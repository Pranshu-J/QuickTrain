import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, ArrowRight, X } from 'lucide-react';
import { useAuth, signInWithGoogle, signOut } from './Auth';

// Helper component for interactive cards
const ModelCard = ({ id, title, description, onSelect }) => {
  const cardRef = useRef(null);

  const handleMouseMove = (e) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    // Calculate mouse position relative to the card
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    cardRef.current.style.setProperty('--mouse-x', `${x}px`);
    cardRef.current.style.setProperty('--mouse-y', `${y}px`);
  };

  return (
    <div 
      className="model-card" 
      ref={cardRef} 
      onMouseMove={handleMouseMove}
      onClick={() => onSelect(id)}
    >
      <h3 className="card-title">{title}</h3>
      <p className="card-desc">{description}</p>
      <ArrowRight style={{ marginTop: '2rem', opacity: 0.4 }} />
    </div>
  );
};

const LandingPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleScrollToModels = () => {
    document.getElementById('model-selection').scrollIntoView({ behavior: 'smooth' });
  };

  const handleModelSelect = (modelId) => {
    if (!user) {
      setIsModalOpen(true);
      return;
    }
    navigate(`/train/${modelId}`);
  };

  return (
    <div className="app-container">
      {/* Modal remains the same */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="login-card" onClick={(e) => e.stopPropagation()}>
            <button className="close-btn" onClick={() => setIsModalOpen(false)}><X size={20}/></button>
            <div className="login-header">
              <h2>Welcome to weights</h2>
              <p>Join our community to start training models</p>
            </div>
            <button className="google-auth-btn" onClick={signInWithGoogle}>Continue with Google</button>
          </div>
        </div>
      )}

      <nav className="navbar">
        <div className="logo"><Box strokeWidth={2.5} size={28} /> weights</div>
        <div className="auth-buttons">
          {user ? (
            <div className="user-profile">
              <button className="btn-pill-outline" onClick={() => navigate('/dashboard')} style={{ marginRight: '15px' }}>Dashboard</button>
              <button className="btn-pill-white" onClick={signOut}>Log out</button>
            </div>
          ) : (
            <button className="btn-pill-white" onClick={() => setIsModalOpen(true)}>Log in</button>
          )}
        </div>
      </nav>

      <div className="hero-card-wrapper">
        <header className="hero-visual-card">
          <div className="hero-content">
            <h1>The home of<br />AI creativity.</h1>
            <button className="cta-button-large" onClick={handleScrollToModels}>Start Creating</button>
          </div>
        </header>
      </div>

      <section id="model-selection" className="models-section">
        <h2 className="section-title">Choose a Model</h2>
        <div className="models-grid">
          <ModelCard 
            id="resnet18"
            title="ResNet 18"
            description="Standard image classification tasks. Fast, efficient, and reliable for small to medium datasets."
            onSelect={handleModelSelect}
          />
          {/* Add more <ModelCard /> components here */}
        </div>
      </section>
    </div>
  );
};

export default LandingPage;