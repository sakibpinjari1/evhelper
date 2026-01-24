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

  if (!state.isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Please log in to access your dashboard</h2>
          <a href="/login" className="text-blue-600 hover:text-blue-500 underline">
            Sign In
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6 lg:p-8">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
              <button
                onClick={handleLogout}
                className="ml-3 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-red-600 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Sign Out
              </button>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-gray-50 px-4 py-5 sm:p-6 lg:p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <a
                href="/charging-request"
                className="flex items-center justify-center px-6 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-md transition-colors"
              >
                <span className="text-2xl mr-3">⚡</span>
                <span className="text-lg font-semibold">Create Charging Request</span>
              </a>
              <a
                href="/active-requests"
                className="flex items-center justify-center px-6 py-4 bg-green-600 text-white rounded-lg hover:bg-green-700 shadow-md transition-colors"
              >
                <span className="text-2xl mr-3">🔋</span>
                <span className="text-lg font-semibold">View Active Requests</span>
              </a>
            </div>
          </div>

          {/* User Info Card */}
          <div className="bg-gray-50 px-4 py-5 sm:p-6 lg:p-8">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6 lg:p-8">
                <div className="flex items-center">
                  <div className="shrink-0 bg-blue-100 rounded-full p-3">
                    <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold text-xl">
                        {state.user?.name?.charAt(0) || 'U'}
                      </span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <h2 className="text-2xl font-bold text-gray-900">{state.user?.name}</h2>
                    <p className="text-gray-600">{state.user?.email}</p>
                    <p className="text-gray-600">{state.user?.city}</p>
                    <p className="text-sm text-gray-500">Token Balance: {state.user?.tokenBalance || 0}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Charging Requests Section */}
          <div className="px-4 py-5 sm:p-6 lg:p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Your Charging Requests</h2>
            
            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                <p className="mt-2 text-gray-600">Loading active requests...</p>
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <div className="text-red-600">{error}</div>
                <button 
                  onClick={fetchRequests}
                  className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-blue-600 bg-white hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Try Again
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {requests.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <p>No charging requests found.</p>
                    <p>Create your first request to get emergency charging assistance!</p>
                  </div>
                ) : (
                  requests.map((request) => (
                    <div key={request._id} className="bg-white p-4 rounded-lg shadow">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <h3 className="text-lg font-medium text-gray-900">Request #{request._id}</h3>
                          <p className="text-sm text-gray-500">
                            Created: {new Date(request.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          request.status === 'OPEN' ? 'bg-green-100 text-green-800' :
                          request.status === 'ACCEPTED' ? 'bg-blue-100 text-blue-800' :
                          request.status === 'COMPLETED' ? 'bg-gray-100 text-gray-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {request.status}
                        </span>
                      </div>

                      <div className="space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <h4 className="text-sm font-medium text-gray-900">Location</h4>
                            <p className="text-gray-600">{request.location}</p>
                          </div>
                          <div>
                            <h4 className="text-sm font-medium text-gray-900">Urgency</h4>
                            <p className="text-gray-600 capitalize">{request.urgency}</p>
                          </div>
                        </div>

                        {request.message && (
                          <div>
                            <h4 className="text-sm font-medium text-gray-900">Message</h4>
                            <p className="text-gray-600">{request.message}</p>
                          </div>
                        )}

                        {request.phoneNumber && (
                          <div>
                            <h4 className="text-sm font-medium text-gray-900">Phone Number</h4>
                            <p className="text-gray-600">{request.phoneNumber}</p>
                          </div>
                        )}
                        {request.contactInfo && (
                          <div>
                            <h4 className="text-sm font-medium text-gray-900">Contact Info</h4>
                            <p className="text-gray-600">{request.contactInfo}</p>
                          </div>
                        )}

                        {request.estimatedTime && (
                          <div>
                            <h4 className="text-sm font-medium text-gray-900">Estimated Time</h4>
                            <p className="text-gray-600">{request.estimatedTime} minutes</p>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-4">
                        <div className="text-sm text-gray-500">
                          {request.tokenCost} tokens • Status: {request.status}
                        </div>
                         
                        {/* Action buttons based on status */}
                        {request.status === 'OPEN' && (
                          <div className="space-x-2">
                            {/* CRITICAL FIX: Don't show Accept button for own requests */}
                            {/* Only show Cancel button for user's own requests */}
                            <button 
                              onClick={() => handleCancelRequest(request._id)}
                              className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-red-600 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                            >
                              Cancel Request
                            </button>
                          </div>
                        )}

                        {request.status === 'ACCEPTED' && (
                          <div className="space-x-2">
                            <button 
                              onClick={() => handleCompleteRequest(request._id)}
                              className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-green-600 bg-white hover:bg-green-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                            >
                              Mark as Completed
                            </button>
                            <span className="text-sm text-gray-500">
                              Waiting for completion...
                            </span>
                          </div>
                        )}

                        {request.status === 'COMPLETED' && (
                          <div className="text-sm text-green-600">
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
