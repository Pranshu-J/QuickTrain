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

  const pythonCode = `import torch
import torch.nn as nn
from torchvision import models, transforms
from PIL import Image

def load_model(model_path, num_classes=2):
    # 1. Initialize the architecture (must match the training script)
    model = models.resnet18()
    model.fc = nn.Linear(model.fc.in_features, num_classes)
    
    # 2. Load the saved weights
    # map_location ensures it works even if you don't have a GPU locally
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model.load_state_dict(torch.load(model_path, map_location=device))
    model.to(device)
    model.eval() # Set to evaluation mode
    return model, device

def predict(image_path, model, device):
    # 3. Define the exact transformations used in training
    transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
    ])

    # 4. Load and preprocess the image
    image = Image.open(image_path).convert('RGB')
    image = transform(image).unsqueeze(0) # Add batch dimension (1, 3, 224, 224)
    image = image.to(device)

    # 5. Perform Inference
    with torch.no_grad():
        outputs = model(image)
        _, predicted = torch.max(outputs, 1)
        
    return predicted.item()

# --- CONFIGURATION ---
MODEL_FILE = "${fileName || 'trained_model.pth'}"  # Path to your downloaded .pth file
IMAGE_TO_TEST = "test_image.jpg" # Path to the image you want to classify
CLASS_NAMES = ["Class 0", "Class 1"] # Replace with your actual labels

if __name__ == "__main__":
    try:
        my_model, current_device = load_model(MODEL_FILE)
        result_index = predict(IMAGE_TO_TEST, my_model, current_device)
        
        print(f"Prediction: {CLASS_NAMES[result_index]} (Index: {result_index})")
    except Exception as e:
        print(f"Error: {e}")`;

  const handleCopy = () => {
    navigator.clipboard.writeText(pythonCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="app-container">
      <div className="navbar">
        <button 
          onClick={() => navigate('/dashboard')} 
          className="btn-back" 
          style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'Poppins' }}
        >
          <ArrowLeft size={20} /> Back to Dashboard
        </button>
      </div>

      <div style={{ width: '95%', maxWidth: '1200px', margin: '0 auto', paddingBottom: '4rem' }}>
        
        {/* Header Section */}
        <div style={{ marginBottom: '3rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
            <div style={{ background: 'rgba(255,255,255,0.1)', padding: '12px', borderRadius: '16px' }}>
              <FileJson size={32} color="#4ade80" />
            </div>
            <div>
              <h1 style={{ fontFamily: 'Poppins', fontSize: '2.5rem', margin: 0 }}>{modelType} Integration</h1>
              <p style={{ color: 'rgba(255,255,255,0.6)', marginTop: '0.5rem' }}>
                ID: <code style={{ background: 'rgba(255,255,255,0.1)', padding: '4px 8px', borderRadius: '6px' }}>{modelId}</code>
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '2rem' }}>
          
          {/* Main Content: Code Snippet */}
          <div className="usage-card" style={{ 
            background: 'var(--glass-bg)', 
            backdropFilter: 'blur(20px)',
            border: '1px solid var(--glass-border)', 
            borderRadius: '24px', 
            padding: '2rem' 
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Terminal size={20} /> Python Inference Script
              </h3>
              <button 
                onClick={handleCopy}
                style={{ 
                  background: copied ? 'rgba(74, 222, 128, 0.1)' : 'rgba(255,255,255,0.05)', 
                  border: '1px solid var(--glass-border)', 
                  color: copied ? '#4ade80' : 'white',
                  padding: '8px 16px', 
                  borderRadius: '12px', 
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.2s'
                }}
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
                {copied ? 'Copied!' : 'Copy Code'}
              </button>
            </div>

            <div style={{ 
              background: '#0f0f11', 
              borderRadius: '16px', 
              padding: '1.5rem', 
              overflowX: 'auto',
              border: '1px solid rgba(255,255,255,0.05)'
            }}>
              <pre style={{ margin: 0, fontFamily: 'monospace', fontSize: '0.9rem', color: '#e4e4e7', lineHeight: '1.6' }}>
                {pythonCode}
              </pre>
            </div>
          </div>

          {/* Sidebar: Actions & Info */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            {/* Download Card */}
            <div style={{ 
              background: 'var(--glass-bg)', 
              backdropFilter: 'blur(20px)',
              border: '1px solid var(--glass-border)', 
              borderRadius: '24px', 
              padding: '2rem' 
            }}>
              <h3 style={{ marginBottom: '1rem' }}>Get Weights</h3>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                Download the trained .pth file to use with the inference script.
              </p>
              <a 
                href={downloadUrl} 
                download={fileName}
                className="cta-button-large"
                style={{ 
                  width: '100%', 
                  textAlign: 'center', 
                  display: 'flex', 
                  justifyContent: 'center', 
                  alignItems: 'center', 
                  gap: '10px',
                  textDecoration: 'none'
                }}
              >
                <Download size={20} /> Download Model
              </a>
            </div>

            {/* Quick Info */}
            <div style={{ 
              background: 'rgba(255,255,255,0.02)', 
              border: '1px solid var(--glass-border)', 
              borderRadius: '24px', 
              padding: '2rem' 
            }}>
              <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>Requirements</h3>
              <ul style={{ paddingLeft: '1.2rem', color: 'rgba(255,255,255,0.7)', lineHeight: '1.8' }}>
                <li>Python 3.8+</li>
                <li>PyTorch</li>
                <li>Torchvision</li>
                <li>Pillow</li>
              </ul>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default ModelUsage;