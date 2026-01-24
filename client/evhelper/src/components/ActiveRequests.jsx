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

  const getStatusColor = (status) => {
    switch (status) {
      case 'OPEN':
        return 'text-green-800 bg-green-100';
      case 'ACCEPTED':
        return 'text-blue-800 bg-blue-100';
      case 'COMPLETED':
        return 'text-gray-800 bg-gray-100';
      case 'CANCELED':
        return 'text-red-800 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'OPEN':
        return '⚡';
      case 'ACCEPTED':
        return '🤝';
      case 'COMPLETED':
        return '✅';
      case 'CANCELED':
        return '❌';
      default:
        return '⏳';
    }
  };

  if (!state.isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Please log in to view active requests</h2>
          <a href="/login" className="text-blue-600 hover:text-blue-500 underline">Sign In</a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto sm:px-6 lg:px-8">
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6 lg:p-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => navigate('/dashboard')}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-gray-700 bg-gray-100 hover:bg-gray-200"
                >
                  ← Back
                </button>
                <h1 className="text-3xl font-bold text-gray-900">Active Requests</h1>
              </div>
              <div className="text-sm text-gray-600">
                Real-time requests in {state.user?.city || 'your city'}
              </div>
            </div>

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
                  className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-blue-600 bg-white hover:bg-blue-50"
                >
                  Refresh Requests
                </button>
              </div>
            ) : requests.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-600">No active requests in your city</p>
              </div>
            ) : (
              <div className="space-y-4">
                {requests.map((request) => (
                  <div key={request._id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-2xl">{getStatusIcon(request.status)}</span>
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(request.status)}`}>
                            {request.status}
                          </span>
                          {isMyRequest(request) && (
                            <span className="px-2 py-1 text-xs font-semibold bg-yellow-100 text-yellow-800 rounded">
                              Your Request
                            </span>
                          )}
                        </div>
                        <p className="text-gray-900 font-medium">Location: {request.location}</p>
                        <p className="text-gray-600 text-sm">Urgency: {request.urgency}</p>
                        <p className="text-gray-600 text-sm">Phone: {request.phoneNumber || request.contactInfo}</p>
                        <p className="text-gray-600 text-sm">{new Date(request.createdAt).toLocaleString()}</p>
                        {request.message && (
                          <p className="text-gray-600 text-sm mt-1">Message: {request.message}</p>
                        )}
                      </div>
                      {request.status === 'OPEN' && !isMyRequest(request) && (
                        <button
                          onClick={() => handleAcceptRequest(request._id)}
                          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
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
