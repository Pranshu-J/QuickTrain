import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './LandingPage';
import ModelTrainer from './ModelTrainer';
<<<<<<< HEAD
import Dashboard from './Dashboard';
import ModelUsage from './ModelUsage'; // Import the new component
=======
import Dashboard from './Dashboard'; // Import the new component
>>>>>>> 3f7ddce (Page updates and resnet usability extended)
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
<<<<<<< HEAD
=======
        {/* Add the Dashboard Route */}
>>>>>>> 3f7ddce (Page updates and resnet usability extended)
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } 
        />
<<<<<<< HEAD
        {/* Add the ModelUsage Route */}
        <Route 
          path="/model-usage" 
          element={
            <ProtectedRoute>
              <ModelUsage />
            </ProtectedRoute>
          } 
        />
=======
>>>>>>> 3f7ddce (Page updates and resnet usability extended)
      </Routes>
    </Router>
  );
};

export default App;