import modal

# Define the cloud environment
image = (
    modal.Image.debian_slim()
    .pip_install("torch", "torchvision", "supabase", "numpy")
)

app = modal.App("resnet-training-service")

@app.function(image=image, gpu="T4", timeout=1200) # 20 minute limit
def train_resnet_remote(file1_name, file2_name, sb_url, sb_key):
    import os
    import shutil
    import zipfile
    import torch
    import torch.nn as nn
    import torch.optim as optim
    from torchvision import datasets, models, transforms
    from torch.utils.data import DataLoader
    from supabase import create_client
    import warnings

    # 1. Silence all warnings
    warnings.filterwarnings("ignore")

    # 2. Supabase Connection
    supabase = create_client(sb_url, sb_key)

    # 3. Helper to organize data generically
    base_dir = "/tmp/dataset"
    train_dir = os.path.join(base_dir, "train")
    
    # Clean previous runs
    if os.path.exists(base_dir):
        shutil.rmtree(base_dir)
    os.makedirs(train_dir, exist_ok=True)

    def prepare_class_data(zip_filename, class_label):
        # Create class folder (e.g., /tmp/dataset/train/class_0)
        class_path = os.path.join(train_dir, class_label)
        os.makedirs(class_path, exist_ok=True)

        # Download Zip
        try:
            file_bytes = supabase.storage.from_('images-bucket').download(zip_filename)
            zip_temp = f"/tmp/{zip_filename}"
            with open(zip_temp, "wb") as f:
                f.write(file_bytes)
        except:
            return # Fail silently if file missing

        # Extract
        with zipfile.ZipFile(zip_temp, 'r') as zip_ref:
            zip_ref.extractall(class_path)
        os.remove(zip_temp)

        # Flatten directory (handles cases where users zipped a folder vs zipped files)
        # Moves all images to the root of class_path and deletes subfolders
        for root, dirs, files in os.walk(class_path):
            if root == class_path:
                continue
            for file in files:
                if not file.startswith('.') and not file.startswith('__'):
                    shutil.move(os.path.join(root, file), os.path.join(class_path, file))
        
        # Cleanup subdirectories and system files
        for root, dirs, files in os.walk(class_path, topdown=False):
            for name in dirs:
                shutil.rmtree(os.path.join(root, name))
        for f in os.listdir(class_path):
            if f.startswith('.'):
                os.remove(os.path.join(class_path, f))

    # Process uploads into generic Class 0 and Class 1
    prepare_class_data(file1_name, "class_0")
    prepare_class_data(file2_name, "class_1")

    # 4. Data Loading
    data_transforms = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
    ])

    # Automatically finds 'class_0' and 'class_1' folders
    dataset = datasets.ImageFolder(train_dir, transform=data_transforms)
    dataloader = DataLoader(dataset, batch_size=32, shuffle=True)

    # 5. Model Setup
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model = models.resnet18(weights='IMAGENET1K_V1')

    # Freeze layers
    for param in model.parameters():
        param.requires_grad = False

    # Generic output for 2 classes
    model.fc = nn.Linear(model.fc.in_features, 2)
    model = model.to(device)

    criterion = nn.CrossEntropyLoss()
    optimizer = optim.Adam(model.fc.parameters(), lr=0.001)

    # 6. Training Loop
    model.train()
    epochs = 5 
    for epoch in range(epochs):
        for inputs, labels in dataloader:
            inputs, labels = inputs.to(device), labels.to(device)
            optimizer.zero_grad()
            outputs = model(inputs)
            loss = criterion(outputs, labels)
            loss.backward()
            optimizer.step()

    # 7. Save & Upload
    save_path = "/tmp/trained_model.pth"
    torch.save(model.state_dict(), save_path)

    # Create a unique name for the bucket
    remote_filename = f"models/resnet18_custom_{os.urandom(4).hex()}.pth"

    with open(save_path, "rb") as f:
        supabase.storage.from_('images-bucket').upload(remote_filename, f)

    # Generate Signed URL (valid for 1 hour)
    signed_url = supabase.storage.from_('images-bucket').create_signed_url(remote_filename, 3600)

    return signed_url['signedUrl']