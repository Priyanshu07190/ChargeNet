import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { 
  Calendar, 
  Zap, 
  MapPin, 
  User, 
  Star, 
  CreditCard,
  CheckCircle,
  ArrowLeft,
  Volume2,
  VolumeX,
  Mic,
  MicOff
} from 'lucide-react';
import { useCharger } from '../contexts/ChargerContext';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../lib/apiService';
import { authService } from '../lib/auth';
import PaymentComponent from '../components/PaymentComponent';

const Booking = () => {
  const { chargerId } = useParams();
  const navigate = useNavigate();
  const { chargers, bookCharger } = useCharger();
  const location = useLocation();
  const { user } = useAuth();
  
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [duration, setDuration] = useState(1);
  const [occupiedSlots, setOccupiedSlots] = useState<Set<string>>(new Set());
  const [occupiedIntervals, setOccupiedIntervals] = useState<Array<{ start: Date; end: Date }>>([]);
  const [selectionConflict, setSelectionConflict] = useState(false);
  const [bookingStep, setBookingStep] = useState(1);
  const [, setLoading] = useState(false); // Used in handlePaymentSuccess
  const [voiceAssistant, setVoiceAssistant] = useState(false);
  const [micActive, setMicActive] = useState(false);

  const charger = chargers.find(c => c._id === chargerId);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (!charger) {
      navigate('/map');
    }
  }, [charger, navigate, user]);

  useEffect(() => {
    // Auto-set today's date
    const today = new Date().toISOString().split('T')[0];
    setSelectedDate(today);
  }, []);

  // Load occupied time intervals for the selected charger and date
  useEffect(() => {
    const loadOccupied = async () => {
      try {
        if (!charger || !selectedDate) {
          setOccupiedIntervals([]);
          setOccupiedSlots(new Set());
          return;
        }
        // Ensure session/token like other booking calls
        const { user: sessionUser } = await authService.getSession();
        if (sessionUser) {
          const token = authService.getCurrentToken();
          if (token) apiService.setAuthToken(token);
        }
        const all = await apiService.getBookings();
        const sameCharger = (all || []).filter((b: any) => {
          const id = b.charger_id?._id || b.charger_id;
          return id === charger._id && b.status !== 'cancelled';
        });
        // Filter to the selected date (local date)
        const intervals: Array<{ start: Date; end: Date }> = [];
        sameCharger.forEach((b: any) => {
          const start = new Date(b.start_time);
          const end = new Date(b.end_time || new Date(new Date(b.start_time).getTime() + (b.duration || 60) * 60000));
          const dateStr = start.toISOString().slice(0,10);
          if (dateStr === selectedDate) {
            intervals.push({ start, end });
          }
        });
        setOccupiedIntervals(intervals);
        // Build occupied half-hour slot starts
        const newSet = new Set<string>();
        timeSlots.forEach((t) => {
          const [h, m] = t.split(':').map(Number);
          const slotStart = new Date(`${selectedDate}T${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:00`);
          const slotEnd = new Date(slotStart.getTime() + 30 * 60000);
          const overlaps = intervals.some(({ start, end }) => slotStart < end && slotEnd > start);
          if (overlaps) newSet.add(t);
        });
        setOccupiedSlots(newSet);
      } catch (e) {
        console.warn('Failed to load occupied slots', e);
        setOccupiedIntervals([]);
        setOccupiedSlots(new Set());
      }
    };
    loadOccupied();
  }, [charger, selectedDate]);

  // Recompute selection conflict when time/duration or intervals change
  useEffect(() => {
    if (!selectedDate || !selectedTime || !duration) { setSelectionConflict(false); return; }
    const [h, m] = selectedTime.split(':').map(Number);
    const start = new Date(`${selectedDate}T${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:00`);
    const end = new Date(start.getTime() + duration * 60 * 60 * 1000);
    const conflict = occupiedIntervals.some(({ start: s, end: e }) => start < e && end > s);
    setSelectionConflict(conflict);
  }, [selectedDate, selectedTime, duration, occupiedIntervals]);

  const timeSlots = [
    '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
    '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
    '18:00', '18:30', '19:00', '19:30', '20:00', '20:30'
  ];

  const totalCost = charger ? charger.price * duration * 30 : 0; // Assuming 30kWh per hour

  const handlePaymentSuccess = async (paymentData: any) => {
    if (!charger || !selectedDate || !selectedTime || !user) return;
    
    setLoading(true);
    try {
      // Ensure we have a valid session and token before booking
      console.log('🔄 Verifying session before booking...');
      const { user: sessionUser } = await authService.getSession();
      
      if (!sessionUser) {
        alert('Session expired. Please log in again.');
        setLoading(false);
        return;
      }
      
      // Ensure API service has the current token
      const currentToken = authService.getCurrentToken();
      if (currentToken) {
        apiService.setAuthToken(currentToken);
        console.log('🔑 Token synchronized for booking request');
      } else {
        console.warn('⚠️ No token available, relying on cookie authentication');
      }

      // Determine booking context from URL query first, then fallbacks
      const params = new URLSearchParams(location.search);
      const sourceParam = params.get('source');
      const currentPath = window.location.pathname;
      const referrer = document.referrer;
      let bookingContext = 'driver-booking';
      if (sourceParam === 'host') {
        bookingContext = 'host-booking';
      } else if (
        currentPath.includes('/host') ||
        referrer.includes('/host') ||
        sessionStorage.getItem('bookingSource') === 'host'
      ) {
        bookingContext = 'host-booking';
      }
      
      console.log('🔍 Booking Debug Info:');
      console.log('Current path:', currentPath);
      console.log('Referrer:', referrer);
      console.log('Booking source from session:', sessionStorage.getItem('bookingSource'));
      console.log('Booking source param:', sourceParam);
      console.log('User type:', user.user_type);
      console.log('📌 FINAL BOOKING CONTEXT:', bookingContext);
      console.log('User ID:', user._id);
      
      // Create booking data
      const bookingData = {
        charger_id: charger._id,
        start_time: new Date(`${selectedDate} ${selectedTime}`),
        end_time: new Date(`${selectedDate} ${selectedTime}`), // Will be updated with duration
        duration: duration * 60, // Convert hours to minutes
        total_cost: totalCost + 5, // Include platform fee
        status: 'confirmed',
        payment_status: 'paid',
        payment_id: paymentData.payment_id,
        razorpay_order_id: paymentData.order_id,
        booking_context: bookingContext // Add context to distinguish driver vs host bookings
      };

      // Calculate actual end time
      const startTime = new Date(`${selectedDate} ${selectedTime}`);
      const endTime = new Date(startTime.getTime() + (duration * 60 * 60 * 1000));
      bookingData.end_time = endTime;

      console.log('📝 BOOKING DATA BEING SENT:', JSON.stringify(bookingData, null, 2));
      console.log('🎯 booking_context in data:', bookingData.booking_context);

      console.log('Creating booking with data:', bookingData);
      console.log('Charger being booked:', charger);

      // Save to backend database (only storage)
      const savedBooking = await apiService.createBooking(bookingData);
      console.log('Booking saved to database:', savedBooking);
      
      // Use the original bookCharger for any additional logic
      await bookCharger(charger._id, `${selectedDate} ${selectedTime}`);
      
      // Success
      setBookingStep(3);
      // Clear booking source hint
      sessionStorage.removeItem('bookingSource');
      // Navigate to appropriate dashboard tab so the new booking appears immediately
      if (bookingContext === 'host-booking') {
        navigate('/host-dashboard?tab=my-bookings');
      } else {
        navigate('/dashboard?tab=bookings');
      }
    } catch (error: any) {
      console.error('Booking failed:', error);
      
      // Handle specific error cases
      if (error.response?.status === 400 && error.response?.data?.error === 'Charger is currently unavailable') {
        alert('⚠️ Charger Unavailable\n\nThis charger is currently not accepting bookings. The host may have temporarily disabled it. Please try another charger or check back later.');
      } else if (error.response?.status === 404) {
        alert('❌ Charger Not Found\n\nThis charger is no longer available. Please select a different charger.');
      } else {
        alert('❌ Booking Failed\n\nSomething went wrong while creating your booking. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentFailure = () => {
    setBookingStep(1);
    alert('Payment failed or was cancelled. Please try again.');
  };

  const handleVoiceCommand = () => {
    setMicActive(!micActive);
    
    if (!micActive) {
      // Simulate voice recognition
      setTimeout(() => {
        setSelectedTime('14:30');
        setDuration(2);
        setMicActive(false);
        
        // Show voice feedback
        const utterance = new SpeechSynthesisUtterance(
          `I've set your booking for 2:30 PM for 2 hours. The total cost will be ₹${(charger?.price || 0) * 2 * 30}. Say confirm to proceed.`
        );
        speechSynthesis.speak(utterance);
      }, 2000);
    }
  };

  if (!charger) {
    return (
      <div className="min-h-screen pt-16 bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading charger details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-16 bg-gradient-to-br from-blue-50 to-green-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/map')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="h-5 w-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Book Charging Session</h1>
              <p className="text-gray-600">{charger.name}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Booking Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Progress Steps */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-6">
                {[
                  { step: 1, name: 'Details', icon: Calendar },
                  { step: 2, name: 'Payment', icon: CreditCard },
                  { step: 3, name: 'Confirmation', icon: CheckCircle }
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.step} className="flex items-center">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        bookingStep >= item.step 
                          ? 'bg-blue-500 text-white' 
                          : 'bg-gray-200 text-gray-600'
                      }`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <span className={`ml-2 text-sm font-medium ${
                        bookingStep >= item.step ? 'text-blue-600' : 'text-gray-500'
                      }`}>
                        {item.name}
                      </span>
                      {item.step < 4 && <div className="w-8 h-0.5 bg-gray-200 mx-4"></div>}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Step 1: Booking Details */}
            {bookingStep === 1 && (
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-900">Select Date & Time</h2>
                  
                  {/* ChargeGenie Voice Assistant */}
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setVoiceAssistant(!voiceAssistant)}
                      className={`p-2 rounded-lg transition-colors ${
                        voiceAssistant ? 'bg-purple-100 text-purple-600' : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {voiceAssistant ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                    </button>
                    
                    {voiceAssistant && (
                      <button
                        onClick={handleVoiceCommand}
                        className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all ${
                          micActive 
                            ? 'bg-red-500 text-white animate-pulse' 
                            : 'bg-purple-500 text-white hover:bg-purple-600'
                        }`}
                      >
                        {micActive ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                        <span className="text-sm">
                          {micActive ? 'Listening...' : 'ChargeGenie'}
                        </span>
                      </button>
                    )}
                  </div>
                </div>

                {voiceAssistant && (
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
                    <div className="flex items-center space-x-2 mb-2">
                      <div className="flex space-x-1">
                        <div className="voice-wave"></div>
                        <div className="voice-wave"></div>
                        <div className="voice-wave"></div>
                        <div className="voice-wave"></div>
                      </div>
                      <span className="text-sm font-medium text-purple-700">ChargeGenie Active</span>
                    </div>
                    <p className="text-sm text-purple-600">
                      "Hi! I can help you book this charger. Just say when you'd like to charge and for how long!"
                    </p>
                  </div>
                )}

                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Time Slot</label>
                    <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
                      {timeSlots.map((time) => {
                        const isOccupied = occupiedSlots.has(time);
                        const isSelected = selectedTime === time;
                        return (
                          <button
                            key={time}
                            onClick={() => !isOccupied && setSelectedTime(time)}
                            disabled={isOccupied}
                            className={`p-2 rounded-lg text-sm font-medium transition-all ${
                              isOccupied
                                ? 'bg-red-100 text-red-700 cursor-not-allowed opacity-70'
                                : isSelected
                                  ? 'bg-blue-500 text-white'
                                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                            title={isOccupied ? 'This time is already booked' : ''}
                          >
                            {time}
                          </button>
                        );
                      })}
                    </div>
                    {selectionConflict && selectedTime && (
                      <p className="text-xs text-red-600 mt-2">Selected time and duration overlaps an existing booking. Please choose a different time or shorter duration.</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Duration (hours)</label>
                    <div className="flex items-center space-x-4">
                      <button
                        onClick={() => setDuration(Math.max(0.5, duration - 0.5))}
                        className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center hover:bg-gray-300 transition-colors"
                      >
                        -
                      </button>
                      <div className="flex-1 text-center">
                        <span className="text-2xl font-bold text-gray-900">{duration}</span>
                        <span className="text-gray-600 ml-1">hours</span>
                      </div>
                      <button
                        onClick={() => setDuration(duration + 0.5)}
                        className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center hover:bg-gray-300 transition-colors"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={() => setBookingStep(2)}
                    disabled={!selectedDate || !selectedTime || selectionConflict}
                    className="w-full bg-gradient-to-r from-blue-500 to-green-500 text-white px-6 py-3 rounded-xl font-semibold hover:from-blue-600 hover:to-green-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Continue to Payment
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Payment */}
            {bookingStep === 2 && (
              <PaymentComponent
                amount={totalCost + 5}
                chargerId={charger?._id}
                onPaymentSuccess={handlePaymentSuccess}
                onPaymentFailure={handlePaymentFailure}
                userInfo={{
                  name: user?.name || '',
                  email: user?.email || '',
                  phone: user?.phone || '',
                }}
              />
            )}

            {/* Step 3: Confirmation */}
            {bookingStep === 3 && (
              <div className="bg-white rounded-2xl shadow-lg p-6 text-center">
                <div className="mb-6">
                  <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce-gentle">
                    <CheckCircle className="h-10 w-10 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Booking Confirmed! 🎉</h2>
                  <p className="text-gray-600">Your charging session has been successfully booked</p>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg mb-6 text-left">
                  <h3 className="font-semibold text-gray-900 mb-3">Booking Details</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Date & Time:</span>
                      <span className="font-medium">{selectedDate} at {selectedTime}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Duration:</span>
                      <span className="font-medium">{duration} hours</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Cost:</span>
                      <span className="font-medium">₹{(totalCost + 5).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Booking ID:</span>
                      <span className="font-medium">CHG-{Date.now().toString().slice(-6)}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <button
                    onClick={() => navigate(user?.user_type === 'host' ? '/host-dashboard' : '/dashboard')}
                    className="w-full bg-gradient-to-r from-blue-500 to-green-500 text-white px-6 py-3 rounded-xl font-semibold hover:from-blue-600 hover:to-green-600 transition-all"
                  >
                    Go to Dashboard
                  </button>
                  <button
                    onClick={() => navigate('/map')}
                    className="w-full bg-gray-200 text-gray-800 px-6 py-3 rounded-xl font-semibold hover:bg-gray-300 transition-all"
                  >
                    Find More Chargers
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Charger Info Sidebar */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-lg p-6 sticky top-24">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-green-400 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Zap className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">{charger?.name}</h3>
                <div className="flex items-center justify-center space-x-1 mt-2">
                  <Star className="h-4 w-4 text-yellow-400 fill-current" />
                  <span className="font-medium">{charger?.rating}</span>
                  <span className="text-gray-500 text-sm">({charger?.reviews} reviews)</span>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <MapPin className="h-5 w-5 text-gray-500" />
                  <div>
                    <p className="font-medium text-gray-900">Location</p>
                    <p className="text-sm text-gray-600">{charger?.location}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <User className="h-5 w-5 text-gray-500" />
                  <div>
                    <p className="font-medium text-gray-900">Host</p>
                    <p className="text-sm text-gray-600">{charger?.host_name || charger?.hostName}</p>
                    {charger?.host_phone && (
                      <p className="text-sm text-blue-600 font-medium">📞 {charger.host_phone}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <Zap className="h-5 w-5 text-gray-500" />
                  <div>
                    <p className="font-medium text-gray-900">Specifications</p>
                    <p className="text-sm text-gray-600">{charger?.plug_type} • {charger?.power} kW</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <CreditCard className="h-5 w-5 text-gray-500" />
                  <div>
                    <p className="font-medium text-gray-900">Pricing</p>
                    <p className="text-sm text-gray-600">₹{charger?.price}/kWh</p>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-gray-200">
                <h4 className="font-semibold text-gray-900 mb-3">Features</h4>
                <div className="flex flex-wrap gap-2">
                  {charger?.features?.map((feature, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-lg"
                    >
                      {feature}
                    </span>
                  ))}
                </div>
              </div>

              {/* Live Status */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${charger?.available ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                  <span className={`text-sm font-medium ${charger?.available ? 'text-green-600' : 'text-red-600'}`}>
                    {charger?.available ? 'Available Now' : 'Currently Occupied'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Booking;