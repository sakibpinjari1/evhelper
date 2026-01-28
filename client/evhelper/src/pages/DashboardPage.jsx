import React, { useContext, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api, { authAPI } from '../utils/auth.js';
import socketService from '../utils/socket.js';

const DashboardPage = () => {
  const { state, actions } = useAuth();
  const [requests, setRequests] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);

  useEffect(() => {
    // Connect to socket and join user's city room
    if (state.isAuthenticated && state.user?.city) {
      socketService.connect('http://localhost:5000', state.user.city, state.token);
      
      // Set up event listeners for real-time updates
      socketService.on('charging-request', (data) => {
        console.log('New charging request received:', data);
        setRequests(prev => [data, ...prev]);
      });

      socketService.on('request-accepted', (data) => {
        console.log('Request accepted:', data);
        setRequests(prev => prev.map(req => 
          req._id === data.requestId ? { ...req, status: 'ACCEPTED' } : req
        ));
      });

      socketService.on('request-completed', (data) => {
        console.log('Request completed:', data);
        setRequests(prev => prev.map(req => 
          req._id === data.requestId ? { ...req, status: 'COMPLETED' } : req
        ));
      });

      socketService.on('request-canceled', (data) => {
        console.log('Request canceled:', data);
        setRequests(prev => prev.map(req => 
          req._id === data.requestId ? { ...req, status: 'CANCELED' } : req
        ));
      });

      socketService.on('request-accepted-notification', (data) => {
        console.log('Request accepted notification:', data);
      });

      socketService.on('request-canceled-notification', (data) => {
        console.log('Request canceled notification:', data);
      });

      // Initial load
      fetchRequests();
    }
  }, [state.isAuthenticated, state.user?.city]);

  const fetchRequests = async () => {
    setLoading(true);
    setError(null);

    try {
      // CRITICAL FIX: Fetch user's own requests, not all requests
      // This should show requests created by the current user only
      const response = await api.get('/charging/requests');
      
      if (response.data.success) {
        setRequests(response.data.requests || []);
      } else {
        setError(response.data.message || 'Failed to fetch your requests');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch your requests');
    } finally {
      setLoading(false);
    }
  };

  const fetchCityRequests = async () => {
    if (!state.user?.city) return;
    
    try {
      // Fetch requests from user's city for the "Active Requests" section
      const response = await api.get(`/charging/requests/city/${state.user.city}`);
      
      if (response.data.success) {
        // This could be used to show city requests in a separate section
        console.log('City requests for dashboard:', response.data.requests);
      }
    } catch (err) {
      console.error('Failed to fetch city requests:', err);
    }
  };

  const handleLogout = () => {
    actions.logout();
  };

  const handleAcceptRequest = async (requestId) => {
    try {
      const response = await api.post(`/charging/requests/${requestId}/accept`);
      
      if (response.data.success) {
        alert('Request accepted successfully!');
        fetchRequests(); // Refresh the requests list
      } else {
        alert(response.data.message || 'Failed to accept request');
      }
    } catch (error) {
      alert(error.response?.data?.message || error.message || 'Failed to accept request');
    }
  };

  const handleCancelRequest = async (requestId) => {
    try {
      const response = await api.post(`/charging/requests/${requestId}/cancel`);
      
      if (response.data.success) {
        alert('Request canceled successfully!');
        fetchRequests(); // Refresh the requests list
      } else {
        alert(response.data.message || 'Failed to cancel request');
      }
    } catch (error) {
      alert(error.response?.data?.message || error.message || 'Failed to cancel request');
    }
  };

  const handleCompleteRequest = async (requestId) => {
    try {
      const response = await api.post(`/charging/requests/${requestId}/complete-requester`);
      
      if (response.data.success) {
        alert('Request marked as completed successfully!');
        fetchRequests(); // Refresh the requests list
      } else {
        alert(response.data.message || 'Failed to mark request as completed');
      }
    } catch (error) {
      alert(error.response?.data?.message || error.message || 'Failed to mark request as completed');
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

  if (!state.isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center py-12 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Please log in to access your dashboard</h2>
          <a href="/login" className="text-cyan-400 hover:text-cyan-300 underline">
            Sign In
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 relative z-10">
      <div className="ev-container">
        {/* Header */}
        <div className="ev-card ev-card-spacing">
          <div className="ev-section">
            <div className="ev-flex-center justify-between">
              <div className="ev-flex-center gap-4">
                <div className="inline-flex items-center justify-center rounded-full ev-charging-pulse" style={{background: 'linear-gradient(135deg, rgb(6, 182, 212) 0%, rgb(59, 130, 246) 100%)', padding: '12px'}}>
                  <span className="text-white text-2xl">⚡</span>
                </div>
                <h1 className="ev-heading-1 ev-neon-text">Dashboard</h1>
              </div>
              <button
                onClick={handleLogout}
                className="ev-button-danger"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="ev-grid-2 ev-card-spacing ev-mobile-stack">
          <a
            href="/charging-request"
            className="ev-glass-card group cursor-pointer transition-all duration-300 hover:scale-105"
          >
            <div className="p-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="rounded-lg flex items-center justify-center group-hover:ev-charging-pulse" style={{background: 'linear-gradient(135deg, rgb(6, 182, 212) 0%, rgb(59, 130, 246) 100%)', padding: '12px'}}>
                  <span className="text-white text-xl">⚡</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Create Charging Request</h3>
                  <p className="text-gray-400 text-sm">Get emergency charging assistance</p>
                </div>
              </div>
              <span className="text-gray-400 group-hover:text-cyan-400 transition-colors text-lg">→</span>
            </div>
          </a>

          <a
            href="/active-requests"
            className="ev-glass-card group cursor-pointer transition-all duration-300 hover:scale-105"
          >
            <div className="p-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="rounded-lg flex items-center justify-center group-hover:ev-charging-pulse" style={{background: 'linear-gradient(135deg, rgb(16, 185, 129) 0%, rgb(59, 130, 246) 100%)', padding: '12px'}}>
                  <span className="text-white text-xl">✓</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">View Active Requests</h3>
                  <p className="text-gray-400 text-sm">Help other EV owners in your city</p>
                </div>
              </div>
              <span className="text-gray-400 group-hover:text-cyan-400 transition-colors text-lg">→</span>
            </div>
          </a>
        </div>

        {/* User Info Card */}
        <div className="ev-glass-card mb-8">
          <div className="p-6 lg:p-8">
            <div className="flex items-center gap-6">
              <div className="shrink-0">
                <div className="rounded-full flex items-center justify-center" style={{background: 'linear-gradient(135deg, rgb(6, 182, 212) 0%, rgb(59, 130, 246) 100%)'}}>
                  <span className="text-white font-bold" style={{fontSize: '12px'}}>
                    {state.user?.name?.charAt(0) || 'U'}
                  </span>
                </div>
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-white">{state.user?.name}</h2>
                <p className="text-gray-400">{state.user?.email}</p>
                <p className="text-gray-400">{state.user?.city}</p>
                <div className="mt-2 inline-flex items-center px-3 py-1 bg-cyan-500/20 border border-cyan-500/50 rounded-full">
                  <span className="text-cyan-300 text-sm font-medium">Token Balance: {state.user?.tokenBalance || 0}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Charging Requests Section */}
        <div className="ev-glass-card">
          <div className="p-6 lg:p-8">
            <h2 className="text-2xl font-bold text-white mb-6">Your Charging Requests</h2>
            
            {loading ? (
              <div className="text-center py-12">
                <div className="ev-loading mx-auto mb-4"></div>
                <p className="text-gray-400">Loading your requests...</p>
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <div className="text-red-400 mb-4">{error}</div>
                <button 
                  onClick={fetchRequests}
                  className="ev-neon-button"
                >
                  Try Again
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {requests.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <div className="mb-4">
                      <span className="text-gray-500 text-5xl">⚡</span>
                    </div>
                    <p className="text-lg">No charging requests found.</p>
                    <p className="text-sm mt-2">Create your first request to get emergency charging assistance!</p>
                  </div>
                ) : (
                  requests.map((request) => (
                    <div key={request._id} className="ev-glass-card p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-medium text-white">Request #{request._id.slice(-6)}</h3>
                          <p className="text-sm text-gray-400">
                            Created: {new Date(request.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getStatusClass(request.status)}`}>
                          <span className="mr-1">{getStatusIcon(request.status)}</span>
                          {request.status}
                        </span>
                      </div>

                      <div className="space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <h4 className="text-sm font-medium text-gray-300">Location</h4>
                            <p className="text-gray-400">{request.location}</p>
                          </div>
                          <div>
                            <h4 className="text-sm font-medium text-gray-300">Urgency</h4>
                            <p className="text-gray-400 capitalize">{request.urgency}</p>
                          </div>
                        </div>

                        {request.message && (
                          <div>
                            <h4 className="text-sm font-medium text-gray-300">Message</h4>
                            <p className="text-gray-400">{request.message}</p>
                          </div>
                        )}

                        {request.phoneNumber && (
                          <div>
                            <h4 className="text-sm font-medium text-gray-300">Phone Number</h4>
                            <p className="text-gray-400">{request.phoneNumber}</p>
                          </div>
                        )}
                        {request.contactInfo && (
                          <div>
                            <h4 className="text-sm font-medium text-gray-300">Contact Info</h4>
                            <p className="text-gray-400">{request.contactInfo}</p>
                          </div>
                        )}

                        {request.estimatedTime && (
                          <div>
                            <h4 className="text-sm font-medium text-gray-300">Estimated Time</h4>
                            <p className="text-gray-400">{request.estimatedTime} minutes</p>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-4 mt-4 border-t border-gray-700">
                        <div className="text-sm text-gray-400">
                          {request.tokenCost} tokens • Status: {request.status}
                        </div>
                         
                        {/* Action buttons based on status */}
                        {request.status === 'OPEN' && (
                          <div className="space-x-2">
                            <button 
                              onClick={() => handleCancelRequest(request._id)}
                              className="px-4 py-2 bg-red-500/20 border border-red-500/50 text-red-300 rounded-lg hover:bg-red-500/30 transition-colors"
                            >
                              Cancel Request
                            </button>
                          </div>
                        )}

                        {request.status === 'ACCEPTED' && (
                          <div className="space-x-2">
                            <button 
                              onClick={() => handleCompleteRequest(request._id)}
                              className="px-4 py-2 bg-green-500/20 border border-green-500/50 text-green-300 rounded-lg hover:bg-green-500/30 transition-colors"
                            >
                              Mark as Completed
                            </button>
                            <span className="text-sm text-gray-400">
                              Waiting for completion...
                            </span>
                          </div>
                        )}

                        {request.status === 'COMPLETED' && (
                          <div className="text-sm text-green-400">
                            <span>✓ Completed</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
