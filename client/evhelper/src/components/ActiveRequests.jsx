import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import socketService from '../utils/socket.js';

const ActiveRequests = () => {
  const { state } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
        // Update request status for all requests
        setRequests(prev => prev.map(req => 
          req._id === data.requestId ? { ...req, status: 'ACCEPTED' } : req
        ));
      });

      socketService.on('request-canceled-notification', (data) => {
        console.log('Request canceled notification:', data);
        // Update request status for all requests
        setRequests(prev => prev.map(req => 
          req._id === data.requestId ? { ...req, status: 'CANCELED' } : req
        ));
      });

      // Initial load
      fetchRequests();
    }

    return () => {
      socketService.disconnect();
    };
  }, [state.isAuthenticated, state.user?.city]);

  const fetchRequests = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Simulate fetching active requests from API
      // In a real app, this would be an API call
      const mockRequests = [
        {
          _id: '1',
          requesterId: 'user1',
          requesterName: 'John Doe',
          city: 'San Francisco',
          location: 'Downtown',
          urgency: 'high',
          message: 'Need immediate assistance - battery at 2%',
          contactInfo: '555-0123',
          estimatedTime: 15,
          status: 'OPEN',
          tokenCost: 5,
          createdAt: new Date(Date.now() - 300000) // 5 minutes ago
        },
        {
          _id: '2',
          requesterId: 'user2',
          requesterName: 'Jane Smith',
          city: 'San Francisco',
          location: 'Union Square',
          urgency: 'medium',
          message: 'Need help with charging cable',
          contactInfo: '555-0456',
          estimatedTime: 30,
          status: 'OPEN',
          tokenCost: 5,
          createdAt: new Date(Date.now() - 600000) // 10 minutes ago
        }
      ];

      // Simulate API delay
      setTimeout(() => {
        setRequests(mockRequests);
        setLoading(false);
      }, 1000);
    } catch (err) {
      setError('Failed to fetch active requests');
      setLoading(false);
    }
  };

  const handleAcceptRequest = (requestId, requesterId) => {
    socketService.acceptRequest(requestId, requesterId);
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
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Please log in to view active charging requests</h2>
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
              <h1 className="text-3xl font-bold text-gray-900">Active Charging Requests</h1>
              <div className="text-sm text-gray-600">
                Real-time requests in {state.user?.city || 'your city'}
              </div>
            </div>
          </div>

          {/* Loading State */}
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
            <>
              {requests.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-gray-500">
                    <div className="text-6xl mb-4">🔋</div>
                    <p className="text-xl text-gray-900 mb-2">No Active Requests</p>
                    <p className="text-gray-600">
                      Be the first to create a charging request in {state.user?.city || 'your city'}!
                    </p>
                    <a 
                      href="/charging-request" 
                      className="text-blue-600 hover:text-blue-500 underline font-medium"
                    >
                      Create Your First Request
                    </a>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {requests.map((request) => (
                    <div key={request._id} className="bg-white p-4 rounded-lg shadow border border-gray-200">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <div className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(request.status)}`}>
                            {getStatusIcon(request.status)}
                            <span className="ml-2">{request.status}</span>
                          </div>
                          <div className="text-sm text-gray-600">
                            {new Date(request.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>

                        <div className="text-right">
                          {request.status === 'OPEN' && (
                            <button
                              onClick={() => handleAcceptRequest(request._id, request.requesterId)}
                              className="px-3 py-1 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                            >
                              Accept Request
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="mt-4 space-y-2">
                        <div>
                          <h4 className="text-lg font-medium text-gray-900">Request Details</h4>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="font-medium text-gray-700">Location:</span>
                            <p className="text-gray-600">{request.location}</p>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">Urgency:</span>
                            <p className="text-gray-600 capitalize">{request.urgency}</p>
                          </div>
                          {request.message && (
                            <div>
                              <span className="font-medium text-gray-700">Message:</span>
                              <p className="text-gray-600">{request.message}</p>
                            </div>
                          )}
                          {request.contactInfo && (
                            <div>
                              <span className="font-medium text-gray-700">Contact:</span>
                              <p className="text-gray-600">{request.contactInfo}</p>
                            </div>
                          )}
                          {request.estimatedTime && (
                            <div>
                              <span className="font-medium text-gray-700">Est. Time:</span>
                              <p className="text-gray-600">{request.estimatedTime} minutes</p>
                            </div>
                          )}
                        </div>

                        <div>
                          <span className="font-medium text-gray-700">Requester:</span>
                          <p className="text-gray-600">{request.requesterName}</p>
                          <p className="text-gray-500 text-xs">ID: {request.requesterId}</p>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Cost:</span>
                          <p className="text-gray-600">{request.tokenCost} tokens</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ActiveRequests;
