import React, { useState, useRef, useEffect } from 'react';
import { MapPin, Map as MapIcon, X } from 'lucide-react';

// Extend Window interface to include Leaflet
declare global {
  interface Window {
    L: any;
  }
}

interface LocationPickerProps {
  value: string;
  onChange: (location: string, coordinates?: { lat: number; lng: number }) => void;
  placeholder?: string;
  label?: string;
}

interface MapLocation {
  lat: number;
  lng: number;
}

const LocationPicker: React.FC<LocationPickerProps> = ({ 
  value, 
  onChange, 
  placeholder = "Enter address or click map icon to select on map", 
  label = "Location" 
}) => {
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [selectedCoordinates, setSelectedCoordinates] = useState<MapLocation | null>(null);
  const [isLoadingAddress, setIsLoadingAddress] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  // Initialize map when modal opens
  useEffect(() => {
    if (showMapPicker && mapRef.current && !mapInstanceRef.current) {
      initializeMap();
    }
  }, [showMapPicker]);

  const initializeMap = async () => {
    try {
      // Load Leaflet if not already loaded
      if (!window.L) {
        await new Promise((resolve, reject) => {
          if (document.querySelector('script[src*="leaflet"]')) {
            resolve(true);
            return;
          }

          const script = document.createElement('script');
          script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
          script.onload = () => resolve(true);
          script.onerror = () => reject(new Error('Failed to load Leaflet'));
          document.head.appendChild(script);
        });
      }

      // Default center (Delhi, India)
      const defaultCenter: MapLocation = { lat: 28.6139, lng: 77.2090 };
      
      // Try to get user's current location
      let initialCenter = defaultCenter;
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: false,
            timeout: 5000,
            maximumAge: 300000 // 5 minutes
          });
        });
        
        initialCenter = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
      } catch (error) {
        console.log('📍 Using default location (geolocation not available)');
      }

      // Initialize map
      mapInstanceRef.current = window.L.map(mapRef.current).setView([initialCenter.lat, initialCenter.lng], 13);

      // Add OpenStreetMap tiles
      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(mapInstanceRef.current);

      // Add click handler to place marker
      mapInstanceRef.current.on('click', async (e: any) => {
        const { lat, lng } = e.latlng;
        
        // Remove existing marker
        if (markerRef.current) {
          mapInstanceRef.current.removeLayer(markerRef.current);
        }

        // Add new marker
        markerRef.current = window.L.marker([lat, lng]).addTo(mapInstanceRef.current);
        
        // Update coordinates
        setSelectedCoordinates({ lat, lng });
        
        // Try to get address from coordinates (reverse geocoding)
        await getAddressFromCoordinates(lat, lng);
      });

      console.log('✅ Location picker map initialized');
    } catch (error) {
      console.error('❌ Failed to initialize location picker map:', error);
    }
  };

  const getAddressFromCoordinates = async (lat: number, lng: number) => {
    setIsLoadingAddress(true);
    try {
      // Using Nominatim (OpenStreetMap) reverse geocoding - free service
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
      );
      
      if (response.ok) {
        const data = await response.json();
        if (data.display_name) {
          // Update the input with the address
          onChange(data.display_name, { lat, lng });
        }
      }
    } catch (error) {
      console.error('Failed to get address from coordinates:', error);
      // Still allow manual coordinates entry
      onChange(`${lat.toFixed(6)}, ${lng.toFixed(6)}`, { lat, lng });
    } finally {
      setIsLoadingAddress(false);
    }
  };

  const handleManualInputChange = (inputValue: string) => {
    onChange(inputValue);
    // Clear coordinates when manually typing
    setSelectedCoordinates(null);
  };

  const handleUseSelectedLocation = () => {
    if (selectedCoordinates) {
      setShowMapPicker(false);
    }
  };

  const handleCloseMapPicker = () => {
    setShowMapPicker(false);
    // Clean up map
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
      markerRef.current = null;
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
      
      {/* Input with map icon */}
      <div className="relative">
        <input
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={(e) => handleManualInputChange(e.target.value)}
          className="w-full px-3 py-2 pr-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
        />
        
        {/* Map picker button */}
        <button
          type="button"
          onClick={() => setShowMapPicker(true)}
          className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
          title="Select location on map"
        >
          <MapIcon className="h-5 w-5" />
        </button>
      </div>

      {/* Coordinates display */}
      {selectedCoordinates && (
        <div className="mt-2 text-xs text-gray-500 flex items-center">
          <MapPin className="h-3 w-3 mr-1" />
          Coordinates: {selectedCoordinates.lat.toFixed(6)}, {selectedCoordinates.lng.toFixed(6)}
        </div>
      )}

      {/* Map picker modal */}
      {showMapPicker && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">📍 Select Location on Map</h3>
              <button
                onClick={handleCloseMapPicker}
                className="text-gray-400 hover:text-gray-600 p-1 rounded"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Instructions */}
            <div className="mb-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-700">
                🎯 <strong>Click anywhere on the map</strong> to place your charger location marker. 
                The address will be automatically filled for you.
              </p>
            </div>

            {/* Map container */}
            <div className="flex-1 min-h-[400px] border border-gray-300 rounded-lg overflow-hidden">
              <div ref={mapRef} className="w-full h-full" style={{ minHeight: '400px' }} />
            </div>

            {/* Loading indicator */}
            {isLoadingAddress && (
              <div className="mt-3 text-center text-sm text-gray-600">
                🔄 Getting address from location...
              </div>
            )}

            {/* Selected location info */}
            {selectedCoordinates && (
              <div className="mt-4 p-3 bg-green-50 rounded-lg">
                <div className="text-sm text-green-700 mb-2">
                  ✅ <strong>Location Selected:</strong>
                </div>
                <div className="text-xs text-gray-600">
                  📍 Coordinates: {selectedCoordinates.lat.toFixed(6)}, {selectedCoordinates.lng.toFixed(6)}
                </div>
                {value && (
                  <div className="text-xs text-gray-600 mt-1">
                    📍 Address: {value}
                  </div>
                )}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex justify-end space-x-3 mt-4 pt-4 border-t">
              <button
                onClick={handleCloseMapPicker}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUseSelectedLocation}
                disabled={!selectedCoordinates}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                {selectedCoordinates ? '✅ Use This Location' : '📍 Click on Map to Select'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LocationPicker;
