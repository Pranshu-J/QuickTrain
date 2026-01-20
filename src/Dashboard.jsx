import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, Loader2, Box, Play, Download } from 'lucide-react';
import { useAuth, supabase } from './Auth';

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  const STORAGE_BASE_URL = "https://zvdfcnffqjiukibnrumg.supabase.co/storage/v1/object/public/images-bucket/models/";

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
        
        // Parsing Logic
        const baseName = fileName.split('_')[0]; 
        const parsedName = baseName.charAt(0).toUpperCase() + baseName.slice(1).replace('net', 'Net');

        return {
          id: fileName.split('.')[0], 
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
    <div className="app-container">
      <div className="navbar">
        <button 
          onClick={() => navigate('/')} 
          className="btn-back" 
          style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'Poppins' }}
        >
          <ArrowLeft size={20} /> Back to Home
        </button>
        <h2 className="logo" style={{ fontSize: '1.5rem' }}>My Projects</h2>
      </div>

      <div className="dashboard-content">
        {loading ? (
          <div className="loading-state">
            <Loader2 className="spin" size={40} />
            <p>Loading models...</p>
          </div>
        ) : projects.length === 0 ? (
          <div className="empty-state">
            <Box size={60} strokeWidth={1} />
            <h3 style={{ marginTop: '1rem' }}>No models trained yet</h3>
            <button className="btn-pill-white" onClick={() => navigate('/')} style={{ marginTop: '1.5rem' }}>
              Train Your First Model
            </button>
          </div>
        ) : (
          <div className="table-container">
            <table className="modern-table">
              <thead>
                <tr>
                  <th>Model Name</th>
                  <th>Project ID</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((project) => (
                  <tr key={project.id}>
                    <td className="model-name-cell">{project.name}</td>
                    <td className="id-cell"><code>{project.id}</code></td>
                    <td>
                      <div className={`status-tag ${project.status.toLowerCase()}`}>
                        {project.status === 'Complete' ? <CheckCircle size={14} /> : <Loader2 size={14} className="spin" />}
                        {project.status}
                      </div>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="action-group">
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
                              className="action-btn use-btn"
                              title="Use Model"
                            >
                              <Play size={16} fill="currentColor" /> Use Model
                            </button>
                            <a href={project.downloadUrl} className="action-btn download-btn" download={project.fullName} title="Download Weights">
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
        )}
      </div>
    </div>
  );
};

export default Dashboard;