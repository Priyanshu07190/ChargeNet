// Note: Using backend API with MongoDB Atlas
import { apiService } from './apiService';

export interface Charger {
  _id: string;
  host_id: string;
  name: string;
  location: string;
  coordinates?: { lat: number; lng: number }; // Real-time mapping coordinates
  plug_type: string;
  power: number;
  price: number;
  available: boolean;
  rating: number;
  reviews: number;
  features: string[];
  green_energy: boolean;
  host_name?: string;
  host_phone?: string;
  created_at: Date;
  // Backward compatibility fields
  id?: string;
  plugType?: string;
  hostName?: string;
  distance?: number;
  moodMatch?: boolean;
}

export interface Booking {
  _id: string;
  charger_id: string;
  user_id: string;
  time_slot: string;
  duration: number;
  status: 'pending' | 'active' | 'completed' | 'cancelled';
  amount: number;
  created_at: Date;
}

class DataService {
  async getChargers(): Promise<Charger[]> {
    try {
      const chargers = await apiService.getChargers();
      return chargers;
    } catch (error) {
      console.error('Failed to fetch chargers from API:', error);
      // Fallback to mock data if API fails
      return this.getMockChargers();
    }
  }

  async createBooking(booking: Omit<Booking, '_id' | 'created_at'>): Promise<Booking> {
    try {
      const newBooking = await apiService.createBooking(booking);
      return newBooking;
    } catch (error) {
      console.error('Failed to create booking:', error);
      throw new Error('Failed to create booking');
    }
  }

  async getUserBookings(userId: string): Promise<Booking[]> {
    try {
      // Get bookings from API - no localStorage
      const bookings = await apiService.getBookings();
      return bookings.filter((booking: Booking) => booking.user_id === userId);
    } catch (error) {
      console.error('Error fetching user bookings:', error);
      return [];
    }
  }

  async updateChargerAvailability(chargerId: string, available: boolean): Promise<void> {
    try {
      // Update through API - no localStorage caching
      await apiService.updateCharger(chargerId, { available });
    } catch (error) {
      console.error('Error updating charger availability:', error);
    }
  }

  async seedDatabase(): Promise<void> {
    try {
      // Seed database through API if needed
      const chargers = await this.getChargers();
      if (chargers.length === 0) {
        console.log('No chargers found, seeding may be needed on backend');
      }
    } catch (error) {
      console.error('Error checking database state:', error);
    }
  }

  private getMockChargers(): Charger[] {
    return [
      {
        _id: '1',
        host_id: 'demo-host-1',
        name: 'EcoCharge Station - Phoenix Mall',
        location: 'Phoenix Mall, Kurla West',
        plug_type: 'Type 2',
        power: 22,
        price: 8.5,
        available: true,
        rating: 4.8,
        reviews: 156,
        features: ['Fast Charging', 'Covered Parking', 'WiFi', 'Cafe Nearby'],
        green_energy: true,
        host_name: 'Priya Sharma',
        host_phone: '+91 98765 43210',
        created_at: new Date(),
        // Compatibility fields
        id: '1',
        plugType: 'Type 2',
        hostName: 'Priya Sharma',
        distance: 1.2,
        moodMatch: true
      },
      {
        _id: '2',
        host_id: 'demo-host-2',
        name: 'GreenPower Hub - Bandra',
        location: 'Bandra West, Near Station',
        plug_type: 'CCS',
        power: 50,
        price: 12.0,
        available: false,
        rating: 4.6,
        reviews: 89,
        features: ['Ultra Fast', 'Security Guard', '24/7', 'Restaurant'],
        green_energy: false,
        host_name: 'Rajesh Kumar',
        host_phone: '+91 99876 54321',
        created_at: new Date(),
        // Compatibility fields
        id: '2',
        plugType: 'CCS',
        hostName: 'Rajesh Kumar',
        distance: 2.8,
        moodMatch: false
      },
      {
        _id: '3',
        host_id: 'demo-host-3',
        name: 'Solar Charge Point - Andheri',
        location: 'Andheri East, IT Park',
        plug_type: 'Type 2',
        power: 11,
        price: 6.5,
        available: true,
        rating: 4.9,
        reviews: 203,
        features: ['Solar Powered', 'Green Energy', 'Parking', 'Mall Access'],
        green_energy: true,
        host_name: 'Sunita Verma',
        host_phone: '+91 97654 32108',
        created_at: new Date(),
        // Compatibility fields
        id: '3',
        plugType: 'Type 2',
        hostName: 'Sunita Verma',
        distance: 0.8,
        moodMatch: true
      },
      {
        _id: '4',
        host_id: 'demo-host-4',
        name: 'QuickCharge - Marine Drive',
        location: 'Marine Drive, South Mumbai',
        plug_type: 'CHAdeMO',
        power: 40,
        price: 15.0,
        available: true,
        rating: 4.4,
        reviews: 67,
        features: ['Sea View', 'Premium Location', 'Valet Parking'],
        green_energy: false,
        created_at: new Date(),
        // Compatibility fields
        id: '4',
        plugType: 'CHAdeMO',
        hostName: 'Rohit Singh',
        distance: 4.2,
        moodMatch: false
      },
      {
        _id: '5',
        host_id: 'demo-host-5',
        name: 'Community Charger - Powai',
        location: 'Powai Lake, Residential Complex',
        plug_type: 'Type 2',
        power: 7.4,
        price: 5.0,
        available: true,
        rating: 4.7,
        reviews: 124,
        features: ['Community Access', 'Lake View', 'Garden'],
        green_energy: true,
        created_at: new Date(),
        // Compatibility fields
        id: '5',
        plugType: 'Type 2',
        hostName: 'Mumbai Housing Society',
        distance: 3.5,
        moodMatch: true
      }
    ];
  }
}

export const dataService = new DataService();
