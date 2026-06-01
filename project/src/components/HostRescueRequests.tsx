// #
import React, { useState, useEffect, useRef } from 'react';
import { AlertTriangle, MapPin, Phone, Navigation as NavigationIcon, DollarSign, X, ChevronRight } from 'lucide-react';
import { authService } from '../lib/auth';
import socketService from '../lib/socketService';

// Always use the same backend URL as apiService (env var → production or localhost)
const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/api$/, '');

const buildGoogleMapsNavigationUrl = (
  destination: { lat: number; lng: number },
  origin?: { lat: number; lng: number }
) => {
  const params = new URLSearchParams({
    api: '1',
    destination: `${destination.lat},${destination.lng}`,
    travelmode: 'driving',
    dir_action: 'navigate',
  });

  if (origin) {
    params.set('origin', `${origin.lat},${origin.lng}`);
  }

  return `https://www.google.com/maps/dir/?${params.toString()}`;
};

const openGoogleMapsNavigation = (
  destination: { lat: number; lng: number },
  locationName: string
) => {
  const openMaps = (origin?: { lat: number; lng: number }) => {
    const url = buildGoogleMapsNavigationUrl(destination, origin);
    const opened = window.open(url, '_blank', 'noopener,noreferrer');
    if (!opened) {
      window.location.href = url;
    }
  };

  if (!navigator.geolocation) {
    openMaps();
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (position) => {
      openMaps({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      });
    },
    () => {
      console.warn(`Opening Google Maps without origin for ${locationName}`);
      openMaps();
    },
    { enableHighAccuracy: true, timeout: 7000, maximumAge: 30000 }
  );
};

// ─── In-App Navigation Modal ──────────────────────────────────────────────────
interface NavigationModalProps {
  destination: { lat: number; lng: number; name: string };
  onClose: () => void;
}

