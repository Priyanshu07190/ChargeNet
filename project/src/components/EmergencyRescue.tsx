// #
import React, { useState, useEffect } from 'react';
import { AlertTriangle, MapPin, Loader, Trash2, X } from 'lucide-react';
import { authService } from '../lib/auth';
import socketService from '../lib/socketService';
import LocationPicker from './LocationPicker';

// Always use the same backend URL as apiService (env var → production or localhost)
const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/api$/, '');

// Helper: clear stale session without causing a redirect loop
const clearStaleSession = async () => {
  try {
    await fetch(`${API_BASE}/api/auth/clear-session`, { credentials: 'include' });
  } catch (_) { /* ignore */ }
  await authService.signOut();
};

interface ActiveRescueMapProps {
  requestId: string;
  driverCoords: { lat: number; lng: number };
  initialHostCoords?: { lat: number; lng: number } | null;
}

const ActiveRescueMap: React.FC<ActiveRescueMapProps> = ({ requestId, driverCoords, initialHostCoords }) => {
  const mapContainerRef = React.useRef<HTMLDivElement>(null);
  const mapInstanceRef = React.useRef<any>(null);
  const driverMarkerRef = React.useRef<any>(null);
  const hostMarkerRef = React.useRef<any>(null);
  const [hostCoords, setHostCoords] = useState<{ lat: number; lng: number } | null>(initialHostCoords || null);

  useEffect(() => {
    // Listen for host location updates via WebSocket
    const handleHostLocationUpdate = (data: any) => {
      console.log("🛰️ Driver map received host location update:", data);
      setHostCoords({ lat: data.lat, lng: data.lng });
    };

    socketService.on(`rescue-location-${requestId}`, handleHostLocationUpdate);

    return () => {
      socketService.off(`rescue-location-${requestId}`, handleHostLocationUpdate);
    };
  }, [requestId]);

  // Initialize map
  useEffect(() => {
    if (mapContainerRef.current && !mapInstanceRef.current && window.L) {
      const L = window.L;

      // Initialize map centered at driver
      mapInstanceRef.current = L.map(mapContainerRef.current).setView([driverCoords.lat, driverCoords.lng], 14);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(mapInstanceRef.current);

      // Create Driver Marker (Red)
      const redIcon = L.icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
      });

      driverMarkerRef.current = L.marker([driverCoords.lat, driverCoords.lng], { icon: redIcon })
        .addTo(mapInstanceRef.current)
        .bindPopup('🚨 Your Stranded Location')
        .openPopup();
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        driverMarkerRef.current = null;
        hostMarkerRef.current = null;
      }
    };
  }, [driverCoords]);

  // Update or create Host Marker when hostCoords changes
  useEffect(() => {
    if (mapInstanceRef.current && window.L && hostCoords) {
      const L = window.L;

      const blueIcon = L.icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
      });

      if (hostMarkerRef.current) {
        // Move existing marker
        hostMarkerRef.current.setLatLng([hostCoords.lat, hostCoords.lng]);
      } else {
        // Create new marker
        hostMarkerRef.current = L.marker([hostCoords.lat, hostCoords.lng], { icon: blueIcon })
          .addTo(mapInstanceRef.current)
          .bindPopup('🚗 Rescue Host Approaching')
          .openPopup();
      }

      // Fit bounds to show both markers
      const bounds = L.latLngBounds([
        [driverCoords.lat, driverCoords.lng],
        [hostCoords.lat, hostCoords.lng]
      ]);
      mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [hostCoords, driverCoords]);

  return (
    <div className="relative rounded-xl overflow-hidden border border-gray-300 mt-4 h-64 shadow-inner">
      <div ref={mapContainerRef} className="w-full h-full" style={{ minHeight: '250px' }} />
      {!hostCoords && (
        <div className="absolute inset-0 bg-black bg-opacity-35 flex items-center justify-center text-white text-sm font-semibold px-4 text-center">
          ⏳ Waiting for Host to start live location sharing...
        </div>
      )}
    </div>
  );
};

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
  const [cancellingRequestId, setCancellingRequestId] = useState<string | null>(null);
  const [detectingLocation, setDetectingLocation] = useState(false);
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
      const response = await fetch(`${API_BASE}/api/rescue-requests/my-requests`, {
        headers: {
          'Authorization': `Bearer ${authService.getCurrentToken()}`
        },
        credentials: 'include'
      });
      // On 403, silently skip — user will be prompted when they try to submit SOS
      if (response.status === 403) {
        console.warn('⚠️ 403 on my-requests — skipping silently');
        return;
      }
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

  // Get current location with reverse geocoding
  const getCurrentLocation = async () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }

    setDetectingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setRescueForm(prev => ({
          ...prev,
          coordinates: { lat: latitude, lng: longitude }
        }));

        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`
          );
          if (response.ok) {
            const data = await response.json();
            if (data.display_name) {
              setRescueForm(prev => ({
                ...prev,
                location_name: data.display_name
              }));
            } else {
              setRescueForm(prev => ({
                ...prev,
                location_name: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
              }));
            }
          } else {
            setRescueForm(prev => ({
              ...prev,
              location_name: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
            }));
          }
        } catch (error) {
          console.error('Error reverse geocoding:', error);
          setRescueForm(prev => ({
            ...prev,
            location_name: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
          }));
        } finally {
          setDetectingLocation(false);
        }
      },
      (error) => {
        console.error('Error getting location:', error);
        alert('Please enable location services to auto-detect your location');
        setDetectingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Create SOS rescue request
  const handleSOSRequest = async () => {
    if (!rescueForm.location_name || !rescueForm.coordinates.lat) {
      alert('Please provide your location');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/api/rescue-requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authService.getCurrentToken()}`
        },
        credentials: 'include',
        body: JSON.stringify(rescueForm)
      });

      // If session is stale, clear it and tell user to re-login
      if (response.status === 403) {
        await clearStaleSession();
        alert('⚠️ Your session has expired. Please log in again.');
        // Let AuthContext detect the signed-out state and redirect naturally
        return;
      }

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

  const handleDeleteRequest = async (requestId: string) => {
    if (!confirm('Delete this emergency request? Hosts will no longer see it as active.')) {
      return;
    }

    try {
      setCancellingRequestId(requestId);
      const response = await fetch(`${API_BASE}/api/rescue-requests/${requestId}/cancel`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authService.getCurrentToken()}`
        },
        credentials: 'include'
      });

      if (response.status === 403) {
        await clearStaleSession();
        alert('Your session has expired. Please log in again.');
        return;
      }

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete rescue request');
      }

      setMyRequests(prev => prev.filter(request => request._id !== requestId));
      await loadMyRequests();
      alert('Emergency request deleted.');
    } catch (error: any) {
      alert(error.message || 'Failed to delete rescue request');
    } finally {
      setCancellingRequestId(null);
    }
  };

  const activeRequests = myRequests.filter(req => req.status !== 'completed' && req.status !== 'cancelled');


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
      {activeRequests.length > 0 && (
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
          <h4 className="text-xl font-bold text-gray-900 mb-4">Your Rescue Requests</h4>
          <div className="space-y-4">
            {activeRequests.map((request) => (
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
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleDeleteRequest(request._id)}
                      disabled={cancellingRequestId === request._id}
                      className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                      title="Delete this emergency request"
                    >
                      {cancellingRequestId === request._id ? (
                        <Loader className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                      <span>Delete</span>
                    </button>
                    <MapPin className="w-5 h-5 text-gray-600" />
                  </div>
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
                  
                  
                  {/* Real-time map tracking when accepted/in-progress */}
                  {(request.status === 'accepted' || request.status === 'in-progress') && (
                    <ActiveRescueMap
                      requestId={request._id}
                      driverCoords={request.coordinates}
                    />
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
              <button onClick={() => setShowSOSModal(false)} className="text-gray-400 hover:text-gray-600" aria-label="Close emergency request modal">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <LocationPicker
                  label="Your Current Location *"
                  value={rescueForm.location_name}
                  onChange={(address, coords) => {
                    setRescueForm(prev => ({
                      ...prev,
                      location_name: address,
                      coordinates: coords || prev.coordinates
                    }));
                  }}
                  placeholder="Enter address or select on map"
                />
                
                {/* Auto-detect button inside the modal */}
                <div className="flex justify-between items-center mt-2">
                  <button
                    type="button"
                    onClick={getCurrentLocation}
                    disabled={detectingLocation}
                    className="flex items-center gap-1.5 text-xs font-semibold text-red-600 hover:text-red-700 transition-colors"
                  >
                    {detectingLocation ? (
                      <>
                        <Loader className="w-3.5 h-3.5 animate-spin" />
                        <span>Detecting your location...</span>
                      </>
                    ) : (
                      <>
                        <MapPin className="w-3.5 h-3.5" />
                        <span>📍 Auto-detect My Live Location</span>
                      </>
                    )}
                  </button>
                  {rescueForm.coordinates.lat !== 0 && (
                    <span className="text-[10px] text-gray-500">
                      Coords: {rescueForm.coordinates.lat.toFixed(5)}, {rescueForm.coordinates.lng.toFixed(5)}
                    </span>
                  )}
                </div>
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
