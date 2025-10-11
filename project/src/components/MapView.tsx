import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navigation, Route, Target } from 'lucide-react';
import { Charger } from '../lib/dataService';
import { useCharger } from '../contexts/ChargerContext';

// Extend Window interface to include Leaflet
declare global {
  interface Window {
    L: any;
  }
}

interface MapViewProps {
  chargers: Charger[];
  userLocation: {lat: number, lng: number} | null;
  loading: boolean;
  routeGeoJSON?: any | null; // optional precomputed route geometry (GeoJSON LineString)
}

const MapView: React.FC<MapViewProps> = ({ chargers, userLocation, loading, routeGeoJSON }) => {
  const { isChargerBusyNow, busyNowVersion } = useCharger();
  const navigate = useNavigate();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const userMarkerRef = useRef<any>(null);
  const routeLayerRef = useRef<any>(null);
  const routeRequestIdRef = useRef(0); // for cancelling stale route fetches
  const [isMapReady, setIsMapReady] = useState(false);
  const [watchId, setWatchId] = useState<number | null>(null);
  const [isTrackingLocation, setIsTrackingLocation] = useState(false);
  const initializationStarted = useRef(false);

  // Initialize map when component mounts and Leaflet is available - STABLE VERSION
  useEffect(() => {
    if (initializationStarted.current) return;
    
    let mounted = true;
    let retryTimeout: NodeJS.Timeout;

    const initMap = () => {
      if (!mounted || !mapRef.current || mapInstanceRef.current || !window.L) {
        return;
      }

      if (initializationStarted.current) return;
      initializationStarted.current = true;

      console.log('🗺️ Starting stable map initialization...');
      initializeMap();
    };

    // Wait for Leaflet to be available
    if (window.L) {
      retryTimeout = setTimeout(initMap, 300);
    } else {
      const checkLeaflet = setInterval(() => {
        if (window.L) {
          clearInterval(checkLeaflet);
          retryTimeout = setTimeout(initMap, 300);
        }
      }, 100);

      // Cleanup after 10 seconds
      setTimeout(() => clearInterval(checkLeaflet), 10000);
    }

    return () => {
      mounted = false;
      if (retryTimeout) clearTimeout(retryTimeout);
    };
  }, []); // Empty dependency array - run only once

  // Update user location when available
  useEffect(() => {
    if (userLocation && mapInstanceRef.current && isMapReady) {
      console.log('� Updating user location on existing map...');
      updateUserLocation(userLocation);
    }
  }, [userLocation, isMapReady]);

  // Update charger markers when chargers change
  useEffect(() => {
    if (isMapReady && mapInstanceRef.current) {
      updateChargerMarkers();
    }
  }, [chargers, isMapReady, busyNowVersion]);

  // Update user location when it changes
  useEffect(() => {
    if (isMapReady && userLocation && mapInstanceRef.current) {
      updateUserLocation(userLocation);
    }
  }, [userLocation, isMapReady]);

  // Draw provided route geometry if any
  useEffect(() => {
    if (!isMapReady || !mapInstanceRef.current) return;
    if (!routeGeoJSON) return;
    try {
      // Clear existing route layer
      if (routeLayerRef.current) {
        mapInstanceRef.current.removeLayer(routeLayerRef.current);
        routeLayerRef.current = null;
      }
      // Add new route
      routeLayerRef.current = window.L.geoJSON(routeGeoJSON, {
        style: { color: '#2563eb', weight: 4, opacity: 0.85 }
      }).addTo(mapInstanceRef.current);
      // Fit bounds to route
      const group = new window.L.featureGroup([routeLayerRef.current]);
      mapInstanceRef.current.fitBounds(group.getBounds().pad(0.12));
    } catch (e) {
      console.error('Failed to draw provided route', e);
    }
  }, [routeGeoJSON, isMapReady]);

  const initializeMap = () => {
    try {
      console.log('🗺️ Starting map initialization...', {
        containerExists: !!mapRef.current,
        leafletLoaded: !!window.L,
        mapAlreadyExists: !!mapInstanceRef.current
      });

      if (!mapRef.current) {
        console.error('❌ Map container not found - DOM ref not ready');
        return;
      }
      
      if (!window.L) {
        console.error('❌ Leaflet library not loaded');
        return;
      }

      if (mapInstanceRef.current) {
        console.log('⚠️ Map already initialized, skipping...');
        return;
      }

      // Check if the container element is in the DOM
      if (!document.contains(mapRef.current)) {
        console.error('❌ Map container not attached to DOM');
        return;
      }

      console.log('🗺️ All checks passed, creating map instance...');
      
      // Default center (Mumbai, India)
      const defaultCenter = userLocation || { lat: 19.0760, lng: 72.8777 };
      
      // Create map instance
      mapInstanceRef.current = window.L.map(mapRef.current, {
        preferCanvas: true,
        zoomControl: true,
        attributionControl: true
      }).setView([defaultCenter.lat, defaultCenter.lng], 13);
      
      // Add OpenStreetMap tiles (100% free)
      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
        minZoom: 3
      }).addTo(mapInstanceRef.current);

      // Enhanced resize handling with multiple strategies
      const invalidateMap = () => {
        if (mapInstanceRef.current) {
          console.log('🔄 Invalidating map size...');
          mapInstanceRef.current.invalidateSize(true);
        }
      };

      // Immediate invalidation
      invalidateMap();
      
      // Animation frame invalidation (after DOM updates)
      requestAnimationFrame(() => {
        invalidateMap();
        // Additional invalidation after short delay for layout completion
        setTimeout(invalidateMap, 100);
        setTimeout(invalidateMap, 300);
        setTimeout(invalidateMap, 600);
      });

      setIsMapReady(true);
      console.log('✅ Leaflet map initialized successfully');
      
      // Force a map render trigger
      setTimeout(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.fire('resize');
          invalidateMap();
        }
      }, 1000);
      
    } catch (error) {
      console.error('❌ Failed to initialize map:', error);
      // Fallback to simulation if Leaflet fails
      setIsMapReady(false);
    }
  };

  const updateUserLocation = (location: {lat: number, lng: number}) => {
    if (!mapInstanceRef.current) return;

    try {
      // Remove existing user marker
      if (userMarkerRef.current) {
        mapInstanceRef.current.removeLayer(userMarkerRef.current);
      }

      // Create custom user location icon
      const userIcon = window.L.divIcon({
        className: 'user-location-marker',
        html: `
          <div class="relative">
            <div class="w-4 h-4 bg-blue-600 rounded-full border-2 border-white shadow-lg relative z-10"></div>
            <div class="w-8 h-8 bg-blue-200 rounded-full absolute -top-2 -left-2 animate-ping opacity-30"></div>
          </div>
        `,
        iconSize: [16, 16],
        iconAnchor: [8, 8]
      });

      // Add user marker
      userMarkerRef.current = window.L.marker([location.lat, location.lng], { icon: userIcon })
        .addTo(mapInstanceRef.current)
        .bindPopup('📍 Your Location');

      // Center map on user location
      mapInstanceRef.current.setView([location.lat, location.lng], 13);
      // Ensure map renders correctly after permission prompt/layout shifts
      requestAnimationFrame(() => {
        mapInstanceRef.current?.invalidateSize();
      });
      setTimeout(() => {
        mapInstanceRef.current?.invalidateSize();
      }, 150);
    } catch (error) {
      console.error('❌ Failed to update user location:', error);
    }
  };

  const updateChargerMarkers = () => {
    if (!mapInstanceRef.current) return;

    try {
      // Clear existing markers
      markersRef.current.forEach(marker => {
        mapInstanceRef.current.removeLayer(marker);
      });
      markersRef.current = [];

      // Add charger markers - USE REAL CHARGER DATA
      console.log(`🔍 Processing ${chargers.length} chargers from database...`);
      
  chargers.forEach((charger, index) => {
        // Enhanced debugging for coordinate issues
        console.log(`Charger ${index + 1}:`, {
          id: charger._id,
          name: charger.name,
          location: charger.location,
          coordinates: charger.coordinates,
          coordinatesType: typeof charger.coordinates,
          lat: charger.coordinates?.lat,
          lng: charger.coordinates?.lng,
          latType: typeof charger.coordinates?.lat,
          lngType: typeof charger.coordinates?.lng
        });

        // Skip if no coordinates provided by host
        if (!charger.coordinates || 
            typeof charger.coordinates.lat !== 'number' || 
            typeof charger.coordinates.lng !== 'number' ||
            isNaN(charger.coordinates.lat) || 
            isNaN(charger.coordinates.lng)) {
          console.warn(`⚠️ Skipping charger "${charger.name}" - no valid coordinates provided by host`);
          return;
        }

        const { lat, lng } = charger.coordinates;

        // Validate coordinate ranges
        if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
          console.warn(`⚠️ Skipping charger "${charger.name}" - coordinates out of valid range:`, {lat, lng});
          return;
        }

    console.log(`✅ Adding charger "${charger.name}" to map at [${lat}, ${lng}]`);

    // Effective availability: host must have it ON (available=true) and not busy right now
    const busyNow = isChargerBusyNow(charger._id);
    const isEffectivelyAvailable = charger.available && !busyNow;

        // Create custom charger icon
    const iconColor = isEffectivelyAvailable ? '#10b981' : '#ef4444'; // green or red
        const chargerIcon = window.L.divIcon({
          className: 'charger-marker',
          html: `
            <div class="relative group cursor-pointer">
              <div class="w-8 h-8 rounded-full flex items-center justify-center shadow-lg transition-all group-hover:scale-110" 
                   style="background-color: ${iconColor}; color: white;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M11.5 7L6.5 14h4v7l5-7h-4v-7z"/>
                </svg>
              </div>
            </div>
          `,
          iconSize: [32, 32],
          iconAnchor: [16, 16]
        });

        // Create marker with popup
        const marker = window.L.marker([lat, lng], { icon: chargerIcon })
          .addTo(mapInstanceRef.current)
          .bindPopup(`
            <div class="p-2">
              <h4 class="font-semibold text-gray-900 mb-1">${charger.name}</h4>
              <p class="text-sm text-gray-600 mb-2">${charger.plug_type} • ₹${charger.price}/kWh</p>
              <p class="text-xs text-gray-500 mb-2">${charger.location || 'Location not specified'}</p>
              <div class="flex items-center justify-between">
                <span class="px-2 py-1 rounded-full text-xs ${
      isEffectivelyAvailable ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }">
      ${isEffectivelyAvailable ? 'Available' : (charger.available ? 'Busy Now' : 'Unavailable')}
                </span>
                <div class="flex space-x-2">
                  <button 
                    onclick="window.getDirectionsToCharger('${charger._id}', ${lat}, ${lng})"
                    class="px-2 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 transition-colors"
                  >
                    Navigate
                  </button>
      ${isEffectivelyAvailable
                    ? `<button 
                        onclick="window.bookCharger('${charger._id}')"
                        class="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 transition-colors"
                      >
                        Book
                      </button>`
                    : `<button 
                        class="px-2 py-1 bg-gray-300 text-gray-500 text-xs rounded cursor-not-allowed opacity-60"
        disabled title="${charger.available ? 'This charger has an active booking right now' : 'This charger is currently unavailable'}"
                      >
        ${charger.available ? 'Busy' : 'Unavailable'}
                      </button>`
                  }
                </div>
              </div>
            </div>
          `);

        markersRef.current.push(marker);
      });

      // Summary of chargers added to map
      const addedCount = markersRef.current.length;
      const totalCount = chargers.length;
      console.log(`📊 Map Update Summary: ${addedCount}/${totalCount} chargers added to map`);
      
      if (addedCount === 0 && totalCount > 0) {
        console.warn('⚠️ No chargers visible on map! All chargers are missing valid coordinates. Please add coordinates when creating chargers as a host.');
      } else if (addedCount > 0) {
        console.log(`✅ Successfully showing ${addedCount} chargers on map with valid coordinates`);
      }

    } catch (error) {
      console.error('❌ Failed to update charger markers:', error);
    }
  };

  // Real-time location tracking with improved accuracy
  const startLocationTracking = () => {
    if (navigator.geolocation && !watchId) {
      console.log('🎯 Starting high-accuracy location tracking...');
      const id = navigator.geolocation.watchPosition(
        (position) => {
          const newLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          console.log('📍 Location update:', newLocation, 'Accuracy:', position.coords.accuracy, 'meters');
          updateUserLocation(newLocation);
        },
        (error) => {
          console.error('❌ Location tracking error:', error);
          console.log('🔄 Trying to restart location tracking with lower accuracy...');
          
          // Try with lower accuracy settings
          if (watchId) {
            navigator.geolocation.clearWatch(watchId);
          }
          
          const fallbackId = navigator.geolocation.watchPosition(
            (position) => {
              const newLocation = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
              };
              console.log('📍 Fallback location update:', newLocation, 'Accuracy:', position.coords.accuracy, 'meters');
              updateUserLocation(newLocation);
            },
            (fallbackError) => {
              console.error('❌ Fallback location tracking also failed:', fallbackError);
              setIsTrackingLocation(false);
            },
            {
              enableHighAccuracy: false, // Lower accuracy for fallback
              maximumAge: 60000, // 1 minute cache
              timeout: 10000 // 10 seconds timeout
            }
          );
          setWatchId(fallbackId);
        },
        {
          enableHighAccuracy: true, // Use GPS for best accuracy
          maximumAge: 10000, // 10 seconds cache
          timeout: 25000 // 25 seconds timeout for high accuracy
        }
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
    }
  };

  // OSRM routing integration (100% free)
  const getDirections = async (_chargerId: string, destLat: number, destLng: number) => {
    if (!userLocation || !mapInstanceRef.current) {
      alert('Please enable location to get directions');
      return;
    }

    try {
      // Increment request id to invalidate any previous in-flight requests
      const requestId = ++routeRequestIdRef.current;
      // Clear existing route immediately
      if (routeLayerRef.current) {
        mapInstanceRef.current.removeLayer(routeLayerRef.current);
        routeLayerRef.current = null;
      }

      // OSRM API call for routing (free service)
      const url = `https://router.project-osrm.org/route/v1/driving/${userLocation.lng},${userLocation.lat};${destLng},${destLat}?overview=full&geometries=geojson`;
      
      const response = await fetch(url);
      const data = await response.json();

      // If another navigation started meanwhile, abandon this result
      if (requestId !== routeRequestIdRef.current) {
        console.log('🛑 Discarding stale route response');
        return;
      }

      if (data.routes && data.routes[0]) {
        const route = data.routes[0];
        
        // Draw route on map
        routeLayerRef.current = window.L.geoJSON(route.geometry, {
          style: {
            color: '#3b82f6',
            weight: 4,
            opacity: 0.8
          }
        }).addTo(mapInstanceRef.current);

        // Fit map to route bounds
        const group = new window.L.featureGroup([routeLayerRef.current]);
        mapInstanceRef.current.fitBounds(group.getBounds().pad(0.1));

        // Display route info
        const distance = (route.distance / 1000).toFixed(2);
        const duration = Math.round(route.duration / 60);
        
        alert(`🚗 Route found!\nDistance: ${distance} km\nEstimated time: ${duration} minutes`);
      } else {
        alert('❌ Could not find a route to this charger');
      }
    } catch (error) {
      console.error('Routing error:', error);
      alert('❌ Failed to get directions. Please try again.');
    }
  };

  // Global function for popup buttons
  useEffect(() => {
    (window as any).getDirectionsToCharger = (chargerId: string, lat: number, lng: number) => {
      getDirections(chargerId, lat, lng);
    };
    (window as any).bookCharger = (chargerId: string) => {
      try {
        // Prefer client-side navigation for a fast UX
        navigate(`/booking/${chargerId}?source=map`);
      } catch (e) {
        console.error('Failed to SPA navigate to booking page', e);
        // Fallback to full reload if navigate is unavailable
        window.location.href = `/booking/${chargerId}?source=map`;
      }
    };
    
    return () => {
      delete (window as any).getDirectionsToCharger;
      delete (window as any).bookCharger;
    };
  }, [userLocation, navigate]);

  // Enhanced window resize and visibility change handling 
  useEffect(() => {
    const onResize = () => {
      if (mapInstanceRef.current && isMapReady) {
        console.log('🔄 Window resize detected, invalidating map...');
        setTimeout(() => {
          mapInstanceRef.current?.invalidateSize(true);
        }, 100);
      }
    };
    
    const onVisibilityChange = () => {
      if (!document.hidden && mapInstanceRef.current && isMapReady) {
        console.log('🔄 Tab became visible, refreshing map...');
        setTimeout(() => {
          mapInstanceRef.current?.invalidateSize(true);
        }, 200);
      }
    };
    
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    document.addEventListener('visibilitychange', onVisibilityChange);
    
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [isMapReady]);

  // Calculate distance between two points (Haversine formula)
  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  return (
    <div className="relative h-full">
      {/* Loading state */}
      {loading && (
        <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-[2000]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading map...</p>
          </div>
        </div>
      )}

      {/* Map not ready state */}
      {!window.L && (
        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center z-[1500]">
          <div className="text-center">
            <div className="text-red-500 text-xl mb-2">⚠️</div>
            <p className="text-gray-600">Map library not loaded</p>
          </div>
        </div>
      )}
      
      {/* Real Leaflet Map */}
      <div 
        ref={mapRef} 
        className="w-full h-full leaflet-container" 
        style={{ 
          minHeight: '400px', 
          backgroundColor: '#f8fafc',
          position: 'relative',
          zIndex: 1
        }} 
      />

      {/* Enhanced Map Controls */}
      <div className="absolute top-4 right-4 space-y-2 z-[1000]">
        {/* Location Tracking Toggle */}
        <button 
          onClick={isTrackingLocation ? stopLocationTracking : startLocationTracking}
          className={`p-3 rounded-lg shadow-lg transition-all border ${
            isTrackingLocation 
              ? 'bg-blue-500 text-white' 
              : 'bg-white text-gray-600 hover:bg-gray-50'
          }`}
          title={isTrackingLocation ? 'Stop location tracking' : 'Start real-time location tracking'}
        >
          <Target className="h-5 w-5" />
        </button>

        {/* Center on User */}
        {userLocation && (
          <button 
            onClick={() => {
              if (userLocation && mapInstanceRef.current) {
                mapInstanceRef.current.setView([userLocation.lat, userLocation.lng], 15);
              }
              userMarkerRef.current?.openPopup();
            }}
            className="bg-white p-3 rounded-lg shadow-lg hover:shadow-xl transition-shadow border"
            title="Center on your location"
          >
            <Navigation className="h-5 w-5 text-gray-600" />
          </button>
        )}

        {/* Clear Route */}
        {routeLayerRef.current && (
          <button 
            onClick={() => {
              if (routeLayerRef.current && mapInstanceRef.current) {
                mapInstanceRef.current.removeLayer(routeLayerRef.current);
                routeLayerRef.current = null;
              }
            }}
            className="bg-red-500 text-white p-3 rounded-lg shadow-lg hover:bg-red-600 transition-colors border"
            title="Clear route"
          >
            <Route className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Map Legend */}
      <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-lg p-4 rounded-lg shadow-lg border z-[1000]">
        <h4 className="font-semibold text-gray-900 mb-2">Legend</h4>
        <div className="space-y-2 text-sm">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-gray-600">Available Charger</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <span className="text-gray-600">Occupied Charger</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
            <span className="text-gray-600">Your Location</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-1 bg-blue-400 rounded"></div>
            <span className="text-gray-600">Route</span>
          </div>
        </div>
        
        {/* Real-time Status */}
        <div className="mt-3 pt-2 border-t border-gray-200">
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${isTrackingLocation ? 'bg-green-400 animate-pulse' : 'bg-gray-400'}`}></div>
            <span className="text-xs text-gray-500">
              {isTrackingLocation ? 'Live tracking' : 'Static location'}
            </span>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-lg p-4 rounded-lg shadow-lg border z-[1000]">
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">{chargers.length}</div>
          <div className="text-sm text-gray-600">Chargers Found</div>
        </div>
        <div className="flex mt-2 space-x-4 text-sm">
          <div className="text-center">
            <div className="font-semibold text-green-600">{chargers.filter(c => c.available).length}</div>
            <div className="text-gray-500">Available</div>
          </div>
          <div className="text-center">
            <div className="font-semibold text-red-600">{chargers.filter(c => !c.available).length}</div>
            <div className="text-gray-500">Busy</div>
          </div>
        </div>
        
        {/* Distance to nearest charger */}
        {userLocation && chargers.length > 0 && (
          <div className="mt-2 pt-2 border-t border-gray-200">
            <div className="text-center">
              <div className="text-sm font-semibold text-blue-600">
                {(() => {
                  const distances = chargers
                    .filter(c => c.coordinates && typeof c.coordinates.lat === 'number' && typeof c.coordinates.lng === 'number')
                    .map(c => calculateDistance(userLocation.lat, userLocation.lng, c.coordinates!.lat, c.coordinates!.lng));
                  if (!distances.length) return '-';
                  return Math.min(...distances).toFixed(1);
                })()}km
              </div>
              <div className="text-xs text-gray-500">Nearest</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MapView;