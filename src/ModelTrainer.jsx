import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import JSZip from 'jszip';
import { ArrowLeft, UploadCloud, Folder, CheckCircle, ToggleLeft, ToggleRight, AlertCircle, Sparkles } from 'lucide-react';
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
  const trainBRef = useRef(null);

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

  // Toggle handler with FLIP animation
  const handleToggleAutoSplit = () => {
    if (!autoSplit) {
      const node = trainBRef.current;
      if (node) {
        const firstRect = node.getBoundingClientRect();
        setAutoSplit(true);
        requestAnimationFrame(() => {
          const lastRect = node.getBoundingClientRect();
          const deltaX = firstRect.left - lastRect.left;
          const deltaY = firstRect.top - lastRect.top;
          node.style.transition = 'none';
          node.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
          // eslint-disable-next-line no-unused-expressions
          node.getBoundingClientRect(); // force reflow
          node.style.transition = 'transform 400ms ease';
          node.style.transform = 'translate(0, 0)';
          const cleanup = () => {
            node.style.transition = '';
            node.style.transform = '';
            node.removeEventListener('transitionend', cleanup);
          };
          node.addEventListener('transitionend', cleanup);
        });
        return;
      }
    }
    setAutoSplit(!autoSplit);
  };

  // --- Upload Logic (Same as original) ---
  const zipAndUpload = async (files, fileName) => {
    if (!files || files.length === 0) return null;
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
      
      const zipNameT1 = `${modelId}-trainA-${user.id}-${instanceId}.zip`;
      const zipNameT2 = `${modelId}-trainB-${user.id}-${instanceId}.zip`;
      const zipNameV1 = !autoSplit ? `${modelId}-testA-${user.id}-${instanceId}.zip` : null;
      const zipNameV2 = !autoSplit ? `${modelId}-testB-${user.id}-${instanceId}.zip` : null;

      setStatus('Compressing & Uploading...');
      
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

  // Reusable Upload Card
  const UploadCard = React.forwardRef(({ title, folder, setFolder, setPreviews, previews, dragActive, setDragActive, inputRef, disabled, style }, ref) => (
    <div 
      ref={ref} 
      className={`
        flex flex-col rounded-3xl p-6 transition-all duration-300 border border-neutral-800 bg-neutral-900
        ${disabled ? 'opacity-30 pointer-events-none grayscale' : 'hover:border-neutral-700'}
        ${dragActive ? 'scale-[0.99] border-white/50' : ''}
      `}
      style={style}
    >
      <div className="flex items-center gap-3 mb-6 text-white font-medium text-lg">
        <div className="p-2 bg-neutral-800 rounded-full">
          <Folder size={18} className="text-neutral-400"/> 
        </div>
        {title}
      </div>
      
      {/* Drop Zone */}
      <div 
        className={`
          flex-1 min-h-[200px] border-2 border-dashed rounded-2xl flex flex-col justify-center items-center cursor-pointer transition-all duration-300 relative overflow-hidden group
          ${dragActive 
            ? 'border-white bg-neutral-800' 
            : 'border-neutral-700 bg-black/20 hover:border-neutral-500 hover:bg-neutral-800/50'}
        `}
        onDragEnter={(e) => handleDrag(e, setDragActive)}
        onDragLeave={(e) => handleDrag(e, setDragActive)}
        onDragOver={(e) => handleDrag(e, setDragActive)}
        onDrop={(e) => handleDrop(e, setDragActive, setFolder, setPreviews)}
        onClick={() => inputRef.current.click()}
      >
        <div className="text-center pointer-events-none z-10 p-4">
          <UploadCloud size={32} className={`mb-4 mx-auto transition-transform duration-300 ${dragActive ? 'scale-110 text-white' : 'text-neutral-500 group-hover:text-white'}`} />
          <div className="font-medium text-neutral-300 group-hover:text-white transition-colors">
            {folder.length > 0 ? 'Add more files' : 'Drop folder here'}
          </div>
          <p className="text-xs text-neutral-500 mt-2">or click to browse</p>
        </div>
        <input ref={inputRef} type="file" multiple webkitdirectory="true" onChange={(e) => handleFiles(e.target.files, setFolder, setPreviews)} className="hidden" />
      </div>

      {/* Previews */}
      {folder.length > 0 && (
        <div className="mt-6 animate-fade-in">
          <div className="flex justify-between text-xs text-neutral-400 mb-3 px-1 uppercase tracking-wide font-semibold">
            <span className="flex items-center gap-1 text-green-400"><CheckCircle size={12}/> {folder.length} files loaded</span>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
            {previews.map((src, i) => (
              <img key={i} src={src} className="size-16 rounded-lg object-cover border border-neutral-700 shrink-0 hover:scale-110 transition-transform hover:border-white" alt="" />
            ))}
          </div>
        </div>
      )}
    </div>
  ));

  return (
    <div className="min-h-screen w-full bg-black text-white font-sans flex flex-col items-center">
      
      {/* Back Button */}
      <div className="w-full max-w-[1400px] p-6 pt-8">
        <button onClick={() => navigate('/')} className="flex items-center gap-2 text-neutral-400 hover:text-white transition-colors group">
          <div className="rounded-full bg-neutral-900 p-2 group-hover:bg-neutral-800 transition-colors">
            <ArrowLeft size={20} />
          </div>
          <span className="font-medium">Back to Home</span>
        </button>
      </div>

      <div className="w-full max-w-[1400px] p-6">
        
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-neutral-800 bg-neutral-900/50 text-neutral-400 text-xs font-semibold uppercase tracking-wider mb-4">
            <Sparkles size={12} className="text-yellow-400" />
            Classification Training
          </div>
          <h2 className="text-5xl md:text-6xl font-bold mb-6 text-white tracking-tight">Configure Training</h2>
          
          <div 
            className="inline-flex items-center gap-4 bg-neutral-900 border border-neutral-800 p-2 pr-6 rounded-full cursor-pointer select-none hover:border-neutral-700 transition-all" 
            onClick={handleToggleAutoSplit}
          >
            <div className={`p-2 rounded-full transition-colors ${autoSplit ? 'text-green-400 bg-green-400/10' : 'text-neutral-500 bg-neutral-800'}`}>
              {autoSplit 
                ? <ToggleRight size={28} className="transition-transform" /> 
                : <ToggleLeft size={28} className="transition-transform" />
              }
            </div>
            <div className="text-left">
              <span className={`block font-semibold text-sm ${autoSplit ? 'text-white' : 'text-neutral-400'}`}>
                {autoSplit ? "Auto-split Enabled" : "Manual Split"}
              </span>
              <span className="text-xs text-neutral-500">
                {autoSplit ? "80% Train / 20% Test" : "Upload test data manually"}
              </span>
            </div>
          </div>
        </div>

        {/* Upload Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          
          {/* Train A: Always Top Left */}
          <div className="col-start-1 row-start-1 flex flex-col gap-4">
             <h3 className="text-white font-bold text-xl ml-2 flex items-center gap-2">
               <span className="flex items-center justify-center size-6 rounded-full bg-neutral-800 text-xs">1</span>
               Training Data
             </h3>
             <UploadCard 
               title="Object A (Train)" folder={trainFolder1} setFolder={setTrainFolder1} 
               previews={trainPreviews1} setPreviews={setTrainPreviews1} 
               dragActive={dragActiveT1} setDragActive={setDragActiveT1} inputRef={inputRefT1} 
               style={{ flex: 1 }}
             />
          </div>

          {/* Train B: Shifts position based on mode */}
          <div className={`${autoSplit ? 'col-start-2 row-start-1' : 'col-start-1 row-start-2'} flex flex-col gap-4`}>
             {autoSplit && (
               <h3 className="text-white font-bold text-xl ml-2 flex items-center gap-2">
                 <span className="flex items-center justify-center size-6 rounded-full bg-neutral-800 text-xs">2</span>
                 Training Data
               </h3>
             )}
             
             <UploadCard 
               ref={trainBRef}
               title="Object B (Train)" folder={trainFolder2} setFolder={setTrainFolder2} 
               previews={trainPreviews2} setPreviews={setTrainPreviews2} 
               dragActive={dragActiveT2} setDragActive={setDragActiveT2} inputRef={inputRefT2} 
               style={{ flex: 1 }}
             />
          </div>

          {/* Testing Data: Only in Manual Mode */}
          {!autoSplit && (
            <>
              <div className="col-start-2 row-start-1 flex flex-col gap-4">
                <h3 className="text-white font-bold text-xl ml-2 flex items-center gap-2">
                  <span className="flex items-center justify-center size-6 rounded-full bg-neutral-800 text-xs">3</span>
                  Testing Data
                </h3>
                <UploadCard 
                  title="Object A (Test)" folder={testFolder1} setFolder={setTestFolder1} 
                  previews={testPreviews1} setPreviews={setTestPreviews1} 
                  dragActive={dragActiveV1} setDragActive={setDragActiveV1} inputRef={inputRefV1}
                  style={{ flex: 1 }}
                />
              </div>
              <div className="col-start-2 row-start-2 flex flex-col gap-4">
                <UploadCard 
                  title="Object B (Test)" folder={testFolder2} setFolder={setTestFolder2} 
                  previews={testPreviews2} setPreviews={setTestPreviews2} 
                  dragActive={dragActiveV2} setDragActive={setDragActiveV2} inputRef={inputRefV2}
                  style={{ flex: 1 }}
                />
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black via-black to-transparent pointer-events-none flex justify-center pb-12">
          <div className="pointer-events-auto flex flex-col items-center gap-4">
            <div className={`px-4 py-1.5 rounded-full border text-xs font-mono font-medium backdrop-blur-md
              ${status === 'Idle' 
                ? 'border-neutral-800 bg-neutral-900/80 text-neutral-500' 
                : status.includes('Error') 
                  ? 'border-red-900/50 bg-red-950/50 text-red-400'
                  : 'border-green-900/50 bg-green-950/50 text-green-400'
              }`}>
              STATUS: {status.toUpperCase()}
            </div>
            
            <button 
              className={`
                px-10 py-4 rounded-full font-bold text-lg transition-all min-w-[240px] shadow-2xl hover:scale-105 active:scale-95
                ${status === 'Idle' || status.includes('Error') 
                  ? 'bg-white text-black hover:bg-neutral-200 cursor-pointer shadow-white/10' 
                  : 'bg-neutral-800 text-neutral-500 cursor-wait'}
              `}
              onClick={handleStartTraining} 
              disabled={status !== 'Idle' && !status.includes('Error')}
            >
              {status === 'Idle' || status.includes('Error') ? 'Start Training Session' : 'Processing...'}
            </button>
          </div>
        </div>

        {/* Spacer for fixed footer */}
        <div className="h-32"></div>
      </div>
    </div>
  );
};

export default ModelTrainer;