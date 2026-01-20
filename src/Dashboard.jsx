import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, Loader2, Box } from 'lucide-react';
import { useAuth, supabase } from './Auth';

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  // The base URL provided for checking model existence
  const STORAGE_BASE_URL = "https://zvdfcnffqjiukibnrumg.supabase.co/storage/v1/object/public/images-bucket/models/";

  useEffect(() => {
    if (user) {
      fetchProjects();
    }
  }, [user]);

  const checkProjectStatus = async (filename) => {
    try {
      // We use method: 'HEAD' to check existence without downloading the large file
      const response = await fetch(`${STORAGE_BASE_URL}${filename}`, { method: 'HEAD' });
      return response.ok ? 'Training Complete' : 'Training in Progress';
    } catch (error) {
      return 'Status Unknown';
    }
  };

  const fetchProjects = async () => {
    try {
      // 1. Get the list of projects from the DB
      const { data, error } = await supabase
        .from('user_data')
        .select('data_content')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // Ignore "no rows" error

      const projectFiles = data?.data_content?.projects || [];

      // 2. Check status for all projects in parallel
      const projectDataPromises = projectFiles.map(async (fileName) => {
        const status = await checkProjectStatus(fileName);
        return {
          id: fileName, // Using filename as ID for now
          name: fileName,
          status: status,
          downloadUrl: `${STORAGE_BASE_URL}${fileName}`
        };
      });

      const resolvedProjects = await Promise.all(projectDataPromises);
      
      // Reverse to show newest first
      setProjects(resolvedProjects.reverse());
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container">
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
      </div>
    </div>
  );
};

export default Dashboard;