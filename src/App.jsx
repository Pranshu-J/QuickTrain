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
      
      // Create a unique Job ID (e.g., timestamp)
      const jobId = `job_${Date.now()}`;

      // 1. Define specific names
      const name1 = `${jobId}_data1.zip`;
      const name2 = `${jobId}_data2.zip`;

      // 2. Upload folders
      await Promise.all([
        zipAndUpload(folder1, name1),
        zipAndUpload(folder2, name2)
      ]);

      setStatus('Files Uploaded. Starting Background Training...');

      // 3. Notify Python Backend (Pass the jobId!)
      const response = await fetch('https://quicktrain.onrender.com/trigger-training', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          file1: name1, 
          file2: name2,
          jobId: jobId 
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Server error');
      }

      // 4. Construct the URL manually (Since we know the format)
      // Note: This URL will work ONLY after training finishes (approx 5-10 mins)
      const bucketUrl = import.meta.env.VITE_SUPABASE_URL + "/storage/v1/object/public/images-bucket/models/";
      const modelUrl = `${bucketUrl}resnet18_${jobId}.pth`;

      setStatus(`Training Started! Check back in 10 mins. Link: ${modelUrl}`);
      console.log("Model will be available at:", modelUrl);

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