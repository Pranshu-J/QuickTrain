import os
import modal
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# --- 1. Define Model Handlers ---
# Each handler knows exactly what its specific Modal function needs.

def handle_resnet(data, sb_url, sb_key, job_id):
    f = modal.Function.from_name("resnet-training-service", "train_resnet_remote")
    # ResNet needs 4 separate file arguments + auto_split
    f.spawn(
        data.get('trainFile1'), 
        data.get('trainFile2'), 
        data.get('testFile1'), 
        data.get('testFile2'), 
        data.get('useAutoSplit', True), 
        sb_url, sb_key, job_id
    )

def handle_tinybert(data, sb_url, sb_key, job_id):
    f = modal.Function.from_name("tinybert-training-service", "train_tinybert_remote")
    # TinyBERT might generally follow ResNet structure
    f.spawn(
        data.get('trainFile1'), 
        data.get('trainFile2'), 
        data.get('testFile1'), 
        data.get('testFile2'), 
        data.get('useAutoSplit', True), 
        sb_url, sb_key, job_id
    )

def handle_ebm(data, sb_url, sb_key, job_id):
    f = modal.Function.from_name("ebm-training-service", "train_ebm_remote")
    # EBM is unique: it only needs ONE file input
    # We map 'trainFile1' from the generic input to the CSV arg
    csv_file = data.get('trainFile1') or data.get('trainFile')
    
    if not csv_file:
        raise ValueError("EBM requires a CSV file provided in 'trainFile1'")
        
    f.spawn(csv_file, sb_url, sb_key, job_id)

# --- 2. The Dispatcher Dictionary ---
# Map string keys to the functions above
MODEL_HANDLERS = {
    'resnet': handle_resnet,
    'tinybert': handle_tinybert,
    'tiny-bert': handle_tinybert,
    'ebm': handle_ebm
}

# --- 3. Clean Route ---
@app.route('/trigger-training', methods=['POST'])
def trigger_training():
    try:
        data = request.json
        job_id = data.get('jobId')
        model_type = data.get('modelType', 'resnet').lower()
        
        # Validation
        if not job_id:
            return jsonify({"error": "Missing jobId"}), 400

        # Retrieve Supabase creds once
        sb_url = os.environ.get("SUPABASE_URL")
        sb_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

        # DYNAMIC ROUTING
        handler = MODEL_HANDLERS.get(model_type)
        
        if not handler:
            return jsonify({"error": f"Unsupported model type: {model_type}"}), 400
            
        print(f"Job {job_id}: Routing to handler for {model_type}...")
        
        # execute the specific handler
        handler(data, sb_url, sb_key, job_id)

        return jsonify({
            "message": f"{model_type} training started in background",
            "jobId": job_id
        })

    except ValueError as ve:
        return jsonify({"error": str(ve)}), 400
    except Exception as e:
        print(f"Error: {e}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=10000)