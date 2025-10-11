import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Calendar, 
  Zap, 
  Star, 
  TrendingUp, 
  Battery,
  Gift,
  X,
  HelpCircle,
  Navigation,
  AlertTriangle,
  Menu,
  ChevronLeft,
  Leaf,
  ShoppingCart,
  DollarSign,
  Plus
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { authService } from '../lib/auth';
import { apiService } from '../lib/apiService';
import UrgentBooking from '../components/UrgentBooking';
import TripPlanner from '../components/TripPlanner';
import RewardsExchange from '../components/RewardsExchange';
import EmergencyRescue from '../components/EmergencyRescue';
import socketService from '../lib/socketService';

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'overview' | 'trip-planner' | 'bookings' | 'analytics' | 'urgent' | 'rewards' | 'carbon-trading' | 'emergency-rescue' | 'support'>('overview');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchParams] = useSearchParams();
  const [recentBookings, setRecentBookings] = useState<any[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [loading, setLoading] = useState(false);
  
  // Carbon Trading State
  const [carbonStats, setCarbonStats] = useState({
    total_distance_km: 0,
    co2_saved_kg: 0,
    carbon_credits: 0,
    carbon_credits_earned: 0,
    carbon_credits_sold: 0,
    carbon_earnings: 0
  });
  const [showListModal, setShowListModal] = useState(false);
  const [listAmount, setListAmount] = useState('');
  const [listPrice, setListPrice] = useState('');
  const [marketplace, setMarketplace] = useState<any[]>([]);
  const [myListings, setMyListings] = useState<any[]>([]);

  const refreshBookings = () => {
    console.log('🔄 Manual refresh triggered for driver bookings');
    setRefreshKey(prev => prev + 1);
  };

  const handleCancelBooking = async (bookingId: string) => {
    if (!confirm('Are you sure you want to cancel this booking?')) return;
    
    try {
      console.log('Attempting to cancel booking:', bookingId);
      // Ensure valid session and sync token before cancelling
      const { user: sessionUser } = await authService.getSession();
      if (!sessionUser) {
        alert('Session expired. Please log in again.');
        return;
      }
      const currentToken = authService.getCurrentToken();
      if (currentToken) {
        apiService.setAuthToken(currentToken);
      }
      
      const result = await apiService.cancelBooking(bookingId);
      console.log('Cancel booking result:', result);
      
      // Refresh data from database
      const updatedBookings = await apiService.getDriverBookings();
      if (updatedBookings) {
        const transformedBookings = updatedBookings.map((booking: any) => ({
          id: booking._id || booking.id,
          chargerName: booking.charger_id?.name || 'Unknown Charger',
          chargerLocation: booking.charger_id?.location || 'Unknown Location',
          date: new Date(booking.start_time).toLocaleDateString(),
          time: new Date(booking.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          duration: Math.round(booking.duration / 60),
          amount: booking.total_cost,
          cost: typeof booking.total_cost === 'number' ? `₹${booking.total_cost}` : (booking.cost || ''),
          status: booking.status,
          created_at: booking.created_at
        }));
        setRecentBookings(transformedBookings);
      }
      
      alert('Booking cancelled successfully');
    } catch (error: any) {
      console.error('Error cancelling booking:', error);
      
      // Check if it's a session/auth error
      if (
        error.message?.includes('session') ||
        error.message?.includes('expired') ||
        error.message?.includes('unauthorized') ||
        error.message?.includes('Forbidden') ||
        error.message?.includes('403')
      ) {
        alert('Your session has expired. Please log in again.');
        // Optionally redirect to login
        // navigate('/login');
      } else {
        const errorMessage = error.message || 'Failed to cancel booking. Please try again.';
        alert(`Error: ${errorMessage}`);
      }
    }
  };

  useEffect(() => {
    // Sync active tab from URL query param
    const tabParam = searchParams.get('tab');
    if (tabParam && ['overview','bookings','analytics','urgent','rewards','support'].includes(tabParam)) {
      console.log('🔄 Setting active tab from URL:', tabParam);
      setActiveTab(tabParam as typeof activeTab);
    }

    // Connect to WebSocket for real-time updates
    socketService.connect();

    // Cleanup on unmount
    return () => {
      // Don't disconnect socket here as it's used across multiple components
    };
  }, [searchParams]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        // Get user session to verify authentication
        const { user: sessionUser } = await authService.getSession();
        if (!sessionUser) {
          console.warn('❌ No valid session, redirecting to login');
          navigate('/login');
          return;
        }
        
        // Load bookings from database
        const backendBookings = await apiService.getDriverBookings();
        console.log('📊 Driver bookings loaded:', backendBookings?.length || 0);
        
        if (backendBookings && backendBookings.length > 0) {
          const transformedBookings = backendBookings.map((booking: any) => ({
            id: booking._id || booking.id,
            chargerName: booking.charger_id?.name || 'Unknown Charger',
            chargerLocation: booking.charger_id?.location || 'Unknown Location',
            date: new Date(booking.start_time).toLocaleDateString(),
            time: new Date(booking.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            duration: Math.round(booking.duration / 60),
            amount: booking.total_cost,
            cost: typeof booking.total_cost === 'number' ? `₹${booking.total_cost}` : (booking.cost || ''),
            status: booking.status,
            created_at: booking.created_at,
            hostName: booking.charger_id?.host_name || 'Host',
            hostPhone: booking.charger_id?.host_phone
          }));
          setRecentBookings(transformedBookings);
        } else {
          setRecentBookings([]);
        }

        // Set up real-time booking updates after successful data load
        const handleBookingListChanged = (data: any) => {
          console.log('📡 Real-time booking update received:', data);
          
          if (data.type === 'booking-created' && data.booking) {
            // Add new booking to the list
            const newBooking = {
              id: data.booking._id || data.booking.id,
              chargerName: data.booking.charger_id?.name || 'Unknown Charger',
              chargerLocation: data.booking.charger_id?.location || 'Unknown Location',
              date: new Date(data.booking.start_time).toLocaleDateString(),
              time: new Date(data.booking.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              duration: Math.round(data.booking.duration / 60),
              amount: data.booking.total_cost,
              status: data.booking.status,
              created_at: data.booking.created_at,
              hostName: data.booking.charger_id?.host_name || 'Host',
              hostPhone: data.booking.charger_id?.host_phone
            };
            
            setRecentBookings(prev => [newBooking, ...prev]);
          } else if (data.type === 'booking-updated' && data.booking) {
            // Update existing booking status
            setRecentBookings(prev => 
              prev.map(booking => 
                booking.id === data.booking._id 
                  ? { ...booking, status: data.booking.status }
                  : booking
              )
            );
          }
        };

        // Connect to WebSocket and join user room
        socketService.connect();
        if (sessionUser?._id) {
          socketService.joinUserRoom(sessionUser._id);
        }
        socketService.onBookingListChanged(handleBookingListChanged);

      } catch (error) {
        console.error('Error loading driver bookings:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
    
    // Cleanup on unmount
    return () => {
      socketService.offBookingListChanged();
    };
  }, [refreshKey]);

  // Load carbon credits stats
  useEffect(() => {
    const loadCarbonStats = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/carbon-credits/stats', {
          credentials: 'include'
        });
        if (response.ok) {
          const data = await response.json();
          setCarbonStats(data);
        }
      } catch (error) {
        console.error('Error loading carbon stats:', error);
      }
    };

    if (activeTab === 'carbon-trading') {
      loadCarbonStats();
      loadMarketplace();
      loadMyListings();
    }
  }, [activeTab, refreshKey]);

  // Carbon Trading Functions
  const loadMarketplace = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/carbon-credits/marketplace', {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setMarketplace(data.listings || []);
      }
    } catch (error) {
      console.error('Error loading marketplace:', error);
    }
  };

  const loadMyListings = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/carbon-credits/my-listings', {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setMyListings(data.listings || []);
      }
    } catch (error) {
      console.error('Error loading my listings:', error);
    }
  };

  const handleListCredits = async () => {
    if (!listAmount || !listPrice) {
      alert('Please enter both amount and price');
      return;
    }

    const amount = parseFloat(listAmount);
    const price = parseFloat(listPrice);

    if (amount <= 0 || price <= 0) {
      alert('Please enter valid positive numbers');
      return;
    }

    if (amount > carbonStats.carbon_credits) {
      alert(`You only have ${carbonStats.carbon_credits} credits available`);
      return;
    }

    try {
      const response = await fetch('http://localhost:5000/api/carbon-credits/list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          credits_amount: amount,
          price_per_credit: price
        })
      });

      if (response.ok) {
        alert('✅ Credits listed successfully!');
        setShowListModal(false);
        setListAmount('');
        setListPrice('');
        setRefreshKey(prev => prev + 1); // Reload data
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to list credits');
      }
    } catch (error) {
      console.error('Error listing credits:', error);
      alert('Failed to list credits');
    }
  };

  const handleCancelListing = async (listingId: string) => {
    if (!confirm('Cancel this listing? Credits will be returned to your account.')) return;

    try {
      const response = await fetch(`http://localhost:5000/api/carbon-credits/cancel/${listingId}`, {
        method: 'POST',
        credentials: 'include'
      });

      if (response.ok) {
        alert('✅ Listing cancelled');
        setRefreshKey(prev => prev + 1);
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to cancel listing');
      }
    } catch (error) {
      console.error('Error cancelling listing:', error);
      alert('Failed to cancel listing');
    }
  };

  const handleBuyCredits = async (listingId: string, amount: number, price: number) => {
    if (!confirm(`Buy ${amount} credits for ₹${price}?`)) return;

    try {
      const response = await fetch(`http://localhost:5000/api/carbon-credits/buy/${listingId}`, {
        method: 'POST',
        credentials: 'include'
      });

      if (response.ok) {
        alert('✅ Purchase successful!');
        setRefreshKey(prev => prev + 1);
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to purchase credits');
      }
    } catch (error) {
      console.error('Error buying credits:', error);
      alert('Failed to purchase credits');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex pt-16">
        {/* Sidebar Navigation */}
        <div className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-white h-[calc(100vh-64px)] fixed left-0 top-16 shadow-lg transition-all duration-300 z-30 overflow-y-auto border-r border-gray-200`}>
          {/* Toggle Button */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="w-full p-4 flex items-center justify-center hover:bg-gray-50 border-b border-gray-200 transition-colors"
          >
            {sidebarOpen ? (
              <>
                <ChevronLeft className="w-5 h-5 text-gray-600" />
                <span className="ml-2 text-sm font-medium text-gray-700">Collapse</span>
              </>
            ) : (
              <Menu className="w-6 h-6 text-gray-600" />
            )}
          </button>

          {/* Menu Items */}
          <nav className="py-2">
            {[
              { id: 'overview', name: 'Overview', icon: TrendingUp },
              { id: 'trip-planner', name: 'Trip Planner', icon: Navigation },
              { id: 'bookings', name: 'My Bookings', icon: Calendar },
              { id: 'urgent', name: 'Urgent Booking', icon: Zap },
              { id: 'rewards', name: 'Rewards', icon: Gift },
              { id: 'carbon-trading', name: 'Carbon Trading', icon: Leaf },
              { id: 'emergency-rescue', name: 'Emergency Rescue', icon: AlertTriangle },
              { id: 'support', name: 'Support', icon: HelpCircle }
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  className={`w-full flex items-center px-4 py-3 transition-all duration-200 ${
                    isActive
                      ? 'bg-blue-50 text-blue-600 border-l-4 border-blue-600'
                      : 'text-gray-700 hover:bg-gray-100 border-l-4 border-transparent'
                  }`}
                  title={!sidebarOpen ? tab.name : ''}
                >
                  <Icon className={`${sidebarOpen ? 'w-5 h-5' : 'w-6 h-6'} flex-shrink-0 ${isActive ? 'text-blue-600' : 'text-gray-600'}`} />
                  {sidebarOpen && (
                    <span className={`ml-3 font-medium text-sm ${isActive ? 'text-blue-600' : 'text-gray-700'}`}>
                      {tab.name}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Main Content Area */}
        <div className={`flex-1 ${sidebarOpen ? 'ml-64' : 'ml-20'} transition-all duration-300`}>
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white sticky top-16 z-20 shadow-lg">
            <div className="px-6 py-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold mb-2">Hi {user?.name}! ⚡</h1>
                  <p className="text-blue-100">Your EV charging journey continues</p>
                </div>
                
                <div className="flex items-center space-x-4">
                  <div className="bg-white/10 backdrop-blur-lg rounded-lg px-4 py-2">
                    <div className="flex items-center space-x-2">
                      <Zap className="h-4 w-4" />
                      <div>
                        <div className="text-xs opacity-80">Tokens</div>
                        <div className="font-bold">0</div>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white/10 backdrop-blur-lg rounded-lg px-4 py-2">
                    <div className="flex items-center space-x-2">
                      <Star className="h-4 w-4" />
                      <div>
                        <div className="text-xs opacity-80">Carbon Credits</div>
                        <div className="font-bold">0</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Content Container */}
          <div className="px-6 py-8">

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Sessions</p>
                    <p className="text-3xl font-bold text-gray-900">0</p>
                  </div>
                  <div className="bg-blue-100 p-3 rounded-xl">
                    <Zap className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
                <div className="mt-4 flex items-center">
                  <span className="text-gray-500 text-sm font-medium">Start charging to see progress</span>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Energy Charged</p>
                    <p className="text-3xl font-bold text-gray-900">0 kWh</p>
                  </div>
                  <div className="bg-green-100 p-3 rounded-xl">
                    <Battery className="h-6 w-6 text-green-600" />
                  </div>
                </div>
                <div className="mt-4 flex items-center">
                  <span className="text-gray-500 text-sm font-medium">No charging sessions yet</span>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Money Saved</p>
                    <p className="text-3xl font-bold text-gray-900">₹0</p>
                  </div>
                  <div className="bg-yellow-100 p-3 rounded-xl">
                    <Star className="h-6 w-6 text-yellow-600" />
                  </div>
                </div>
                <div className="mt-4 flex items-center">
                  <span className="text-gray-500 text-sm font-medium">vs petrol costs</span>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">CO₂ Avoided</p>
                    <p className="text-3xl font-bold text-gray-900">0 kg</p>
                  </div>
                  <div className="bg-green-100 p-3 rounded-xl">
                    <Star className="h-6 w-6 text-green-600" />
                  </div>
                </div>
                <div className="mt-4 flex items-center">
                  <span className="text-gray-500 text-sm font-medium">Environmental impact</span>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-gray-900">Recent Charging Sessions</h3>
                  {recentBookings.length > 0 && (
                    <button
                      onClick={() => setActiveTab('bookings')}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      View All
                    </button>
                  )}
                </div>

                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading your recent sessions...</p>
                  </div>
                ) : recentBookings.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-gray-400 mb-4">
                      <Zap className="h-12 w-12 mx-auto" />
                    </div>
                    <p className="text-gray-500 text-lg font-medium">No charging sessions yet</p>
                    <p className="text-gray-400 text-sm mt-2 mb-4">Your charging history will appear here after your first session</p>
                    <button 
                      onClick={() => navigate('/map?source=driver')}
                      className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors"
                    >
                      Start Charging
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {recentBookings.slice(0, 3).map((booking) => (
                      <div key={booking.id} className="flex items-center justify-between p-4 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-gradient-to-r from-blue-400 to-green-400 rounded-lg flex items-center justify-center">
                            <Zap className="h-5 w-5 text-white" />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-semibold text-gray-900">{booking.chargerName}</div>
                            <div className="text-xs text-gray-500">{booking.chargerLocation}</div>
                            <div className="text-xs text-gray-500 mt-0.5">{booking.date} • {booking.time}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            booking.status === 'completed' 
                              ? 'bg-green-100 text-green-800'
                              : booking.status === 'cancelled'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {booking.status}
                          </span>
                          {booking.status !== 'completed' && booking.status !== 'cancelled' && (
                            <button
                              onClick={() => handleCancelBooking(booking.id)}
                              className="text-red-600 hover:text-red-900 bg-red-50 hover:bg-red-100 px-3 py-1 rounded-lg text-xs transition-colors"
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
                <h3 className="text-xl font-bold text-gray-900 mb-6">Charger Recommendations</h3>
                <div className="text-center py-8">
                  <div className="text-gray-400 mb-4">
                    <Star className="h-12 w-12 mx-auto" />
                  </div>
                  <p className="text-gray-500 text-lg font-medium">No recommendations yet</p>
                  <p className="text-gray-400 text-sm mt-2">Personalized charger suggestions will appear based on your usage patterns</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Trip Planner Tab */}
        {activeTab === 'trip-planner' && (
          <div className="space-y-8">
            <TripPlanner source="driver" />
          </div>
        )}

        {/* Bookings Tab */}
        {activeTab === 'bookings' && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">My Charging Sessions</h3>
                  <p className="text-gray-600 mt-1">Track your charging history and upcoming bookings</p>
                </div>
                <button
                  onClick={refreshBookings}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  Refresh
                </button>
              </div>
            </div>
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading your bookings...</p>
              </div>
            ) : recentBookings.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-400 mb-4">
                  <Calendar className="h-16 w-16 mx-auto" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No Charging Sessions Yet</h3>
                <p className="text-gray-600 mb-4">Your charging history will appear here once you start booking sessions</p>
                <button 
                  onClick={() => navigate('/map?source=driver')}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Find Chargers
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Charger
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date & Time
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Duration
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Cost
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {recentBookings.map((booking) => (
                      <tr key={booking.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0">
                              <div className="w-10 h-10 bg-gradient-to-r from-blue-400 to-green-400 rounded-lg flex items-center justify-center">
                                <Zap className="h-5 w-5 text-white" />
                              </div>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {booking.chargerName}
                              </div>
                              {booking.chargerLocation && (
                                <div className="text-xs text-gray-500 mt-0.5">
                                  {booking.chargerLocation}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{booking.date}</div>
                          <div className="text-sm text-gray-500">{booking.time}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {booking.duration}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {booking.cost || (typeof booking.amount === 'number' ? `₹${booking.amount}` : '')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            booking.status === 'completed' 
                              ? 'bg-green-100 text-green-800'
                              : booking.status === 'cancelled'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {booking.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          {booking.status !== 'completed' && booking.status !== 'cancelled' && (
                            <button
                              onClick={() => handleCancelBooking(booking.id)}
                              className="text-red-600 hover:text-red-900 bg-red-50 hover:bg-red-100 px-3 py-1 rounded-lg transition-colors flex items-center space-x-1"
                            >
                              <X className="h-4 w-4" />
                              <span>Cancel</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Urgent Booking Tab */}
        {activeTab === 'urgent' && <UrgentBooking />}

        {/* Rewards Tab */}
        {activeTab === 'rewards' && <RewardsExchange />}

        {/* Carbon Trading Tab */}
        {activeTab === 'carbon-trading' && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Leaf className="w-6 h-6 text-green-600" />
                Carbon Credits Trading
              </h3>
              <p className="text-gray-600 mt-1">Trade your earned carbon credits and make an environmental impact</p>
            </div>
            <div className="p-6">
              {/* Carbon Credits Journey Section */}
              <div className="bg-gradient-to-r from-green-50 to-blue-50 p-6 rounded-2xl mb-6">
                <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Leaf className="w-5 h-5 text-green-600" />
                  Your Carbon Credits Journey
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white p-4 rounded-xl border border-green-200">
                    <p className="text-sm text-gray-600 mb-1">Total Credits Earned</p>
                    <p className="text-3xl font-bold text-green-600">{carbonStats.carbon_credits_earned}</p>
                    <p className="text-xs text-gray-500 mt-2">1 Credit = 1,000 kg CO₂ avoided</p>
                    <p className="text-xs text-gray-400 mt-1">{carbonStats.total_distance_km.toLocaleString()} km traveled</p>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-blue-200">
                    <p className="text-sm text-gray-600 mb-1">Credits Available</p>
                    <p className="text-3xl font-bold text-blue-600">{carbonStats.carbon_credits}</p>
                    <p className="text-xs text-gray-500 mt-2">Ready to trade</p>
                    {carbonStats.carbon_credits > 0 && (
                      <button 
                        onClick={() => setShowListModal(true)}
                        className="mt-3 w-full bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-1"
                      >
                        <Plus className="w-3 h-3" />
                        List for Trading
                      </button>
                    )}
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-purple-200">
                    <p className="text-sm text-gray-600 mb-1">Total Earnings</p>
                    <p className="text-3xl font-bold text-purple-600">₹{carbonStats.carbon_earnings}</p>
                    <p className="text-xs text-gray-500 mt-2">{carbonStats.carbon_credits_sold} credits sold</p>
                  </div>
                </div>
                
                {/* Progress Bar with Milestones */}
                <div className="mt-6 bg-white p-6 rounded-xl border border-gray-200">
                  <div className="flex justify-between items-center mb-3">
                    <h5 className="text-lg font-bold text-gray-900">Carbon Credits Journey</h5>
                    <button className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors border border-green-200">
                      <Leaf className="w-4 h-4" />
                      <span className="font-medium">Go Green</span>
                    </button>
                  </div>
                  
                  <div className="mb-4">
                    <div className="flex justify-between items-baseline mb-2">
                      <p className="text-sm text-gray-600">{carbonStats.carbon_credits_earned} / 5,000 Credits</p>
                      <div className="text-right">
                        {carbonStats.carbon_credits_earned < 1000 && (
                          <>
                            <p className="text-xs text-gray-500">Next gift at <span className="font-semibold text-gray-700">1,000</span></p>
                            <p className="text-xs font-semibold text-gray-700">• {1000 - carbonStats.carbon_credits_earned} to go</p>
                          </>
                        )}
                        {carbonStats.carbon_credits_earned >= 1000 && carbonStats.carbon_credits_earned < 2000 && (
                          <>
                            <p className="text-xs text-gray-500">Next gift at <span className="font-semibold text-gray-700">2,000</span></p>
                            <p className="text-xs font-semibold text-gray-700">• {2000 - carbonStats.carbon_credits_earned} to go</p>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="relative">
                      <div className="w-full bg-gray-200 rounded-full h-3 mb-6">
                        <div className="bg-gradient-to-r from-green-500 to-blue-500 h-3 rounded-full transition-all duration-500" style={{ width: `${Math.min((carbonStats.carbon_credits_earned / 5000) * 100, 100)}%` }}></div>
                      </div>
                      
                      {/* Milestone Markers */}
                      <div className="absolute top-0 left-0 right-0 flex justify-between px-0">
                        {[
                          { value: 1000, position: '20%', label: '1k' },
                          { value: 2000, position: '40%', label: '2k' },
                          { value: 3000, position: '60%', label: '3k' },
                          { value: 4000, position: '80%', label: '4k' },
                          { value: 5000, position: '100%', label: '5k' }
                        ].map((milestone) => (
                          <div key={milestone.value} className="flex flex-col items-center" style={{ position: 'absolute', left: milestone.position, transform: 'translateX(-50%)' }}>
                            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center mb-1 border-2 border-gray-300 mt-4">
                              <Gift className="w-5 h-5 text-gray-400" />
                            </div>
                            <span className="text-xs text-gray-500 font-medium">{milestone.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-8">
                    <p className="text-sm text-blue-800">
                      <strong>Keep charging</strong> to unlock your <strong>1k gift!</strong>
                    </p>
                  </div>
                  
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 mt-3">
                    <p className="text-xs text-green-700">
                      💡 <strong>How it works:</strong> 1 Carbon Credit = 1,000 kg CO₂ saved from renewable energy charging
                    </p>
                  </div>
                  
                  <div className="mt-4 flex justify-end">
                    <button className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors">
                      Gift Locked
                    </button>
                  </div>
                </div>
              </div>

              {/* Trading Section */}
              <div className="space-y-6">
                {/* My Listings */}
                {myListings.length > 0 && (
                  <div>
                    <h4 className="text-lg font-bold text-gray-900 mb-4">My Listings</h4>
                    <div className="space-y-3">
                      {myListings.map((listing) => (
                        <div key={listing._id} className="bg-white border border-gray-200 p-4 rounded-xl flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-gray-900">{listing.credits_amount} Credits</p>
                            <p className="text-sm text-gray-600">₹{listing.price_per_credit}/credit • Total: ₹{listing.total_price}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              {listing.status === 'active' && '🟢 Active'}
                              {listing.status === 'sold' && '✅ Sold'}
                              {listing.status === 'cancelled' && '❌ Cancelled'}
                            </p>
                          </div>
                          {listing.status === 'active' && (
                            <button
                              onClick={() => handleCancelListing(listing._id)}
                              className="px-4 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors"
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Marketplace */}
                <div>
                  <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <ShoppingCart className="w-5 h-5 text-blue-600" />
                    Marketplace
                  </h4>
                  {marketplace.length === 0 ? (
                    <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl p-8 text-center">
                      <ShoppingCart className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-600 font-medium mb-2">No Credits Listed Yet</p>
                      <p className="text-sm text-gray-500">Be the first to list your carbon credits!</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {marketplace.map((listing) => (
                        <div key={listing._id} className="bg-white border border-gray-200 p-4 rounded-xl hover:shadow-md transition-shadow">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <p className="font-semibold text-gray-900 text-lg">{listing.credits_amount} Credits</p>
                              <p className="text-sm text-gray-600">by {listing.seller_name}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-gray-500">₹{listing.price_per_credit}/credit</p>
                              <p className="text-lg font-bold text-green-600">₹{listing.total_price}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => handleBuyCredits(listing._id, listing.credits_amount, listing.total_price)}
                            className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                          >
                            <ShoppingCart className="w-4 h-4" />
                            Buy Now
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* How It Works */}
                <div>
                  <h4 className="text-lg font-bold text-gray-900 mb-4">How Carbon Trading Works</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white border border-gray-200 p-4 rounded-xl">
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mb-3">
                        <span className="text-green-600 font-bold">1</span>
                      </div>
                      <h5 className="font-semibold text-gray-900 mb-2">Earn Credits</h5>
                      <p className="text-sm text-gray-600">Earn 1 carbon credit for every 1,000 kg CO₂ avoided by charging with renewable energy</p>
                    </div>
                    <div className="bg-white border border-gray-200 p-4 rounded-xl">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mb-3">
                        <span className="text-blue-600 font-bold">2</span>
                      </div>
                      <h5 className="font-semibold text-gray-900 mb-2">List for Trade</h5>
                      <p className="text-sm text-gray-600">Set your price and list your credits on the marketplace</p>
                    </div>
                    <div className="bg-white border border-gray-200 p-4 rounded-xl">
                      <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center mb-3">
                        <span className="text-purple-600 font-bold">3</span>
                      </div>
                      <h5 className="font-semibold text-gray-900 mb-2">Get Paid</h5>
                      <p className="text-sm text-gray-600">Receive instant payment when your credits are purchased</p>
                    </div>
                  </div>
                </div>

                {/* CO₂ Calculation Info */}
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4">
                  <div className="flex items-start gap-3">
                    <Leaf className="w-5 h-5 text-green-600 mt-0.5" />
                    <div>
                      <h5 className="font-semibold text-green-900 mb-1">How Credits are Calculated</h5>
                      <p className="text-sm text-green-700"><strong>1,000 kg CO₂ avoided = 1 Carbon Credit</strong></p>
                      <p className="text-xs text-green-600 mt-1">
                        <strong>Formula:</strong> Every 1 km driven with EV = 100g CO₂ saved (vs petrol vehicle)
                      </p>
                      <p className="text-xs text-green-600 mt-1">
                        So <strong>10,000 km = 1,000 kg CO₂ = 1 Carbon Credit</strong> 🌱
                      </p>
                    </div>
                  </div>
                </div>

                {/* Market Info */}
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <TrendingUp className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div>
                      <h5 className="font-semibold text-blue-900 mb-1">Current Market Rate</h5>
                      <p className="text-sm text-blue-700">₹50 per carbon credit (per kg CO₂)</p>
                      <p className="text-xs text-blue-600 mt-1">Based on renewable energy impact and market demand</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* List Credits Modal */}
            {showListModal && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                      <DollarSign className="w-6 h-6 text-green-600" />
                      List Credits for Sale
                    </h3>
                    <button
                      onClick={() => setShowListModal(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-6 h-6" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <p className="text-sm text-blue-800">
                        You have <strong>{carbonStats.carbon_credits} credits</strong> available to list
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Number of Credits
                      </label>
                      <input
                        type="number"
                        value={listAmount}
                        onChange={(e) => setListAmount(e.target.value)}
                        placeholder="e.g., 10"
                        min="0.01"
                        step="0.01"
                        max={carbonStats.carbon_credits}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Price per Credit (₹)
                      </label>
                      <input
                        type="number"
                        value={listPrice}
                        onChange={(e) => setListPrice(e.target.value)}
                        placeholder="e.g., 50"
                        min="1"
                        step="1"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                      <p className="text-xs text-gray-500 mt-1">Market rate: ₹50-100 per credit</p>
                    </div>

                    {listAmount && listPrice && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                        <p className="text-sm text-green-800">
                          Total listing value: <strong>₹{(parseFloat(listAmount) * parseFloat(listPrice)).toFixed(2)}</strong>
                        </p>
                      </div>
                    )}

                    <div className="flex gap-3 mt-6">
                      <button
                        onClick={() => setShowListModal(false)}
                        className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleListCredits}
                        className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                      >
                        List Credits
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Emergency Rescue Tab */}
        {activeTab === 'emergency-rescue' && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <AlertTriangle className="w-6 h-6 text-red-600" />
                Emergency Rescue Service
              </h3>
              <p className="text-gray-600 mt-1">Request emergency portable charging if you're stranded</p>
            </div>
            <div className="p-6">
              <EmergencyRescue />
            </div>
          </div>
        )}

        {/* Support Tab */}
        {activeTab === 'support' && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-900">Support Center</h3>
              <p className="text-gray-600 mt-1">Get help with your charging experience</p>
            </div>
            <div className="p-6 space-y-6">
              {/* FAQ Section */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-4">Frequently Asked Questions</h4>
                <div className="space-y-3">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h5 className="font-medium text-gray-800 mb-2">How do I cancel a booking?</h5>
                    <p className="text-sm text-gray-600">You can cancel upcoming bookings from your "My Bookings" tab by clicking the cancel button next to the booking.</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h5 className="font-medium text-gray-800 mb-2">What if a charger is not working?</h5>
                    <p className="text-sm text-gray-600">Please report the issue immediately through the contact form below. We'll notify the host and provide alternative charging options.</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h5 className="font-medium text-gray-800 mb-2">How are charging costs calculated?</h5>
                    <p className="text-sm text-gray-600">Costs are based on the charger's rate per kWh multiplied by your charging duration, plus a small platform fee.</p>
                  </div>
                </div>
              </div>

              {/* Contact Support */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-4">Contact Support</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h5 className="font-medium text-blue-800 mb-2">Emergency Support</h5>
                    <p className="text-sm text-blue-600 mb-3">For urgent charging issues or safety concerns</p>
                    <button className="bg-blue-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-600 transition-colors">
                      Call Emergency Line
                    </button>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <h5 className="font-medium text-green-800 mb-2">General Support</h5>
                    <p className="text-sm text-green-600 mb-3">For booking questions, app issues, or feedback</p>
                    <button className="bg-green-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-600 transition-colors">
                      Start Chat
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;