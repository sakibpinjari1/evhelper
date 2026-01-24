import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import PrivateRoute from './components/PrivateRoute.jsx';
import Register from './components/Register.jsx';
import Login from './components/Login.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import ChargingRequestForm from './components/ChargingRequestForm.jsx';
import ActiveRequests from './components/ActiveRequests.jsx';
import './App.css'

function AppRoutes() {
  const { state } = useAuth();

  return (
    <div className="min-h-screen relative">
      <div className="ev-grid-bg"></div>
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

        {/* Charging Request Form Route */}
        <Route path="/charging-request" element={
          <PrivateRoute>
            <ChargingRequestForm />
          </PrivateRoute>
        } />

        {/* Active Requests Route */}
        <Route path="/active-requests" element={
          <PrivateRoute>
            <ActiveRequests />
          </PrivateRoute>
        } />

        {/* Redirect root to dashboard if authenticated */}
        <Route
          path="/"
          element={
            state.isAuthenticated ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />
          }
        />
      </Routes>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}

export default App
