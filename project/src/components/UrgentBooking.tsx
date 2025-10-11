import { useState } from 'react';
import { Zap, Clock, MapPin, Star, ArrowUpDown } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface UrgentSlot {
  id: string;
  chargerName: string;
  location: string;
  availableAt: string;
  duration: number;
  originalPrice: number;
  tokensRequired: number;
  distance: number;
  rating: number;
  hostName: string;
}

const UrgentBooking = () => {
  const { user } = useAuth();
  const [urgentSlots, setUrgentSlots] = useState<UrgentSlot[]>([]);

  const handleExchangeTokens = (slotId: string, tokensRequired: number) => {
    if ((user?.tokens || 0) >= tokensRequired) {
      // Simulate booking the urgent slot
      alert(`Urgent slot booked! ${tokensRequired} tokens deducted.`);
      setUrgentSlots(prev => prev.filter(slot => slot.id !== slotId));
    } else {
      alert('Insufficient tokens for this urgent booking.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-200 rounded-2xl p-6">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center">
            <Zap className="h-6 w-6 text-white animate-pulse" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Urgent Booking</h2>
            <p className="text-red-600">Exchange tokens to claim priority charging slots</p>
          </div>
        </div>
        
        <div className="bg-white/50 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-gray-700">Your Available Tokens:</span>
            <div className="flex items-center space-x-2">
              <Zap className="h-5 w-5 text-yellow-500" />
              <span className="text-2xl font-bold text-gray-900">0</span>
            </div>
          </div>
        </div>
      </div>

      {/* Available Urgent Slots */}
      <div>
        <h3 className="text-xl font-bold text-gray-900 mb-4">Available Urgent Slots</h3>
        
        {urgentSlots.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl shadow-lg">
            <Clock className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Urgent Slots Available</h3>
            <p className="text-gray-600 mb-4">Priority charging slots will appear when other users cancel or make slots available</p>
            <p className="text-gray-500 text-sm">Earn tokens by completing charging sessions to exchange for urgent bookings</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {urgentSlots.map((slot) => (
              <div key={slot.id} className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                <div className="bg-gradient-to-r from-red-400 to-orange-400 p-4 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-lg">{slot.chargerName}</h4>
                      <div className="flex items-center space-x-1 text-sm opacity-90">
                        <MapPin className="h-3 w-3" />
                        <span>{slot.distance}km away</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm opacity-90">Available at</div>
                      <div className="text-xl font-bold">{slot.availableAt}</div>
                    </div>
                  </div>
                </div>

                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      <Star className="h-4 w-4 text-yellow-400 fill-current" />
                      <span className="font-medium">{slot.rating}</span>
                      <span className="text-gray-500 text-sm">• {slot.hostName}</span>
                    </div>
                    <span className="text-sm text-gray-600">{slot.duration}h duration</span>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-lg mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-gray-600">Original Price:</span>
                      <span className="text-gray-900 line-through">₹{slot.originalPrice}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-900">Token Exchange:</span>
                      <div className="flex items-center space-x-2">
                        <Zap className="h-4 w-4 text-yellow-500" />
                        <span className="font-bold text-lg text-purple-600">{slot.tokensRequired} Tokens</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleExchangeTokens(slot.id, slot.tokensRequired)}
                    disabled={(user?.tokens || 0) < slot.tokensRequired}
                    className={`w-full flex items-center justify-center space-x-2 px-4 py-3 rounded-xl font-semibold transition-all ${
                      (user?.tokens || 0) >= slot.tokensRequired
                        ? 'bg-gradient-to-r from-red-500 to-orange-500 text-white hover:from-red-600 hover:to-orange-600 transform hover:scale-105'
                        : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    <ArrowUpDown className="h-5 w-5" />
                    <span>
                      {(user?.tokens || 0) >= slot.tokensRequired 
                        ? 'Exchange Tokens & Book' 
                        : 'Insufficient Tokens'
                      }
                    </span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* How It Works */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6">
        <h3 className="text-lg font-bold text-blue-900 mb-4">How Urgent Booking Works</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-2">
              <span className="text-white font-bold">1</span>
            </div>
            <p className="text-sm text-blue-800">Users offer their booked slots for token exchange</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-2">
              <span className="text-white font-bold">2</span>
            </div>
            <p className="text-sm text-blue-800">Exchange your earned tokens to claim priority slots</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-2">
              <span className="text-white font-bold">3</span>
            </div>
            <p className="text-sm text-blue-800">Get immediate access to charging without waiting</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UrgentBooking;