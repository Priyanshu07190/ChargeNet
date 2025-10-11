import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  TrendingUp, 
  Zap, 
  Calendar, 
  Battery,
  Leaf,
  Edit,
  Trash2,
  User,
  DollarSign,
  Star,
  Award,
  Plus,
  X,
  MapPin,
  HelpCircle,
  Navigation,
  Gift,
  AlertTriangle,
  Menu,
  ChevronLeft,
  ShoppingCart
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import LocationPicker from '../components/LocationPicker';
import { apiService } from '../lib/apiService';
import { authService } from '../lib/auth';
import socketService from '../lib/socketService';
import TripPlanner from '../components/TripPlanner';
import EmergencyRescue from '../components/EmergencyRescue';
import HostRescueRequests from '../components/HostRescueRequests';

interface HostCharger {
  id: string;
  name: string;
  location: string;
  coordinates?: { lat: number; lng: number } | null;
  plugType: string;
  power: number;
  price: number;
  status: 'active' | 'maintenance' | 'offline';
  availability: boolean;
  bookings: number;
  revenue: number;
  rating: number;
  reviews: number;
  utilization: number;
  greenEnergy: boolean;
  host_name?: string;
  host_phone?: string;
}

interface BookingData {
  id: string;
  chargerName: string;
  customer: string;
  customerPhone?: string;
  date: string;
  time: string;
  duration: number;
  amount: number;
  status: 'upcoming' | 'active' | 'completed' | 'cancelled';
}

// Safely extract a customer's phone from different backend shapes
const getCustomerPhone = (booking: any, driverProfile: any = null): string | undefined => {
  const u = booking?.user_id || booking?.user || {};
  
  // Try driver profile first if available
  if (driverProfile) {
    const profilePhone = driverProfile.phone || driverProfile.mobile || driverProfile.phone_number || driverProfile.contact?.phone;
    if (profilePhone) {
      console.log('� Found phone in driver profile:', profilePhone);
      return profilePhone;
    }
  }
  
  console.log('�🔍 Debugging customer phone extraction:', {
    booking_id: booking._id || booking.id,
    user_id: u,
    available_fields: Object.keys(u || {}),
    driverProfile: driverProfile ? Object.keys(driverProfile) : 'not provided',
    phone_attempts: {
      'u.phone': u.phone,
      'u.mobile': u.mobile,
      'u.phone_number': u.phone_number,
      'u.contact?.phone': u?.contact?.phone,
      'booking.user_phone': booking.user_phone,
      'booking.customer_phone': booking.customer_phone
    }
  });
  
  return (
    u.phone ||
    u.mobile ||
    u.phone_number ||
    u?.contact?.phone ||
    booking.user_phone ||
    booking.customer_phone ||
    undefined
  );
};

