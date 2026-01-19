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
        if "resnet18" in file1 and "resnet18" in file2:
            print("Files validated. Connecting to Modal...")
            
            # 1. LOOKUP THE DEPLOYED FUNCTION
            # We use the App Name defined in resnet18.py ("resnet-training-service")
            # and the function name ("train_resnet_remote")
            train_function = modal.Function.lookup("resnet-training-service", "train_resnet_remote")
            
            sb_url = os.environ.get("SUPABASE_URL")
            sb_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

            print("Spawning remote training job...")
            
            # 2. CALL THE FUNCTION REMOTELY
            # This triggers the code sitting on Modal's servers
            model_url = train_function.remote(file1, file2, sb_url, sb_key)
            
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