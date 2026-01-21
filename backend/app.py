import os
import modal
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

@app.route('/trigger-training', methods=['POST'])
def trigger_training():
    try:
        data = request.json
        
        # 1. Extract inputs
        train_file1 = data.get('trainFile1') or data.get('trainFile')
        train_file2 = data.get('trainFile2') or data.get('testFile')
        test_file1 = data.get('testFile1') 
        test_file2 = data.get('testFile2') 
        use_auto_split = data.get('useAutoSplit', True)
        job_id = data.get('jobId')
        model_type = data.get('modelType', 'resnet')

        if not train_file1:
            return jsonify({"error": "Missing training file(s)"}), 400

        print(f"Job {job_id}: Connecting to Modal for {model_type}...")

        # 3. Dynamic Function Selection
        if model_type == 'resnet':
            train_function = modal.Function.from_name("resnet-training-service", "train_resnet_remote")
            
        # FIX: Check for 'tiny-bert' (matching React) and use correct Service/Function names
        elif model_type == 'tinybert' or model_type == 'tiny-bert':
            # UPDATED: Matches the name defined in bert_service.py
            train_function = modal.Function.from_name("tinybert-training-service", "train_tinybert_remote")
            
        else:
            return jsonify({"error": f"Unsupported model type: {model_type}"}), 400
        
        sb_url = os.environ.get("SUPABASE_URL")
        sb_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

        print(f"Spawning background job: {job_id}")
        
        # 4. Spawn the job
        train_function.spawn(
            train_file1, 
            train_file2, 
            test_file1, 
            test_file2, 
            use_auto_split, 
            sb_url, 
            sb_key, 
            job_id
        )
        
        return jsonify({
            "message": f"{model_type} training started in background",
            "jobId": job_id
        })

    except Exception as e:
        print(f"Error: {e}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=10000)