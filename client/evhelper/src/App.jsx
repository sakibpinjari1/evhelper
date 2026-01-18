import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import { useAuth } from './context/AuthContext.jsx';
import PrivateRoute from './components/PrivateRoute.jsx';
import Register from './components/Register.jsx';
import Login from './components/Login.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import SocketExample from './components/SocketExample.jsx';
import './App.css'

function App() {
  const { state } = useAuth();

  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-gray-50">
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            
            {/* Protected Routes */}
            <Route path="/dashboard" element={
              <PrivateRoute>
                <DashboardPage />
              </PrivateRoute>
            } />
            
            {/* Socket.IO Demo Route */}
            <Route path="/socket-demo" element={<SocketExample />} />
            
            {/* Redirect root to dashboard if authenticated */}
            <Route 
              path="/" 
              element={
                state.isAuthenticated ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />
              } 
            />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App
