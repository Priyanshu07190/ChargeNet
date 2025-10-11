import React, { useState, useEffect } from 'react';
import { AlertTriangle, MapPin, Loader } from 'lucide-react';
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

const EmergencyRescue: React.FC = () => {
  const [showSOSModal, setShowSOSModal] = useState(false);
  const [myRequests, setMyRequests] = useState<RescueRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [rescueForm, setRescueForm] = useState({
    location_name: '',
    coordinates: { lat: 0, lng: 0 },
    vehicle_details: '',
    battery_level: '',
    notes: ''
  });

  // Load ONLY user's own rescue requests (not requests from others)
  const loadMyRequests = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/rescue-requests/my-requests', {
        headers: {
          'Authorization': `Bearer ${authService.getCurrentToken()}`
        },
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setMyRequests(data.requests || []);
      }
    } catch (error) {
      console.error('Error loading my rescue requests:', error);
    }
  };

  useEffect(() => {
    // Load initial data
    loadMyRequests();
    
    // Connect to Socket.io
    socketService.connect();
    
    // Listen for rescue request updates (real-time)
    socketService.on('rescue-request-accepted', (data: any) => {
      console.log('🔔 [EmergencyRescue] Rescue request accepted:', data);
      loadMyRequests(); // Reload to get updated status
    });

    socketService.on('rescue-in-progress', (data: any) => {
      console.log('🔔 [EmergencyRescue] Rescue in progress:', data);
      loadMyRequests();
    });

    socketService.on('rescue-completed', (data: any) => {
      console.log('🔔 [EmergencyRescue] Rescue completed:', data);
      loadMyRequests();
    });

    socketService.on('rescue-cancelled', (data: any) => {
      console.log('🔔 [EmergencyRescue] Rescue cancelled:', data);
      loadMyRequests();
    });
    
    return () => {
      // Clean up Socket.io listeners
      socketService.off('rescue-request-accepted');
      socketService.off('rescue-in-progress');
      socketService.off('rescue-completed');
      socketService.off('rescue-cancelled');
    };
  }, []);

  // Get current location
  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setRescueForm(prev => ({
            ...prev,
            coordinates: {
              lat: position.coords.latitude,
              lng: position.coords.longitude
            }
          }));
        },
        (error) => {
          console.error('Error getting location:', error);
          alert('Please enable location services to create a rescue request');
        }
      );
    }
  };

  // Create SOS rescue request
  const handleSOSRequest = async () => {
    if (!rescueForm.location_name || !rescueForm.coordinates.lat) {
      alert('Please provide your location');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch('http://localhost:5000/api/rescue-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authService.getCurrentToken()}`
        },
        credentials: 'include',
        body: JSON.stringify(rescueForm)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create rescue request');
      }

      await response.json();
      setShowSOSModal(false);
      setRescueForm({
        location_name: '',
        coordinates: { lat: 0, lng: 0 },
        vehicle_details: '',
        battery_level: '',
        notes: ''
      });
      loadMyRequests();
      alert('🚨 SOS sent! Nearby hosts have been notified.');
    } catch (error: any) {
      alert(error.message || 'Failed to send SOS request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* SOS Button - Always visible */}
      <div className="bg-gradient-to-r from-red-500 to-orange-500 rounded-2xl shadow-2xl p-8 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full -mr-32 -mt-32"></div>
        <div className="relative">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-2xl font-bold mb-2">Emergency Rescue Service</h3>
              <p className="text-red-100">Stranded with dead battery? Get portable charging help!</p>
            </div>
            <AlertTriangle className="w-16 h-16 text-white opacity-80 animate-pulse" />
          </div>
          <button
            onClick={() => {
              getCurrentLocation();
              setShowSOSModal(true);
            }}
            className="w-full bg-white text-red-600 py-4 rounded-xl font-bold text-lg hover:bg-red-50 transition-all shadow-lg flex items-center justify-center gap-3"
          >
            <AlertTriangle className="w-6 h-6" />
            REQUEST EMERGENCY RESCUE
          </button>
        </div>
      </div>

      {/* My Active Requests */}
      {myRequests.length > 0 && (
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
          <h4 className="text-xl font-bold text-gray-900 mb-4">Your Rescue Requests</h4>
          <div className="space-y-4">
            {myRequests.filter(req => req.status !== 'completed' && req.status !== 'cancelled').map((request) => (
              <div key={request._id} className="bg-gray-50 border-2 border-gray-200 rounded-xl p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      request.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      request.status === 'accepted' ? 'bg-green-100 text-green-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {request.status.toUpperCase()}
                    </span>
                  </div>
                  <MapPin className="w-5 h-5 text-gray-600" />
                </div>

                <div className="space-y-2 text-sm">
                  <p className="text-gray-700"><strong>Location:</strong> {request.location_name}</p>
                  {request.battery_level && (
                    <p className="text-gray-700"><strong>Battery:</strong> {request.battery_level}</p>
                  )}
                  {request.status === 'accepted' && request.accepted_by_name && (
                    <div className="bg-gradient-to-r from-green-50 to-blue-50 border-2 border-green-400 rounded-lg p-4 mt-3">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-2xl">✅</span>
                        <p className="text-green-900 font-bold text-lg">Help is on the way!</p>
                      </div>
                      
                      <div className="space-y-2 bg-white rounded-lg p-3 mb-3">
                        <p className="text-gray-900"><strong>Host:</strong> {request.accepted_by_name}</p>
                        <p className="text-gray-900"><strong>Phone:</strong> {request.accepted_by_phone}</p>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white rounded-lg p-3 border-2 border-green-300">
                          <p className="text-xs text-gray-600 mb-1">Service Cost</p>
                          <p className="text-2xl font-bold text-green-600">₹{request.price}</p>
                        </div>
                        <div className="bg-white rounded-lg p-3 border-2 border-blue-300">
                          <p className="text-xs text-gray-600 mb-1">Arrival Time</p>
                          <p className="text-2xl font-bold text-blue-600">~{request.estimated_time} min</p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {request.status === 'in-progress' && request.accepted_by_name && (
                    <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-400 rounded-lg p-4 mt-3">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-2xl animate-pulse">🚗</span>
                        <p className="text-blue-900 font-bold text-lg">Host is arriving now!</p>
                      </div>
                      
                      <div className="space-y-2 bg-white rounded-lg p-3 mb-3">
                        <p className="text-gray-900"><strong>Host:</strong> {request.accepted_by_name}</p>
                        <p className="text-gray-900"><strong>Phone:</strong> {request.accepted_by_phone}</p>
                      </div>
                      
                      <div className="bg-white rounded-lg p-3 border-2 border-blue-300">
                        <p className="text-xs text-gray-600 mb-1">Total Cost</p>
                        <p className="text-2xl font-bold text-blue-600">₹{request.price}</p>
                      </div>
                      
                      <p className="text-sm text-blue-700 mt-3 font-medium">💡 Please have the payment ready</p>
                    </div>
                  )}
                  
                  {request.status === 'pending' && (
                    <p className="text-yellow-700 mt-2">⏳ Waiting for a nearby host to accept...</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SOS Modal */}
      {showSOSModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">Emergency Rescue Request</h3>
              <button onClick={() => setShowSOSModal(false)} className="text-gray-400 hover:text-gray-600">
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Your Current Location *</label>
                <input
                  type="text"
                  value={rescueForm.location_name}
                  onChange={(e) => setRescueForm({ ...rescueForm, location_name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                  placeholder="e.g., Near ABC Mall, XYZ Road"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Vehicle Details</label>
                <input
                  type="text"
                  value={rescueForm.vehicle_details}
                  onChange={(e) => setRescueForm({ ...rescueForm, vehicle_details: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                  placeholder="e.g., Tata Nexon EV - MH12AB1234"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Battery Level</label>
                <select
                  value={rescueForm.battery_level}
                  onChange={(e) => setRescueForm({ ...rescueForm, battery_level: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                >
                  <option value="">Select...</option>
                  <option value="0%">0% (Dead)</option>
                  <option value="1-5%">1-5%</option>
                  <option value="5-10%">5-10%</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Additional Notes</label>
                <textarea
                  value={rescueForm.notes}
                  onChange={(e) => setRescueForm({ ...rescueForm, notes: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                  placeholder="Any additional information..."
                />
              </div>

              {/* Show Predefined Service Cost */}
              <div className="bg-gradient-to-r from-blue-50 to-green-50 border-2 border-blue-300 rounded-lg p-4">
                <p className="text-sm font-medium text-gray-700 mb-2">💰 Service Cost</p>
                <div className="flex items-center gap-2">
                  <span className="text-3xl font-bold text-blue-600">₹500</span>
                  <span className="text-sm text-gray-600">(Standard Emergency Fee)</span>
                </div>
                <p className="text-xs text-gray-600 mt-2">
                  ⚡ This will be charged when the host completes the rescue
                </p>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowSOSModal(false)}
                  className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-xl font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSOSRequest}
                  disabled={loading || !rescueForm.location_name}
                  className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? <Loader className="w-5 h-5 animate-spin" /> : <AlertTriangle className="w-5 h-5" />}
                  {loading ? 'Sending...' : 'Send SOS'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmergencyRescue;
