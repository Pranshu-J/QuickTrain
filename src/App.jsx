import React, { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import JSZip from 'jszip';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const SupabaseUploader = () => {
  const [status, setStatus] = useState('Idle');
  
  // We need state for TWO separate folders
  const [folder1, setFolder1] = useState([]);
  const [folder2, setFolder2] = useState([]);

  // Helper to handle file selection
  const onFileChange = (e, setFolder) => {
    if (e.target.files) setFolder(Array.from(e.target.files));
  };

  // Helper to Zip and Upload a single folder
  const zipAndUpload = async (files, fileName) => {
    const zip = new JSZip();
    files.forEach(file => {
      // Use webkitRelativePath to keep folder structure
      zip.file(file.webkitRelativePath || file.name, file);
    });
    
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    
    // Request signed URL (Assuming you use the standard Supabase upload flow)
    // For simplicity here, I am uploading directly using the anon key 
    // (Ensure your RLS policies allow this or use your backend for signing)
    const { error } = await supabase.storage
      .from('images-bucket')
      .upload(fileName, zipBlob, { upsert: true });

    if (error) throw error;
    return fileName;
  };

  const handleStartTraining = async () => {
    if (folder1.length === 0 || folder2.length === 0) {
      alert("Please select both folders.");
      return;
    }

    try {
      setStatus('Zipping and Uploading Data...');
      
      // 1. Define the specific names required
      const name1 = 'training-data-1-resnet18.zip';
      const name2 = 'training-data-2-resnet18.zip';

      // 2. Upload both folders in parallel
      await Promise.all([
        zipAndUpload(folder1, name1),
        zipAndUpload(folder2, name2)
      ]);

      setStatus('Files Uploaded. Triggering Training...');

      // 3. Notify Python Backend
      const response = await fetch('https://YOUR-RENDER-URL.onrender.com/trigger-training', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          file1: name1, 
          file2: name2 
        }),
      });

      const data = await response.json();
      
      if (!response.ok) throw new Error(data.error);

      console.log("Training Response:", data);
      setStatus(`Training Complete! Model URL: ${data.modelUrl}`);

    } catch (error) {
      console.error(error);
      setStatus(`Error: ${error.message}`);
    }
  };

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h2>AI Model Trainer (ResNet18)</h2>
      
      <div style={{ marginBottom: '20px' }}>
        <label><strong>Folder 1 (Training Data):</strong></label><br/>
        <input type="file" multiple webkitdirectory="true" onChange={(e) => onFileChange(e, setFolder1)} />
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label><strong>Folder 2 (Validation/Extra Data):</strong></label><br/>
        <input type="file" multiple webkitdirectory="true" onChange={(e) => onFileChange(e, setFolder2)} />
      </div>

      <button onClick={handleStartTraining} style={{ padding: '10px 20px', cursor: 'pointer' }}>
        Upload & Start Training
      </button>

      <p>Status: <strong>{status}</strong></p>
    </div>
  );
};

export default SupabaseUploader;