// Main Component
const HostDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // State Management
  const [activeTab, setActiveTab] = useState<'overview' | 'trip-planner' | 'my-bookings' | 'chargers' | 'rescue-requests' | 'bookings' | 'request-charger' | 'carbon-trading' | 'emergency-rescue' | 'support'>('overview');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [chargers, setChargers] = useState<HostCharger[]>([]);
  const [bookings, setBookings] = useState<BookingData[]>([]);
  const [myBookings, setMyBookings] = useState<any[]>([]); // Host's own bookings as a driver
  const [showAddCharger, setShowAddCharger] = useState(false);
  const [editingCharger, setEditingCharger] = useState<HostCharger | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Form state for new charger
  const [newCharger, setNewCharger] = useState({
    name: '',
    location: '',
    coordinates: null as { lat: number; lng: number } | null,
    plugType: 'Type 2',
    power: '',
    price: '',
    greenEnergy: false,
    host_name: '',
    host_phone: ''
  });

  // Add a refresh trigger
  const [refreshKey, setRefreshKey] = useState(0);
  const [searchParams] = useSearchParams();

  // Charger request state
  const [chargerRequests, setChargerRequests] = useState<any[]>([]);
  const [showRequestForm, setShowRequestForm] = useState(false);

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
  const [requestForm, setRequestForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    location: '',
    address: '',
    property_type: 'residential',
    parking_availability: 'dedicated',
    reason: '',
    expected_usage: ''
  });

  const refreshBookings = () => {
    console.log('Refreshing all bookings data...');
    setRefreshKey(prev => prev + 1);
  };

  const handleCancelMyBooking = async (bookingId: string) => {
    if (!confirm('Are you sure you want to cancel this booking?')) return;
    
    try {
      console.log('🔄 Host attempting to cancel booking:', bookingId);
      
      // Ensure we have a valid session and token before cancelling
      console.log('🔄 Verifying session before cancellation...');
      const { user: sessionUser } = await authService.getSession();
      
      if (!sessionUser) {
        alert('Session expired. Please log in again.');
        return;
      }
      
      // Ensure API service has the current token
      const currentToken = authService.getCurrentToken();
      if (currentToken) {
        apiService.setAuthToken(currentToken);
        console.log('🔑 Token synchronized for cancellation request');
      } else {
        console.warn('⚠️ No token available, relying on cookie authentication');
      }
      
      console.log('🔑 Current auth token available:', !!apiService.getAuthToken());
      console.log('👤 Current user:', user?.email, 'ID:', user?._id);
      
      const result = await apiService.cancelBooking(bookingId);
      console.log('✅ Cancel booking result:', result);
      
      // Refresh data from database
      const updatedBookings = await apiService.getHostPersonalBookings();
      if (updatedBookings) {
        const transformedBookings = updatedBookings.map((booking: any) => ({
          id: booking._id || booking.id,
          chargerName: booking.charger_id?.name || 'Unknown Charger',
          chargerLocation: booking.charger_id?.location || 'Unknown Location',
          date: new Date(booking.start_time).toLocaleDateString(),
          time: new Date(booking.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          duration: Math.round(booking.duration / 60),
          cost: `₹${booking.total_cost}`,
          amount: booking.total_cost,
          status: booking.status,
          created_at: booking.created_at
        }));
        setMyBookings(transformedBookings);
      }
      
      alert('Booking cancelled successfully');
    } catch (error: any) {
      console.error('❌ Error cancelling booking:', error);
      
      // Check for specific error types
      if (error.message?.includes('403') || error.message?.includes('Forbidden')) {
        alert('Session expired or you do not have permission to cancel this booking. Please refresh the page and try again.');
      } else if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
        alert('Please log in again to cancel this booking.');
      } else if (error.message?.includes('session') || error.message?.includes('expired')) {
        alert('Your session has expired. Please log in again.');
      } else {
        const errorMessage = error.message || 'Failed to cancel booking. Please try again.';
        alert(`Error: ${errorMessage}`);
      }
    }
  };

  useEffect(() => {
    // Sync active tab from URL param
    const tabParam = searchParams.get('tab');
    if (tabParam && ['overview','trip-planner','my-bookings','chargers','bookings','request-charger','support'].includes(tabParam)) {
      setActiveTab(tabParam as any);
    }

    // Connect to WebSocket for real-time updates
    socketService.connect();

    // Listen for charger list changes (add/delete) - specific to this host
    const handleChargerListChanged = (data: {
      type: 'charger-added' | 'charger-deleted';
      charger?: any;
      charger_id?: string;
      location: string;
    }) => {
      console.log('🏠 Host Dashboard - Real-time charger list update received:', data);
      
      if (data.type === 'charger-added' && data.charger && data.charger.host_id === user?._id) {
        // Add new charger to host's list if it belongs to them
        const newHostCharger: HostCharger = {
          id: data.charger._id,
          name: data.charger.name,
          location: data.charger.location,
          coordinates: data.charger.coordinates || null, // Include coordinates from real-time update
          plugType: data.charger.plug_type,
          power: data.charger.power,
          price: data.charger.price,
          status: (data.charger.available ? 'active' : 'offline') as 'active' | 'maintenance' | 'offline',
          availability: data.charger.available,
          greenEnergy: data.charger.green_energy,
          revenue: 0,
          bookings: 0,
          rating: data.charger.rating || 0,
          reviews: data.charger.reviews || 0,
          utilization: 0,
          host_name: data.charger.host_name,
          host_phone: data.charger.host_phone
        };
        setChargers(prev => [newHostCharger, ...prev]);
      } else if (data.type === 'charger-deleted' && data.charger_id) {
        // Remove deleted charger from host's list
        setChargers(prev => prev.filter(charger => charger.id !== data.charger_id));
      }
    };

    socketService.onChargerListChanged(handleChargerListChanged);

    // Listen for booking list changes (create/update/cancel)
    const handleBookingListChanged = (data: any) => {
      console.log('🏠 Host Dashboard - Real-time booking update received:', data);
      
      if (data.type === 'booking-created' && data.booking) {
        // Check if it's a host's personal booking or a booking on host's charger
        if (data.booking.user_id === user?._id && data.booking_context === 'host-booking') {
          // Host's personal booking - add to myBookings
          const newBooking = {
            id: data.booking._id || data.booking.id,
            chargerName: data.booking.charger_id?.name || 'Unknown Charger',
            chargerLocation: data.booking.charger_id?.location || 'Unknown Location',
            date: new Date(data.booking.start_time).toLocaleDateString(),
            time: new Date(data.booking.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            duration: Math.round(data.booking.duration / 60),
            cost: `₹${data.booking.total_cost}`,
            amount: data.booking.total_cost,
            status: data.booking.status,
            created_at: data.booking.created_at
          };
          setMyBookings(prev => [newBooking, ...prev]);
        }
        
        // Check if it's a booking on one of host's chargers
        if (data.charger_id) {
          const isHostCharger = chargers.some(charger => charger.id === data.charger_id);
          if (isHostCharger) {
            // Booking on host's charger - add to bookings
            const newHostBooking = {
              id: data.booking._id || data.booking.id,
              chargerName: data.booking.charger_id?.name || 'Unknown Charger',
              customer: data.booking.user_id?.name || 'Unknown Customer',
              customerPhone: getCustomerPhone(data.booking),
              date: new Date(data.booking.start_time).toLocaleDateString(),
              time: new Date(data.booking.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              duration: Math.round(data.booking.duration / 60),
              amount: data.booking.total_cost,
              status: data.booking.status
            };
            setBookings(prev => [newHostBooking, ...prev]);
          }
        }
      } else if (data.type === 'booking-updated' && data.booking) {
        // Update booking status in both lists if applicable
        if (data.booking.user_id === user?._id) {
          setMyBookings(prev => 
            prev.map(booking => 
              booking.id === data.booking._id 
                ? { ...booking, status: data.booking.status }
                : booking
            )
          );
        }
        
        setBookings(prev => 
          prev.map(booking => 
            booking.id === data.booking._id 
              ? { ...booking, status: data.booking.status }
              : booking
          )
        );
      }
    };

    socketService.onBookingListChanged(handleBookingListChanged);

    // Join host-specific room and user room for targeted updates
    if (user?._id) {
      socketService.joinHostRoom(user._id);
      socketService.joinUserRoom(user._id);
    }

    // Cleanup on unmount
    return () => {
      socketService.offChargerListChanged(handleChargerListChanged);
      socketService.offBookingListChanged(handleBookingListChanged);
    };
  }, [searchParams, user?._id]);

  useEffect(() => {
    // Load chargers from backend for the current user
    const loadChargers = async () => {
      if (user?._id) {
        try {
          console.log('Loading chargers from database for host:', user._id);
          const backendChargers = await apiService.getHostChargers();
          
          if (backendChargers && backendChargers.length > 0) {
            // Transform backend data to match our interface
            const transformedChargers = backendChargers.map((charger: any) => ({
              id: charger._id || charger.id,
              name: charger.name,
              location: charger.location,
              coordinates: charger.coordinates || null, // Include coordinates from database
              plugType: charger.plug_type || charger.plugType,
              power: charger.power,
              price: charger.price,
              status: charger.available ? 'active' : 'offline',
              availability: charger.available,
              greenEnergy: charger.green_energy || charger.greenEnergy,
              revenue: 0, // Backend doesn't store these yet
              bookings: 0,
              rating: charger.rating || 0,
              reviews: charger.reviews || 0,
              utilization: 0,
              host_name: charger.host_name,
              host_phone: charger.host_phone
            }));
            
            console.log('Transformed chargers:', transformedChargers);
            setChargers(transformedChargers);
          } else {
            console.log('No chargers found for host');
            setChargers([]);
          }
        } catch (error) {
          console.error('Error loading chargers from backend:', error);
          setChargers([]);
        }
      }
    };

    loadChargers();
    
    // Load bookings for this host
    const loadBookings = async () => {
      if (user?._id) {
        try {
          console.log('Loading bookings for host:', user._id);
          const hostBookings = await apiService.getHostBookings();
          console.log('Raw host bookings from API:', hostBookings);
          
          if (hostBookings && hostBookings.length > 0) {
            // Enhance bookings with full driver profiles
            const enhancedBookings = await Promise.all(
              hostBookings.map(async (booking: any) => {
                let customerPhone;
                let driverProfile = null;
                
                // Always try to fetch the driver's full profile for phone
                if (booking.user_id?._id || booking.user_id) {
                  const driverId = booking.user_id._id || booking.user_id;
                  try {
                    console.log('🔍 Fetching driver profile for phone:', driverId);
                    // Try both API endpoints to get profile
                    try {
                      driverProfile = await apiService.getUserProfile(driverId);
                    } catch (e) {
                      console.log('Trying alternative profile endpoint...');
                      driverProfile = await apiService.getDriverProfile(driverId);
                    }
                    console.log('� Driver profile received:', driverProfile);
                  } catch (error) {
                    console.warn('Failed to fetch driver profile:', error);
                  }
                }

                // Extract phone with profile data
                customerPhone = getCustomerPhone(booking, driverProfile);
                console.log('📱 Final customer phone:', customerPhone);

                return {
                  id: booking._id || booking.id,
                  chargerName: booking.charger_id?.name || 'Unknown Charger',
                  customer: booking.user_id?.name || 'Anonymous Customer',
                  customerPhone: customerPhone,
                  date: new Date(booking.start_time).toLocaleDateString(),
                  time: new Date(booking.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                  duration: Math.round(booking.duration / 60), // Convert minutes to hours
                  amount: booking.total_cost,
                  status: booking.status
                };
              })
            );
            
            console.log('Enhanced bookings with driver phones:', enhancedBookings);
            setBookings(enhancedBookings);
          } else {
            console.log('No bookings found for host');
            setBookings([]);
          }
        } catch (error) {
          console.error('Error loading host bookings:', error);
          setBookings([]);
        }
      }
    };

    loadBookings();
    
    // Load host's own bookings (as a driver)
    const loadMyBookings = async () => {
      if (user?._id) {
        try {
          console.log('🏠 Loading HOST PERSONAL bookings for user:', user._id);
          
          // Load directly from backend (database) as primary source
          const backendBookings = await apiService.getHostPersonalBookings();
          console.log('📊 Host personal bookings loaded:', backendBookings?.length || 0);
          console.log('📋 Host personal bookings data:', backendBookings);
          
          if (backendBookings && backendBookings.length > 0) {
            const transformedBookings = backendBookings.map((booking: any) => ({
              id: booking._id || booking.id,
              chargerName: booking.charger_id?.name || 'Unknown Charger',
              chargerLocation: booking.charger_id?.location || 'Unknown Location',
              date: new Date(booking.start_time).toLocaleDateString(),
              time: new Date(booking.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              duration: Math.round(booking.duration / 60),
              cost: `₹${booking.total_cost}`,
              amount: booking.total_cost,
              status: booking.status,
              created_at: booking.created_at
            }));
            
            console.log('Transformed my bookings:', transformedBookings);
            setMyBookings(transformedBookings);
          } else {
            console.log('No bookings found in database');
            setMyBookings([]);
          }
        } catch (error) {
          console.error('Error loading my bookings from database:', error);
          setMyBookings([]);
        }
      }
    };

    loadMyBookings();
  }, [user?._id, refreshKey]); // Add refreshKey as dependency

  // Load charger requests when tab is active
  useEffect(() => {
    const loadChargerRequests = async () => {
      if (activeTab === 'request-charger' && user?._id) {
        try {
          const response = await fetch('http://localhost:5000/api/charger-requests', {
            headers: {
              'Authorization': `Bearer ${authService.getCurrentToken()}`
            },
            credentials: 'include'
          });
          if (response.ok) {
            const data = await response.json();
            setChargerRequests(data.requests || []);
          }
        } catch (error) {
          console.error('Error loading charger requests:', error);
        }
      }
    };
    loadChargerRequests();
  }, [activeTab, user?._id]);

  // Additional effect to refresh My Bookings when the tab is switched
  useEffect(() => {
    if (activeTab === 'my-bookings' && user?._id) {
      console.log('My Bookings tab activated, refreshing data...');
      
      const refreshData = async () => {
        try {
          console.log('🏠 HOST DASHBOARD: Calling getHostPersonalBookings API...');
          const backendBookings = await apiService.getHostPersonalBookings();
          console.log('🏠 HOST DASHBOARD: Host personal bookings received:', backendBookings?.length || 0);
          console.log('🏠 HOST DASHBOARD: Host personal bookings data:', backendBookings);
          
          if (backendBookings && backendBookings.length > 0) {
            const transformedBookings = backendBookings.map((booking: any) => ({
              id: booking._id || booking.id,
              chargerName: booking.charger_id?.name || 'Unknown Charger',
              chargerLocation: booking.charger_id?.location || 'Unknown Location',
              date: new Date(booking.start_time).toLocaleDateString(),
              time: new Date(booking.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              duration: Math.round(booking.duration / 60),
              cost: `₹${booking.total_cost}`,
              amount: booking.total_cost,
              status: booking.status,
              created_at: booking.created_at
            }));
            
            setMyBookings(transformedBookings);
          } else {
            setMyBookings([]);
          }
        } catch (error) {
          console.error('Error refreshing my bookings on tab switch:', error);
        }
      };
      
      refreshData();
    }
  }, [activeTab, user?._id]);

  // Charger management functions
  const handleAddCharger = async () => {
    if (!newCharger.name || !newCharger.location || !newCharger.power || !newCharger.price || !newCharger.host_name || !newCharger.host_phone) {
      alert('Please fill in all required fields including host contact information');
      return;
    }

    // Validate coordinates if provided
    if (newCharger.coordinates) {
      const { lat, lng } = newCharger.coordinates;
      if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        alert('Please enter valid coordinates. Latitude must be between -90 and 90, longitude between -180 and 180.');
        return;
      }
    }

    setIsLoading(true);

    try {
      // Save to backend - charger will be added to list via real-time WebSocket update
      const backendData = {
        name: newCharger.name,
        location: newCharger.location,
        coordinates: newCharger.coordinates, // Include coordinates if selected via map
        plug_type: newCharger.plugType,
        power: parseInt(newCharger.power),
        price: parseFloat(newCharger.price),
        available: true,
        rating: 0,
        reviews: 0,
        features: [],
        green_energy: newCharger.greenEnergy,
        host_name: newCharger.host_name,
        host_phone: newCharger.host_phone
      };
      
      const savedCharger = await apiService.createCharger(backendData);
      
      console.log('✅ Charger created successfully:', savedCharger._id);
      console.log('📡 Real-time update will add charger to list automatically');
      
    } catch (error) {
      console.error('Failed to save charger to backend:', error);
      alert('Failed to create charger. Please try again.');
      setIsLoading(false);
      return;
    }

    // Reset form (charger will be added to list via WebSocket)
    setNewCharger({
      name: '',
      location: '',
      coordinates: null,
      plugType: 'Type 2',
      power: '',
      price: '',
      greenEnergy: false,
      host_name: '',
      host_phone: ''
    });
    
    // Close modal
    setShowAddCharger(false);
    setIsLoading(false);
  };

  // Function to handle deleting a charger
  const handleDeleteCharger = async (chargerId: string, chargerName: string) => {
    if (window.confirm(`Are you sure you want to delete "${chargerName}"? This action cannot be undone.`)) {
      try {
        // Delete from backend 
        await apiService.deleteCharger(chargerId);
        console.log('✅ Charger deleted successfully');
        console.log('📡 Real-time update will remove charger from list automatically');
      } catch (error) {
        console.error('Failed to delete charger from backend:', error);
        alert('Failed to delete charger. Please try again.');
      }
    }
  };

  // Function to start editing a charger
  const handleEditCharger = (charger: HostCharger) => {
    setEditingCharger(charger);
    setNewCharger({
      name: charger.name,
      location: charger.location,
      coordinates: charger.coordinates || null, // Use existing coordinates from database
      plugType: charger.plugType,
      power: charger.power.toString(),
      price: charger.price.toString(),
      greenEnergy: charger.greenEnergy,
      host_name: charger.host_name || '',
      host_phone: charger.host_phone || ''
    });
    setShowAddCharger(true);
  };

  // Function to update an existing charger
  const handleUpdateCharger = async () => {
    if (!newCharger.name || !newCharger.location || !newCharger.power || !newCharger.price || !editingCharger) {
      alert('Please fill in all required fields');
      return;
    }

    const updatedCharger: HostCharger = {
      ...editingCharger,
      name: newCharger.name,
      location: newCharger.location,
      coordinates: newCharger.coordinates || null, // Include coordinates in local state
      plugType: newCharger.plugType,
      power: parseInt(newCharger.power),
      price: parseFloat(newCharger.price),
      greenEnergy: newCharger.greenEnergy
    };

    try {
      // Update in backend first
      const backendData = {
        name: newCharger.name,
        location: newCharger.location,
        coordinates: newCharger.coordinates, // Include coordinates in backend update
        plug_type: newCharger.plugType,
        power: parseInt(newCharger.power),
        price: parseFloat(newCharger.price),
        green_energy: newCharger.greenEnergy
      };
      
      await apiService.updateCharger(editingCharger.id, backendData);
    } catch (error) {
      console.error('Failed to update charger in backend:', error);
      // Continue with local update even if backend fails
    }

    const updatedChargers = chargers.map(charger => 
      charger.id === editingCharger.id ? updatedCharger : charger
    );
    setChargers(updatedChargers);

    // Reset form and editing state
    setNewCharger({
      name: '',
      location: '',
      coordinates: null,
      plugType: 'Type 2',
      power: '',
      price: '',
      greenEnergy: false,
      host_name: '',
      host_phone: ''
    });
    setEditingCharger(null);
    setShowAddCharger(false);
  };

  const totalRevenue = chargers.reduce((sum, charger) => sum + charger.revenue, 0);
  const totalBookings = chargers.reduce((sum, charger) => sum + charger.bookings, 0);
  const avgRating = chargers.length > 0 ? chargers.reduce((sum, charger) => sum + charger.rating, 0) / chargers.length : 0;
  const activeChargers = chargers.filter(c => c.status === 'active').length;

  // Toggle charger availability function
  const handleToggleAvailability = async (chargerId: string, currentAvailability: boolean) => {
    try {
      console.log('🔄 Toggling availability for charger:', chargerId);
      const response = await apiService.toggleChargerAvailability(chargerId);
      
      // Update the local state with both availability and status
      const updatedChargers = chargers.map(charger =>
        charger.id === chargerId 
          ? { 
              ...charger, 
              availability: !currentAvailability,
              status: (!currentAvailability ? 'active' : 'offline') as 'active' | 'maintenance' | 'offline'
            }
          : charger
      );
      setChargers(updatedChargers);
      
      console.log('✅ Availability toggled successfully:', response.available);
    } catch (error: any) {
      console.error('❌ Failed to toggle availability:', error);
      
      // Provide specific error messages based on the error type
      if (error.message?.includes('Access denied')) {
        alert('Access denied: You are not authorized to modify this charger.');
      } else if (error.message?.includes('not found')) {
        alert('Charger not found. Please refresh the page and try again.');
      } else if (error.message?.includes('Invalid charger ID')) {
        alert('Invalid charger ID. Please refresh the page and try again.');
      } else {
        alert('Failed to update charger availability. Please check your connection and try again.');
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'maintenance': return 'bg-yellow-100 text-yellow-800';
      case 'offline': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getBookingStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'upcoming': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Carbon Trading Functions
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
        setRefreshKey(prev => prev + 1);
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

  // Load carbon stats when carbon trading tab is active
  useEffect(() => {
    if (activeTab === 'carbon-trading') {
      loadCarbonStats();
      loadMarketplace();
      loadMyListings();
    }
  }, [activeTab, refreshKey]);

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
              { id: 'my-bookings', name: 'My Bookings', icon: User },
              { id: 'chargers', name: 'My Chargers', icon: Zap },
              { id: 'rescue-requests', name: 'Rescue Requests', icon: AlertTriangle },
              { id: 'bookings', name: 'Customer Bookings', icon: Calendar },
              { id: 'request-charger', name: 'Request Free Charger', icon: Gift },
              { id: 'carbon-trading', name: 'Carbon Trading', icon: Leaf },
              { id: 'emergency-rescue', name: 'Emergency SOS', icon: AlertTriangle },
              { id: 'support', name: 'Support', icon: HelpCircle }
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id as any);
                    if (tab.id === 'bookings') {
                      refreshBookings();
                    }
                  }}
                  className={`w-full flex items-center px-4 py-3 transition-all duration-200 ${
                    isActive
                      ? 'bg-gradient-to-r from-green-500 to-blue-500 text-white border-l-4 border-green-600'
                      : 'text-gray-700 hover:bg-gray-100 border-l-4 border-transparent'
                  }`}
                  title={!sidebarOpen ? tab.name : ''}
                >
                  <Icon className={`${sidebarOpen ? 'w-5 h-5' : 'w-6 h-6'} flex-shrink-0 ${isActive ? 'text-white' : 'text-gray-600'}`} />
                  {sidebarOpen && (
                    <span className={`ml-3 font-medium text-sm ${isActive ? 'text-white' : 'text-gray-700'}`}>
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
          <div className="bg-gradient-to-r from-green-600 to-blue-600 text-white sticky top-16 z-20 shadow-lg">
            <div className="px-6 py-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold mb-2">Host Dashboard</h1>
                  <p className="text-green-100">Welcome back, {user?.name}! 🏡⚡</p>
                </div>
                
                <div className="flex items-center space-x-4">
                  <div className="bg-white/10 backdrop-blur-lg rounded-lg px-4 py-2">
                    <div className="text-sm opacity-80">Host Rating</div>
                    <div className="text-xl font-bold">{avgRating.toFixed(1)} ⭐</div>
                  </div>
                  <div className="bg-white/10 backdrop-blur-lg rounded-lg px-4 py-2">
                <div className="text-sm opacity-80">Green Host</div>
                <div className="text-xl font-bold">🌱 New Host</div>
              </div>
            </div>
          </div>
          
          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
            <div className="bg-white/10 backdrop-blur-lg rounded-lg p-4 text-center">
              <div className="text-2xl font-bold">₹{totalRevenue.toLocaleString()}</div>
              <div className="text-sm opacity-80">Total Revenue</div>
            </div>
            <div className="bg-white/10 backdrop-blur-lg rounded-lg p-4 text-center">
              <div className="text-2xl font-bold">{totalBookings}</div>
              <div className="text-sm opacity-80">Total Bookings</div>
            </div>
            <div className="bg-white/10 backdrop-blur-lg rounded-lg p-4 text-center">
              <div className="text-2xl font-bold">{activeChargers}</div>
              <div className="text-sm opacity-80">Active Chargers</div>
            </div>
            <div className="bg-white/10 backdrop-blur-lg rounded-lg p-4 text-center">
              <div className="text-2xl font-bold">{chargers.filter(c => c.greenEnergy).length}</div>
              <div className="text-sm opacity-80">Green Chargers</div>
            </div>
          </div>
        </div>
      </div>

          {/* Content Container */}
          <div className="px-6 py-8">

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Monthly Revenue</p>
                    <p className="text-3xl font-bold text-gray-900">₹0</p>
                  </div>
                  <div className="bg-green-100 p-3 rounded-xl">
                    <DollarSign className="h-6 w-6 text-green-600" />
                  </div>
                </div>
                <div className="mt-4 flex items-center">
                  <span className="text-gray-500 text-sm font-medium">Add chargers to start earning</span>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Active Sessions</p>
                    <p className="text-3xl font-bold text-gray-900">{bookings.filter(b => b.status === 'active').length}</p>
                  </div>
                  <div className="bg-blue-100 p-3 rounded-xl">
                    <Battery className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
                <div className="mt-4 flex items-center">
                  <span className="text-gray-500 text-sm font-medium">No active sessions</span>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Average Utilization</p>
                    <p className="text-3xl font-bold text-gray-900">{chargers.length > 0 ? Math.round(chargers.reduce((sum, c) => sum + c.utilization, 0) / chargers.length) : 0}%</p>
                  </div>
                  <div className="bg-purple-100 p-3 rounded-xl">
                    <TrendingUp className="h-6 w-6 text-purple-600" />
                  </div>
                </div>
                <div className="mt-4 flex items-center">
                  <span className="text-gray-500 text-sm font-medium">No chargers yet</span>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Customer Rating</p>
                    <p className="text-3xl font-bold text-gray-900">{avgRating > 0 ? avgRating.toFixed(1) : '0.0'}</p>
                  </div>
                  <div className="bg-yellow-100 p-3 rounded-xl">
                    <Star className="h-6 w-6 text-yellow-600" />
                  </div>
                </div>
                <div className="mt-4 flex items-center">
                  <span className="text-gray-500 text-sm font-medium">No ratings yet</span>
                </div>
              </div>
            </div>

            {/* Recent Activity & Green Impact */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-6">Recent Activity</h3>
                {bookings.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-gray-400 mb-4">
                      <Calendar className="h-12 w-12 mx-auto" />
                    </div>
                    <p className="text-gray-500 text-lg font-medium">No activity yet</p>
                    <p className="text-gray-400 text-sm mt-2">Booking activity will appear here once customers start using your chargers</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {bookings.slice(0, 4).map((booking) => (
                      <div key={booking.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                        <div className="flex items-center space-x-3">
                          <div className={`w-3 h-3 rounded-full ${
                            booking.status === 'active' ? 'bg-green-500 animate-pulse' : 
                            booking.status === 'upcoming' ? 'bg-blue-500' : 'bg-gray-400'
                          }`}></div>
                          <div>
                            <p className="font-medium text-gray-900">{booking.customer}</p>
                            <p className="text-sm text-gray-500">{booking.chargerName}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-gray-900">₹{booking.amount}</p>
                          <p className="text-sm text-gray-500">{booking.duration}h</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl shadow-lg p-6 border-2 border-green-200">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                    <Leaf className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">Green Impact</h3>
                    <p className="text-green-600">Your environmental contribution</p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="bg-white/50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-green-600 mb-1">0 kg</div>
                    <div className="text-sm text-gray-600">CO₂ emissions prevented</div>
                  </div>
                  
                  <div className="bg-white/50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600 mb-1">0 kWh</div>
                    <div className="text-sm text-gray-600">Clean energy provided</div>
                  </div>
                  
                  <div className="bg-white/50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600 mb-1">0 Trees</div>
                    <div className="text-sm text-gray-600">Equivalent trees planted</div>
                  </div>
                </div>

                {/* Green Host Badge */}
                <div className="mt-6 p-4 bg-gradient-to-r from-gray-300 to-gray-400 rounded-lg text-white text-center">
                  <Award className="h-8 w-8 mx-auto mb-2 opacity-60" />
                  <p className="font-bold">Start Your Green Journey</p>
                  <p className="text-sm opacity-90">Add chargers to earn green impact</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Trip Planner Tab */}
        {activeTab === 'trip-planner' && (
          <div className="space-y-8">
            <TripPlanner source="host" />
          </div>
        )}

        {/* My Bookings Tab */}
        {activeTab === 'my-bookings' && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100">
            <div className="p-6 border-b border-gray-200">
              <div>
                <h3 className="text-xl font-bold text-gray-900">My Bookings</h3>
                <p className="text-gray-600 mt-1">Your bookings when charging at other locations</p>
              </div>
            </div>

            {myBookings.length === 0 ? (
              <div className="p-8 text-center">
                <div className="text-gray-400 mb-4">
                  <Calendar className="h-16 w-16 mx-auto" />
                </div>
                <h4 className="text-lg font-medium text-gray-900 mb-2">No bookings yet</h4>
                <p className="text-gray-500 mb-6">Start exploring nearby chargers to make your first booking</p>
                <button
                  onClick={() => navigate('/map?source=host')}
                  className="bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors"
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
                    {myBookings.map((booking) => (
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
                              <div className="text-sm text-gray-500">
                                {booking.chargerLocation}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{booking.date}</div>
                          <div className="text-sm text-gray-500">{booking.time}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {booking.duration}h
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {booking.cost}
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
                              onClick={() => handleCancelMyBooking(booking.id)}
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

        {/* Chargers Tab */}
        {activeTab === 'chargers' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">My Chargers</h2>
              <button
                onClick={() => setShowAddCharger(true)}
                className="flex items-center space-x-2 bg-gradient-to-r from-green-500 to-blue-500 text-white px-6 py-3 rounded-xl font-semibold hover:from-green-600 hover:to-blue-600 transition-all"
              >
                <Plus className="h-5 w-5" />
                <span>Add New Charger</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {chargers.length === 0 ? (
                <div className="col-span-full bg-white rounded-2xl shadow-lg border border-gray-100 p-12 text-center">
                  <div className="bg-gray-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                    <Zap className="h-8 w-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Chargers Yet</h3>
                  <p className="text-gray-500 mb-6">Start earning by adding your first EV charger to the platform</p>
                  <button
                    onClick={() => setShowAddCharger(true)}
                    className="inline-flex items-center space-x-2 bg-gradient-to-r from-green-500 to-blue-500 text-white px-6 py-3 rounded-xl font-semibold hover:from-green-600 hover:to-blue-600 transition-all"
                  >
                    <Plus className="h-5 w-5" />
                    <span>Add Your First Charger</span>
                  </button>
                </div>
              ) : (
                chargers.map((charger) => (
                <div key={charger.id} className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                  <div className="relative">
                    <div className={`h-32 ${
                      charger.greenEnergy 
                        ? 'bg-gradient-to-br from-green-400 to-emerald-400' 
                        : 'bg-gradient-to-br from-blue-400 to-purple-400'
                    }`}>
                      <div className="absolute top-4 left-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(charger.status)}`}>
                          {charger.status}
                        </span>
                      </div>
                      <div className="absolute top-4 right-4">
                        {charger.greenEnergy && (
                          <div className="bg-white/20 backdrop-blur-lg rounded-full p-2">
                            <Leaf className="h-5 w-5 text-white" />
                          </div>
                        )}
                      </div>
                      <div className="absolute bottom-4 left-4 text-white">
                        <h3 className="text-lg font-bold">{charger.name}</h3>
                        <div className="flex items-center space-x-1 text-sm opacity-90">
                          <MapPin className="h-3 w-3" />
                          <span>{charger.location}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-6">
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="text-center">
                        <div className="text-lg font-bold text-gray-900">₹{charger.revenue.toLocaleString()}</div>
                        <div className="text-xs text-gray-600">Revenue</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-gray-900">{charger.bookings}</div>
                        <div className="text-xs text-gray-600">Bookings</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-gray-900">{charger.rating}</div>
                        <div className="text-xs text-gray-600">Rating</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-gray-900">{charger.utilization}%</div>
                        <div className="text-xs text-gray-600">Utilization</div>
                      </div>
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Type:</span>
                        <span className="font-medium">{charger.plugType}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Power:</span>
                        <span className="font-medium">{charger.power} kW</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Price:</span>
                        <span className="font-medium">₹{charger.price}/kWh</span>
                      </div>
                      {charger.host_name && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Host:</span>
                          <span className="font-medium">{charger.host_name}</span>
                        </div>
                      )}
                      {charger.host_phone && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Contact:</span>
                          <span className="font-medium">{charger.host_phone}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between mb-4">
                      <span className="text-sm text-gray-600">Availability:</span>
                      <div className="flex items-center space-x-3">
                        <span className={`text-sm font-medium ${charger.availability ? 'text-green-600' : 'text-red-600'}`}>
                          {charger.availability ? 'Available' : 'Offline'}
                        </span>
                        <button
                          onClick={() => handleToggleAvailability(charger.id, charger.availability)}
                          className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 ${
                            charger.availability ? 'bg-green-600' : 'bg-gray-300'
                          }`}
                        >
                          <span
                            className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${
                              charger.availability ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>
                    </div>

                    <div className="flex space-x-2">
                      <button 
                        onClick={() => handleEditCharger(charger)}
                        className="flex-1 bg-blue-50 text-blue-600 px-4 py-2 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium flex items-center justify-center space-x-2"
                      >
                        <Edit className="h-4 w-4" />
                        <span>Edit</span>
                      </button>
                      <button 
                        onClick={() => handleDeleteCharger(charger.id, charger.name)}
                        className="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors flex items-center justify-center"
                        title="Delete Charger"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Bookings Tab */}
        {activeTab === 'bookings' && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Booking Management</h3>
                  <p className="text-gray-600 mt-1">Track and manage all your charger bookings</p>
                </div>
                <button
                  onClick={refreshBookings}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                >
                  <span>Refresh</span>
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Customer
                    </th>
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
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {bookings.map((booking) => (
                    <tr key={booking.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0">
                            <div className="w-10 h-10 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full flex items-center justify-center text-white font-bold">
                              {booking.customer.charAt(0)}
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {booking.customer}
                            </div>
                            <div className="text-xs text-gray-500 mt-0.5">
                              {booking.customerPhone || 'No phone on file'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{booking.chargerName}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{booking.date}</div>
                        <div className="text-sm text-gray-500">{booking.time}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {booking.duration}h
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        ₹{booking.amount}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getBookingStatusColor(booking.status)}`}>
                          {booking.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Rescue Requests Tab - Incoming Requests from Drivers */}
        {activeTab === 'rescue-requests' && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-red-50 to-orange-50">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <AlertTriangle className="w-6 h-6 text-red-600" />
                Incoming Rescue Requests
              </h3>
              <p className="text-gray-600 mt-1">View and accept rescue requests from stranded drivers</p>
            </div>
            <div className="p-6">
              <HostRescueRequests />
            </div>
          </div>
        )}

        {/* Request Free Charger Tab */}
        {activeTab === 'request-charger' && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-green-50 to-blue-50">
              <div className="flex items-center gap-3 mb-2">
                <Gift className="w-8 h-8 text-green-600" />
                <h3 className="text-2xl font-bold text-gray-900">Request Free Charger</h3>
              </div>
              <p className="text-gray-700 mt-2">Join our ChargeNet Host Program and receive a free EV charger installation!</p>
              <p className="text-sm text-gray-600 mt-1">Help expand the EV charging network while earning passive income.</p>
            </div>

            <div className="p-6">
              {chargerRequests.length === 0 && !showRequestForm ? (
                /* Show benefits and CTA if no requests */
                <div className="space-y-6">
                  {/* Program Benefits */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-green-50 p-5 rounded-xl border border-green-200">
                      <Gift className="w-10 h-10 text-green-600 mb-3" />
                      <h4 className="font-semibold text-gray-900 mb-2">Free Equipment</h4>
                      <p className="text-sm text-gray-600">Get a premium EV charger and professional installation at no cost.</p>
                    </div>
                    <div className="bg-blue-50 p-5 rounded-xl border border-blue-200">
                      <DollarSign className="w-10 h-10 text-blue-600 mb-3" />
                      <h4 className="font-semibold text-gray-900 mb-2">Earn Revenue</h4>
                      <p className="text-sm text-gray-600">Set your own rates and earn passive income from EV drivers.</p>
                    </div>
                    <div className="bg-purple-50 p-5 rounded-xl border border-purple-200">
                      <Leaf className="w-10 h-10 text-purple-600 mb-3" />
                      <h4 className="font-semibold text-gray-900 mb-2">Go Green</h4>
                      <p className="text-sm text-gray-600">Support sustainable transport and reduce carbon emissions.</p>
                    </div>
                  </div>

                  {/* Eligibility Criteria */}
                  <div className="bg-gray-50 p-5 rounded-xl">
                    <h4 className="font-semibold text-gray-900 mb-3">Eligibility Criteria</h4>
                    <ul className="space-y-2 text-sm text-gray-600">
                      <li className="flex items-start gap-2">
                        <span className="text-green-600 mt-1">✓</span>
                        <span>Must be a registered host on ChargeNet platform</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-green-600 mt-1">✓</span>
                        <span>Have dedicated parking space with power access</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-green-600 mt-1">✓</span>
                        <span>Commit to hosting for minimum 12 months</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-green-600 mt-1">✓</span>
                        <span>Maintain charger availability and respond to bookings promptly</span>
                      </li>
                    </ul>
                  </div>

                  {/* CTA Button */}
                  <button
                    onClick={() => setShowRequestForm(true)}
                    className="w-full bg-gradient-to-r from-green-600 to-blue-600 text-white py-4 rounded-xl font-semibold hover:from-green-700 hover:to-blue-700 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                  >
                    <Gift className="w-5 h-5" />
                    Apply Now for Free Charger
                  </button>
                </div>
              ) : showRequestForm ? (
                /* Request Form */
                <div className="space-y-6">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-800">
                      <strong>Note:</strong> Please fill out this form carefully. Our team will review your request and contact you within 3-5 business days.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Name */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Full Name *</label>
                      <input
                        type="text"
                        value={requestForm.name}
                        onChange={(e) => setRequestForm({ ...requestForm, name: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>

                    {/* Email */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Email Address *</label>
                      <input
                        type="email"
                        value={requestForm.email}
                        onChange={(e) => setRequestForm({ ...requestForm, email: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>

                    {/* Phone */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Mobile Number *</label>
                      <input
                        type="tel"
                        value={requestForm.phone}
                        onChange={(e) => setRequestForm({ ...requestForm, phone: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>

                    {/* Location */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">City/Area *</label>
                      <input
                        type="text"
                        value={requestForm.location}
                        onChange={(e) => setRequestForm({ ...requestForm, location: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="e.g., Mumbai, Pune"
                        required
                      />
                    </div>

                    {/* Property Type */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Property Type *</label>
                      <select
                        value={requestForm.property_type}
                        onChange={(e) => setRequestForm({ ...requestForm, property_type: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="residential">Residential</option>
                        <option value="commercial">Commercial</option>
                        <option value="apartment">Apartment Complex</option>
                        <option value="office">Office Building</option>
                        <option value="parking">Public Parking</option>
                      </select>
                    </div>

                    {/* Parking Availability */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Parking Type *</label>
                      <select
                        value={requestForm.parking_availability}
                        onChange={(e) => setRequestForm({ ...requestForm, parking_availability: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="dedicated">Dedicated Parking Spot</option>
                        <option value="shared">Shared Parking Area</option>
                        <option value="street">Street Parking</option>
                      </select>
                    </div>
                  </div>

                  {/* Full Address */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Full Address *</label>
                    <textarea
                      value={requestForm.address}
                      onChange={(e) => setRequestForm({ ...requestForm, address: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Complete address with pincode"
                      required
                    />
                  </div>

                  {/* Reason */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Why do you want to host a charger? *</label>
                    <textarea
                      value={requestForm.reason}
                      onChange={(e) => setRequestForm({ ...requestForm, reason: e.target.value })}
                      rows={4}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Tell us about your motivation to become a ChargeNet host..."
                      required
                    />
                  </div>

                  {/* Expected Usage */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Expected Daily Usage (Optional)</label>
                    <input
                      type="text"
                      value={requestForm.expected_usage}
                      onChange={(e) => setRequestForm({ ...requestForm, expected_usage: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g., 2-3 charging sessions per day"
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-4">
                    <button
                      onClick={() => setShowRequestForm(false)}
                      className="flex-1 px-6 py-3 border-2 border-gray-300 rounded-xl font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={async () => {
                        try {
                          setIsLoading(true);
                          const response = await fetch('http://localhost:5000/api/charger-requests', {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                              'Authorization': `Bearer ${authService.getCurrentToken()}`
                            },
                            credentials: 'include',
                            body: JSON.stringify(requestForm)
                          });

                          if (!response.ok) {
                            const error = await response.json();
                            throw new Error(error.error || 'Failed to submit request');
                          }

                          const data = await response.json();
                          setChargerRequests([data.request]);
                          setShowRequestForm(false);
                          alert('Request submitted successfully! We will contact you within 3-5 business days.');
                        } catch (error: any) {
                          alert(error.message || 'Failed to submit request. Please try again.');
                        } finally {
                          setIsLoading(false);
                        }
                      }}
                      disabled={isLoading || !requestForm.name || !requestForm.email || !requestForm.phone || !requestForm.location || !requestForm.address || !requestForm.reason}
                      className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-xl font-semibold hover:from-green-700 hover:to-blue-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoading ? 'Submitting...' : 'Submit Request'}
                    </button>
                  </div>
                </div>
              ) : (
                /* Show existing requests */
                <div className="space-y-4">
                  {chargerRequests.map((request) => (
                    <div key={request._id} className="bg-gray-50 border border-gray-200 rounded-xl p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h4 className="font-semibold text-gray-900">Charger Request</h4>
                          <p className="text-sm text-gray-600">Submitted on {new Date(request.created_at).toLocaleDateString()}</p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          request.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          request.status === 'approved' ? 'bg-green-100 text-green-800' :
                          request.status === 'rejected' ? 'bg-red-100 text-red-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Location:</span>
                          <span className="ml-2 text-gray-900 font-medium">{request.location}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Property Type:</span>
                          <span className="ml-2 text-gray-900 font-medium">{request.property_type}</span>
                        </div>
                      </div>

                      {request.status === 'pending' && (
                        <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                          <p className="text-sm text-yellow-800">
                            ⏳ Your request is under review. Our team will contact you soon.
                          </p>
                        </div>
                      )}
                      
                      {request.admin_notes && (
                        <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
                          <p className="text-sm text-blue-900">
                            <strong>Admin Note:</strong> {request.admin_notes}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Carbon Trading Tab */}
        {activeTab === 'carbon-trading' && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Leaf className="w-6 h-6 text-green-600" />
                Carbon Credits Trading
              </h3>
              <p className="text-gray-600 mt-1">Trade your earned carbon credits from hosting green energy chargers</p>
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
                    <p className="text-xs text-gray-400 mt-1">{carbonStats.total_distance_km.toLocaleString()} km</p>
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
                      <strong>Keep hosting green energy</strong> to unlock your <strong>1k gift!</strong>
                    </p>
                  </div>
                  
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-4">
                    <div className="flex items-start space-x-3">
                      <div className="text-2xl">💡</div>
                      <div>
                        <h4 className="text-sm font-semibold text-green-800 mb-1">How it works</h4>
                        <p className="text-sm text-green-700">
                          <strong>1 Carbon Credit = 1,000 kg CO₂ saved</strong> from renewable energy charging. Help drivers charge green and earn valuable carbon credits!
                        </p>
                      </div>
                    </div>
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
                      <p className="text-sm text-gray-500">Check back later for carbon credit listings!</p>
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
                      <p className="text-sm text-gray-600">Earn 1 carbon credit for every 1,000 kg CO₂ avoided by providing renewable energy</p>
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

                {/* Market Info */}
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <TrendingUp className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div>
                      <h5 className="font-semibold text-blue-900 mb-1">Current Market Rate</h5>
                      <p className="text-sm text-blue-700">₹50 per carbon credit</p>
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

        {/* Emergency SOS Tab - For Host to Request Help */}
        {activeTab === 'emergency-rescue' && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-red-50 to-orange-50">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <AlertTriangle className="w-6 h-6 text-red-600" />
                Emergency SOS - Request Help
              </h3>
              <p className="text-gray-600 mt-1">Stranded with your EV? Request emergency portable charging</p>
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
              <h3 className="text-xl font-bold text-gray-900">Host Support Center</h3>
              <p className="text-gray-600 mt-1">Get help with your charging experience and hosting business</p>
            </div>
            <div className="p-6 space-y-6">
              {/* General FAQ Section (same as driver) */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-4">General Frequently Asked Questions</h4>
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

              {/* Host-specific FAQ Section */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-4">Host-Specific Questions</h4>
                <div className="space-y-3">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h5 className="font-medium text-blue-800 mb-2">How do I add a new charger?</h5>
                    <p className="text-sm text-blue-600">Go to the "My Chargers" tab and click "Add Charger". Fill in the details including location, power rating, and pricing.</p>
                  </div>
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h5 className="font-medium text-blue-800 mb-2">What if a customer doesn't show up?</h5>
                    <p className="text-sm text-blue-600">You can cancel the booking from the "Customer Bookings" tab. The customer will be charged a no-show fee if applicable.</p>
                  </div>
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h5 className="font-medium text-blue-800 mb-2">How are payments processed?</h5>
                    <p className="text-sm text-blue-600">Payments are automatically transferred to your account within 2-3 business days after a successful charging session.</p>
                  </div>
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h5 className="font-medium text-blue-800 mb-2">What if my charger breaks down?</h5>
                    <p className="text-sm text-blue-600">Mark it as unavailable immediately and contact support. We'll help arrange repairs and notify affected customers.</p>
                  </div>
                </div>
              </div>

              {/* Contact Support (Enhanced for hosts) */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-4">Contact Support</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="bg-green-50 p-4 rounded-lg">
                    <h5 className="font-medium text-green-800 mb-2">General Support</h5>
                    <p className="text-sm text-green-600 mb-3">For booking questions, app issues, or feedback</p>
                    <button className="bg-green-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-600 transition-colors">
                      Start Chat
                    </button>
                  </div>
                  <div className="bg-orange-50 p-4 rounded-lg">
                    <h5 className="font-medium text-orange-800 mb-2">Technical Issues</h5>
                    <p className="text-sm text-orange-600 mb-3">For charger malfunctions or platform issues</p>
                    <button className="bg-orange-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-orange-600 transition-colors">
                      Report Technical Issue
                    </button>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <h5 className="font-medium text-purple-800 mb-2">Business Support</h5>
                    <p className="text-sm text-purple-600 mb-3">For earnings, payments, or hosting questions</p>
                    <button className="bg-purple-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-purple-600 transition-colors">
                      Contact Business Team
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

      {/* Add Charger Modal */}
      {showAddCharger && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-gray-900">
                  {editingCharger ? 'Edit Charger' : 'Add New Charger'}
                </h3>
                <button
                  onClick={() => {
                    setShowAddCharger(false);
                    setEditingCharger(null);
                    // Reset form when closing
                    setNewCharger({
                      name: '',
                      location: '',
                      coordinates: null,
                      plugType: 'Type 2',
                      power: '',
                      price: '',
                      greenEnergy: false,
                      host_name: '',
                      host_phone: ''
                    });
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Charger Name</label>
                  <input
                    type="text"
                    placeholder="e.g., Home Driveway Charger"
                    value={newCharger.name}
                    onChange={(e) => setNewCharger(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>

                <LocationPicker
                  value={newCharger.location}
                  onChange={(location, coordinates) => {
                    setNewCharger(prev => ({ 
                      ...prev, 
                      location,
                      coordinates: coordinates || null
                    }));
                  }}
                  placeholder="Enter full address or click map icon to select location"
                  label="Location"
                />

                {/* Coordinates Section - Always Visible */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-medium text-green-800 flex items-center">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Charger Coordinates
                    </h4>
                    {newCharger.coordinates && (
                      <button
                        type="button"
                        onClick={() => setNewCharger(prev => ({ ...prev, coordinates: null, location: '' }))}
                        className="text-xs text-red-600 hover:text-red-800 flex items-center"
                      >
                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Clear Location
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-green-700 mb-1">
                        Latitude 
                        <span className="text-gray-500 font-normal">(-90 to 90)</span>
                      </label>
                      <input
                        type="number"
                        step="any"
                        min="-90"
                        max="90"
                        value={newCharger.coordinates?.lat || ''}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value === '') {
                            setNewCharger(prev => ({ ...prev, coordinates: null }));
                          } else {
                            const lat = parseFloat(value);
                            if (!isNaN(lat) && lat >= -90 && lat <= 90) {
                              setNewCharger(prev => ({ 
                                ...prev, 
                                coordinates: { 
                                  lat: lat,
                                  lng: prev.coordinates?.lng || 0
                                }
                              }));
                            }
                          }
                        }}
                        className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 bg-white ${
                          !newCharger.coordinates?.lat || (newCharger.coordinates.lat >= -90 && newCharger.coordinates.lat <= 90)
                            ? 'border-green-300 focus:ring-green-500' 
                            : 'border-red-300 focus:ring-red-500'
                        }`}
                        placeholder="Enter latitude"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-green-700 mb-1">
                        Longitude 
                        <span className="text-gray-500 font-normal">(-180 to 180)</span>
                      </label>
                      <input
                        type="number"
                        step="any"
                        min="-180"
                        max="180"
                        value={newCharger.coordinates?.lng || ''}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value === '') {
                            setNewCharger(prev => ({ ...prev, coordinates: null }));
                          } else {
                            const lng = parseFloat(value);
                            if (!isNaN(lng) && lng >= -180 && lng <= 180) {
                              setNewCharger(prev => ({ 
                                ...prev, 
                                coordinates: { 
                                  lat: prev.coordinates?.lat || 0,
                                  lng: lng
                                }
                              }));
                            }
                          }
                        }}
                        className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 bg-white ${
                          !newCharger.coordinates?.lng || (newCharger.coordinates.lng >= -180 && newCharger.coordinates.lng <= 180)
                            ? 'border-green-300 focus:ring-green-500' 
                            : 'border-red-300 focus:ring-red-500'
                        }`}
                        placeholder="Enter longitude"
                      />
                    </div>
                  </div>
                  <div className="mt-3 flex items-start space-x-2">
                    <div className="text-xs text-green-600 flex-1">
                      💡 Coordinates auto-fill when you select a location on the map above. You can also manually enter them here.
                    </div>
                    {newCharger.coordinates && (
                      newCharger.coordinates.lat < -90 || newCharger.coordinates.lat > 90 || 
                      newCharger.coordinates.lng < -180 || newCharger.coordinates.lng > 180
                    ) && (
                      <div className="text-xs text-red-600 flex items-center">
                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                        Invalid coordinates
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Host Name</label>
                    <input
                      type="text"
                      placeholder="Your name for drivers to contact"
                      value={newCharger.host_name}
                      onChange={(e) => setNewCharger(prev => ({ ...prev, host_name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Host Phone</label>
                    <input
                      type="tel"
                      placeholder="Phone number for drivers"
                      value={newCharger.host_phone}
                      onChange={(e) => setNewCharger(prev => ({ ...prev, host_phone: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Plug Type</label>
                    <select 
                      value={newCharger.plugType}
                      onChange={(e) => setNewCharger(prev => ({ ...prev, plugType: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                      <option value="Type 2">Type 2</option>
                      <option value="CCS">CCS</option>
                      <option value="CHAdeMO">CHAdeMO</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Power (kW)</label>
                    <input
                      type="number"
                      placeholder="22"
                      value={newCharger.power}
                      onChange={(e) => setNewCharger(prev => ({ ...prev, power: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Price per kWh (₹)</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="8.5"
                    value={newCharger.price}
                    onChange={(e) => setNewCharger(prev => ({ ...prev, price: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <input 
                    type="checkbox" 
                    id="greenEnergy" 
                    checked={newCharger.greenEnergy}
                    onChange={(e) => setNewCharger(prev => ({ ...prev, greenEnergy: e.target.checked }))}
                    className="rounded border-gray-300 text-green-500 focus:ring-green-500" 
                  />
                  <label htmlFor="greenEnergy" className="text-sm text-gray-700">
                    Powered by renewable energy (Solar/Wind)
                  </label>
                </div>

                <div className="flex space-x-4 pt-4">
                  <button
                    onClick={() => {
                      setShowAddCharger(false);
                      setEditingCharger(null);
                      // Reset form when canceling
                      setNewCharger({
                        name: '',
                        location: '',
                        coordinates: null,
                        plugType: 'Type 2',
                        power: '',
                        price: '',
                        greenEnergy: false,
                        host_name: '',
                        host_phone: ''
                      });
                    }}
                    className="flex-1 bg-gray-200 text-gray-800 px-4 py-3 rounded-xl font-semibold hover:bg-gray-300 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={editingCharger ? handleUpdateCharger : handleAddCharger}
                    disabled={isLoading}
                    className="flex-1 bg-gradient-to-r from-green-500 to-blue-500 text-white px-4 py-3 rounded-xl font-semibold hover:from-green-600 hover:to-blue-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? 'Saving...' : (editingCharger ? 'Update Charger' : 'Add Charger')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HostDashboard;