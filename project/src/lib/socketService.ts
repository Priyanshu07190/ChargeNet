import { io, Socket } from 'socket.io-client';

// Get WebSocket URL from environment variable
// Remove '/api' from the URL if present, and use base URL for socket connection
const getSocketUrl = () => {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
  return apiUrl.replace('/api', '');
};

class SocketService {
  private socket: Socket | null = null;
  private isConnected = false;

  connect() {
    if (this.socket?.connected) {
      return this.socket;
    }

    const socketUrl = getSocketUrl();
    console.log('🔌 Connecting to WebSocket:', socketUrl);

    this.socket = io(socketUrl, {
      withCredentials: true,
      transports: ['websocket', 'polling']
    });

    this.socket.on('connect', () => {
      console.log('🔌 WebSocket connected');
      this.isConnected = true;
      
      // Join the charger updates room for real-time availability changes
      this.socket?.emit('join-room', 'charger-updates');
    });

    this.socket.on('disconnect', () => {
      console.log('🔌 WebSocket disconnected');
      this.isConnected = false;
    });

    this.socket.on('connect_error', (error) => {
      console.error('🔌 WebSocket connection error:', error);
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  // Listen for charger availability changes
  onChargerAvailabilityChanged(callback: (data: {
    charger_id: string;
    available: boolean;
    status: string;
  }) => void) {
    if (!this.socket) {
      this.connect();
    }
    
    this.socket?.on('charger-availability-changed', callback);
  }

  // Listen for charger list changes (add/delete)
  onChargerListChanged(callback: (data: {
    type: 'charger-added' | 'charger-deleted';
    charger?: any;
    charger_id?: string;
    location: string;
  }) => void) {
    if (!this.socket) {
      this.connect();
    }
    
    this.socket?.on('charger-list-changed', callback);
  }

  // Remove listener for charger availability changes
  offChargerAvailabilityChanged(callback?: (data: any) => void) {
    this.socket?.off('charger-availability-changed', callback);
  }

  // Remove listener for charger list changes
  offChargerListChanged(callback?: (data: any) => void) {
    this.socket?.off('charger-list-changed', callback);
  }

  // Listen for booking list changes (create/update/cancel)
  onBookingListChanged(callback: (data: {
    type: 'booking-created' | 'booking-updated';
    booking: any;
    user_id?: string;
    charger_id?: string;
    booking_context?: string;
    previous_status?: string;
    new_status?: string;
  }) => void) {
    if (!this.socket) {
      this.connect();
    }
    
    this.socket?.on('booking-list-changed', callback);
  }

  // Remove listener for booking list changes
  offBookingListChanged(callback?: (data: any) => void) {
    this.socket?.off('booking-list-changed', callback);
  }

  // Join user-specific room for booking updates
  joinUserRoom(userId: string) {
    this.socket?.emit('join-user-room', userId);
  }

  // Join specific rooms for targeted updates
  joinHostRoom(hostId: string) {
    this.socket?.emit('join-host-room', hostId);
  }

  joinLocationRoom(location: string) {
    this.socket?.emit('join-location-room', location);
  }

  // Generic event listener (for any event)
  on(eventName: string, callback: (data: any) => void) {
    if (!this.socket) {
      this.connect();
    }
    this.socket?.on(eventName, callback);
  }

  // Generic event remover (for any event)
  off(eventName: string, callback?: (data: any) => void) {
    this.socket?.off(eventName, callback);
  }

  // Emit generic events
  emit(eventName: string, data?: any) {
    this.socket?.emit(eventName, data);
  }

  getSocket() {
    return this.socket;
  }

  isSocketConnected() {
    return this.isConnected && this.socket?.connected;
  }
}

// Export a singleton instance
export const socketService = new SocketService();
export default socketService;