const NavigationModal: React.FC<NavigationModalProps> = ({ destination, onClose }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const routeLayerRef = useRef<any>(null);
  const hostMarkerRef = useRef<any>(null);
  const watchIdRef = useRef<number | null>(null);
  const [hostCoords, setHostCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [routeInfo, setRouteInfo] = useState<{ distance: string; duration: string } | null>(null);
  const [status, setStatus] = useState<'locating' | 'routing' | 'ready' | 'error'>('locating');

  // Fetch real road route from OSRM
  const fetchRoute = async (from: { lat: number; lng: number }, to: { lat: number; lng: number }) => {
    try {
      setStatus('routing');
      const url = `https://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const distanceKm = (route.distance / 1000).toFixed(1);
        const durationMin = Math.ceil(route.duration / 60);
        setRouteInfo({ distance: `${distanceKm} km`, duration: `${durationMin} min` });

        const L = window.L;
        if (routeLayerRef.current) mapInstanceRef.current.removeLayer(routeLayerRef.current);
        routeLayerRef.current = L.geoJSON(route.geometry, {
          style: { color: '#3b82f6', weight: 5, opacity: 0.85, dashArray: '8,4' }
        }).addTo(mapInstanceRef.current);

        // Fit map to route
        mapInstanceRef.current.fitBounds(routeLayerRef.current.getBounds(), { padding: [40, 40] });
        setStatus('ready');
      }
    } catch (e) {
      console.error('Route fetch error:', e);
      // Fallback: draw straight line
      const L = window.L;
      if (routeLayerRef.current) mapInstanceRef.current.removeLayer(routeLayerRef.current);
      routeLayerRef.current = L.polyline([[from.lat, from.lng], [to.lat, to.lng]], {
        color: '#3b82f6', weight: 4, dashArray: '8,4'
      }).addTo(mapInstanceRef.current);
      mapInstanceRef.current.fitBounds(routeLayerRef.current.getBounds(), { padding: [40, 40] });
      setStatus('ready');
    }
  };

  // Init map + get host location
  useEffect(() => {
    if (!mapRef.current || !window.L) return;
    const L = window.L;

    mapInstanceRef.current = L.map(mapRef.current).setView(
      [destination.lat, destination.lng], 13
    );
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '\u00a9 OpenStreetMap contributors'
    }).addTo(mapInstanceRef.current);

    // Driver destination marker (Red)
    const redIcon = L.icon({
      iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
      iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
    });
    L.marker([destination.lat, destination.lng], { icon: redIcon })
      .addTo(mapInstanceRef.current)
      .bindPopup(`\ud83d\udea8 ${destination.name}`)
      .openPopup();

    // Get host location
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const from = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setHostCoords(from);

        const greenIcon = L.icon({
          iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
          iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
        });
        hostMarkerRef.current = L.marker([from.lat, from.lng], { icon: greenIcon })
          .addTo(mapInstanceRef.current)
          .bindPopup('\ud83d\udeb6 Your Location');

        fetchRoute(from, destination);

        // Live tracking
        watchIdRef.current = navigator.geolocation.watchPosition((p) => {
          const updated = { lat: p.coords.latitude, lng: p.coords.longitude };
          setHostCoords(updated);
          hostMarkerRef.current?.setLatLng([updated.lat, updated.lng]);
          fetchRoute(updated, destination);
        }, undefined, { enableHighAccuracy: true });
      },
      () => setStatus('error'),
      { enableHighAccuracy: true, timeout: 10000 }
    );

    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
      mapInstanceRef.current?.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gray-950">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-900 border-b border-gray-700 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center">
            <NavigationIcon className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-sm">Navigating to Driver</p>
            <p className="text-gray-400 text-xs truncate max-w-[200px]">{destination.name}</p>
          </div>
        </div>
        <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center hover:bg-gray-600 transition">
          <X className="w-4 h-4 text-white" />
        </button>
      </div>

      {/* Route info bar */}
      {routeInfo && (
        <div className="flex items-center justify-around bg-blue-600 px-4 py-2">
          <div className="text-center">
            <p className="text-white font-bold text-lg">{routeInfo.distance}</p>
            <p className="text-blue-200 text-xs">Distance</p>
          </div>
          <div className="w-px h-8 bg-blue-400" />
          <div className="text-center">
            <p className="text-white font-bold text-lg">{routeInfo.duration}</p>
            <p className="text-blue-200 text-xs">ETA</p>
          </div>
          <div className="w-px h-8 bg-blue-400" />
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-green-400 animate-pulse" />
            <p className="text-blue-200 text-xs">Live GPS</p>
          </div>
        </div>
      )}

      {/* Status messages */}
      {status === 'locating' && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-gray-950 bg-opacity-80">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-white font-semibold">Getting your location...</p>
          </div>
        </div>
      )}
      {status === 'error' && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-gray-950 bg-opacity-80">
          <div className="text-center px-6">
            <p className="text-red-400 text-4xl mb-3">⚠️</p>
            <p className="text-white font-semibold mb-2">Location access denied</p>
            <p className="text-gray-400 text-sm">Please allow location access in your browser settings.</p>
          </div>
        </div>
      )}

      {/* Map fills remaining space */}
      <div ref={mapRef} className="flex-1 w-full" />

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 bg-gray-900 py-2 border-t border-gray-700">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-green-500" />
          <span className="text-gray-300 text-xs">You</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-red-500" />
          <span className="text-gray-300 text-xs">Driver</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-8 h-0.5 bg-blue-400" style={{ borderTop: '2px dashed #3b82f6', background: 'none' }} />
          <span className="text-gray-300 text-xs">Route</span>
        </div>
      </div>
    </div>
  );
};
// ─────────────────────────────────────────────────────────────────────────────


interface HostActiveRescueMapProps {
  requestId: string;
  driverCoords: { lat: number; lng: number };
}

const HostActiveRescueMap: React.FC<HostActiveRescueMapProps> = ({ requestId, driverCoords }) => {
  const mapContainerRef = React.useRef<HTMLDivElement>(null);
  const mapInstanceRef = React.useRef<any>(null);
  const driverMarkerRef = React.useRef<any>(null);
  const hostMarkerRef = React.useRef<any>(null);
  const [hostCoords, setHostCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  const watchIdRef = React.useRef<number | null>(null);

  // Start live location sharing
  const toggleLocationSharing = () => {
    if (isSharing) {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      setIsSharing(false);
      setHostCoords(null);
    } else {
      if (navigator.geolocation) {
        setIsSharing(true);
        watchIdRef.current = navigator.geolocation.watchPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            console.log("🛰️ Host sharing live location:", latitude, longitude);
            setHostCoords({ lat: latitude, lng: longitude });
            socketService.emit('host-location-update', {
              requestId,
              lat: latitude,
              lng: longitude
            });
          },
          (error) => {
            console.error("Error watchPosition:", error);
            alert("Failed to access your live GPS location. Please check your browser permissions.");
            setIsSharing(false);
          },
          { enableHighAccuracy: true, timeout: 10000 }
        );
      } else {
        alert("Geolocation is not supported by your browser.");
      }
    }
  };

  // Clean up geolocation watch on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  // Initialize Map
  useEffect(() => {
    if (mapContainerRef.current && !mapInstanceRef.current && window.L) {
      const L = window.L;

      mapInstanceRef.current = L.map(mapContainerRef.current).setView([driverCoords.lat, driverCoords.lng], 14);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(mapInstanceRef.current);

      // Driver marker (Red)
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
        .bindPopup('🚨 Stranded Driver Location')
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

  // Update Host Marker
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
        hostMarkerRef.current.setLatLng([hostCoords.lat, hostCoords.lng]);
      } else {
        hostMarkerRef.current = L.marker([hostCoords.lat, hostCoords.lng], { icon: blueIcon })
          .addTo(mapInstanceRef.current)
          .bindPopup('🚗 Your Live Location')
          .openPopup();
      }

      // Auto fit bounds
      const bounds = L.latLngBounds([
        [driverCoords.lat, driverCoords.lng],
        [hostCoords.lat, hostCoords.lng]
      ]);
      mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [hostCoords, driverCoords]);

  return (
    <div className="mt-4 bg-white rounded-xl p-4 border border-blue-200">
      <div className="flex items-center justify-between mb-3">
        <h6 className="font-semibold text-gray-800 text-sm flex items-center gap-2">
          🛰️ Live GPS Location Sharing
        </h6>
        <button
          onClick={toggleLocationSharing}
          className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all shadow-md ${
            isSharing 
              ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse' 
              : 'bg-gradient-to-r from-blue-600 to-green-600 hover:shadow-lg text-white'
          }`}
        >
          {isSharing ? '🔴 Stop Sharing' : '🛰️ Share Live Location'}
        </button>
      </div>

      <div className="relative rounded-lg overflow-hidden border border-gray-300 h-64">
        <div ref={mapContainerRef} className="w-full h-full" style={{ minHeight: '250px' }} />
        {!isSharing && (
          <div className="absolute inset-0 bg-black bg-opacity-35 flex items-center justify-center text-white text-xs font-semibold px-4 text-center">
            📍 Enable live location sharing to track your progress relative to the driver in real-time.
          </div>
        )}
      </div>
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

const HostRescueRequests: React.FC = () => {
  const [pendingRequests, setPendingRequests] = useState<RescueRequest[]>([]);
  const [acceptedRequests, setAcceptedRequests] = useState<RescueRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [navigationTarget, setNavigationTarget] = useState<{ lat: number; lng: number; name: string } | null>(null);

  // Load pending rescue requests
  const loadPendingRequests = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/rescue-requests/pending`, {
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
      const response = await fetch(`${API_BASE}/api/rescue-requests/accepted`, {
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
      const response = await fetch(`${API_BASE}/api/rescue-requests/${requestId}/accept`, {
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
      const response = await fetch(`${API_BASE}/api/rescue-requests/${requestId}/reject`, {
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

  // Navigate to rescue location in Google Maps, ready for turn-by-turn navigation.
  const handleNavigate = (lat: number, lng: number, locationName: string) => {
    openGoogleMapsNavigation({ lat, lng }, locationName);
  };

  // Mark rescue as started
  const handleStartRescue = async (requestId: string) => {
    try {
      const response = await fetch(`${API_BASE}/api/rescue-requests/${requestId}/start`, {
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
      const response = await fetch(`${API_BASE}/api/rescue-requests/${requestId}/complete`, {
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

                {/* Embedded live Leaflet tracking map & GPS sharing */}
                <HostActiveRescueMap
                  requestId={request._id}
                  driverCoords={request.coordinates}
                />

                <div className="flex gap-3 mt-4">
                  <button
                    onClick={() => handleNavigate(request.coordinates.lat, request.coordinates.lng, request.location_name)}
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

      {/* In-App Navigation Modal — full screen route view */}
      {navigationTarget && (
        <NavigationModal
          destination={navigationTarget}
          onClose={() => setNavigationTarget(null)}
        />
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
