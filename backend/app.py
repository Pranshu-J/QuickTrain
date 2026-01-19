import os
from flask import Flask, request, jsonify
# Import the Modal function explicitly
from resnet18 import train_resnet_remote 

app = Flask(__name__)

@app.route('/trigger-training', methods=['POST'])
def trigger_training():
    try:
        data = request.json
        file1 = data.get('file1') # "training-data-1-resnet18.zip"
        file2 = data.get('file2') # "training-data-2-resnet18.zip"

        if not file1 or not file2:
            return jsonify({"error": "Missing filenames"}), 400

        # 1. Verify naming convention logic
        # Check if 'resnet18' is in both strings
        if "resnet18" in file1 and "resnet18" in file2:
            print("Files validated. Initializing Modal...")
            
            # 2. Get Supabase Credentials to pass to Modal
            # (Modal runs in a separate environment, so it needs these passed in 
            # or set as Modal Secrets. Passing as args for simplicity here.)
            sb_url = os.environ.get("SUPABASE_URL")
            sb_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

            # 3. Trigger the Modal Function
            # .remote() blocks until the function finishes. 
            # Note: If training takes >30s, Flask might timeout. 
            # For long training, use .spawn() and return a Job ID.
            print("Spawning remote training job...")
            
            # Using call to execute the logic inside resnet18.py
            # This executes the code in the cloud
            model_url = train_resnet_remote.remote(file1, file2, sb_url, sb_key)
            
            return jsonify({
                "message": "Training successful",
                "modelUrl": model_url
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