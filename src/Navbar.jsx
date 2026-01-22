import React, { useState, useRef, useEffect } from 'react';
import { Box } from 'lucide-react'; // Assuming you are using lucide-react

const Navbar = ({ user, navigate, signOut, setIsModalOpen, btnSecondary }) => {
  // 1. State for the sliding pill
  const [sliderStyle, setSliderStyle] = useState({ left: 0, width: 0, opacity: 0 });
  
  // 2. Refs to store the DOM elements we want to measure
  const itemRefs = useRef({});

  // 3. Function to move the slider to a specific element by key
  const moveSliderTo = (key) => {
    const element = itemRefs.current[key];
    if (element) {
      setSliderStyle({
        left: element.offsetLeft,
        width: element.offsetWidth,
        opacity: 1,
      });
    }
  };

  // 4. Set default position to 'logo' on mount and window resize
  useEffect(() => {
    moveSliderTo('logo');
    
    const handleResize = () => moveSliderTo('logo');
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [user]); // Re-run if user state changes (login/logout)

  return (
    /* --- Navbar --- */
    <nav 
      className="absolute top-6 left-1/2 -translate-x-1/2 w-auto py-3 px-4 flex justify-between items-center gap-6 z-30 bg-white/10 shadow-lg rounded-full backdrop-blur-xl border border-white/10"
      onMouseLeave={() => moveSliderTo('logo')} // Return to logo on leave
    >
      {/* --- THE SLIDING PILL --- */}
      <div 
        className="absolute top-2 bottom-2 bg-white/20 rounded-full transition-all duration-300 ease-out pointer-events-none"
        style={{
          left: sliderStyle.left,
          width: sliderStyle.width,
          opacity: sliderStyle.opacity,
        }}
      />

      {/* --- Logo Section --- */}
      <div 
        ref={(el) => (itemRefs.current['logo'] = el)}
        onMouseEnter={() => moveSliderTo('logo')}
        className="flex items-center gap-2 font-bold text-xl text-white px-3 py-1 relative z-10 cursor-default"
      >
        <Box strokeWidth={3} size={24} /> <span>QuickTrain</span>
      </div>

      {/* --- Actions Section --- */}
      <div className="flex items-center">
        {/* Docs button always visible */}
        <button
          ref={(el) => (itemRefs.current['docs'] = el)}
          onMouseEnter={() => moveSliderTo('docs')}
          className={`${btnSecondary} relative z-10 px-3 py-1 rounded-full mx-2`}
          onClick={() => navigate('/docs')}
        >
          Docs
        </button>
        {user ? (
          <div className="flex items-center gap-2">
            <button 
              ref={(el) => (itemRefs.current['dashboard'] = el)}
              onMouseEnter={() => moveSliderTo('dashboard')}
              className={`${btnSecondary} relative z-10 transition-colors px-3 py-1 rounded-full`} 
              onClick={() => navigate('/dashboard')}
            >
              Dashboard
            </button>
            <button 
              ref={(el) => (itemRefs.current['logout'] = el)}
              onMouseEnter={() => moveSliderTo('logout')}
              className="text-white/70 hover:text-white text-sm font-medium transition-colors cursor-pointer relative z-10 px-3 py-1 rounded-full" 
              onClick={signOut}
            >
              Log out
            </button>
          </div>
        ) : (
          <button 
            ref={(el) => (itemRefs.current['login'] = el)}
            onMouseEnter={() => moveSliderTo('login')}
            className={`${btnSecondary} relative z-10 px-3 py-1 rounded-full`} 
            onClick={() => setIsModalOpen(true)}
          >
            Log in
          </button>
        )}
      </div>
    </nav>
  );
};

export default Navbar;