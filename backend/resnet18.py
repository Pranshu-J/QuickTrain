import modal

# Define the cloud environment
image = (
    modal.Image.debian_slim()
    .pip_install("torch", "torchvision", "supabase", "numpy")
)

app = modal.App("resnet-training-service")

@app.function(image=image, gpu="T4", timeout=1200) # 20 minute limit
def train_resnet_remote(train_f1, train_f2, test_f1, test_f2, auto_split, sb_url, sb_key, job_id):
    import os
    import shutil
    import zipfile
    import random
    import torch
    import torch.nn as nn
    import torch.optim as optim
    from torchvision import datasets, models, transforms
    from torch.utils.data import DataLoader
    from supabase import create_client
    import warnings

    warnings.filterwarnings("ignore")
    supabase = create_client(sb_url, sb_key)

    # --- 1. Setup Directories ---
    base_dir = "/tmp/dataset"
    train_dir = os.path.join(base_dir, "train")
    val_dir = os.path.join(base_dir, "val")
    
    if os.path.exists(base_dir):
        shutil.rmtree(base_dir)
    
    os.makedirs(train_dir, exist_ok=True)
    os.makedirs(val_dir, exist_ok=True)

    # --- 2. Data Prep Helper ---
    def download_and_extract(zip_filename, target_dir, class_label):
        if not zip_filename: return
        
        class_path = os.path.join(target_dir, class_label)
        os.makedirs(class_path, exist_ok=True)

        try:
            file_bytes = supabase.storage.from_('images-bucket').download(zip_filename)
            zip_temp = f"/tmp/{zip_filename}"
            with open(zip_temp, "wb") as f:
                f.write(file_bytes)
        except Exception as e:
            print(f"Error downloading {zip_filename}: {e}")
            return

        with zipfile.ZipFile(zip_temp, 'r') as zip_ref:
            zip_ref.extractall(class_path)
        os.remove(zip_temp)

        # Flatten logic
        for root, dirs, files in os.walk(class_path):
            if root == class_path: continue
            for file in files:
                if not file.startswith('.') and not file.startswith('__'):
                    shutil.move(os.path.join(root, file), os.path.join(class_path, file))
        
        # Cleanup
        for root, dirs, files in os.walk(class_path, topdown=False):
            for name in dirs: shutil.rmtree(os.path.join(root, name))

    # --- 3. Execute Data Prep ---
    print("Preparing Training Data...")
    download_and_extract(train_f1, train_dir, "class_0")
    download_and_extract(train_f2, train_dir, "class_1")

    if auto_split:
        print("Auto-splitting 20% for validation...")
        for cls in ["class_0", "class_1"]:
            src = os.path.join(train_dir, cls)
            dst = os.path.join(val_dir, cls)
            os.makedirs(dst, exist_ok=True)
            
            all_files = os.listdir(src)
            random.shuffle(all_files)
            split_idx = int(len(all_files) * 0.2)
            
            for f in all_files[:split_idx]:
                shutil.move(os.path.join(src, f), os.path.join(dst, f))
    else:
        print("Downloading User-Provided Validation Data...")
        download_and_extract(test_f1, val_dir, "class_0")
        download_and_extract(test_f2, val_dir, "class_1")

    # --- 4. Loaders ---
    data_transforms = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
    ])

    train_dataset = datasets.ImageFolder(train_dir, transform=data_transforms)
    val_dataset = datasets.ImageFolder(val_dir, transform=data_transforms)

    train_loader = DataLoader(train_dataset, batch_size=32, shuffle=True)
    val_loader = DataLoader(val_dataset, batch_size=32, shuffle=False)

    print(f"Training images: {len(train_dataset)}, Validation images: {len(val_dataset)}")

    # --- 5. Model ---
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model = models.resnet18(weights='IMAGENET1K_V1')
    for param in model.parameters():
        param.requires_grad = False
    model.fc = nn.Linear(model.fc.in_features, 2)
    model = model.to(device)

    criterion = nn.CrossEntropyLoss()
    optimizer = optim.Adam(model.fc.parameters(), lr=0.001)

    # --- 6. Train & Validate Loop ---
    epochs = 5 
    for epoch in range(epochs):
        model.train()
        running_loss = 0.0
        for inputs, labels in train_loader:
            inputs, labels = inputs.to(device), labels.to(device)
            optimizer.zero_grad()
            outputs = model(inputs)
            loss = criterion(outputs, labels)
            loss.backward()
            optimizer.step()
            running_loss += loss.item()

        # Validation
        model.eval()
        correct = 0
        total = 0
        with torch.no_grad():
            for inputs, labels in val_loader:
                inputs, labels = inputs.to(device), labels.to(device)
                outputs = model(inputs)
                _, predicted = torch.max(outputs.data, 1)
                total += labels.size(0)
                correct += (predicted == labels).sum().item()
        
        acc = 100 * correct / total if total > 0 else 0
        print(f"Epoch {epoch+1}/{epochs} | Loss: {running_loss:.4f} | Val Acc: {acc:.2f}%")

    # --- 7. Save & Upload ---
    save_path = "/tmp/trained_model.pth"
    torch.save(model.state_dict(), save_path)
    remote_filename = f"models/resnet18_{job_id}.pth"

    with open(save_path, "rb") as f:
        supabase.storage.from_('images-bucket').upload(remote_filename, f, {"upsert": "true"})

    return remote_filename