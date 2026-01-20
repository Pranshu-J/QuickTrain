import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import JSZip from 'jszip';
import { ArrowLeft, UploadCloud, Folder, CheckCircle, ToggleLeft, ToggleRight, AlertCircle } from 'lucide-react';
import { useAuth, supabase } from './Auth';

const ModelTrainer = () => {
  const navigate = useNavigate();
  const { modelId } = useParams();
  const { user } = useAuth();
  
  // --- Training Data State ---
  const [trainFolder1, setTrainFolder1] = useState([]);
  const [trainFolder2, setTrainFolder2] = useState([]);
  const [trainPreviews1, setTrainPreviews1] = useState([]);
  const [trainPreviews2, setTrainPreviews2] = useState([]);

  // --- Testing Data State ---
  const [autoSplit, setAutoSplit] = useState(true);
  const [testFolder1, setTestFolder1] = useState([]);
  const [testFolder2, setTestFolder2] = useState([]);
  const [testPreviews1, setTestPreviews1] = useState([]);
  const [testPreviews2, setTestPreviews2] = useState([]);
  
  // Drag States
  const [dragActiveT1, setDragActiveT1] = useState(false);
  const [dragActiveT2, setDragActiveT2] = useState(false);
  const [dragActiveV1, setDragActiveV1] = useState(false);
  const [dragActiveV2, setDragActiveV2] = useState(false);

  const [status, setStatus] = useState('Idle');

  // Input Refs
  const inputRefT1 = useRef(null);
  const inputRefT2 = useRef(null);
  const inputRefV1 = useRef(null);
  const inputRefV2 = useRef(null);

  // Helper: Generate Previews
  const generatePreviews = (files) => {
    const images = Array.from(files).filter(file => file.type.startsWith('image/'));
    return images.slice(0, 6).map(file => URL.createObjectURL(file));
  };

  const handleFiles = (files, setFolder, setPreviews) => {
    if (!files || files.length === 0) return;
    const fileArray = Array.from(files);
    setFolder(fileArray);
    const newPreviews = generatePreviews(fileArray);
    setPreviews(prev => {
      prev.forEach(url => URL.revokeObjectURL(url));
      return newPreviews;
    });
  };

  // --- Generic Drag & Drop Handlers ---
  const handleDrag = (e, setActive) => {
    e.preventDefault(); e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setActive(true);
    else if (e.type === "dragleave") setActive(false);
  };

  const handleDrop = (e, setActive, setFolder, setPreviews) => {
    e.preventDefault(); e.stopPropagation();
    setActive(false);
    if (e.dataTransfer.files?.length > 0) handleFiles(e.dataTransfer.files, setFolder, setPreviews);
  };

  // --- Upload Logic ---
  const zipAndUpload = async (files, fileName) => {
    if (!files || files.length === 0) return null; // Handle empty optional files
    const zip = new JSZip();
    files.forEach(file => zip.file(file.webkitRelativePath || file.name, file));
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const { error } = await supabase.storage.from('images-bucket').upload(fileName, zipBlob, { upsert: true });
    if (error) throw error;
    return fileName;
  };

  const updateUserData = async (fullProjectName) => {
    if (!user) throw new Error("User not authenticated");
    const { data: existingRow } = await supabase.from('user_data').select('data_content').eq('user_id', user.id).single();
    const currentProjects = existingRow?.data_content?.projects || [];
    await supabase.from('user_data').upsert({ 
        user_id: user.id,
        data_content: { projects: [...currentProjects, fullProjectName] } 
    });
  };

  const handleStartTraining = async () => {
    // Validation
    if (trainFolder1.length === 0 || trainFolder2.length === 0) {
      alert("Please upload both Training Class A and Class B.");
      return;
    }
    if (!autoSplit && (testFolder1.length === 0 || testFolder2.length === 0)) {
      alert("Since Auto-split is OFF, you must upload Testing data for both classes.");
      return;
    }

    try {
      setStatus('Initializing...');
      const instanceId = Math.random().toString(36).substring(2, 10);
      const modelFileName = `${modelId}_${instanceId}.pth`;
      
      // Filenames
      const zipNameT1 = `${modelId}-trainA-${user.id}-${instanceId}.zip`;
      const zipNameT2 = `${modelId}-trainB-${user.id}-${instanceId}.zip`;
      const zipNameV1 = !autoSplit ? `${modelId}-testA-${user.id}-${instanceId}.zip` : null;
      const zipNameV2 = !autoSplit ? `${modelId}-testB-${user.id}-${instanceId}.zip` : null;

      setStatus('Compressing & Uploading...');
      
      // Upload concurrently
      await Promise.all([
        zipAndUpload(trainFolder1, zipNameT1),
        zipAndUpload(trainFolder2, zipNameT2),
        !autoSplit ? zipAndUpload(testFolder1, zipNameV1) : Promise.resolve(null),
        !autoSplit ? zipAndUpload(testFolder2, zipNameV2) : Promise.resolve(null),
      ]);

      setStatus('Registering Project...');
      await updateUserData(modelFileName);

      setStatus('Starting GPU Instance...');
      const response = await fetch('https://quicktrain.onrender.com/trigger-training', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          trainFile1: zipNameT1, 
          trainFile2: zipNameT2,
          testFile1: zipNameV1,
          testFile2: zipNameV2,
          useAutoSplit: autoSplit,
          jobId: instanceId 
        }),
      });

      if (!response.ok) throw new Error('Training trigger failed');

      setStatus('Training Started Successfully!');
      setTimeout(() => navigate('/dashboard'), 2000);
      
    } catch (error) {
      console.error(error);
      setStatus(`Error: ${error.message}`);
    }
  };

  // Clean previews on unmount
  useEffect(() => {
    return () => {
      [...trainPreviews1, ...trainPreviews2, ...testPreviews1, ...testPreviews2].forEach(u => URL.revokeObjectURL(u));
    };
  }, []);

  // Reusable Upload Card Component
  const UploadCard = ({ title, folder, setFolder, setPreviews, previews, dragActive, setDragActive, inputRef, disabled }) => (
    <div className={`upload-card ${disabled ? 'disabled-card' : ''}`} style={{opacity: disabled ? 0.5 : 1, pointerEvents: disabled ? 'none' : 'auto'}}>
      <div className="card-header"><Folder size={20} color="#a1a1aa"/> {title}</div>
      <div 
        className={`drop-zone ${dragActive ? 'active' : ''}`}
        onDragEnter={(e) => handleDrag(e, setDragActive)}
        onDragLeave={(e) => handleDrag(e, setDragActive)}
        onDragOver={(e) => handleDrag(e, setDragActive)}
        onDrop={(e) => handleDrop(e, setDragActive, setFolder, setPreviews)}
        onClick={() => inputRef.current.click()}
      >
        <div className="drop-zone-content">
          <UploadCloud size={32} className="drop-icon" />
          <div className="zone-text">{folder.length > 0 ? 'Add more files' : 'Drop folder here'}</div>
        </div>
        <input ref={inputRef} type="file" multiple webkitdirectory="true" onChange={(e) => handleFiles(e.target.files, setFolder, setPreviews)} style={{ display: 'none' }} />
      </div>
      {folder.length > 0 && (
        <div className="preview-area">
          <div className="file-stats"><span><CheckCircle size={14} style={{display:'inline'}}/> {folder.length} files</span></div>
          <div className="preview-scroll">
            {previews.map((src, i) => <img key={i} src={src} className="preview-thumb" alt="" />)}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="app-container">
      <div style={{ width: '100%', maxWidth: '1400px', padding: '2rem' }}>
        <button onClick={() => navigate('/')} className="btn-pill-outline" style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
          <ArrowLeft size={18} /> Back
        </button>
      </div>

      <div className="trainer-wrapper">
        <div className="trainer-header">
          <h2>Configure Training</h2>
          <div className="toggle-container" onClick={() => setAutoSplit(!autoSplit)} style={{cursor:'pointer', display:'flex', alignItems:'center', gap:'10px', marginTop:'10px'}}>
            {autoSplit ? <ToggleRight size={32} color="#4ade80" /> : <ToggleLeft size={32} color="#9ca3af" />}
            <span>{autoSplit ? "Auto-split Data (80% Train / 20% Test)" : "Manual Data Upload"}</span>
          </div>
        </div>

        <div className="upload-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
          {/* Training Column */}
          <div style={{display:'flex', flexDirection:'column', gap:'1rem'}}>
             <h3 style={{color:'white'}}>Training Data</h3>
             <UploadCard 
               title="Object A (Train)" folder={trainFolder1} setFolder={setTrainFolder1} 
               previews={trainPreviews1} setPreviews={setTrainPreviews1} 
               dragActive={dragActiveT1} setDragActive={setDragActiveT1} inputRef={inputRefT1} 
             />
             <UploadCard 
               title="Object B (Train)" folder={trainFolder2} setFolder={setTrainFolder2} 
               previews={trainPreviews2} setPreviews={setTrainPreviews2} 
               dragActive={dragActiveT2} setDragActive={setDragActiveT2} inputRef={inputRefT2} 
             />
          </div>

          {/* Testing Column */}
          <div style={{display:'flex', flexDirection:'column', gap:'1rem'}}>
             <h3 style={{color: autoSplit ? '#52525b' : 'white'}}>Testing Data {autoSplit && "(Auto-Generated)"}</h3>
             <UploadCard 
               title="Object A (Test)" folder={testFolder1} setFolder={setTestFolder1} 
               previews={testPreviews1} setPreviews={setTestPreviews1} 
               dragActive={dragActiveV1} setDragActive={setDragActiveV1} inputRef={inputRefV1}
               disabled={autoSplit}
             />
             <UploadCard 
               title="Object B (Test)" folder={testFolder2} setFolder={setTestFolder2} 
               previews={testPreviews2} setPreviews={setTestPreviews2} 
               dragActive={dragActiveV2} setDragActive={setDragActiveV2} inputRef={inputRefV2}
               disabled={autoSplit}
             />
          </div>
        </div>

        <div className="trainer-footer">
          <div className="status-pill">Status: <span style={{color: status === 'Idle' ? '#9ca3af' : '#4ade80'}}>{status}</span></div>
          <button className="cta-button-large" onClick={handleStartTraining} disabled={status !== 'Idle' && !status.includes('Error')}>
            {status === 'Idle' || status.includes('Error') ? 'Start Training Session' : 'Processing...'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModelTrainer;