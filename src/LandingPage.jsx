import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, ArrowRight, X } from 'lucide-react';
import { useAuth, signInWithGoogle, signOut } from './Auth';
import Navbar from './Navbar';
// 1. Import the image at the top of the file using forward slashes
import backgroundImage from './assets/background1.webp';

// --- Components ---

const ModelCard = ({ id, title, description, onSelect }) => {
  const cardRef = useRef(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    setPosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onClick={() => onSelect(id)}
      className="group relative bg-neutral-900 border border-white/10 rounded-[32px] p-8 md:p-12 overflow-hidden cursor-pointer transition-all duration-300 hover:scale-[1.01] hover:bg-neutral-800"
    >
      {/* Spotlight Effect Layer */}
      <div
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{
          background: `radial-gradient(600px circle at ${position.x}px ${position.y}px, rgba(255, 255, 255, 0.06), transparent 40%)`,
        }}
      />

      <div className="relative z-10 flex flex-col h-full justify-between">
        <div>
          <h3 className="text-3xl font-semibold mb-4 text-white tracking-tight">
            {title}
          </h3>
          <p className="text-neutral-400 text-base leading-relaxed">
            {description}
          </p>
        </div>
        <div className="mt-8 flex items-center text-white/50 group-hover:text-white transition-colors">
          <span className="text-sm font-medium mr-2">Tune Model</span>
          <ArrowRight size={20} />
        </div>
      </div>
    </div>
  );
};

const LandingPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleScrollToModels = () => {
    const el = document.getElementById('model-selection');
    if (!el) return;
    
    const navHeight = 80; 
    const targetTop = el.getBoundingClientRect().top + window.pageYOffset - navHeight - 20;
    const duration = 1000;
    const start = window.pageYOffset;
    const distance = targetTop - start;
    let startTime = null;

    const animation = (currentTime) => {
      if (startTime === null) startTime = currentTime;
      const timeElapsed = currentTime - startTime;
      const progress = Math.min(timeElapsed / duration, 1);
      const ease = progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2;
      window.scrollTo(0, start + distance * ease);
      if (progress < 1) requestAnimationFrame(animation);
    };

    requestAnimationFrame(animation);
  };

  const handleModelSelect = (modelId) => {
    if (!user) {
      setIsModalOpen(true);
      return;
    }
    if (modelId === 'tinybert') {
      navigate('/tinybert');
    } else if (modelId === 'ebm') {
      navigate('/ebm');
    } else {
      navigate(`/train/${modelId}`);
    }
  };

  // Button Styles matched to Weights.html
  const btnSecondary = "text-white font-medium text-sm cursor-pointer hover:text-white/80 transition-colors";

  return (
    <div className="flex flex-col w-full min-h-screen bg-black font-sans text-white selection:bg-white/20">
      
      {/* --- Modal Overlay --- */}
      {isModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]" 
          onClick={() => setIsModalOpen(false)}
        >
          <div 
            className="relative w-[90%] max-w-[450px] p-12 rounded-[32px] text-center bg-[#1c1c1c] border border-white/10 shadow-2xl" 
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              className="absolute top-5 right-5 text-neutral-400 hover:text-white transition-colors" 
              onClick={() => setIsModalOpen(false)}
            >
              <X size={24}/>
            </button>
            <div className="mb-10">
              <h2 className="font-serif text-4xl mb-3 text-white">Welcome</h2>
              <p className="text-neutral-400">Join our community to start creating.</p>
            </div>
            <button 
              className="w-full py-4 rounded-full bg-white text-black font-bold text-lg hover:opacity-90 transition-opacity" 
              onClick={signInWithGoogle}
            >
              Continue with Google
            </button>
          </div>  
        </div>
      )}

      {/* --- Navbar --- */}
      <Navbar user={user} navigate={navigate} signOut={signOut} setIsModalOpen={setIsModalOpen} btnSecondary={btnSecondary} />

      {/* --- Hero Section (Matched to Weights.html structure) --- */}
      <div className="w-full p-2 h-screen">
        <header className="relative w-full h-full rounded-2xl overflow-hidden bg-neutral-900">
          {/* Background Image & Overlays */}
          <div className="absolute inset-0 z-0">
            <img 
              alt="Background" 
              className="h-full w-full object-cover opacity-80" 
              // 2. Use the imported variable instead of a string path
              src={backgroundImage} 
            />
            <div className="absolute inset-0 bg-black opacity-20"></div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30"></div>
          </div>
          
          {/* Content */}
          <div className="relative z-10 flex flex-col items-center justify-center h-full px-4 text-center pb-12">
            <h1 className="max-w-4xl font-serif font-bold text-white text-6xl md:text-7xl mb-8 tracking-tight drop-shadow-lg">
              The home of <br/> AI creativity.
            </h1>
            <button 
              className="bg-white text-black text-lg font-bold py-4 px-8 rounded-full hover:opacity-70 transition-opacity"
              onClick={handleScrollToModels}
            >
              Start Creating
            </button>
          </div>
        </header>
      </div>

      {/* --- Models Section --- */}
      <section id="model-selection" className="w-full max-w-7xl py-24 px-6 mx-auto">
        <div className="mb-16">
          <h2 className="font-serif text-5xl text-white mb-4">
            Choose a Model
          </h2>
          <p className="text-neutral-400 text-lg max-w-xl">
            Select a pre-trained architecture to begin your training journey.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <ModelCard 
            id="resnet18"
            title="ResNet 18"
            description="Standard image classification tasks. Fast, efficient, and reliable for small to medium datasets."
            onSelect={handleModelSelect}
          />
           <ModelCard 
            id="ebm"
            title="EBM (InterpretML)"
            description="Explainable Boosting Machine for interpretable machine learning. Gain model predictions with state-of-the-art interpretability."
            onSelect={handleModelSelect}
          />
           <ModelCard 
            id="tinybert"
            title="TinyBERT"
            description="Lightweight BERT model optimized for efficient natural language processing on resource-constrained devices."
            onSelect={handleModelSelect}
          />
        </div>
      </section>

      {/* --- Footer (Matched Style) --- */}
      <footer className="w-full bg-black px-6 py-12 border-t border-white/5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2 opacity-50">
             <Box size={20} />
             <span className="font-semibold">Weights</span>
          </div>
          <p className="text-neutral-500 text-sm">
            © 2026 Weights. All rights reserved.
          </p>
        </div>
      </footer>

    </div>
  );
};

export default LandingPage;