import React, { useState, useEffect } from 'react';
import socketService from '../utils/socket.js';

const SocketExample = () => {
  const [connected, setConnected] = useState(false);
  const [city, setCity] = useState('');
  const [messages, setMessages] = useState([]);
  const [chargingRequests, setChargingRequests] = useState([]);

  useEffect(() => {
    // Setup custom event listeners
    setupEventListeners();

    return () => {
      // Cleanup on unmount
      socketService.disconnect();
    };
  }, []);

  const setupEventListeners = () => {
    // Listen for city events
    socketService.on('city-joined', (data) => {
      addMessage(`Joined ${data.city} room successfully`);
    });

    socketService.on('user-joined-city', (data) => {
      addMessage(`New user joined ${data.city}`);
    });

    socketService.on('user-left-city', (data) => {
      addMessage(`User left ${data.city}`);
    });

    // Listen for charging requests
    socketService.on('charging-request', (data) => {
      addMessage(`New charging request in ${data.city}`);
      setChargingRequests(prev => [...prev, data]);
    });

    socketService.on('charging-request-accepted', (data) => {
      addMessage(`Your charging request was accepted!`);
    });

    // Listen for connection status
    socketService.on('connect', () => {
      setConnected(true);
    });

    socketService.on('disconnect', () => {
      setConnected(false);
      addMessage('Disconnected from server');
    });
  };

  const addMessage = (message) => {
    setMessages(prev => [...prev, { 
      text: message, 
      timestamp: new Date().toLocaleTimeString() 
    }]);
  };

  const handleConnect = () => {
    if (!city.trim()) {
      alert('Please enter a city name');
      return;
    }

    // Connect to socket server and join city room
    socketService.connect('http://localhost:5000', city.trim());
    setConnected(true);
    addMessage(`Connecting to server and joining ${city}...`);
  };

  const handleDisconnect = () => {
    socketService.disconnect();
    setConnected(false);
    addMessage('Disconnected from server');
  };

  const handleJoinCity = () => {
    if (!city.trim()) {
      alert('Please enter a city name');
      return;
    }

    const success = socketService.joinCity(city.trim());
    if (success) {
      addMessage(`Joining ${city} room...`);
    }
  };

  const handleLeaveCity = () => {
    const success = socketService.leaveCity();
    if (success) {
      addMessage('Leaving current city room...');
    }
  };

  const handleSendChargingRequest = () => {
    const requestData = {
      message: 'I need emergency charging help!',
      location: 'Downtown area',
      urgency: 'high',
      contactInfo: 'Phone: 555-0123'
    };

    const success = socketService.sendChargingRequest(requestData);
    if (success) {
      addMessage('Sending charging request...');
    }
  };

  const handleAcceptRequest = (requestId, requesterId) => {
    const success = socketService.acceptChargingRequest(requestId, requesterId);
    if (success) {
      addMessage(`Accepting charging request ${requestId}...`);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h2>Socket.IO City Room Example</h2>
      
      {/* Connection Status */}
      <div style={{ 
        padding: '10px', 
        backgroundColor: connected ? '#d4edda' : '#f8d7da', 
        borderRadius: '5px',
        marginBottom: '20px'
      }}>
        <strong>Status:</strong> {connected ? 'Connected' : 'Disconnected'}
        {connected && <span> - Socket ID: {socketService.getSocketId()}</span>}
      </div>

      {/* City Input */}
      <div style={{ marginBottom: '20px' }}>
        <input
          type="text"
          placeholder="Enter your city (e.g., San Francisco)"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          style={{ 
            padding: '8px', 
            marginRight: '10px', 
            width: '200px',
            border: '1px solid #ccc',
            borderRadius: '4px'
          }}
        />
        <button 
          onClick={handleConnect}
          disabled={connected}
          style={{ 
            padding: '8px 16px', 
            marginRight: '10px',
            backgroundColor: connected ? '#6c757d' : '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: connected ? 'not-allowed' : 'pointer'
          }}
        >
          Connect & Join City
        </button>
        <button 
          onClick={handleDisconnect}
          disabled={!connected}
          style={{ 
            padding: '8px 16px',
            backgroundColor: !connected ? '#6c757d' : '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: !connected ? 'not-allowed' : 'pointer'
          }}
        >
          Disconnect
        </button>
      </div>

      {/* Room Controls */}
      {connected && (
        <div style={{ marginBottom: '20px' }}>
          <button 
            onClick={handleJoinCity}
            style={{ 
              padding: '8px 16px', 
              marginRight: '10px',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Join City Room
          </button>
          <button 
            onClick={handleLeaveCity}
            style={{ 
              padding: '8px 16px', 
              marginRight: '10px',
              backgroundColor: '#ffc107',
              color: 'black',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Leave City Room
          </button>
          <button 
            onClick={handleSendChargingRequest}
            style={{ 
              padding: '8px 16px',
              backgroundColor: '#17a2b8',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Send Charging Request
          </button>
        </div>
      )}

      {/* Messages */}
      <div style={{ marginBottom: '20px' }}>
        <h3>Messages</h3>
        <div style={{ 
          border: '1px solid #ccc', 
          borderRadius: '5px', 
          padding: '10px',
          height: '200px',
          overflowY: 'auto',
          backgroundColor: '#f8f9fa'
        }}>
          {messages.length === 0 ? (
            <p style={{ color: '#6c757d' }}>No messages yet...</p>
          ) : (
            messages.map((msg, index) => (
              <div key={index} style={{ marginBottom: '5px' }}>
                <small style={{ color: '#6c757d' }}>[{msg.timestamp}]</small>
                <span style={{ marginLeft: '10px' }}>{msg.text}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Charging Requests */}
      {chargingRequests.length > 0 && (
        <div>
          <h3>Active Charging Requests</h3>
          <div style={{ border: '1px solid #ccc', borderRadius: '5px', padding: '10px' }}>
            {chargingRequests.map((request, index) => (
              <div key={index} style={{ 
                marginBottom: '10px', 
                padding: '10px', 
                backgroundColor: '#e9ecef',
                borderRadius: '4px'
              }}>
                <p><strong>Request:</strong> {request.message}</p>
                <p><strong>Location:</strong> {request.location}</p>
                <p><strong>City:</strong> {request.city}</p>
                <p><strong>Requester ID:</strong> {request.requesterId}</p>
                <button 
                  onClick={() => handleAcceptRequest(
                    `request-${index}`, 
                    request.requesterId
                  )}
                  style={{ 
                    padding: '6px 12px',
                    backgroundColor: '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Accept Request
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SocketExample;
