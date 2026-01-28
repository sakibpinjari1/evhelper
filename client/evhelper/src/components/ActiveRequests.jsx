import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api, { authAPI } from '../utils/auth.js';

const ActiveRequests = () => {
  const navigate = useNavigate();
  const { state } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (state.isAuthenticated && state.user?.city) {
      fetchRequests();
    }
  }, [state.isAuthenticated, state.user?.city]);

  const fetchRequests = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.get(`/charging/requests/city/${state.user?.city}`);
      
      if (response.data.success) {
        console.log('Current user ID:', state.user?._id);
        console.log('Requests received:', response.data.requests);
        setRequests(response.data.requests || []);
      } else {
        setError(response.data.message || 'Failed to fetch active requests');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch active requests');
    } finally {
      setLoading(false);
    }
  };

  const isMyRequest = (request) => {
    if (!request || !state.user) return false;
    
    // Handle both string and object formats for requesterId
    const requesterId = typeof request.requesterId === 'string' 
      ? request.requesterId 
      : request.requesterId?._id;
    
    const myUserId = state.user._id || state.user.id;
    
    const isOwner = requesterId === myUserId;
    console.log(`Checking ownership: ${requesterId} === ${myUserId} => ${isOwner}`);
    return isOwner;
  };

  const handleAcceptRequest = async (requestId) => {
    try {
      const response = await api.post(`/charging/requests/${requestId}/accept`);
      
      if (response.data.success) {
        alert('Request accepted successfully!');
        fetchRequests();
      } else {
        alert(response.data.message || 'Failed to accept request');
      }
    } catch (error) {
      alert(error.response?.data?.message || error.message || 'Failed to accept request');
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'OPEN': return 'ev-status-open';
      case 'ACCEPTED': return 'ev-status-accepted';
      case 'COMPLETED': return 'ev-status-completed';
      case 'CANCELED': return 'ev-status-canceled';
      default: return 'ev-status-completed';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'OPEN': return '⚡';
      case 'ACCEPTED': return '🤝';
      case 'COMPLETED': return '✅';
      case 'CANCELED': return '❌';
      default: return '⏳';
    }
  };

  const getUrgencyColor = (urgency) => {
    switch (urgency?.toLowerCase()) {
      case 'low': return 'bg-green-500/20 border-green-500/50 text-green-300';
      case 'medium': return 'bg-amber-500/20 border-amber-500/50 text-amber-300';
      case 'high': return 'bg-red-500/20 border-red-500/50 text-red-300';
      default: return 'bg-gray-500/20 border-gray-500/50 text-gray-300';
    }
  };

  if (!state.isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center py-12 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Please log in to view active requests</h2>
          <a href="/login" className="text-cyan-400 hover:text-cyan-300 underline">
            Sign In
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 relative z-10">
      <div className="mx-auto sm:px-6 lg:px-8">
        {/* Header */}
        <div className="ev-card ev-card-spacing">
          <div className="ev-section">
            <div className="ev-flex-center justify-between">
              <div className="ev-flex-center gap-4">
                <button
                  onClick={() => navigate('/dashboard')}
                  className="ev-button-secondary"
                >
                  <span className="mr-2">←</span>
                  Back
                </button>
                <div>
                  <h1 className="ev-heading-1 ev-neon-text">Active Requests</h1>
                  <p className="ev-text-muted">
                    Real-time requests in {state.user?.city || 'your city'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="ev-loading"></div>
                <span className="text-sm text-gray-400">Live</span>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="ev-glass-card">
          <div className="p-6 lg:p-8">
            {loading ? (
              <div className="text-center py-12">
                <div className="ev-loading mx-auto mb-4"></div>
                <p className="text-gray-400">Loading active requests...</p>
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <div className="text-red-400 mb-4">{error}</div>
                <button 
                  onClick={fetchRequests}
                  className="ev-neon-button"
                >
                  Refresh Requests
                </button>
              </div>
            ) : requests.length === 0 ? (
              <div className="text-center py-12">
                <div className="mb-4">
                  <span className="text-gray-500 text-5xl">⚡</span>
                </div>
                <p className="text-lg text-gray-400">No active requests in your city</p>
                <p className="text-sm text-gray-500 mt-2">Be the first to help or check back later</p>
              </div>
            ) : (
              <div className="space-y-4">
                {requests.map((request) => (
                  <div key={request._id} className="ev-glass-card p-6 hover:scale-[1.02] transition-transform duration-300">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="text-lg">{getStatusIcon(request.status)}</div>
                          <div className="flex flex-col gap-2">
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusClass(request.status)}`}>
                              {request.status}
                            </span>
                            {isMyRequest(request) && (
                              <span className="px-2 py-1 text-xs font-semibold bg-amber-500/20 border border-amber-500/50 text-amber-300 rounded">
                                Your Request
                              </span>
                            )}
                            <span className={`px-2 py-1 text-xs font-semibold rounded ${getUrgencyColor(request.urgency)}`}>
                              {request.urgency?.toUpperCase()} PRIORITY
                            </span>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <div>
                            <h4 className="text-sm font-medium text-gray-300 mb-1">📍 Location</h4>
                            <p className="text-gray-400">{request.location}</p>
                          </div>
                          <div>
                            <h4 className="text-sm font-medium text-gray-300 mb-1">📞 Contact</h4>
                            <p className="text-gray-400">{request.phoneNumber || request.contactInfo}</p>
                          </div>
                        </div>

                        {request.message && (
                          <div className="mb-4">
                            <h4 className="text-sm font-medium text-gray-300 mb-1">💬 Message</h4>
                            <p className="text-gray-400">{request.message}</p>
                          </div>
                        )}

                        <div className="flex items-center gap-4 text-sm text-gray-400">
                          <span>🕒 {new Date(request.createdAt).toLocaleString()}</span>
                          {request.estimatedTime && (
                            <span>⏱️ ~{request.estimatedTime} min</span>
                          )}
                        </div>
                      </div>

                      {/* Action Button */}
                      {request.status === 'OPEN' && !isMyRequest(request) && (
                        <button
                          onClick={() => handleAcceptRequest(request._id)}
                          className="ev-neon-button px-6 py-3 ev-charging-pulse"
                        >
                          Accept Request
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActiveRequests;
