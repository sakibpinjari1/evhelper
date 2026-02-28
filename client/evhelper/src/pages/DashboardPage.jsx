import React, { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/auth.js';
import socketService from '../utils/socket.js';
import AcceptedRequestsList from '../components/AcceptedRequestsList';
import RequestChatDrawer from '../components/RequestChatDrawer';

const DashboardPage = () => {
  const { state, actions } = useAuth();
  const [requests, setRequests] = React.useState([]);
  const [acceptedRequests, setAcceptedRequests] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [helperLoading, setHelperLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  const [chatDrawer, setChatDrawer] = React.useState({ open: false, requestId: null, peerName: null, requestStatus: null });
  const [toast, setToast] = React.useState(null);

  useEffect(() => {
    // Connect to socket and join user's city room
    if (state.isAuthenticated && state.user?.city) {
      // Let SocketService auto-detect URL (prod uses window.location.origin)
      socketService.connect(null, state.user.city, state.token);

      const upsertRequest = (prev, req) => {
        if (!req?._id) return prev;
        const existing = prev.find((r) => r._id === req._id);
        if (existing) {
          return prev.map((r) => (r._id === req._id ? { ...r, ...req } : r));
        }
        return [req, ...prev];
      };

      // charging-request is emitted for new requests in the city room
      const onChargingRequest = (data) => {
        const normalized = {
          ...data,
          _id: data?._id || data?.id,
          createdAt: data?.createdAt || new Date().toISOString()
        };

        console.log('New charging request received:', normalized);
        setRequests((prev) => upsertRequest(prev, normalized));
      };

      // request-taken is emitted when a request becomes unavailable in the city
      const onRequestTaken = (data) => {
        const id = data?.requestId || data?.id || data?._id;
        if (!id) return;
        setRequests((prev) => prev.map((r) => (r._id === id ? { ...r, status: 'ACCEPTED' } : r)));
        fetchAcceptedRequests();
      };

      // These notifications include requestId
      const onRequestCompletedNotification = (data) => {
        const id = data?.requestId || data?.id || data?._id;
        if (!id) return;
        setRequests((prev) => prev.map((r) => (r._id === id ? { ...r, status: 'COMPLETED' } : r)));
        fetchAcceptedRequests();
      };

      const onRequestCanceledNotification = (data) => {
        const id = data?.requestId || data?.id || data?._id;
        if (!id) return;
        setRequests((prev) => prev.map((r) => (r._id === id ? { ...r, status: 'CANCELED' } : r)));
        fetchAcceptedRequests();
      };

      const onRequestExpiredNotification = (data) => {
        const id = data?.requestId || data?.id || data?._id;
        if (!id) return;
        setRequests((prev) => prev.map((r) => (r._id === id ? { ...r, status: 'EXPIRED' } : r)));
        fetchAcceptedRequests();
        setToast('A request expired');
      };

      const onRequestExpired = (data) => {
        const id = data?.request?.id || data?.requestId;
        if (!id) return;
        setRequests((prev) => prev.map((r) => (r._id === id ? { ...r, status: 'EXPIRED' } : r)));
        fetchAcceptedRequests();
        setToast('Your request expired');
      };

      socketService.on('charging-request', onChargingRequest);
      socketService.on('request-taken', onRequestTaken);
      socketService.on('request-completed-notification', onRequestCompletedNotification);
      socketService.on('request-canceled-notification', onRequestCanceledNotification);
      socketService.on('request-expired-notification', onRequestExpiredNotification);
      socketService.on('request-expired', onRequestExpired);

      // Initial load
      fetchRequests();
      fetchAcceptedRequests();

      return () => {
        socketService.off('charging-request', onChargingRequest);
        socketService.off('request-taken', onRequestTaken);
        socketService.off('request-completed-notification', onRequestCompletedNotification);
        socketService.off('request-canceled-notification', onRequestCanceledNotification);
        socketService.off('request-expired-notification', onRequestExpiredNotification);
        socketService.off('request-expired', onRequestExpired);
      };
    }
  }, [state.isAuthenticated, state.user?.city]);

  React.useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(timer);
  }, [toast]);

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

  const fetchAcceptedRequests = async () => {
    if (!state.isAuthenticated) {
      return [];
    }

    setHelperLoading(true);

    try {
      // Fetch requests where current user is the helper
      const response = await api.get('/charging/requests/helper');
      
      if (response.data.success) {
        setAcceptedRequests(response.data.requests || []);
      } else {
        console.error('Failed to fetch accepted requests:', response.data.message);
        setAcceptedRequests([]);
      }
    } catch (err) {
      console.error('Error fetching accepted requests:', err.response?.data?.message || err.message);
      setAcceptedRequests([]);
    } finally {
      setHelperLoading(false);
    }
  };

  const fetchHelperRequests = async () => {
    if (!state.isAuthenticated) {
      setError('Please log in to view your accepted requests');
      return [];
    }

    setLoading(true);
    setError(null);

    try {
      // Fetch requests where current user is the helper
      const response = await api.get('/charging/requests/helper');
      
      if (response.data.success) {
        return response.data.requests || [];
      } else {
        setError(response.data.message || 'Failed to fetch your accepted requests');
        return [];
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch your accepted requests');
      return [];
    } finally {
      setLoading(false);
    }
  };

  const fetchCityRequests = async () => {
    if (!state.user?.city) return;
    
    try {
      // Fetch requests from user's city for the "Active Requests" section
      const response = await api.get(`/charging/requests/city/${encodeURIComponent(state.user.city)}`);
      
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
        fetchAcceptedRequests(); // Refresh helper's accepted requests
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
      case 'EXPIRED': return 'ev-status-expired';
      default: return 'ev-status-completed';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'OPEN': return '⚡';
      case 'ACCEPTED': return '🤝';
      case 'COMPLETED': return '✅';
      case 'CANCELED': return '❌';
      case 'EXPIRED': return '⌛';
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
      {toast && (
        <div className="ev-toast-container">
          <div className="ev-toast ev-toast-expired">{toast}</div>
        </div>
      )}
      <div className="ev-container">
        {/* Header */}
        <div className="ev-formal-card ev-card-spacing">
          <div className="ev-section">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full ev-charging-pulse ev-formal-badge">
                  <svg className="w-6 h-6 ev-formal-icon" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                  </svg>
                </div>
                <h1 className="ev-formal-title">Dashboard</h1>
              </div>
              <button
                onClick={handleLogout}
                className="ev-formal-button w-full sm:w-auto"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>

        {/* Active Chats */}
        {(() => {
          const requesterChats = (requests || []).filter((r) => r.status === 'ACCEPTED');
          const helperChats = (acceptedRequests || []).filter((r) => r.status === 'ACCEPTED');
          const hasChats = requesterChats.length > 0 || helperChats.length > 0;

          if (!hasChats) return null;

          return (
            <div className="ev-formal-card ev-card-spacing">
              <div className="ev-section">
                <h2 className="ev-formal-title mb-4">Active Chats</h2>
                <div className="ev-stack-6">
                  {requesterChats.map((request) => (
                    <div key={`req-${request._id}`} className="ev-formal-card ev-formal-compact p-4 sm:p-6">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                          <div className="text-sm text-gray-400 mb-1">Your Request</div>
                          <div className="text-white font-medium">Request #{request._id.slice(-6)}</div>
                          <div className="ev-formal-subtitle">
                            Helper: {request.helperId?.name || 'Assigned Helper'}
                          </div>
                        </div>
                        <button
                          onClick={() =>
                            setChatDrawer({
                              open: true,
                              requestId: request._id,
                              peerName: request.helperId?.name || 'Helper',
                              requestStatus: request.status
                            })
                          }
                          className="ev-formal-button w-full sm:w-auto text-sm sm:text-base"
                        >
                          Open Chat
                        </button>
                      </div>
                    </div>
                  ))}

                  {helperChats.map((request) => (
                    <div key={`helper-${request._id}`} className="ev-formal-card ev-formal-compact p-4 sm:p-6">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                          <div className="text-sm text-gray-400 mb-1">As Helper</div>
                          <div className="text-white font-medium">Request #{request._id.slice(-6)}</div>
                          <div className="ev-formal-subtitle">
                            Requester: {request.requesterId?.name || 'Requester'}
                          </div>
                        </div>
                        <button
                          onClick={() =>
                            setChatDrawer({
                              open: true,
                              requestId: request._id,
                              peerName: request.requesterId?.name || 'Requester',
                              requestStatus: request.status
                            })
                          }
                          className="ev-formal-button w-full sm:w-auto text-sm sm:text-base"
                        >
                          Open Chat
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })()}

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
          <a
            href="/charging-request"
            className="ev-formal-card ev-formal-compact group cursor-pointer transition-all duration-300 hover:scale-105"
          >
            <div className="p-4 sm:p-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg flex items-center justify-center ev-charging-pulse ev-formal-badge">
                  <svg className="w-6 h-6 ev-formal-icon" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Create Charging Request</h3>
                  <p className="ev-formal-subtitle">Get emergency charging assistance</p>
                </div>
              </div>
              <svg className="w-5 h-5 ev-formal-chevron" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </a>

          <a
            href="/active-requests"
            className="ev-formal-card ev-formal-compact group cursor-pointer transition-all duration-300 hover:scale-105"
          >
            <div className="p-4 sm:p-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg flex items-center justify-center ev-charging-pulse ev-formal-badge">
                  <svg className="w-6 h-6 ev-formal-icon" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">View Active Requests</h3>
                  <p className="ev-formal-subtitle">Help other EV owners in your city</p>
                </div>
              </div>
              <svg className="w-5 h-5 ev-formal-chevron" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </a>

          <a
            href="/circuit-live"
            className="ev-formal-card ev-formal-compact group cursor-pointer transition-all duration-300 hover:scale-105"
          >
            <div className="p-4 sm:p-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg flex items-center justify-center ev-charging-pulse ev-formal-badge">
                  <svg className="w-6 h-6 ev-formal-icon" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M9 2h6v2h-6V2zm3 20a7 7 0 0 1-7-7c0-3.53 2.61-6.45 6-6.93V6h2v2.07c3.39.48 6 3.4 6 6.93a7 7 0 0 1-7 7zm0-2a5 5 0 0 0 5-5 5 5 0 1 0-10 0 5 5 0 0 0 5 5z"/>
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Circuit Live Charging</h3>
                  <p className="ev-formal-subtitle">Monitor battery and control relay</p>
                </div>
              </div>
              <svg className="w-5 h-5 ev-formal-chevron" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </a>
        </div>

        {/* User Info Card */}
        <div className="ev-formal-card ev-formal-compact mb-8">
          <div className="p-4 sm:p-6 lg:p-8">
            <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
              <div className="shrink-0">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center ev-formal-badge">
                  <span className="text-white font-bold text-xl sm:text-2xl">
                    {state.user?.name?.charAt(0) || 'U'}
                  </span>
                </div>
              </div>
              <div className="flex-1 text-center sm:text-left">
                <h2 className="text-xl sm:text-2xl font-bold text-white">{state.user?.name}</h2>
                <p className="ev-formal-subtitle">{state.user?.email}</p>
                <p className="ev-formal-subtitle">{state.user?.city}</p>
                <div className="mt-3">
                  <span className="ev-formal-pill">Token Balance: {state.user?.tokenBalance || 0}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Charging Requests Section */}
        <div className="ev-formal-card">
          <div className="p-4 sm:p-6 lg:p-8">
            <h2 className="ev-formal-title mb-6">Your Charging Requests</h2>
            
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
                  className="ev-formal-button"
                >
                  Try Again
                </button>
              </div>
            ) : (
              <div className="ev-stack-6">
                {requests.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <div className="mb-4">
                      <svg className="w-16 h-16 mx-auto text-gray-500" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                      </svg>
                    </div>
                    <p className="text-lg">No charging requests found.</p>
                    <p className="text-sm mt-2">Create your first request to get emergency charging assistance!</p>
                  </div>
                ) : (
                  requests.map((request) => (
                    <React.Fragment key={request._id}>
                      <div className="ev-formal-card ev-formal-compact p-4 sm:p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h3 className="text-lg font-medium text-white">Request #{request._id.slice(-6)}</h3>
                            <p className="ev-formal-subtitle">
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
                              <p className="ev-formal-subtitle">{request.location}</p>
                            </div>
                            <div>
                              <h4 className="text-sm font-medium text-gray-300">Urgency</h4>
                              <p className="ev-formal-subtitle capitalize">{request.urgency}</p>
                            </div>
                          </div>

                          {request.message && (
                            <div>
                              <h4 className="text-sm font-medium text-gray-300">Message</h4>
                              <p className="ev-formal-subtitle">{request.message}</p>
                            </div>
                          )}

                          {request.phoneNumber && (
                            <div>
                              <h4 className="text-sm font-medium text-gray-300">Phone Number</h4>
                              <p className="ev-formal-subtitle">{request.phoneNumber}</p>
                            </div>
                          )}
                          {request.contactInfo && (
                            <div>
                              <h4 className="text-sm font-medium text-gray-300">Contact Info</h4>
                              <p className="ev-formal-subtitle">{request.contactInfo}</p>
                            </div>
                          )}

                          {request.estimatedTime && (
                            <div>
                              <h4 className="text-sm font-medium text-gray-300">Estimated Time</h4>
                              <p className="ev-formal-subtitle">{request.estimatedTime} minutes</p>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center justify-between pt-4 mt-4 border-t border-gray-700">
                          <div className="ev-formal-subtitle">
                            {request.tokenCost} tokens • Status: {request.status}
                          </div>
                           
                          {/* Action buttons based on status */}
                          {request.status === 'OPEN' && (
                            <div className="flex flex-col sm:flex-row gap-2 sm:space-x-2">
                              <button 
                                onClick={() => handleCancelRequest(request._id)}
                                className="ev-formal-button w-full sm:w-auto text-sm sm:text-base"
                              >
                                Cancel Request
                              </button>
                            </div>
                          )}

                          {request.status === 'ACCEPTED' && (
                            <div className="flex flex-col sm:flex-row gap-2 sm:space-x-2 sm:items-center">
                              <button 
                                onClick={() => handleCompleteRequest(request._id)}
                                className="ev-formal-button w-full sm:w-auto text-sm sm:text-base"
                              >
                                Mark as Completed
                              </button>
                              <button
                                onClick={() =>
                                  setChatDrawer({
                                    open: true,
                                    requestId: request._id,
                                    peerName: request.helperId?.name || "Helper",
                                    requestStatus: request.status
                                  })
                                }
                                className="ev-formal-button w-full sm:w-auto text-sm sm:text-base"
                              >
                                Open Chat
                              </button>
                              <span className="text-xs sm:text-sm text-gray-400 sm:ml-2">
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
                    </React.Fragment>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Helper's Accepted Requests Section */}
        {acceptedRequests.length > 0 && (
          <div className="ev-formal-card mt-8">
            <div className="p-4 sm:p-6 lg:p-8">
              <h2 className="ev-formal-title mb-6">Your Active Helper Requests</h2>
              
              {helperLoading ? (
                <div className="text-center py-12">
                  <div className="ev-loading mx-auto mb-4"></div>
                  <p className="text-gray-400">Loading your accepted requests...</p>
                </div>
              ) : (
                <AcceptedRequestsList 
                  requests={acceptedRequests}
                  onOpenChat={(request) =>
                    setChatDrawer({
                      open: true,
                      requestId: request._id,
                      peerName: request.requesterId?.name || "Requester",
                      requestStatus: request.status
                    })
                  }
                />
              )}
            </div>
          </div>
        )}
        <RequestChatDrawer
          open={chatDrawer.open}
          onClose={() => setChatDrawer({ open: false, requestId: null, peerName: null, requestStatus: null })}
          requestId={chatDrawer.requestId}
          peerName={chatDrawer.peerName}
          requestStatus={chatDrawer.requestStatus}
        />
      </div>
    </div>
  );
};

export default DashboardPage;
