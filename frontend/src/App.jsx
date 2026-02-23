import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './components/LoginPage';
import ChatPage from './components/ChatPage';
import FitnessPage from './components/FitnessPage';
import { useAuth } from './context/AuthContext';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route 
          path="/chat" 
          element={
            <ProtectedRoute>
              <ChatPage />
            </ProtectedRoute>
          } 
        />
        {/* Fitness page is public - no authentication required */}
        <Route path="/" element={<FitnessPage />} />
      </Routes>
    </Router>
  );
}

export default App;
