import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
<<<<<<< HEAD
import { ArrowLeft, CheckCircle, Loader2, Box, Play, Download } from 'lucide-react';
=======
import { ArrowLeft, CheckCircle, Loader2, Box } from 'lucide-react';
>>>>>>> 3f7ddce (Page updates and resnet usability extended)
import { useAuth, supabase } from './Auth';

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

<<<<<<< HEAD
=======
  // The base URL provided for checking model existence
>>>>>>> 3f7ddce (Page updates and resnet usability extended)
  const STORAGE_BASE_URL = "https://zvdfcnffqjiukibnrumg.supabase.co/storage/v1/object/public/images-bucket/models/";

  useEffect(() => {
    if (user) {
      fetchProjects();
    }
  }, [user]);

  const checkProjectStatus = async (filename) => {
    try {
<<<<<<< HEAD
      const response = await fetch(`${STORAGE_BASE_URL}${filename}`, { method: 'HEAD' });
      return response.ok ? 'Complete' : 'Training';
    } catch (error) {
      return 'Unknown';
=======
      // We use method: 'HEAD' to check existence without downloading the large file
      const response = await fetch(`${STORAGE_BASE_URL}${filename}`, { method: 'HEAD' });
      return response.ok ? 'Training Complete' : 'Training in Progress';
    } catch (error) {
      return 'Status Unknown';
>>>>>>> 3f7ddce (Page updates and resnet usability extended)
    }
  };

  const fetchProjects = async () => {
    try {
<<<<<<< HEAD
=======
      // 1. Get the list of projects from the DB
>>>>>>> 3f7ddce (Page updates and resnet usability extended)
      const { data, error } = await supabase
        .from('user_data')
        .select('data_content')
        .eq('user_id', user.id)
        .single();

<<<<<<< HEAD
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
=======
      if (error && error.code !== 'PGRST116') throw error; // Ignore "no rows" error

      const projectFiles = data?.data_content?.projects || [];

      // 2. Check status for all projects in parallel
      const projectDataPromises = projectFiles.map(async (fileName) => {
        const status = await checkProjectStatus(fileName);
        return {
          id: fileName, // Using filename as ID for now
          name: fileName,
>>>>>>> 3f7ddce (Page updates and resnet usability extended)
          status: status,
          downloadUrl: `${STORAGE_BASE_URL}${fileName}`
        };
      });

      const resolvedProjects = await Promise.all(projectDataPromises);
<<<<<<< HEAD
=======
      
      // Reverse to show newest first
>>>>>>> 3f7ddce (Page updates and resnet usability extended)
      setProjects(resolvedProjects.reverse());
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container">
<<<<<<< HEAD
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
=======
      <div className="overlay">
        {/* Header */}
        <div style={{ padding: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button onClick={() => navigate('/')} className="btn-back">
            <ArrowLeft size={20} /> Back to Home
          </button>
          <h2 style={{ color: 'white', margin: 0 }}>My Projects</h2>
        </div>

        {/* Content */}
        <div className="dashboard-container" style={{ maxWidth: '1000px', margin: '0 auto', padding: '0 2rem' }}>
          
          {loading ? (
            <div style={{ color: 'white', textAlign: 'center', marginTop: '4rem' }}>Loading projects...</div>
          ) : projects.length === 0 ? (
            <div className="glass-card" style={{ textAlign: 'center', padding: '4rem' }}>
              <Box size={48} style={{ opacity: 0.5, marginBottom: '1rem' }} />
              <h3>No projects found</h3>
              <p>Start training a model to see it here.</p>
              <button className="btn-primary" onClick={() => navigate('/')} style={{ marginTop: '1rem' }}>
                Create New Model
              </button>
            </div>
          ) : (
            <div className="projects-grid" style={{ display: 'grid', gap: '1rem' }}>
              {projects.map((project) => (
                <div key={project.id} className="glass-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.5rem' }}>
                  
                  <div className="project-info">
                    <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem' }}>{project.name}</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', color: '#ccc' }}>
                      {project.status === 'Training Complete' ? (
                        <CheckCircle size={16} color="#4ade80" />
                      ) : (
                        <Loader2 size={16} className="spin" />
                      )}
                      <span style={{ 
                        color: project.status === 'Training Complete' ? '#4ade80' : '#fbbf24' 
                      }}>
                        {project.status}
                      </span>
                    </div>
                  </div>

                  {project.status === 'Training Complete' && (
                    <a 
                      href={project.downloadUrl} 
                      className="btn-pill-white" 
                      style={{ textDecoration: 'none', fontSize: '0.9rem' }}
                      download
                    >
                      Download Model
                    </a>
                  )}
                  
                </div>
              ))}
            </div>
          )}
        </div>
>>>>>>> 3f7ddce (Page updates and resnet usability extended)
      </div>
    </div>
  );
};

export default Dashboard;