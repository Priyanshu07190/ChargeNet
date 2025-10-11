import React, { useState, useEffect } from 'react';
import { AlertTriangle, MapPin, Phone, Navigation as NavigationIcon, DollarSign, X } from 'lucide-react';
import { authService } from '../lib/auth';
import socketService from '../lib/socketService';

interface RescueRequest {
  _id: string;
  requester_name: string;
  requester_phone: string;
  requester_type: string;
  location_name: string;
  coordinates: { lat: number; lng: number };
  vehicle_details?: string;
  battery_level?: string;
  status: string;
  accepted_by?: string;
  accepted_by_name?: string;
  accepted_by_phone?: string;
  price?: number;
  estimated_time?: number;
  payment_status?: string;
  created_at: string;
  accepted_at?: string;
}

const HostRescueRequests: React.FC = () => {
  const [pendingRequests, setPendingRequests] = useState<RescueRequest[]>([]);
  const [acceptedRequests, setAcceptedRequests] = useState<RescueRequest[]>([]);
  const [loading, setLoading] = useState(false);

  // Load pending rescue requests
  const loadPendingRequests = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/rescue-requests/pending', {
        headers: {
          'Authorization': `Bearer ${authService.getCurrentToken()}`
        },
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setPendingRequests(data.requests || []);
      }
    } catch (error) {
      console.error('Error loading pending rescue requests:', error);
    }
  };

  // Load accepted rescue requests
  const loadAcceptedRequests = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/rescue-requests/accepted', {
        headers: {
          'Authorization': `Bearer ${authService.getCurrentToken()}`
        },
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setAcceptedRequests(data.requests || []);
      }
    } catch (error) {
      console.error('Error loading accepted rescue requests:', error);
    }
  };

  useEffect(() => {
    // Load initial data
    loadPendingRequests();
    loadAcceptedRequests();
    
    // Connect to Socket.io
    socketService.connect();
    
    // Listen for new rescue requests (real-time)
    socketService.on('new-rescue-request', (data: any) => {
      console.log('🔔 [HostRescueRequests] New rescue request received:', data);
      loadPendingRequests(); // Reload pending requests
    });

    socketService.on('rescue-request-accepted', (data: any) => {
      console.log('🔔 [HostRescueRequests] Rescue request accepted:', data);
      loadPendingRequests();
      loadAcceptedRequests();
    });

    socketService.on('rescue-in-progress', (data: any) => {
      console.log('🔔 [HostRescueRequests] Rescue in progress:', data);
      loadAcceptedRequests();
    });

    socketService.on('rescue-completed', (data: any) => {
      console.log('🔔 [HostRescueRequests] Rescue completed:', data);
      loadAcceptedRequests();
    });

    socketService.on('rescue-cancelled', (data: any) => {
      console.log('🔔 [HostRescueRequests] Rescue cancelled:', data);
      loadPendingRequests();
      loadAcceptedRequests();
    });
    
    return () => {
      // Clean up Socket.io listeners
      socketService.off('new-rescue-request');
      socketService.off('rescue-request-accepted');
      socketService.off('rescue-in-progress');
      socketService.off('rescue-completed');
      socketService.off('rescue-cancelled');
    };
  }, []);

  // Accept rescue request
  const handleAcceptRequest = async (requestId: string, price: number, estimatedTime: number) => {
    try {
      setLoading(true);
      const response = await fetch(`http://localhost:5000/api/rescue-requests/${requestId}/accept`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authService.getCurrentToken()}`
        },
        credentials: 'include',
        body: JSON.stringify({ price, estimated_time: estimatedTime })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to accept request');
      }

      loadPendingRequests();
      loadAcceptedRequests();
      alert('✅ Rescue request accepted! Navigate to the location.');
    } catch (error: any) {
      alert(error.message || 'Failed to accept rescue request');
    } finally {
      setLoading(false);
    }
  };

  // Reject rescue request
  const handleRejectRequest = async (requestId: string) => {
    try {
      const response = await fetch(`http://localhost:5000/api/rescue-requests/${requestId}/reject`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authService.getCurrentToken()}`
        },
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to reject request');
      }

      loadPendingRequests();
      alert('Request rejected');
    } catch (error) {
      console.error('Error rejecting request:', error);
    }
  };

  // Navigate to rescue location
  const handleNavigate = (lat: number, lng: number) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    window.open(url, '_blank');
  };

  // Mark rescue as started
  const handleStartRescue = async (requestId: string) => {
    try {
      const response = await fetch(`http://localhost:5000/api/rescue-requests/${requestId}/start`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authService.getCurrentToken()}`
        },
        credentials: 'include'
      });

      if (response.ok) {
        loadAcceptedRequests();
        alert('✅ Rescue marked as in progress');
      }
    } catch (error) {
      console.error('Error starting rescue:', error);
    }
  };

  // Mark rescue as complete
  const handleCompleteRescue = async (requestId: string) => {
    try {
      const response = await fetch(`http://localhost:5000/api/rescue-requests/${requestId}/complete`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authService.getCurrentToken()}`
        },
        credentials: 'include'
      });

      if (response.ok) {
        loadAcceptedRequests();
        alert('✅ Rescue completed! Payment received.');
      }
    } catch (error) {
      console.error('Error completing rescue:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Info Banner */}
      <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-2xl shadow-lg p-6 text-white">
        <div className="flex items-start gap-4">
          <AlertTriangle className="w-8 h-8 flex-shrink-0 mt-1" />
          <div>
            <h3 className="text-xl font-bold mb-2">Earn Money by Helping Stranded Drivers!</h3>
            <p className="text-orange-50">Accept rescue requests, bring your portable charger, set your own price, and help EV drivers in need.</p>
          </div>
        </div>
      </div>

      {/* Pending Rescue Requests */}
      {pendingRequests.length > 0 ? (
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></span>
              New Rescue Requests ({pendingRequests.length})
            </h4>
          </div>
          <div className="space-y-4">
            {pendingRequests.map((request) => (
              <RescueRequestCard
                key={request._id}
                request={request}
                onAccept={handleAcceptRequest}
                onReject={handleRejectRequest}
                loading={loading}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-gray-400" />
          </div>
          <h4 className="text-lg font-semibold text-gray-900 mb-2">No Pending Requests</h4>
          <p className="text-gray-600">When drivers need emergency charging, their requests will appear here.</p>
        </div>
      )}

      {/* Your Active Rescues */}
      {acceptedRequests.length > 0 && (
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
          <h4 className="text-xl font-bold text-gray-900 mb-4">Your Active Rescues</h4>
          <div className="space-y-4">
            {acceptedRequests.map((request) => (
              <div key={request._id} className="bg-gradient-to-r from-blue-50 to-green-50 border-2 border-blue-200 rounded-xl p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h5 className="font-bold text-gray-900 text-lg mb-1">{request.requester_name}</h5>
                    <p className="text-sm text-gray-700 flex items-start gap-2">
                      <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span>{request.location_name}</span>
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    request.status === 'accepted' ? 'bg-green-100 text-green-800' :
                    request.status === 'in-progress' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {request.status === 'in-progress' ? 'IN PROGRESS' : 'ACCEPTED'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-white rounded-lg p-3 border border-blue-200">
                    <div className="flex items-center gap-2 text-gray-700">
                      <Phone className="w-4 h-4" />
                      <span className="text-sm font-medium">{request.requester_phone}</span>
                    </div>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-blue-200">
                    <div className="flex items-center gap-2 text-gray-700">
                      <DollarSign className="w-4 h-4" />
                      <span className="text-sm font-medium">₹{request.price}</span>
                    </div>
                  </div>
                  {request.battery_level && (
                    <div className="bg-white rounded-lg p-3 border border-blue-200">
                      <p className="text-xs text-gray-600">Battery</p>
                      <p className="font-semibold text-gray-900">{request.battery_level}</p>
                    </div>
                  )}
                  {request.vehicle_details && (
                    <div className="bg-white rounded-lg p-3 border border-blue-200">
                      <p className="text-xs text-gray-600">Vehicle</p>
                      <p className="font-semibold text-gray-900 text-xs">{request.vehicle_details}</p>
                    </div>
                  )}
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => handleNavigate(request.coordinates.lat, request.coordinates.lng)}
                    className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 flex items-center justify-center gap-2"
                  >
                    <NavigationIcon className="w-5 h-5" />
                    Navigate
                  </button>
                  
                  {request.status === 'accepted' && (
                    <button
                      onClick={() => handleStartRescue(request._id)}
                      className="flex-1 bg-green-600 text-white py-3 rounded-xl font-semibold hover:bg-green-700"
                    >
                      Start Rescue
                    </button>
                  )}
                  
                  {request.status === 'in-progress' && (
                    <button
                      onClick={() => handleCompleteRescue(request._id)}
                      className="flex-1 bg-green-600 text-white py-3 rounded-xl font-semibold hover:bg-green-700"
                    >
                      Complete
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Rescue Request Card Component
interface RescueRequestCardProps {
  request: RescueRequest;
  onAccept: (id: string, price: number, estimatedTime: number) => void;
  onReject: (id: string) => void;
  loading: boolean;
}

const RescueRequestCard: React.FC<RescueRequestCardProps> = ({ request, onAccept, onReject, loading }) => {
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [estimatedTime, setEstimatedTime] = useState('30');
  
  // Predefined price based on distance/urgency (can be calculated later)
  const PREDEFINED_PRICE = 500; // Fixed price for now

  const handleAcceptClick = () => {
    if (!estimatedTime || parseInt(estimatedTime) <= 0) {
      alert('Please enter a valid arrival time');
      return;
    }
    onAccept(request._id, PREDEFINED_PRICE, parseInt(estimatedTime));
    setShowAcceptModal(false);
    setEstimatedTime('30');
  };

  const timeSinceRequest = () => {
    const now = new Date();
    const created = new Date(request.created_at);
    const diffMinutes = Math.floor((now.getTime() - created.getTime()) / (1000 * 60));
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes === 1) return '1 minute ago';
    return `${diffMinutes} minutes ago`;
  };

  return (
    <>
      <div className="bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-300 rounded-xl p-5 relative hover:shadow-lg transition-shadow">
        {/* Emergency Badge */}
        <div className="absolute top-3 right-3 flex flex-col items-end gap-2">
          <span className="px-3 py-1 bg-red-500 text-white rounded-full text-xs font-bold animate-pulse">
            🚨 EMERGENCY
          </span>
          <span className="text-xs text-gray-600 font-medium">{timeSinceRequest()}</span>
        </div>

        {/* Driver Info */}
        <div className="pr-28 mb-4">
          <h5 className="font-bold text-gray-900 text-lg mb-1">{request.requester_name}</h5>
          <p className="text-sm text-gray-700 flex items-start gap-2 mb-2">
            <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0 text-red-500" />
            <span className="font-medium">{request.location_name}</span>
          </p>
          <p className="text-sm text-gray-600 flex items-center gap-2">
            <Phone className="w-4 h-4" />
            <span>{request.requester_phone}</span>
          </p>
        </div>

        {/* Vehicle Details */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          {request.battery_level && (
            <div className="bg-white rounded-lg p-3 border border-red-200">
              <p className="text-gray-600 text-xs mb-1">Battery Level</p>
              <p className="font-bold text-red-600 text-lg">{request.battery_level}</p>
            </div>
          )}
          {request.vehicle_details && (
            <div className="bg-white rounded-lg p-3 border border-red-200">
              <p className="text-gray-600 text-xs mb-1">Vehicle</p>
              <p className="font-semibold text-gray-900 text-sm">{request.vehicle_details}</p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={() => onReject(request._id)}
            disabled={loading}
            className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-xl font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Reject
          </button>
          <button
            onClick={() => setShowAcceptModal(true)}
            disabled={loading}
            className="flex-1 px-4 py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 disabled:opacity-50"
          >
            Accept & Help
          </button>
        </div>
      </div>

      {/* Accept Modal */}
      {showAcceptModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">Set Your Price & ETA</h3>
              <button 
                onClick={() => setShowAcceptModal(false)} 
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-blue-900">
                <strong>Driver:</strong> {request.requester_name}<br />
                <strong>Location:</strong> {request.location_name}
              </p>
            </div>

            <div className="space-y-4">
              {/* Show Predefined Price */}
              <div className="bg-gradient-to-r from-green-50 to-blue-50 border-2 border-green-300 rounded-lg p-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Service Charge (Fixed)
                </label>
                <div className="flex items-center gap-2">
                  <DollarSign className="w-6 h-6 text-green-600" />
                  <span className="text-3xl font-bold text-green-600">₹{PREDEFINED_PRICE}</span>
                </div>
                <p className="text-xs text-gray-600 mt-2">
                  This is the standard emergency rescue service fee
                </p>
              </div>

              {/* Arrival Time Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your Estimated Arrival Time (minutes) *
                </label>
                <input
                  type="number"
                  value={estimatedTime}
                  onChange={(e) => setEstimatedTime(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-lg font-semibold"
                  placeholder="e.g., 30"
                  min="1"
                  max="120"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  How long will it take you to reach the location?
                </p>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowAcceptModal(false)}
                  className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-xl font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAcceptClick}
                  disabled={!estimatedTime || loading}
                  className="flex-1 px-4 py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  ✅ Confirm & Help
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default HostRescueRequests;
