import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './LandingPage';
import ModelTrainer from './ModelTrainer';
import Dashboard from './Dashboard';
import ModelUsage from './ModelUsage';
import TinyBert from './TinyBert';
import { useAuth } from './Auth';
import './App.css';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  // Updated loading state to match Weights dark theme
  if (loading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-black text-white">
        <div className="animate-pulse font-sans text-lg">Loading...</div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/" replace />;
  }

  return children;
};

const App = () => {
  return (
    // Global wrapper to enforce dark theme background and font across all pages
    <div className="min-h-screen bg-black font-sans text-white selection:bg-white/20">
      <Router>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route 
            path="/train/:modelId" 
            element={
              <ProtectedRoute>
                <ModelTrainer />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/tinybert" 
            element={
              <ProtectedRoute>
                <TinyBert />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/model-usage" 
            element={
              <ProtectedRoute>
                <ModelUsage />
              </ProtectedRoute>
            } 
          />
        </Routes>
      </Router>
    </div>
  );
};

export default App;