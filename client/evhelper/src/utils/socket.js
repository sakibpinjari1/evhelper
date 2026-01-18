import { io } from 'socket.io-client';

class SocketService {
  constructor() {
    this.socket = null;
    this.connected = false;
  }

  /**
   * Initialize socket connection
   * @param {string} serverUrl - Socket server URL
   * @param {string} city - User's city for room joining
   * @param {string} token - Authentication token (optional)
   */
  connect(serverUrl = 'http://localhost:5000', city = null, token = null) {
    if (this.socket && this.connected) {
      console.log('Socket already connected');
      return this.socket;
    }

    // Configure socket options
    const options = {
      transports: ['websocket', 'polling'],
      timeout: 20000,
      forceNew: true
    };

    // Add authentication if token provided
    if (token) {
      options.auth = {
        token: token
      };
    }

    this.socket = io(serverUrl, options);

    // Connection events
    this.socket.on('connect', () => {
      this.connected = true;
      console.log('Connected to socket server with ID:', this.socket.id);
      
      // Join city room if city provided
      if (city) {
        this.joinCity(city);
      }
    });

    this.socket.on('disconnect', (reason) => {
      this.connected = false;
      console.log('Disconnected from socket server:', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    // Built-in event handlers
    this.setupEventHandlers();

    return this.socket;
  }

  /**
   * Join a city-specific room
   * @param {string} city - City name to join
   */
  joinCity(city) {
    if (!this.socket || !this.connected) {
      console.error('Socket not connected. Cannot join city room.');
      return false;
    }

    this.socket.emit('join-city', { city });
    console.log(`Attempting to join city room for: ${city}`);
    return true;
  }

  /**
   * Leave current city room
   */
  leaveCity() {
    if (!this.socket || !this.connected) {
      console.error('Socket not connected. Cannot leave city room.');
      return false;
    }

    this.socket.emit('leave-city');
    console.log('Leaving current city room');
    return true;
  }

  /**
   * Send a charging request to users in the same city
   * @param {Object} requestData - Charging request data
   */
  sendChargingRequest(requestData) {
    if (!this.socket || !this.connected) {
      console.error('Socket not connected. Cannot send charging request.');
      return false;
    }

    this.socket.emit('charging-request', requestData);
    console.log('Charging request sent:', requestData);
    return true;
  }

  /**
   * Accept a charging request
   * @param {string} requestId - ID of the charging request
   * @param {string} requesterId - Socket ID of the requester
   */
  acceptChargingRequest(requestId, requesterId) {
    if (!this.socket || !this.connected) {
      console.error('Socket not connected. Cannot accept charging request.');
      return false;
    }

    this.socket.emit('accept-charging-request', { requestId, requesterId });
    console.log(`Charging request ${requestId} accepted`);
    return true;
  }

  /**
   * Get active requests in the city
   * @returns {Array} - Array of active requests
   */
  getActiveRequests() {
    // This would typically make an API call
    // For demo purposes, we'll return a mock array
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve([
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
            createdAt: new Date(Date.now() - 300000)
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
            createdAt: new Date(Date.now() - 600000)
          }
        ]);
      }, 500);
    });
  }

  /**
   * Setup built-in event handlers
   */
  setupEventHandlers() {
    // City room events
    this.socket.on('city-joined', (data) => {
      console.log('Successfully joined city room:', data);
    });

    this.socket.on('city-left', (data) => {
      console.log('Left city room:', data);
    });

    this.socket.on('user-joined-city', (data) => {
      console.log('New user joined city:', data);
    });

    this.socket.on('user-left-city', (data) => {
      console.log('User left city:', data);
    });

    // Charging request events
    this.socket.on('charging-request', (data) => {
      console.log('New charging request received:', data);
    });

    this.socket.on('charging-request-accepted', (data) => {
      console.log('Your charging request was accepted:', data);
    });

    this.socket.on('request-accepted-notification', (data) => {
      console.log('Charging request accepted notification:', data);
    });

    // Error handling
    this.socket.on('error', (data) => {
      console.error('Socket error:', data);
    });
  }

  /**
   * Add custom event listener
   * @param {string} event - Event name
   * @param {Function} callback - Event callback function
   */
  on(event, callback) {
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  /**
   * Remove event listener
   * @param {string} event - Event name
   * @param {Function} callback - Event callback function
   */
  off(event, callback) {
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }

  /**
   * Disconnect socket
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
      console.log('Socket disconnected manually');
    }
  }

  /**
   * Get connection status
   * @returns {boolean} - Connection status
   */
  isConnected() {
    return this.connected && this.socket?.connected;
  }

  /**
   * Get socket ID
   * @returns {string|null} - Socket ID or null if not connected
   */
  getSocketId() {
    return this.socket?.id || null;
  }
}

// Create and export singleton instance
const socketService = new SocketService();
export default socketService;
