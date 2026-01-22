import modal

# Define the cloud environment
image = (
    modal.Image.debian_slim()
    .pip_install(
        "interpret", 
        "scikit-learn", 
        "pandas", 
        "supabase", 
        "joblib",
        "numpy"
    )
)

app = modal.App("ebm-training-service")

# CPU optimized (EBM is native to CPU)
@app.function(image=image, cpu=2.0, timeout=1200) 
def train_ebm_remote(csv_filename, sb_url, sb_key, job_id):
    import os
    import pandas as pd
    import numpy as np
    import joblib
    from interpret.glassbox import ExplainableBoostingClassifier
    from sklearn.model_selection import train_test_split
    from supabase import create_client
    import warnings

    warnings.filterwarnings("ignore")
    
    # URL normalization fix (User mentioned "trailing slash" warning)
    if sb_url and not sb_url.endswith("/"):
        sb_url += "/"

    supabase = create_client(sb_url, sb_key)

    print(f"Job {job_id}: Starting EBM training pipeline...")

    # --- 1. Download Data ---
    local_csv_path = f"/tmp/{csv_filename}"
    try:
        print(f"Downloading {csv_filename}...")
        file_bytes = supabase.storage.from_('images-bucket').download(csv_filename)
        with open(local_csv_path, "wb") as f:
            f.write(file_bytes)
    except Exception as e:
        print(f"Download failed: {e}")
        return {"status": "failed", "error": str(e)}

    # --- 2. Load and Preprocess Data ---
    try:
        df = pd.read_csv(local_csv_path)
        
        # --- FIX FOR ATTRIBUTE ERROR ---
        # Convert all string-like columns (StringDtype) to object (numpy-compatible)
        # This prevents the 'StringArray object has no attribute squeeze' crash in interpret
        for col in df.columns:
            # Check if column is string-like (includes StringDtype and object)
            if pd.api.types.is_string_dtype(df[col]):
                df[col] = df[col].astype(object)
                
        # Generic split: Last column is Target, others are Features
        X = df.iloc[:, :-1]
        y = df.iloc[:, -1]
        
        print(f"Loaded {len(df)} rows. Target: '{y.name}'")
        
    except Exception as e:
        return {"status": "failed", "error": f"CSV Parse Error: {e}"}

    # --- 3. Train Model ---
    try:
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.20, random_state=42)
        
        ebm = ExplainableBoostingClassifier()
        
        print(f"Fitting model on {len(X_train)} samples...")
        ebm.fit(X_train, y_train)
        
        acc = ebm.score(X_test, y_test)
        print(f"Training complete. Accuracy: {acc:.4f}")
    except Exception as e:
        print(f"Training failed: {e}")
        # Return error so we can debug remotely if it happens again
        return {"status": "failed", "error": f"Training failed: {e}"}

    # --- 4. Save & Upload ---
    save_path = f"/tmp/ebm_{job_id}.pkl"
    remote_filename = f"models/ebm-model_{job_id}.pkl"
    
    try:
        joblib.dump(ebm, save_path)

        with open(save_path, "rb") as f:
            supabase.storage.from_('images-bucket').upload(
                remote_filename, 
                f, 
                {"upsert": "true", "content-type": "application/octet-stream"}
            )
    except Exception as e:
         return {"status": "failed", "error": f"Upload failed: {e}"}

    # Cleanup
    if os.path.exists(local_csv_path): os.remove(local_csv_path)
    if os.path.exists(save_path): os.remove(save_path)

    return {"status": "success", "accuracy": acc, "model_path": remote_filename}