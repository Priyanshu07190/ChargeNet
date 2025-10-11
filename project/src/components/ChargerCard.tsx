import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Star, Zap, Clock, Navigation, Wifi } from 'lucide-react';
import { Charger } from '../lib/dataService';

interface ChargerCardProps {
  charger: Charger;
  bookingSource?: string;
}

const ChargerCard: React.FC<ChargerCardProps> = ({ charger, bookingSource = 'driver' }) => {
  const getPriceColor = (price: number) => {
    if (price < 8) return 'text-green-600 bg-green-50';
    if (price < 12) return 'text-orange-600 bg-orange-50';
    return 'text-red-600 bg-red-50';
  };

  const getAvailabilityColor = (available: boolean) => {
    return available 
      ? 'text-green-600 bg-green-50 border-green-200' 
      : 'text-red-600 bg-red-50 border-red-200';
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1 border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="relative">
        <div className="h-48 bg-gradient-to-br from-blue-400 to-green-400"></div>
        <div className="absolute top-4 right-4">
          <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getAvailabilityColor(charger.available)}`}>
            {charger.available ? 'Available' : 'Unavailable'}
          </span>
        </div>
        <div className="absolute bottom-4 left-4 text-white">
          <h3 className="text-xl font-bold mb-1">{charger.name}</h3>
          <div className="flex items-center space-x-1 text-sm opacity-90">
            <MapPin className="h-4 w-4" />
            <span>{charger.distance}km away</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Star className="h-5 w-5 text-yellow-400 fill-current" />
            <span className="font-semibold">{charger.rating}</span>
            <span className="text-gray-500 text-sm">({charger.reviews} reviews)</span>
          </div>
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${getPriceColor(charger.price)}`}>
            ₹{charger.price}/kWh
          </div>
        </div>

        <div className="space-y-3 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Zap className="h-4 w-4 text-blue-500" />
              <span className="text-sm text-gray-600">Plug Type</span>
            </div>
            <span className="text-sm font-medium">{charger.plug_type}</span>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-green-500" />
              <span className="text-sm text-gray-600">Power</span>
            </div>
            <span className="text-sm font-medium">{charger.power} kW</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Wifi className="h-4 w-4 text-purple-500" />
              <span className="text-sm text-gray-600">Host</span>
            </div>
            <span className="text-sm font-medium">{charger.host_name || charger.hostName || 'Host'}</span>
          </div>

          {charger.host_phone && (
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-xs">📞</span>
                <span className="text-sm text-gray-600">Contact</span>
              </div>
              <span className="text-sm font-medium">{charger.host_phone}</span>
            </div>
          )}
        </div>

        {/* Features */}
        <div className="flex flex-wrap gap-2 mb-6">
          {charger.features.map((feature, index) => (
            <span
              key={index}
              className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-lg"
            >
              {feature}
            </span>
          ))}
        </div>

        {/* Actions */}
        <div className="flex space-x-3">
          {charger.available ? (
            <Link
              to={`/booking/${charger._id}?source=${bookingSource}`}
              onClick={() => {
                // Set booking source in sessionStorage for context determination
                sessionStorage.setItem('bookingSource', bookingSource);
              }}
              className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-3 rounded-xl font-semibold text-center hover:from-blue-600 hover:to-blue-700 transition-all"
            >
              Book Now
            </Link>
          ) : (
            <button 
              disabled
              className="flex-1 bg-gray-400 text-gray-200 px-4 py-3 rounded-xl font-semibold text-center cursor-not-allowed"
              title="This charger is currently unavailable"
            >
              Unavailable
            </button>
          )}
          <button className="px-4 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors">
            <Navigation className="h-5 w-5 text-gray-600" />
          </button>
        </div>

        {/* Mood Match Indicator */}
        {charger.moodMatch && (
          <div className="mt-4 p-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-purple-700 font-medium">
                Perfect mood match for you! ✨
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChargerCard;