import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MapPin, Zap, Clock, Star } from 'lucide-react';
import { useCharger } from '../contexts/ChargerContext';
import ChargerCard from '../components/ChargerCard';
import MapView from '../components/MapView';
import socketService from '../lib/socketService';

const ChargerMap = () => {
  const { chargers, loading, fetchNearbyChargers, updateChargerAvailability, isChargerBusyNow, busyNowVersion } = useCharger();
  const [searchParams] = useSearchParams();
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const [tripMode, setTripMode] = useState(false);
  const [routeGeoJSON, setRouteGeoJSON] = useState<any | null>(null);
  const [filters, setFilters] = useState({
    plugType: 'all',
    priceRange: 'all',
    availability: 'all',
    rating: 'all'
  });
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [locationAccuracy, setLocationAccuracy] = useState<number | null>(null); // meters
  const [locationSource, setLocationSource] = useState<string>('');
  const [userAddress, setUserAddress] = useState<string>('');
  const [isResolvingAddress, setIsResolvingAddress] = useState(false);
  const [showAccuracyWarning, setShowAccuracyWarning] = useState(false);
  const [watchId, setWatchId] = useState<number | null>(null);
  const [isTrackingLocation, setIsTrackingLocation] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  // Removed improve accuracy interactive watcher (button removed)

  // Get the source parameter from URL
  const bookingSource = searchParams.get('source') || 'driver';
  const tripRequested = searchParams.get('trip') === '1';
  const startType = searchParams.get('startType') || 'current';
  const startQuery = searchParams.get('start') || '';
  const destQuery = searchParams.get('dest') || '';

  useEffect(() => {
    // Connect to WebSocket and listen for real-time updates
    socketService.connect();
    
    // Listen for charger availability changes
    const handleChargerAvailabilityChanged = (data: {
      charger_id: string;
      available: boolean;
      status: string;
    }) => {
      console.log('🔄 Real-time charger availability update received:', data);
      updateChargerAvailability(data.charger_id, data.available);
    };

    // Listen for charger list changes (add/delete)
    const handleChargerListChanged = (data: {
      type: 'charger-added' | 'charger-deleted';
      charger?: any;
      charger_id?: string;
      location: string;
    }) => {
      console.log('🔄 Real-time charger list update received:', data);
      // TODO: Implement charger addition/removal in context
      // These methods are not available in the current ChargerContext
    };

    socketService.onChargerAvailabilityChanged(handleChargerAvailabilityChanged);
    socketService.onChargerListChanged(handleChargerListChanged);

    // Cleanup on unmount
    return () => {
      socketService.offChargerAvailabilityChanged(handleChargerAvailabilityChanged);
      socketService.offChargerListChanged(handleChargerListChanged);
      // Stop location tracking on unmount
      if (watchId) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [updateChargerAvailability]);

  // Touch busyNowVersion to re-render dependent derived values when busy set changes
  useEffect(() => {
    // No-op: presence of this effect ensures component observes busyNowVersion updates
  }, [busyNowVersion]);

  // Trip planner: geocode and build route if requested
  useEffect(() => {
    const run = async () => {
      if (!tripRequested || !destQuery) return;
      setTripMode(true);

      // Helper geocoder via Nominatim
      const geocode = async (q: string) => {
        const resp = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(q)}`);
        const data = await resp.json();
        if (Array.isArray(data) && data[0]) {
          return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) } as {lat:number;lng:number};
        }
        return null;
      };

      try {
        // Determine start point
        let start = userLocation;
        if (startType === 'address' && startQuery) {
          start = await geocode(startQuery);
        } else if (!start) {
          // Try quick geolocation if not available yet
          const quick = await new Promise<GeolocationPosition | null>((resolve) => {
            if (!navigator.geolocation) return resolve(null);
            navigator.geolocation.getCurrentPosition(
              (pos) => resolve(pos),
              () => resolve(null),
              { enableHighAccuracy: true, timeout: 6000, maximumAge: 0 }
            );
          });
          if (quick) start = { lat: quick.coords.latitude, lng: quick.coords.longitude };
        }

        const dest = await geocode(destQuery);
        if (!start || !dest) {
          console.warn('TripPlanner: missing start or dest');
          return;
        }

        // OSRM route
        const url = `https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${dest.lng},${dest.lat}?overview=full&geometries=geojson`;
        const resp = await fetch(url);
        const data = await resp.json();
        if (data.routes && data.routes[0]) {
          const route = data.routes[0];
          setRouteGeoJSON(route.geometry);
        }
      } catch (e) {
        console.error('TripPlanner route error', e);
      }
    };
    run();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripRequested, destQuery, startType, startQuery]);

  // Multi-attempt high-accuracy acquisition
  const acquireBestLocation = async (opts?: { attempts?: number; desiredAccuracy?: number; timeoutPerAttempt?: number }) => {
    const { attempts = 3, desiredAccuracy = 40, timeoutPerAttempt = 12000 } = opts || {};
    if (!navigator.geolocation) return null;
    const samples: GeolocationPosition[] = [];
    const getPosition = () => new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: timeoutPerAttempt
      });
    });
    for (let i = 0; i < attempts; i++) {
      try {
        console.log(`📡 Location attempt ${i+1}/${attempts}`);
        const pos = await getPosition();
        samples.push(pos);
        console.log('   ↳ sample accuracy:', pos.coords.accuracy);
        if (pos.coords.accuracy <= desiredAccuracy) break;
      } catch (e) {
        console.warn('   ↳ attempt failed', e);
      }
    }
    if (!samples.length) return null;
    return samples.reduce((a,b)=> a.coords.accuracy <= b.coords.accuracy ? a : b);
  };

  const persistLocation = (pos: GeolocationPosition) => {
    const payload = { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy, ts: Date.now() };
    try { localStorage.setItem('lastUserLocation', JSON.stringify(payload)); } catch {}
  };

  // Reverse geocode helper (Nominatim) with basic rate limiting
  const lastGeocodeRef = useRef<number>(0);
  const reverseGeocode = async (lat: number, lng: number) => {
    const now = Date.now();
    if (now - lastGeocodeRef.current < 4000) return; // simple throttle 4s
    lastGeocodeRef.current = now;
    try {
      setIsResolvingAddress(true);
      const resp = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}` , { headers: { 'Accept': 'application/json' } });
      if (resp.ok) {
        const data = await resp.json();
        if (data.display_name) setUserAddress(data.display_name);
      }
    } catch (e) {
      console.warn('Reverse geocode failed', e);
    } finally {
      setIsResolvingAddress(false);
    }
  };

  const startLocationTracking = () => {
    if (navigator.geolocation && !watchId) {
      const id = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude, accuracy } = position.coords;
            setUserLocation({ lat: latitude, lng: longitude });
            setLocationAccuracy(accuracy);
            setLocationSource('live');
            setShowAccuracyWarning(accuracy > 120);
            if (accuracy < 150) reverseGeocode(latitude, longitude);
        },
        (error) => {
          console.error('Location tracking error:', error);
          handleLocationError(error);
          setIsTrackingLocation(false);
        },
        { enableHighAccuracy: true, maximumAge: 10000, timeout: 25000 }
      );
      setWatchId(id);
      setIsTrackingLocation(true);
    }
  };

  const stopLocationTracking = () => {
    if (watchId) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
      setIsTrackingLocation(false);
      console.log('⏹️ Stopped real-time location tracking');
    }
  };

  // Manual location refresh leveraging multi-attempt
  const refreshMyLocation = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    console.log('🔄 Fast refresh requested');
    const quickAttempt = (options: PositionOptions, label: string, timeoutLabel: string) =>
      new Promise<GeolocationPosition | null>((resolve) => {
        let settled = false;
        const timer = setTimeout(() => {
          if (!settled) {
            console.log(`⏱️ ${timeoutLabel} timed out`);
            settled = true; resolve(null);
          }
        }, (options.timeout || 4000) + 200); // small buffer
        navigator.geolocation.getCurrentPosition(
          (pos) => { if (!settled) { settled = true; clearTimeout(timer); console.log(`✅ ${label} success acc=${pos.coords.accuracy}`); resolve(pos); } },
          (err) => { if (!settled) { settled = true; clearTimeout(timer); console.log(`❌ ${label} error`, err); resolve(null); } },
          options
        );
      });

    // First: high accuracy short timeout
    const highAcc = await quickAttempt({ enableHighAccuracy: true, maximumAge: 0, timeout: 3500 }, 'HighAcc', 'HighAcc');
    let finalPos = highAcc;

    // Fallback quickly if high accuracy failed or very poor accuracy
    if (!finalPos || (finalPos.coords.accuracy > 150)) {
      const fallback = await quickAttempt({ enableHighAccuracy: false, maximumAge: 15000, timeout: 2500 }, 'Fallback', 'Fallback');
      if (fallback) finalPos = fallback;
    }

    if (finalPos) {
      setUserLocation({ lat: finalPos.coords.latitude, lng: finalPos.coords.longitude });
      setLocationAccuracy(finalPos.coords.accuracy);
      setLocationSource('manual');
      persistLocation(finalPos);
      fetchNearbyChargers(finalPos.coords.latitude, finalPos.coords.longitude);
      setShowAccuracyWarning(finalPos.coords.accuracy > 120);
      if (finalPos.coords.accuracy < 160) reverseGeocode(finalPos.coords.latitude, finalPos.coords.longitude);
    } else {
      alert('Could not refresh location quickly. Move to open area.');
    }
    setIsRefreshing(false);
  };


  const handleLocationError = (error: GeolocationPositionError) => {
    let errorMessage = 'Unknown location error';
    switch(error.code) {
      case error.PERMISSION_DENIED:
        errorMessage = "Location access denied by user.";
        break;
      case error.POSITION_UNAVAILABLE:
        errorMessage = "Location information is unavailable.";
        break;
      case error.TIMEOUT:
        errorMessage = "Location request timed out.";
        break;
    }
    console.error('Geolocation error:', errorMessage);
    // Fall back to default location
    const defaultLocation = { lat: 19.0760, lng: 72.8777 }; // Mumbai
    setUserLocation(defaultLocation);
    fetchNearbyChargers(defaultLocation.lat, defaultLocation.lng);
  };

  useEffect(() => {
    // Load cached location if fresh (<5 min)
    try {
      const cached = localStorage.getItem('lastUserLocation');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Date.now() - parsed.ts < 5 * 60 * 1000) {
          setUserLocation({ lat: parsed.lat, lng: parsed.lng });
          setLocationAccuracy(parsed.accuracy);
          setLocationSource('cache');
        }
      }
    } catch {}

    const init = async () => {
      if (!navigator.geolocation) {
        console.warn('⚠️ Geolocation unsupported');
        const defaultLocation = { lat: 19.0760, lng: 72.8777 };
        setUserLocation(defaultLocation);
        fetchNearbyChargers(defaultLocation.lat, defaultLocation.lng);
        return;
      }
      const best = await acquireBestLocation({ attempts: 3, desiredAccuracy: 35 });
      if (best) {
        setUserLocation({ lat: best.coords.latitude, lng: best.coords.longitude });
        setLocationAccuracy(best.coords.accuracy);
        setLocationSource('multi');
        persistLocation(best);
        fetchNearbyChargers(best.coords.latitude, best.coords.longitude);
    setShowAccuracyWarning(best.coords.accuracy > 120);
    reverseGeocode(best.coords.latitude, best.coords.longitude);
        setTimeout(()=>window.dispatchEvent(new Event('resize')),400);
      } else {
        console.warn('⚠️ Falling back to single attempt');
        navigator.geolocation.getCurrentPosition(
          (pos)=>{
            setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
            setLocationAccuracy(pos.coords.accuracy);
            setLocationSource('fallback');
            persistLocation(pos);
            fetchNearbyChargers(pos.coords.latitude, pos.coords.longitude);
      setShowAccuracyWarning(pos.coords.accuracy > 120);
      reverseGeocode(pos.coords.latitude, pos.coords.longitude);
          },
          (err)=>{ console.error('❌ No location acquired', err); handleLocationError(err); },
          { enableHighAccuracy: false, maximumAge: 300000, timeout: 15000 }
        );
      }
    };
    init();
  }, []);

  // If route present, limit chargers roughly to route bounding-box with small padding
  const filteredChargers = chargers.filter(charger => {
    const effectiveAvailable = charger.available && !isChargerBusyNow(charger._id);
    if (filters.plugType !== 'all' && charger.plug_type !== filters.plugType) return false;
    if (filters.availability !== 'all' && effectiveAvailable.toString() !== filters.availability) return false;
    if (filters.rating !== 'all') {
      const minRating = parseFloat(filters.rating);
      if (charger.rating < minRating) return false;
    }
    if (routeGeoJSON && routeGeoJSON.type === 'LineString' && Array.isArray(routeGeoJSON.coordinates)) {
      // Bounding box padding ~0.05 deg (~5-6km), rough corridor; can refine later with point-to-line distance
      const lats = routeGeoJSON.coordinates.map((c: number[]) => c[1]);
      const lngs = routeGeoJSON.coordinates.map((c: number[]) => c[0]);
      const minLat = Math.min(...lats) - 0.05;
      const maxLat = Math.max(...lats) + 0.05;
      const minLng = Math.min(...lngs) - 0.05;
      const maxLng = Math.max(...lngs) + 0.05;
      const coord = charger.coordinates || (charger as any).coords || null;
      if (!coord) return false;
      if (coord.lat < minLat || coord.lat > maxLat || coord.lng < minLng || coord.lng > maxLng) return false;
    }
    return true;
  });

  return (
    <div className="min-h-screen pt-16">
      {tripMode && (
        <div className="bg-blue-50 border-b border-blue-200">
          <div className="max-w-7xl mx-auto px-4 py-2 text-sm text-blue-800">
            Trip mode: showing chargers along your planned route
          </div>
        </div>
      )}
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div className="flex items-center flex-wrap gap-3 mb-4 md:mb-0">
              <MapPin className="h-6 w-6 text-blue-500" />
              <h1 className="text-2xl font-bold text-gray-900">Find Chargers</h1>
              {userLocation ? (
                <div className="bg-green-50 border border-green-200 px-3 py-1.5 rounded-lg text-green-800 text-xs md:text-sm flex flex-col max-w-xs md:max-w-sm">
                  <div className="flex items-center flex-wrap gap-1">
                    <div className={`w-2 h-2 rounded-full ${locationAccuracy && locationAccuracy < 40 ? 'bg-green-500' : 'bg-yellow-500'} mr-1`}></div>
                    <span className="font-medium">{userLocation.lat.toFixed(4)}, {userLocation.lng.toFixed(4)}</span>
                    {locationAccuracy !== null && (
                      <span className="opacity-80">±{Math.round(locationAccuracy)}m</span>
                    )}
                    {/* Source label hidden per user request (previously showed e.g. "multi") */}
                    {locationSource && false && (
                      <span className="text-[9px] uppercase tracking-wide bg-white/70 px-1 py-0.5 rounded border border-green-300">{locationSource}</span>
                    )}
                  </div>
                  {/* Address hidden per user request */}
                  {false && userAddress && (
                    <div className="truncate mt-0.5 text-[10px] md:text-[11px] text-green-700" title={userAddress}>
                      {isResolvingAddress ? 'Resolving address…' : userAddress}
                    </div>
                  )}
                </div>
              ) : (
                <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm animate-pulse">
                  Getting location...
                </span>
              )}
              {/* Improve Accuracy button removed per request; address moved under coordinates */}
            </div>
            
            <div className="flex items-center space-x-3">
              {/* Manual Location Refresh Button */}
              <button
                onClick={refreshMyLocation}
                disabled={isRefreshing}
                className={`px-3 py-2 rounded-lg text-sm font-medium border transition-all flex items-center gap-1 ${
                  isRefreshing
                    ? 'bg-blue-200 text-blue-600 border-blue-300 cursor-wait'
                    : 'bg-blue-100 text-blue-800 border-blue-300 hover:bg-blue-200'
                }`}
                title="Fast refresh (quick dual-attempt)"
              >
                {isRefreshing ? (
                  <>
                    <span className="animate-spin inline-block w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full"></span>
                    Refreshing
                  </>
                ) : (
                  <>🔄 Refresh</>
                )}
              </button>
              
              {/* Real-time Location Tracking Toggle */}
              <button
                onClick={isTrackingLocation ? stopLocationTracking : startLocationTracking}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  isTrackingLocation 
                    ? 'bg-green-100 text-green-800 border border-green-300' 
                    : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200'
                }`}
                title={isTrackingLocation ? 'Stop real-time location tracking' : 'Start real-time location tracking'}
              >
                {isTrackingLocation ? (
                  <>
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse inline-block mr-2"></div>
                    Live Tracking
                  </>
                ) : (
                  '📍 Track Location'
                )}
              </button>

              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('map')}
                  className={`px-4 py-2 rounded-md transition-all ${
                    viewMode === 'map' 
                      ? 'bg-white shadow-sm text-blue-600' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Map View
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-4 py-2 rounded-md transition-all ${
                    viewMode === 'list' 
                      ? 'bg-white shadow-sm text-blue-600' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  List View
                </button>
              </div>
            </div>
          </div>
          
          {/* Filter Bar */}
          {showAccuracyWarning && (
            <div className="mx-4 mt-3 mb-1 bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-2 rounded text-xs flex items-center gap-2">
              <span>⚠️ Your location accuracy is currently poor (±{locationAccuracy && Math.round(locationAccuracy)}m). Move outside or tap "Improve Accuracy".</span>
            </div>
          )}
          <div className="flex flex-wrap gap-4 mt-4 p-4 bg-gray-50 rounded-lg">
            <select
              value={filters.plugType}
              onChange={(e) => setFilters({...filters, plugType: e.target.value})}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Plug Types</option>
              <option value="Type 2">Type 2</option>
              <option value="CCS">CCS</option>
              <option value="CHAdeMO">CHAdeMO</option>
            </select>
            
            <select
              value={filters.availability}
              onChange={(e) => setFilters({...filters, availability: e.target.value})}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Chargers</option>
              <option value="true">Available Now</option>
              <option value="false">Occupied</option>
            </select>
            
            <select
              value={filters.rating}
              onChange={(e) => setFilters({...filters, rating: e.target.value})}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Ratings</option>
              <option value="4">4+ Stars</option>
              <option value="3">3+ Stars</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1">
        {viewMode === 'map' ? (
          <div className="h-[calc(100vh-200px)]">
            <MapView 
              chargers={filteredChargers} 
              userLocation={userLocation}
              loading={loading}
              routeGeoJSON={routeGeoJSON}
            />
          </div>
        ) : (
          <div className="max-w-7xl mx-auto px-4 py-6">
            {loading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredChargers.map((charger) => (
                  <ChargerCard key={charger._id} charger={charger} bookingSource={bookingSource} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Quick Stats */}
      <div className="bg-white border-t">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-wrap justify-center gap-8 text-center">
            <div className="flex items-center space-x-2">
              <Zap className="h-5 w-5 text-green-500" />
              <span className="text-sm text-gray-600">
                {filteredChargers.filter(c => c.available && !isChargerBusyNow(c._id)).length} Available
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-orange-500" />
              <span className="text-sm text-gray-600">
                {filteredChargers.filter(c => !c.available || isChargerBusyNow(c._id)).length} Occupied
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <Star className="h-5 w-5 text-yellow-500" />
              <span className="text-sm text-gray-600">
                {(filteredChargers.reduce((acc, c) => acc + c.rating, 0) / filteredChargers.length || 0).toFixed(1)} Avg Rating
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChargerMap;