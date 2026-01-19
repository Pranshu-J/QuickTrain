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
        file1 = data.get('file1')
        file2 = data.get('file2')

        if not file1 or not file2:
            return jsonify({"error": "Missing filenames"}), 400

        # Check for correct naming convention
        if "resnet18" in file1 or "job_" in file1:
            print("Files validated. Connecting to Modal...")
            
            train_function = modal.Function.from_name("resnet-training-service", "train_resnet_remote")
            
            sb_url = os.environ.get("SUPABASE_URL")
            sb_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
            job_id = data.get('jobId')

            print(f"Spawning background job: {job_id}")
            
            # --- CRITICAL FIX ---
            # Use .spawn() instead of .remote()
            # This starts the job in the cloud and returns IMMEDIATELY.
            # It does NOT wait for the result.
            train_function.spawn(file1, file2, sb_url, sb_key, job_id)
            
            return jsonify({
                "message": "Training started in background",
                "jobId": job_id
            })
            
        else:
            return jsonify({
                "error": "Files do not match the required 'resnet18' naming convention."
            }), 400

    except Exception as e:
        print(f"Error: {e}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=10000)