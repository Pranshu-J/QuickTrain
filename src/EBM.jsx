import React, { useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, UploadCloud, FileText, CheckCircle, Info, Zap } from 'lucide-react';
import { useAuth, supabase } from './Auth';

const EBMTrainer = () => {
    // Helper to register project in user_data
    const updateUserData = async (fullProjectName) => {
      if (!user) throw new Error("User not authenticated");
      const { data: existingRow } = await supabase.from('user_data').select('data_content').eq('user_id', user.id).single();
      const currentProjects = existingRow?.data_content?.projects || [];
      await supabase.from('user_data').upsert({ 
          user_id: user.id,
          data_content: { projects: [...currentProjects, fullProjectName] } 
      });
    };
  const navigate = useNavigate();
  // We use modelId here to keep it consistent with your other components
  const { modelId } = useParams(); 
  const { user } = useAuth();
  
  // Define a fallback name so it doesn't result in "undefined"
  const projectIdentifier = modelId || 'ebm-model';

  // Set model type to EBM
  const [modelType, setModelType] = useState('ebm'); 
  const [trainFile, setTrainFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [status, setStatus] = useState('Idle');
  const inputRef = useRef(null);

  const validateFile = (file) => {
    const validTypes = ['application/json', 'text/csv', 'application/vnd.ms-excel']; 
    const validExts = ['.json', '.csv'];
    const fileName = file.name.toLowerCase();
    return validTypes.includes(file.type) || validExts.some(ext => fileName.endsWith(ext));
  };

  const handleFileSelection = (file) => {
    if (!file) return;
    if (!validateFile(file)) {
      alert("Invalid file type. Please upload a .json or .csv file.");
      return;
    }
    setTrainFile(file);
  };

  const handleDrag = (e) => {
    e.preventDefault(); e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault(); e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelection(e.dataTransfer.files[0]);
    }
  };

  const handleStartTraining = async () => {
    if (!trainFile) {
      alert("Please upload a dataset.");
      return;
    }

    try {
      setStatus('Initializing...');
      const instanceId = Math.random().toString(36).substring(2, 10);
      const extTrain = trainFile.name.split('.').pop();
      // Naming convention adapted for EBM
      const trainName = `${projectIdentifier}-train-${user.id}-${instanceId}.${extTrain}`;

      setStatus('Uploading Dataset...');
      const { error } = await supabase.storage
        .from('images-bucket')
        .upload(trainName, trainFile, { upsert: true });
      if (error) throw error;

      // Register project in user_data
      setStatus('Registering Project...');
      const modelOutputName = `${projectIdentifier}_${instanceId}.zip`;
      await updateUserData(modelOutputName);

      setStatus('Starting Remote Job...');
      const response = await fetch('https://quicktrain.onrender.com/trigger-training', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          trainFile: trainName,
          trainFile2: null,
          testFile1: null,
          testFile2: null,
          useAutoSplit: true,
          jobId: instanceId,
          modelType: modelType, // Sends 'ebm'
        }),
      });
      if (!response.ok) throw new Error('Training trigger failed');

      setStatus('Job Started Successfully!');
      setTimeout(() => navigate('/dashboard'), 2000);
    } catch (error) {
      console.error(error);
      setStatus(`Error: ${error.message}`);
    }
  };

  return (
    <div className="min-h-screen w-full bg-black text-white font-sans flex flex-col items-center">
      <div className="w-full max-w-[800px] p-6 pt-8">
        <button onClick={() => navigate('/')} className="flex items-center gap-2 text-neutral-400 hover:text-white transition-colors group">
          <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform"/>
          <span className="font-medium">Back to Projects</span>
        </button>
      </div>

      <div className="w-full max-w-[800px] p-6">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-neutral-800 bg-neutral-900/50 text-amber-400 text-xs font-semibold uppercase tracking-wider mb-4">
            <Zap size={12} />
            Energy Based Model
          </div>
          <h2 className="text-4xl md:text-5xl font-bold mb-4 text-white tracking-tight">EBM Fine-Tuning</h2>
          <p className="text-neutral-400">Train an Energy-Based Model for density estimation or generative classification tasks.</p>
        </div>

        <div className="bg-amber-900/10 border border-amber-500/20 rounded-xl p-4 mb-8 flex gap-3 text-sm text-amber-200">
           <Info className="shrink-0 text-amber-400" size={20} />
           <div>
             <strong>Format Requirement:</strong> Your file (CSV or JSON) must contain input data:
             <ul className="list-disc list-inside mt-1 ml-1 text-amber-300/80">
               <li><code>text</code>: The input data sequence</li>
               <li><code>label</code>: The class or scalar energy target</li>
             </ul>
           </div>
        </div>

        <div className="mb-6">
           <label className="text-sm font-semibold text-neutral-400 uppercase tracking-wide mb-2 block">Selected Model Architecture</label>
           <div className="w-full bg-neutral-900 text-white border border-neutral-800 rounded-lg px-4 py-3 opacity-80 cursor-not-allowed flex justify-between items-center">
             <span>Stochastic Deep Energy (Langevin Dynamics)</span>
             <span className="text-xs bg-neutral-800 px-2 py-1 rounded text-neutral-400">Fixed</span>
           </div>
        </div>

        <div 
          className={`
            flex flex-col rounded-3xl p-8 transition-all duration-300 border border-neutral-800 bg-neutral-900
            hover:border-neutral-700 ${dragActive ? 'scale-[0.99] border-amber-500/50' : ''}
          `}
        >
          <div className="flex items-center gap-3 mb-6 text-white font-medium text-lg">
            <div className="p-2 bg-neutral-800 rounded-full">
              <FileText size={18} className="text-amber-400"/> 
            </div>
            Training Dataset
          </div>
          
          <div 
            className={`
              min-h-[200px] border-2 border-dashed rounded-2xl flex flex-col justify-center items-center cursor-pointer transition-all duration-300 relative overflow-hidden group
              ${dragActive 
                ? 'border-amber-500 bg-neutral-800' 
                : trainFile 
                  ? 'border-green-500/50 bg-green-900/10'
                  : 'border-neutral-700 bg-black/20 hover:border-neutral-500 hover:bg-neutral-800/50'}
            `}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => inputRef.current.click()}
          >
            <div className="text-center pointer-events-none z-10 p-4">
              {trainFile ? (
                 <div className="animate-fade-in">
                   <CheckCircle size={48} className="mb-3 mx-auto text-green-400" />
                   <div className="font-mono text-base text-green-300 truncate max-w-[250px] mx-auto">{trainFile.name}</div>
                   <div className="text-sm text-neutral-500 mt-1">{(trainFile.size / 1024).toFixed(2)} KB</div>
                 </div>
              ) : (
                 <>
                   <UploadCloud size={40} className={`mb-4 mx-auto transition-transform duration-300 ${dragActive ? 'scale-110 text-amber-400' : 'text-neutral-500 group-hover:text-white'}`} />
                   <div className="font-medium text-lg text-neutral-300 group-hover:text-white transition-colors">
                     Drop CSV or JSON here
                   </div>
                   <div className="text-sm text-neutral-500 mt-2">Click to browse files</div>
                 </>
              )}
            </div>
            <input ref={inputRef} type="file" accept=".csv,.json" onChange={(e) => handleFileSelection(e.target.files[0])} className="hidden" />
          </div>

          {trainFile && (
            <button 
              onClick={(e) => { e.stopPropagation(); setTrainFile(null); }}
              className="mt-4 text-sm text-red-400 hover:text-red-300 w-full text-center underline decoration-red-900/50"
            >
              Remove file
            </button>
          )}
        </div>

        <div className="mt-10 flex justify-center">
           <button 
             className={`
               px-12 py-4 rounded-full font-bold text-lg transition-all min-w-[280px] shadow-2xl
               ${status === 'Idle' || status.includes('Error') 
                 ? 'bg-white text-black hover:bg-neutral-200 hover:scale-105 active:scale-95' 
                 : 'bg-neutral-800 text-neutral-500 cursor-wait'}
             `}
             onClick={handleStartTraining} 
             disabled={status !== 'Idle' && !status.includes('Error')}
           >
             {status === 'Idle' || status.includes('Error') ? 'Start Training Session' : status}
           </button>
        </div>
      </div>
    </div>
  );
};

export default EBMTrainer;