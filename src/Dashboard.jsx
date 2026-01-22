import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, Loader2, Box, Play, Download, Search } from 'lucide-react';
import { useAuth, supabase } from './Auth';

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  const STORAGE_BASE_URL = "https://zvdfcnffqjiukibnrumg.supabase.co/storage/v1/object/public/images-bucket/models/";

  // Model id prefix to model name mapping
  const MODEL_NAME_MAP = {
    resnet18: "ResNet-18",
    tinybert: "TinyBERT",
    // Add more mappings here as needed
  };

  useEffect(() => {
    if (user) {
      fetchProjects();
    }
  }, [user]);

  const checkProjectStatus = async (filename) => {
    try {
      const response = await fetch(`${STORAGE_BASE_URL}${filename}`, { method: 'HEAD' });
      return response.ok ? 'Complete' : 'Training';
    } catch (error) {
      return 'Unknown';
    }
  };

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('user_data')
        .select('data_content')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      const projectFiles = data?.data_content?.projects || [];

      const projectDataPromises = projectFiles.map(async (fileName) => {
        const status = await checkProjectStatus(fileName);
        const id = fileName.split('.')[0];
        // Use dictionary for model name mapping
        let modelName = id.split('_')[0].toLowerCase();
        let parsedName = MODEL_NAME_MAP[modelName];
        if (!parsedName) {
          // Fallback to previous logic if not found in map
          parsedName = modelName.charAt(0).toUpperCase() + modelName.slice(1).replace('net', 'Net');
        }
        return {
          id: id,
          name: parsedName,
          fullName: fileName,
          status: status,
          downloadUrl: `${STORAGE_BASE_URL}${fileName}`
        };
      });

      const resolvedProjects = await Promise.all(projectDataPromises);
      setProjects(resolvedProjects.reverse());
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-black text-white font-sans selection:bg-neutral-700">
      
      {/* Navbar Area */}
      <div className="mx-auto max-w-7xl px-6 pt-8 pb-12">
        <div className="flex items-center justify-between">
          <button 
            onClick={() => navigate('/')} 
            className="group flex items-center gap-2 text-neutral-400 hover:text-white transition-colors"
          >
            <div className="rounded-full bg-neutral-900 p-2 group-hover:bg-neutral-800 transition-colors">
              <ArrowLeft size={20} />
            </div>
            <span className="font-medium">Back to Home</span>
          </button>
          <h2 className="text-2xl font-bold tracking-tight">My Projects</h2>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 text-neutral-500">
            <Loader2 className="animate-spin mb-4" size={48} />
            <p className="text-lg font-medium">Loading models...</p>
          </div>
        ) : projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-3xl bg-neutral-900/50 border border-neutral-800 py-32 text-center">
            <div className="rounded-full bg-neutral-800 p-6 mb-6">
              <Box size={48} className="text-neutral-400" strokeWidth={1.5} />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">No models trained yet</h3>
            <p className="text-neutral-400 mb-8 max-w-md">Start your journey by training your first custom AI model using our secure infrastructure.</p>
            <button 
              className="bg-white text-black px-8 py-3 rounded-full font-bold hover:bg-neutral-200 transition-all hover:scale-105 active:scale-95" 
              onClick={() => navigate('/')}
            >
              Train Your First Model
            </button>
          </div>
        ) : (
          <div className="rounded-3xl border border-neutral-800 bg-neutral-900/30 overflow-hidden backdrop-blur-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-neutral-800 bg-neutral-900/80 text-sm font-medium text-neutral-400">
                    <th className="px-8 py-5 font-semibold">Model Name</th>
                    <th className="px-8 py-5 font-semibold">Project ID</th>
                    <th className="px-8 py-5 font-semibold">Status</th>
                    <th className="px-8 py-5 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/50 text-sm">
                  {projects.map((project) => (
                    <tr key={project.id} className="group hover:bg-neutral-900/50 transition-colors">
                      <td className="px-8 py-5 font-medium text-white text-base">
                        {project.name}
                      </td>
                      <td className="px-8 py-5 font-mono text-neutral-500">
                        {project.id.substring(0, 12)}...
                      </td>
                      <td className="px-8 py-5">
                        <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide
                          ${project.status === 'Complete' 
                            ? 'bg-green-950/30 text-green-400 border border-green-900/50' 
                            : 'bg-yellow-950/30 text-yellow-500 border border-yellow-900/50'
                          }`}
                        >
                          {project.status === 'Complete' ? <CheckCircle size={12} /> : <Loader2 size={12} className="animate-spin" />}
                          {project.status}
                        </div>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <div className="flex items-center justify-end gap-3 opacity-100 sm:opacity-60 group-hover:opacity-100 transition-opacity">
                          {project.status === 'Complete' && (
                            <>
                              <button 
                                onClick={() => navigate('/model-usage', { 
                                  state: { 
                                    modelId: project.id, 
                                    modelType: project.name,
                                    fileName: project.fullName,
                                    downloadUrl: project.downloadUrl
                                  } 
                                })}
                                className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-bold text-black hover:bg-neutral-200 transition-colors"
                              >
                                <Play size={14} fill="currentColor" /> Use Model
                              </button>
                              <a 
                                href={project.downloadUrl} 
                                className="flex items-center justify-center rounded-full bg-neutral-800 p-2 text-white hover:bg-neutral-700 transition-colors" 
                                download={project.fullName} 
                                title="Download Weights"
                              >
                                <Download size={16} />
                              </a>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;