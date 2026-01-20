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
        
        # New variable names to match frontend
        train_file1 = data.get('trainFile1')
        train_file2 = data.get('trainFile2')
        test_file1 = data.get('testFile1') # Can be None if auto-split
        test_file2 = data.get('testFile2') # Can be None if auto-split
        use_auto_split = data.get('useAutoSplit', True)
        job_id = data.get('jobId')

        if not train_file1 or not train_file2:
            return jsonify({"error": "Missing training files"}), 400

        print(f"Job {job_id}: Connecting to Modal...")
        
        train_function = modal.Function.from_name("resnet-training-service", "train_resnet_remote")
        
        sb_url = os.environ.get("SUPABASE_URL")
        sb_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

        print(f"Spawning background job: {job_id}")
        
        # Spawning with new arguments
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
            "message": "Training started in background",
            "jobId": job_id
        })

    except Exception as e:
        print(f"Error: {e}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=10000)