import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './LandingPage';
import ModelTrainer from './ModelTrainer';
import Dashboard from './Dashboard'; // Import the new component
import { useAuth } from './Auth';
import './App.css';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) return <div className="app-container" style={{color: 'white', padding: '2rem'}}>Loading...</div>;
  
  if (!user) {
    return <Navigate to="/" replace />;
  }

  return children;
};

const App = () => {
  return (
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
        {/* Add the Dashboard Route */}
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } 
        />
      </Routes>
    </Router>
  );
};

export default App;