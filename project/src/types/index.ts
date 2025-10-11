// Legacy types for backward compatibility
export interface Charger {
  id: string;
  name: string;
  location: string;
  coordinates?: { lat: number; lng: number }; // Added coordinates support
  plugType: string;
  power: number;
  price: number;
  available: boolean;
  rating: number;
  reviews: number;
  distance: number;
  hostName: string;
  features: string[];
  moodMatch?: boolean;
}

// MongoDB-compatible types
export interface MongoCharger {
  _id: string;
  host_id: string;
  name: string;
  location: string;
  coordinates?: { lat: number; lng: number }; // Added coordinates support
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
  // Additional computed fields
  hostName?: string;
  distance?: number;
  moodMatch?: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  type: 'driver' | 'host';
  verified: boolean;
  tokens: number;
  ecoMiles: number; // Carbon Credits (maps to eco_miles in DB)
  avatar?: string;
}

export interface MongoUser {
  _id: string;
  email: string;
  name: string;
  phone: string;
  user_type: 'driver' | 'host' | 'passenger';
  has_ev: boolean;
  vehicle_category?: string;
  vehicle_type?: string;
  vehicle_model?: string;
  vehicle_number?: string;
  charger_type?: string;
  verified: boolean;
  tokens: number;
  eco_miles: number; // Carbon Credits
  created_at: Date;
  updated_at: Date;
}

export interface Booking {
  id: string;
  chargerId: string;
  userId: string;
  timeSlot: string;
  duration: number;
  status: 'pending' | 'active' | 'completed' | 'cancelled';
  amount: number;
  createdAt: Date;
}

export interface MongoBooking {
  _id: string;
  charger_id: string;
  user_id: string;
  time_slot: string;
  duration: number;
  status: 'pending' | 'active' | 'completed' | 'cancelled';
  amount: number;
  created_at: Date;
}

export interface BeaconHunt {
  id: string;
  name: string;
  description: string;
  location: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  reward: number;
  distance: number;
  discovered: boolean;
  clues: string[];
}

export interface BarterListing {
  id: string;
  title: string;
  description: string;
  category: string;
  offeredBy: string;
  wantedSkill: string;
  chargeCredits: number;
  rating: number;
  location: string;
  tags: string[];
}