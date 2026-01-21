import modal

# 1. Define the Cloud Environment
image = (
    modal.Image.debian_slim()
    .pip_install(
        "torch", 
        "pandas", 
        "scikit-learn", 
        "transformers", 
        "datasets", 
        "supabase", 
        "accelerate"
    )
)

# This App name MUST match what is in app.py
app = modal.App("tinybert-training-service")

# This Function name MUST match what is in app.py
@app.function(image=image, gpu="T4", timeout=1800)
def train_tinybert_remote(
    train_file1,
    train_file2,
    test_file1,
    test_file2,
    use_auto_split,
    sb_url,
    sb_key,
    job_id
):
    input_filename = train_file1
    
    # UPDATED: Changed from 'tabular-bucket' to 'images-bucket' as requested
    bucket_name = "images-bucket" 
    
    import os
    import shutil
    import pandas as pd
    import torch
    from sklearn.preprocessing import LabelEncoder
    from transformers import (
        AutoTokenizer, 
        AutoModelForSequenceClassification, 
        Trainer, 
        TrainingArguments
    )
    from datasets import Dataset
    from supabase import create_client

    # --- Setup Supabase ---
    print("Connecting to Supabase...")
    supabase = create_client(sb_url, sb_key)
    
    # --- Paths ---
    local_data_path = f"/tmp/{input_filename}"
    output_dir = "/tmp/model_output"
    archive_path = f"/tmp/tinybert_{job_id}"

    # --- Helper: Robust Data Loading ---
    def load_and_process_data(file_path):
        print(f"Loading data from {file_path}...")
        
        if file_path.endswith('.csv'):
            df = pd.read_csv(file_path)
        elif file_path.endswith('.json'):
            try:
                df = pd.read_json(file_path)
            except ValueError:
                df = pd.read_json(file_path, lines=True)
        else:
            raise ValueError("Unsupported file format. Please use .csv or .json")

        if 'text' not in df.columns or 'label' not in df.columns:
            print("Standard headers not found. Assuming Col 0 is 'text' and Col 1 is 'label'.")
            new_cols = {df.columns[0]: 'text', df.columns[1]: 'label'}
            df = df.rename(columns=new_cols)

        df = df[['text', 'label']]

        # Clean Malformed Rows
        initial_count = len(df)
        df = df.dropna(subset=['text', 'label'])
        df = df[df['text'].map(lambda x: isinstance(x, str) and len(str(x).strip()) > 0)]
        
        if len(df) < initial_count:
            print(f"Cleaned data: Dropped {initial_count - len(df)} malformed/empty rows.")

        # Label Encoding
        le = LabelEncoder()
        df.loc[:, 'encoded_label'] = le.fit_transform(df['label'])
        
        label_list = le.classes_.tolist()
        id2label = {i: str(label) for i, label in enumerate(label_list)}
        label2id = {str(label): i for i, label in enumerate(label_list)}
        
        print(f"Detected {len(label_list)} classes: {label_list}")
        
        dataset = Dataset.from_pandas(df[['text', 'encoded_label']].rename(columns={'encoded_label': 'label'}))
        if '__index_level_0__' in dataset.column_names:
            dataset = dataset.remove_columns(['__index_level_0__'])
            
        return dataset, id2label, label2id


    # --- 3. Download Training Data ---
    print(f"Downloading {input_filename} from bucket '{bucket_name}'...")
    try:
        data_bytes = supabase.storage.from_(bucket_name).download(input_filename)
        with open(local_data_path, "wb") as f:
            f.write(data_bytes)
    except Exception as e:
        print(f"Failed to download file: {e}")
        return None

    # --- 4. Prepare Data & Model ---
    MODEL_NAME = "huawei-noah/TinyBERT_General_4L_312D"
    dataset, id2label, label2id = load_and_process_data(local_data_path)

    print("Tokenizing training data...")
    tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
    def tokenize_function(examples):
        return tokenizer(examples["text"], padding="max_length", truncation=True, max_length=128)
    tokenized_dataset = dataset.map(tokenize_function, batched=True)

    # --- 4b. Download and Prepare Validation Data (if provided) ---
    eval_dataset = None
    if test_file1:
        test_local_path = f"/tmp/{test_file1}"
        print(f"Downloading validation file {test_file1} from bucket '{bucket_name}'...")
        try:
            test_bytes = supabase.storage.from_(bucket_name).download(test_file1)
            with open(test_local_path, "wb") as f:
                f.write(test_bytes)
            eval_raw, _, _ = load_and_process_data(test_local_path)
            eval_dataset = eval_raw.map(tokenize_function, batched=True)
        except Exception as e:
            print(f"Failed to download or process validation file: {e}")
            eval_dataset = None
    if not eval_dataset:
        if use_auto_split:
            split = tokenized_dataset.train_test_split(test_size=0.2)
            eval_dataset = split["test"]
            tokenized_dataset = split["train"]

    model = AutoModelForSequenceClassification.from_pretrained(
        MODEL_NAME,
        num_labels=len(id2label),
        id2label=id2label,
        label2id=label2id
    )

    # --- 5. Training ---
    training_args = TrainingArguments(
        output_dir=output_dir,
        num_train_epochs=3,
        per_device_train_batch_size=32, 
        logging_steps=10,
        save_strategy="no",
        report_to="none",
        learning_rate=2e-5,
    )

    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=tokenized_dataset,
        eval_dataset=eval_dataset,
    )

    print("Starting training on GPU...")
    trainer.train()

    # --- 6. Save and Package ---
    print("Saving model locally...")
    model.save_pretrained(output_dir)
    tokenizer.save_pretrained(output_dir)

    print("Zipping model artifacts...")
    shutil.make_archive(archive_path, 'zip', output_dir)
    final_zip_path = f"{archive_path}.zip"

    # --- 7. Upload to Supabase ---
    remote_path = f"models/tinybert_{job_id}.zip"
    print(f"Uploading to Supabase: {remote_path}...")
    
    try:
        with open(final_zip_path, "rb") as f:
            supabase.storage.from_(bucket_name).upload(
                path=remote_path, 
                file=f, 
                file_options={"upsert": "true"}
            )
        print("Upload successful!")
    except Exception as e:
        print(f"Error uploading model: {e}")
        return None

    return remote_path