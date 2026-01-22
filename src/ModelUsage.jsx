import React, { useState } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { ArrowLeft, Copy, Check, Download, FileJson, Terminal } from 'lucide-react';

const ModelUsage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [copied, setCopied] = useState(false);

  // Redirect if accessed directly without state
  if (!location.state) {
    return <Navigate to="/dashboard" replace />;
  }

  const { modelId, modelType, fileName, downloadUrl } = location.state;

  // Detect if the model is TinyBERT based on the name passed from Dashboard
  const isTinyBert = modelType && modelType.toLowerCase().includes('tinybert');

  // 1. ResNet Code Snippet (Unchanged)
  const resnetCode = `import torch
import torch.nn as nn
from torchvision import models, transforms
from PIL import Image

def load_model(model_path, num_classes=2):
    # 1. Initialize the architecture
    model = models.resnet18()
    model.fc = nn.Linear(model.fc.in_features, num_classes)
    
    # 2. Load the saved weights
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model.load_state_dict(torch.load(model_path, map_location=device))
    model.to(device)
    model.eval()
    return model, device

def predict(image_path, model, device):
    transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
    ])

    image = Image.open(image_path).convert('RGB')
    image = transform(image).unsqueeze(0)
    image = image.to(device)

    with torch.no_grad():
        outputs = model(image)
        _, predicted = torch.max(outputs, 1)
        
    return predicted.item()

# --- CONFIGURATION ---
MODEL_FILE = "${fileName || 'trained_model.pth'}"
IMAGE_TO_TEST = "test_image.jpg" 
CLASS_NAMES = ["Class 0", "Class 1"] 

if __name__ == "__main__":
    try:
        my_model, current_device = load_model(MODEL_FILE)
        result_index = predict(IMAGE_TO_TEST, my_model, current_device)
        print(f"Prediction: {CLASS_NAMES[result_index]}")
    except Exception as e:
        print(f"Error: {e}")`;

  // 2. Updated TinyBERT Code Snippet (Handles Zip extraction)
  const tinyBertCode = `import torch
import zipfile
import os
from transformers import AutoTokenizer, AutoModelForSequenceClassification

def setup_model(zip_path, extract_to="./my_model_files"):
    """
    Checks for the model zip file and extracts it to a folder.
    Transformers requires a folder path to load the configuration and weights.
    """
    # If the directory exists and has files, assume it's already extracted
    if os.path.exists(extract_to) and os.listdir(extract_to):
        return extract_to

    print(f"Extracting {zip_path}...")
    if not os.path.exists(zip_path):
        raise FileNotFoundError(f"Model zip file not found: {zip_path}")

    with zipfile.ZipFile(zip_path, 'r') as zip_ref:
        zip_ref.extractall(extract_to)
    
    print(f"Model extracted to: {extract_to}")
    return extract_to

def classify_text(text_input, model_dir):
    # 1. Load the tokenizer and model from the extracted folder
    # This reads 'config.json', 'model.safetensors', etc.
    tokenizer = AutoTokenizer.from_pretrained(model_dir)
    model = AutoModelForSequenceClassification.from_pretrained(model_dir)

    # 2. Tokenize
    inputs = tokenizer(
        text_input,
        return_tensors="pt",
        truncation=True,
        padding=True,
        max_length=128
    )

    # 3. Inference
    model.eval()
    with torch.no_grad():
        outputs = model(**inputs)

    # 4. Process results
    predictions = torch.nn.functional.softmax(outputs.logits, dim=-1)
    label_id = torch.argmax(predictions, dim=1).item()
    confidence = torch.max(predictions).item()

    # 5. Get Label Name from config
    label_name = model.config.id2label[label_id]

    return label_name, confidence

# --- CONFIGURATION ---
# Ensure this matches the name of the file you downloaded
MODEL_ZIP_FILE = "${fileName || 'model.zip'}" 
EXTRACT_DIR = "./extracted_model_v1"

if __name__ == "__main__":
    sample_text = "I am having trouble logging into my account, please help!"

    try:
        # Step 1: Unzip the model
        model_folder_path = setup_model(MODEL_ZIP_FILE, EXTRACT_DIR)
        
        # Step 2: Run classification
        label, score = classify_text(sample_text, model_folder_path)
        
        print(f"\\nInput: {sample_text}")
        print(f"Result: {label} ({score:.2%} confidence)")
    except Exception as e:
        print(f"Error: {e}")`;

  // Select the correct code based on the flag
  const pythonCode = isTinyBert ? tinyBertCode : resnetCode;

  const handleCopy = () => {
    navigator.clipboard.writeText(pythonCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen w-full bg-white text-black font-sans pb-16">
      
      {/* Navbar */}
      <div className="w-full max-w-7xl mx-auto px-6 py-8">
        <button 
          onClick={() => navigate('/dashboard')} 
          className="flex items-center gap-2 text-black hover:text-black/70 hover:-translate-x-1 transition-all bg-transparent border-none cursor-pointer font-medium"
        >
          <ArrowLeft size={20} /> Back to Dashboard
        </button>
      </div>

      <div className="w-[95%] max-w-[1200px] mx-auto">
        
        {/* Header Section */}
        <div className="mb-12 flex items-center gap-4">
          <div className="bg-green-50 p-3 rounded-2xl border border-green-100">
            <FileJson size={32} className="text-green-500" />
          </div>
          <div>
            <h1 className="font-sans text-4xl font-semibold m-0 text-black">{modelType} Integration</h1>
            <p className="text-black/50 mt-2 text-base flex items-center gap-2">
              ID: <code className="bg-gray-100 px-2 py-1 rounded-md text-sm font-mono text-black/80 border border-gray-200">{modelId}</code>
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-8">
          
          {/* Main Content: Code Snippet */}
          <div className="bg-white border border-gray-200 rounded-3xl p-8 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h3 className="flex items-center gap-2.5 font-semibold text-xl">
                <Terminal size={20} /> Python Inference Script
              </h3>
              <button 
                onClick={handleCopy}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-xl border transition-all cursor-pointer font-medium text-sm
                  ${copied 
                    ? 'bg-green-50 border-green-200 text-green-600' 
                    : 'bg-white border-gray-200 text-black hover:bg-gray-50'
                  }
                `}
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
                {copied ? 'Copied!' : 'Copy Code'}
              </button>
            </div>

            {/* Code Block */}
            <div className="bg-[#0f0f11] rounded-2xl p-6 overflow-x-auto border border-gray-100/10 shadow-inner">
              <pre className="m-0 font-mono text-sm text-gray-200 leading-relaxed">
                {pythonCode}
              </pre>
            </div>
          </div>

          {/* Sidebar: Actions & Info */}
          <div className="flex flex-col gap-6">
            
            {/* Download Card */}
            <div className="bg-white border border-gray-200 rounded-3xl p-8 shadow-sm">
              <h3 className="mb-3 font-semibold text-lg">Get Weights</h3>
              <p className="text-black/60 text-sm mb-6 leading-relaxed">
                {isTinyBert 
                  ? "Download the model zip file. This archive contains the config, tokenizer, and safetensors weights."
                  : "Download the trained .pth file to use with the inference script."
                }
              </p>
              <a 
                href={downloadUrl} 
                download={fileName}
                className="flex justify-center items-center gap-2.5 w-full bg-black text-white py-4 rounded-full font-semibold hover:bg-gray-800 transition-colors no-underline"
              >
                <Download size={20} /> Download Model
              </a>
            </div>

            {/* Quick Info */}
            <div className="bg-gray-50 border border-gray-100 rounded-3xl p-8">
              <h3 className="mb-4 font-medium text-lg text-black">Requirements</h3>
              <ul className="pl-5 text-black/70 leading-loose list-disc">
                {isTinyBert ? (
                   <>
                     <li>Python 3.8+</li>
                     <li>Transformers (Hugging Face)</li>
                     <li>PyTorch</li>
                   </>
                ) : (
                   <>
                     <li>Python 3.8+</li>
                     <li>PyTorch</li>
                     <li>Torchvision</li>
                     <li>Pillow</li>
                   </>
                )}
              </ul>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default ModelUsage;