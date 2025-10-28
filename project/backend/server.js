const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const path = require('path');
const http = require('http');
const crypto = require('crypto');
const { Server } = require('socket.io');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const app = express();
const server = http.createServer(app);

// CORS Configuration for Production & Development
const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  process.env.FRONTEND_URL, // Your Vercel/Netlify URL
].filter(Boolean); // Remove undefined values

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
  }
});
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(cookieParser());

// Health check endpoint for deployment platforms
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    message: 'ChargeNet Backend is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'ChargeNet API Server',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth/*',
      chargers: '/api/chargers',
      bookings: '/api/bookings'
    }
  });
});

// Debug middleware for all requests
app.use((req, res, next) => {
  console.log('🌐 REQUEST:', req.method, req.originalUrl, req.headers.authorization ? '[AUTH]' : '[NO AUTH]');
  if (req.method === 'POST' && req.originalUrl.includes('/auth/login')) {
    console.log('🔐 Login request body:', req.body);
    console.log('🔐 Content-Type:', req.headers['content-type']);
  }
  next();
});

// Debug middleware for booking routes
app.use('/api/bookings', (req, res, next) => {
  console.log('📡 Booking route accessed:', req.method, req.originalUrl, req.params);
  next();
});

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
.then(() => console.log('✅ Connected to MongoDB Atlas'))
.catch(err => console.error('❌ MongoDB connection error:', err));

// User Schema
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  phone: { type: String, required: true },
  user_type: { type: String, enum: ['driver', 'host', 'passenger'], default: 'driver' },
  has_ev: { type: Boolean, default: false },
  vehicle_category: { type: String },
  vehicle_type: { type: String },
  vehicle_model: { type: String },
  vehicle_number: { type: String },
  charger_type: { type: String },
  verified: { type: Boolean, default: false },
  tokens: { type: Number, default: 100 },
  eco_miles: { type: Number, default: 0 }, // Carbon Credits in UI
  // Carbon Credit fields
  total_distance_km: { type: Number, default: 0 }, // Total green km traveled (100g CO2 saved per km)
  carbon_credits: { type: Number, default: 0 }, // 1 credit = 1000kg CO2 = 10,000 km
  carbon_credits_earned: { type: Number, default: 0 }, // Total earned (including sold)
  carbon_credits_sold: { type: Number, default: 0 }, // Total sold
  carbon_earnings: { type: Number, default: 0 }, // Total earnings from selling credits (₹)
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// Charger Schema
const chargerSchema = new mongoose.Schema({
  host_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  location: { type: String, required: true },
  coordinates: {
    lat: { type: Number },
    lng: { type: Number }
  },
  plug_type: { type: String, required: true },
  power: { type: Number, required: true },
  price: { type: Number, required: true },
  available: { type: Boolean, default: true },
  rating: { type: Number, default: 4.5 },
  reviews: { type: Number, default: 0 },
  features: [String],
  green_energy: { type: Boolean, default: false },
  // Host contact information for drivers
  host_name: { type: String, required: true },
  host_phone: { type: String, required: true },
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// Booking Schema
const bookingSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  charger_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Charger', required: true },
  start_time: { type: Date, required: true },
  end_time: { type: Date, required: true },
  duration: { type: Number, required: true }, // in minutes
  total_cost: { type: Number, required: true },
  status: { type: String, enum: ['pending', 'confirmed', 'active', 'completed', 'cancelled'], default: 'pending' },
  payment_status: { type: String, enum: ['pending', 'paid', 'failed', 'refunded'], default: 'pending' },
  booking_context: { type: String, enum: ['driver-booking', 'host-booking'], default: 'driver-booking' }, // Track if booked as driver or host
  // Payment fields
  payment_id: { type: String }, // Razorpay payment ID
  razorpay_order_id: { type: String }, // Razorpay order ID
  refund_id: { type: String }, // Razorpay refund ID
  payment_method: { type: String }, // card, upi, wallet, etc.
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// Session Schema - Replace localStorage with database sessions
const sessionSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  token: { type: String, required: true, unique: true },
  expires_at: { type: Date, required: true },
  device_info: { type: String }, // Optional device/browser info
  last_accessed: { type: Date, default: Date.now },
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// Charger Request Schema - For hosts requesting free chargers
const chargerRequestSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  location: { type: String, required: true },
  address: { type: String, required: true },
  property_type: { type: String, enum: ['residential', 'commercial', 'apartment', 'office', 'parking'], required: true },
  parking_availability: { type: String, enum: ['dedicated', 'shared', 'street'], required: true },
  reason: { type: String, required: true },
  expected_usage: { type: String },
  status: { type: String, enum: ['pending', 'approved', 'rejected', 'installed'], default: 'pending' },
  admin_notes: { type: String },
  approved_at: { type: Date },
  rejected_at: { type: Date },
  installed_at: { type: Date },
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// Emergency Rescue Request Schema - For stranded EVs needing portable charging
const rescueRequestSchema = new mongoose.Schema({
  requester_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  requester_name: { type: String, required: true },
  requester_phone: { type: String, required: true },
  requester_type: { type: String, enum: ['driver', 'host'], required: true },
  location_name: { type: String, required: true },
  coordinates: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true }
  },
  vehicle_details: { type: String },
  battery_level: { type: String },
  status: { type: String, enum: ['pending', 'accepted', 'in-progress', 'completed', 'cancelled'], default: 'pending' },
  accepted_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  accepted_by_name: { type: String },
  accepted_by_phone: { type: String },
  accepted_at: { type: Date },
  completed_at: { type: Date },
  cancelled_at: { type: Date },
  price: { type: Number }, // Set by host when accepting
  estimated_time: { type: Number }, // Minutes
  payment_status: { type: String, enum: ['pending', 'paid', 'failed'], default: 'pending' },
  payment_id: { type: String },
  razorpay_order_id: { type: String },
  rejected_by: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // Track who rejected
  notes: { type: String }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// Carbon Credit Listing Schema - For trading carbon credits
const carbonCreditListingSchema = new mongoose.Schema({
  seller_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  seller_name: { type: String, required: true },
  seller_phone: { type: String, required: true },
  credits_amount: { type: Number, required: true }, // Number of credits to sell
  price_per_credit: { type: Number, required: true }, // Price in ₹
  total_price: { type: Number, required: true }, // credits_amount * price_per_credit
  status: { type: String, enum: ['active', 'sold', 'cancelled'], default: 'active' },
  buyer_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  buyer_name: { type: String },
  sold_at: { type: Date },
  cancelled_at: { type: Date },
  payment_status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'pending' },
  payment_id: { type: String },
  razorpay_order_id: { type: String },
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

const User = mongoose.model('User', userSchema);
const Charger = mongoose.model('Charger', chargerSchema);
const Booking = mongoose.model('Booking', bookingSchema);
const Session = mongoose.model('Session', sessionSchema);
const ChargerRequest = mongoose.model('ChargerRequest', chargerRequestSchema);
const RescueRequest = mongoose.model('RescueRequest', rescueRequestSchema);
const CarbonCreditListing = mongoose.model('CarbonCreditListing', carbonCreditListingSchema);

// Enhanced Monitoring Schemas

// Session Analytics Schema - Detailed charging session data
const sessionAnalyticsSchema = new mongoose.Schema({
  booking_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  charger_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Charger', required: true },
  session_start: { type: Date, required: true },
  session_end: { type: Date },
  energy_delivered: { type: Number, default: 0 }, // kWh
  peak_power_usage: { type: Number, default: 0 }, // kW
  average_power_usage: { type: Number, default: 0 }, // kW
  charging_efficiency: { type: Number, default: 0 }, // percentage
  temperature_data: {
    ambient_temp: { type: Number },
    charger_temp: { type: Number },
    battery_temp: { type: Number }
  },
  location_data: {
    latitude: { type: Number },
    longitude: { type: Number },
    address: { type: String }
  },
  vehicle_data: {
    initial_soc: { type: Number }, // State of Charge %
    final_soc: { type: Number },
    battery_capacity: { type: Number }, // kWh
    vehicle_model: { type: String }
  },
  payment_data: {
    amount_paid: { type: Number, required: true },
    payment_method: { type: String },
    transaction_id: { type: String },
    currency: { type: String, default: 'INR' }
  },
  environmental_impact: {
    co2_saved: { type: Number, default: 0 }, // kg
    green_energy_used: { type: Boolean, default: false },
    carbon_credits_earned: { type: Number, default: 0 }
  },
  quality_metrics: {
    session_rating: { type: Number, min: 1, max: 5 },
    charger_rating: { type: Number, min: 1, max: 5 },
    host_rating: { type: Number, min: 1, max: 5 },
    issues_reported: [String],
    session_interrupted: { type: Boolean, default: false }
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// User Activity Logs Schema - Navigation and feature usage tracking
const userActivityLogSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  session_id: { type: String, required: true }, // Browser/app session ID
  activity_type: { 
    type: String, 
    enum: ['login', 'logout', 'page_view', 'feature_use', 'search', 'booking', 'payment', 'error'],
    required: true 
  },
  page_url: { type: String },
  feature_used: { type: String }, // e.g., 'urgent_booking', 'voice_assistant', 'map_search'
  action_details: {
    search_query: { type: String },
    filters_applied: [String],
    results_count: { type: Number },
    interaction_time: { type: Number }, // seconds spent
    clicks_count: { type: Number },
    scroll_depth: { type: Number } // percentage
  },
  device_info: {
    device_type: { type: String }, // mobile, desktop, tablet
    browser: { type: String },
    os: { type: String },
    screen_resolution: { type: String },
    user_agent: { type: String }
  },
  location_data: {
    ip_address: { type: String },
    country: { type: String },
    city: { type: String },
    timezone: { type: String }
  },
  performance_metrics: {
    page_load_time: { type: Number }, // ms
    api_response_time: { type: Number }, // ms
    error_occurred: { type: Boolean, default: false },
    error_message: { type: String }
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// System Performance Schema - API response times and errors
const systemPerformanceSchema = new mongoose.Schema({
  endpoint: { type: String, required: true }, // e.g., '/api/chargers', '/api/bookings'
  method: { type: String, enum: ['GET', 'POST', 'PUT', 'DELETE'], required: true },
  response_time: { type: Number, required: true }, // milliseconds
  status_code: { type: Number, required: true },
  request_size: { type: Number }, // bytes
  response_size: { type: Number }, // bytes
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // if authenticated
  ip_address: { type: String },
  user_agent: { type: String },
  error_details: {
    error_type: { type: String },
    error_message: { type: String },
    stack_trace: { type: String }
  },
  database_metrics: {
    query_time: { type: Number }, // ms
    queries_count: { type: Number },
    connection_time: { type: Number } // ms
  },
  server_metrics: {
    cpu_usage: { type: Number }, // percentage
    memory_usage: { type: Number }, // MB
    concurrent_requests: { type: Number }
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// Business Metrics Schema - Aggregated daily/monthly statistics
const businessMetricsSchema = new mongoose.Schema({
  date: { type: Date, required: true },
  period_type: { type: String, enum: ['daily', 'weekly', 'monthly', 'yearly'], required: true },
  user_metrics: {
    new_registrations: { type: Number, default: 0 },
    active_users: { type: Number, default: 0 },
    returning_users: { type: Number, default: 0 },
    user_retention_rate: { type: Number, default: 0 }, // percentage
    drivers_count: { type: Number, default: 0 },
    hosts_count: { type: Number, default: 0 }
  },
  booking_metrics: {
    total_bookings: { type: Number, default: 0 },
    completed_bookings: { type: Number, default: 0 },
    cancelled_bookings: { type: Number, default: 0 },
    booking_completion_rate: { type: Number, default: 0 }, // percentage
    average_booking_duration: { type: Number, default: 0 }, // minutes
    peak_booking_hours: [String]
  },
  financial_metrics: {
    total_revenue: { type: Number, default: 0 },
    platform_commission: { type: Number, default: 0 },
    host_earnings: { type: Number, default: 0 },
    average_transaction_value: { type: Number, default: 0 },
    payment_success_rate: { type: Number, default: 0 }, // percentage
    refunds_issued: { type: Number, default: 0 }
  },
  operational_metrics: {
    total_chargers: { type: Number, default: 0 },
    active_chargers: { type: Number, default: 0 },
    average_utilization_rate: { type: Number, default: 0 }, // percentage
    total_energy_delivered: { type: Number, default: 0 }, // kWh
    average_session_rating: { type: Number, default: 0 },
    support_tickets: { type: Number, default: 0 }
  },
  environmental_metrics: {
    total_co2_saved: { type: Number, default: 0 }, // kg
    green_energy_percentage: { type: Number, default: 0 },
    carbon_credits_distributed: { type: Number, default: 0 },
    eco_friendly_sessions: { type: Number, default: 0 }
  },
  geographic_metrics: {
    top_cities: [{
      city: String,
      bookings_count: Number,
      revenue: Number
    }],
    new_locations: { type: Number, default: 0 },
    market_penetration: [{
      region: String,
      penetration_rate: Number // percentage
    }]
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  indexes: [
    { date: 1, period_type: 1 }, // Compound index for efficient querying
    { date: -1 } // Descending date index
  ]
});

// Create models for the new schemas
const SessionAnalytics = mongoose.model('SessionAnalytics', sessionAnalyticsSchema);
const UserActivityLog = mongoose.model('UserActivityLog', userActivityLogSchema);
const SystemPerformance = mongoose.model('SystemPerformance', systemPerformanceSchema);
const BusinessMetrics = mongoose.model('BusinessMetrics', businessMetricsSchema);

// Middleware to verify charger ownership
const verifyChargerOwnership = async (req, res, next) => {
  try {
    const chargerId = req.params.id;
    const userId = req.user.userId;

    if (!chargerId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ 
        error: 'Invalid charger ID format',
        message: 'The provided charger ID is not valid.'
      });
    }

    const charger = await Charger.findOne({ _id: chargerId, host_id: userId });
    
    if (!charger) {
      const anyCharger = await Charger.findOne({ _id: chargerId });
      if (!anyCharger) {
        return res.status(404).json({ 
          error: 'Charger not found',
          message: 'The specified charger does not exist.'
        });
      } else {
        return res.status(403).json({ 
          error: 'Access denied',
          message: 'You are not authorized to access this charger.'
        });
      }
    }

    req.charger = charger;
    next();
  } catch (error) {
    console.error('Charger ownership verification error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to verify charger ownership.'
    });
  }
};

// Session-based Authentication Middleware
const authenticateToken = async (req, res, next) => {
  console.log('🔐 Authentication middleware called for:', req.method, req.originalUrl);
  
  // Prefer cookie-based session token over Authorization header to avoid conflicts
  let token = req.cookies.chargenet_session;
  const authHeader = req.headers['authorization'];
  const headerToken = authHeader && authHeader.split(' ')[1];

  if (token) {
    console.log('🍪 Using cookie token');
  } else if (headerToken) {
    token = headerToken;
    console.log('📤 No cookie token, falling back to header token');
  }

  if (!token) {
    console.log('❌ No token found in headers or cookies');
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const user = await validateSession(token);
    req.user = { userId: user._id.toString(), email: user.email };
    req.fullUser = user; // Include full user object for convenience
    console.log('✅ Authentication successful for user:', user.email, 'ID:', user._id.toString());
    next();
  } catch (error) {
    console.log('❌ Authentication failed:', error.message);
    return res.status(403).json({ error: 'Invalid or expired session' });
  }
};

// Routes

// Health check
app.get('/', (req, res) => {
  res.json({ message: 'ChargeNet API is running!', timestamp: new Date().toISOString() });
});

// Session Management Helper Functions
const createSession = async (userId, deviceInfo = null) => {
  try {
    // Generate JWT token
    const token = jwt.sign(
      { userId, sessionId: new mongoose.Types.ObjectId() },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Set expiration time (24 hours from now)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    // Create session in database
    const session = new Session({
      user_id: userId,
      token,
      expires_at: expiresAt,
      device_info: deviceInfo,
      last_accessed: new Date()
    });

    await session.save();
    return token;
  } catch (error) {
    console.error('Session creation error:', error);
    throw error;
  }
};

const validateSession = async (token) => {
  try {
    console.log('🔍 Validating session token...');
    
    // First verify JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('✅ JWT verified for user:', decoded.userId);
    
    // Check if session exists in database and is not expired
    const session = await Session.findOne({
      token,
      expires_at: { $gt: new Date() }
    }).populate('user_id');

    if (!session) {
      console.log('❌ Session not found in database or expired');
      throw new Error('Session not found or expired');
    }

    console.log('✅ Session found and valid for user:', session.user_id._id);

    // Update last accessed time
    session.last_accessed = new Date();
    await session.save();

    return session.user_id;
  } catch (error) {
    console.log('❌ Session validation failed:', error.message);
    throw new Error('Invalid session');
  }
};

const destroySession = async (token) => {
  try {
    await Session.deleteOne({ token });
  } catch (error) {
    console.error('Session destruction error:', error);
  }
};

const destroyAllUserSessions = async (userId) => {
  try {
    await Session.deleteMany({ user_id: userId });
  } catch (error) {
    console.error('All sessions destruction error:', error);
  }
};

// Cleanup expired sessions (can be run periodically)
const cleanupExpiredSessions = async () => {
  try {
    const result = await Session.deleteMany({ expires_at: { $lt: new Date() } });
    console.log(`Cleaned up ${result.deletedCount} expired sessions`);
  } catch (error) {
    console.error('Session cleanup error:', error);
  }
};

// Auth Routes
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, name, phone, userType, hasEv, vehicleCategory, vehicleType, vehicleModel, vehicleNumber, chargerType } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = new User({
      email,
      password: hashedPassword,
      name,
      phone,
      user_type: userType || 'driver',
      has_ev: hasEv || false,
      vehicle_category: vehicleCategory,
      vehicle_type: vehicleType,
      vehicle_model: vehicleModel,
      vehicle_number: vehicleNumber,
      charger_type: chargerType
    });

    await user.save();

    // Create session instead of just generating token
    const token = await createSession(user._id, req.headers['user-agent']);

    // Set HTTP-only cookie for session persistence
    res.cookie('chargenet_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });

    // Return user without password
    const userResponse = { ...user.toObject() };
    delete userResponse.password;

    res.status(201).json({
      user: userResponse,
      token
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    console.log('🔐 Login attempt - Email:', email);
    console.log('🔐 Password provided:', !!password);
    console.log('🔐 Request body:', JSON.stringify(req.body));

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      console.log('❌ User not found for email:', email);
      return res.status(400).json({ error: 'Invalid credentials' });
    }
    
    console.log('✅ User found:', user.email);

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      console.log('❌ Invalid password for email:', email);
      return res.status(400).json({ error: 'Invalid credentials' });
    }
    
    console.log('✅ Password valid, creating session...');

    // Create session instead of just generating token
    const token = await createSession(user._id, req.headers['user-agent']);

    // Set HTTP-only cookie for session persistence
    res.cookie('chargenet_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });

    // Return user without password
    const userResponse = { ...user.toObject() };
    delete userResponse.password;

    res.json({
      user: userResponse,
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    // The user is already available from session validation
    const userResponse = { ...req.fullUser.toObject() };
    delete userResponse.password;
    res.json({ user: userResponse });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// Session restoration route - checks for valid session in cookies
app.get('/api/auth/session', async (req, res) => {
  try {
    const token = req.cookies.chargenet_session;
    
    if (!token) {
      return res.json({ user: null });
    }

    const user = await validateSession(token);
    const userResponse = { ...user.toObject() };
    delete userResponse.password;
    
    res.json({ 
      user: userResponse,
      token // Return token for frontend to use
    });
  } catch (error) {
    // Session invalid or expired
    res.clearCookie('chargenet_session');
    res.json({ user: null });
  }
});

// Logout route - destroys session
app.post('/api/auth/logout', authenticateToken, async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    let token = authHeader && authHeader.split(' ')[1];
    
    // If no token in header, check cookies
    if (!token) {
      token = req.cookies.chargenet_session;
    }
    
    if (token) {
      await destroySession(token);
    }
    
    // Clear the session cookie
    res.clearCookie('chargenet_session');
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

// Logout from all devices
app.post('/api/auth/logout-all', authenticateToken, async (req, res) => {
  try {
    await destroyAllUserSessions(req.user.userId);
    // Clear the session cookie
    res.clearCookie('chargenet_session');
    res.json({ message: 'Logged out from all devices successfully' });
  } catch (error) {
    console.error('Logout all error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

// Get user profile by ID (for host dashboard to view driver info)
app.get('/api/users/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findById(userId).select('-password -sessions');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ user });
  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({ error: 'Failed to get user profile' });
  }
});

// Update user profile
app.put('/api/auth/update-profile', authenticateToken, async (req, res) => {
  try {
    const { name, email, phone, vehicle_model, vehicle_number, charger_type } = req.body;
    const userId = req.user.userId;

    console.log('🔄 Updating profile for user:', userId, req.body);

    // Check if email is being changed and if it's already taken by another user
    if (email) {
      const existingUser = await User.findOne({ 
        email: email, 
        _id: { $ne: userId } 
      });
      
      if (existingUser) {
        return res.status(400).json({ error: 'Email already in use by another user' });
      }
    }

    // Build update object with only provided fields
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (vehicle_model !== undefined) updateData.vehicle_model = vehicle_model;
    if (vehicle_number !== undefined) updateData.vehicle_number = vehicle_number;
    if (charger_type !== undefined) updateData.charger_type = charger_type;

    // Update the user
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    console.log('✅ Profile updated successfully:', updatedUser);
    res.json({ 
      message: 'Profile updated successfully', 
      user: updatedUser 
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Charger Routes
app.get('/api/chargers', async (req, res) => {
  try {
    const chargers = await Charger.find()
      .populate('host_id', 'name')
      .sort({ created_at: -1 });
    
    // Transform data to match frontend expectations
    const transformedChargers = chargers.map(charger => ({
      ...charger.toObject(),
      id: charger._id.toString(),
      plugType: charger.plug_type,
      hostName: charger.host_id?.name || 'Unknown Host',
      distance: Math.random() * 5 + 0.5, // Mock distance for now
      moodMatch: Math.random() > 0.5 // Mock mood match for now
    }));

    res.json(transformedChargers);
  } catch (error) {
    console.error('Get chargers error:', error);
    res.status(500).json({ error: 'Failed to get chargers' });
  }
});

app.post('/api/chargers', authenticateToken, async (req, res) => {
  try {
    const { host_name, host_phone, name, location, plug_type, power, price, green_energy } = req.body;

    // Comprehensive validation
    if (!host_name || !host_phone || !name || !location || !plug_type || !power || !price) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        message: 'Host name, phone, charger name, location, plug type, power, and price are all required.',
        required_fields: ['host_name', 'host_phone', 'name', 'location', 'plug_type', 'power', 'price']
      });
    }

    // Validate data types and ranges
    if (typeof power !== 'number' || power <= 0) {
      return res.status(400).json({ 
        error: 'Invalid power value',
        message: 'Power must be a positive number.' 
      });
    }

    if (typeof price !== 'number' || price <= 0) {
      return res.status(400).json({ 
        error: 'Invalid price value',
        message: 'Price must be a positive number.' 
      });
    }

    // Validate phone number format (basic validation)
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    if (!phoneRegex.test(host_phone.replace(/[\s\-\(\)]/g, ''))) {
      return res.status(400).json({ 
        error: 'Invalid phone number',
        message: 'Please provide a valid phone number.' 
      });
    }

    const chargerData = {
      name: name.trim(),
      location: location.trim(),
      coordinates: req.body.coordinates, // Include coordinates from frontend
      plug_type,
      power,
      price,
      host_name: host_name.trim(),
      host_phone: host_phone.trim(),
      host_id: req.user.userId,
      available: true,
      rating: 0,
      reviews: 0,
      features: [],
      green_energy: Boolean(green_energy),
      created_at: new Date()
    };

    console.log('Creating charger for user:', req.user.userId);

    const charger = new Charger(chargerData);
    await charger.save();

    console.log('✅ Charger created successfully:', charger._id);
    
    // Broadcast new charger to all connected clients
    const chargerUpdateData = {
      type: 'charger-added',
      charger: charger,
      location: charger.location
    };
    io.to('charger-updates').emit('charger-list-changed', chargerUpdateData);
    console.log('📡 Broadcasting new charger to all users');
    
    res.status(201).json(charger);
  } catch (error) {
    console.error('Create charger error:', error);
    if (error.code === 11000) {
      res.status(409).json({ 
        error: 'Duplicate charger',
        message: 'A charger with similar details already exists.' 
      });
    } else {
      res.status(500).json({ 
        error: 'Failed to create charger',
        message: 'Internal server error. Please try again.' 
      });
    }
  }
});

// Get chargers for the authenticated host
app.get('/api/chargers/host', authenticateToken, async (req, res) => {
  try {
    const chargers = await Charger.find({ host_id: req.user.userId })
      .sort({ created_at: -1 });
    
    res.json(chargers);
  } catch (error) {
    console.error('Get host chargers error:', error);
    res.status(500).json({ error: 'Failed to get host chargers' });
  }
});

// Update a charger
app.put('/api/chargers/:id', authenticateToken, async (req, res) => {
  try {
    const charger = await Charger.findOne({ 
      _id: req.params.id, 
      host_id: req.user.userId 
    });

    if (!charger) {
      return res.status(404).json({ error: 'Charger not found or not owned by user' });
    }

    Object.assign(charger, req.body);
    await charger.save();

    res.json(charger);
  } catch (error) {
    console.error('Update charger error:', error);
    res.status(500).json({ error: 'Failed to update charger' });
  }
});

// Delete a charger
app.delete('/api/chargers/:id', authenticateToken, async (req, res) => {
  try {
    const charger = await Charger.findOneAndDelete({ 
      _id: req.params.id, 
      host_id: req.user.userId 
    });

    if (!charger) {
      return res.status(404).json({ error: 'Charger not found or not owned by user' });
    }

    // Broadcast charger deletion to all connected clients
    const chargerUpdateData = {
      type: 'charger-deleted',
      charger_id: charger._id,
      location: charger.location
    };
    io.to('charger-updates').emit('charger-list-changed', chargerUpdateData);
    console.log('📡 Broadcasting charger deletion to all users');

    res.json({ message: 'Charger deleted successfully' });
  } catch (error) {
    console.error('Delete charger error:', error);
    res.status(500).json({ error: 'Failed to delete charger' });
  }
});

// Toggle charger availability
app.patch('/api/chargers/:id/toggle-availability', authenticateToken, async (req, res) => {
  try {
    const chargerId = req.params.id;
    const userId = req.user.userId;
    
    console.log('🔄 Toggling availability for charger:', chargerId, 'by host:', userId);
    
    // Validate ObjectId format
    if (!chargerId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ 
        error: 'Invalid charger ID format',
        message: 'The provided charger ID is not valid.'
      });
    }
    
    const charger = await Charger.findOne({ 
      _id: chargerId, 
      host_id: userId 
    });

    if (!charger) {
      // Check if charger exists at all for better error messaging
      const anyCharger = await Charger.findOne({ _id: chargerId });
      if (!anyCharger) {
        console.log('❌ Charger not found:', chargerId);
        return res.status(404).json({ 
          error: 'Charger not found',
          message: 'The specified charger does not exist.'
        });
      } else {
        console.log('❌ User not authorized for charger:', chargerId, 'Owner:', anyCharger.host_id, 'User:', userId);
        return res.status(403).json({ 
          error: 'Access denied',
          message: 'You are not authorized to modify this charger.'
        });
      }
    }

    // Toggle the availability
    const newAvailability = !charger.available;
    charger.available = newAvailability;
    await charger.save();

    console.log('✅ Charger availability toggled to:', newAvailability);
    
    // Broadcast real-time update to all connected clients
    const updateData = {
      charger_id: charger._id,
      available: newAvailability,
      status: newAvailability ? 'active' : 'offline',
      timestamp: new Date().toISOString(),
      host_id: userId
    };
    
    // Broadcast to all clients viewing charger maps/lists
    io.to('charger-updates').emit('charger-availability-changed', updateData);
    console.log('📡 Real-time update broadcasted:', updateData);
    
    res.json({ 
      id: charger._id,
      available: newAvailability,
      message: `Charger ${newAvailability ? 'enabled' : 'disabled'} successfully`
    });
  } catch (error) {
    console.error('Toggle charger availability error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to toggle charger availability. Please try again.'
    });
  }
});

// ============================================
// CHARGER REQUEST ROUTES (Free Charger Program)
// ============================================

// Submit a charger request (Host only)
app.post('/api/charger-requests', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const {
      name,
      email,
      phone,
      location,
      address,
      property_type,
      parking_availability,
      reason,
      expected_usage
    } = req.body;

    // Validate required fields
    if (!name || !email || !phone || !location || !address || !property_type || !parking_availability || !reason) {
      return res.status(400).json({ error: 'All required fields must be provided' });
    }

    // Check if user is a host
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.user_type !== 'host') {
      return res.status(403).json({ error: 'Only hosts can request free chargers' });
    }

    // Check if user already has a pending request
    const existingRequest = await ChargerRequest.findOne({
      user_id: userId,
      status: 'pending'
    });

    if (existingRequest) {
      return res.status(400).json({ 
        error: 'You already have a pending charger request',
        request: existingRequest
      });
    }

    // Create new charger request
    const chargerRequest = new ChargerRequest({
      user_id: userId,
      name,
      email,
      phone,
      location,
      address,
      property_type,
      parking_availability,
      reason,
      expected_usage,
      status: 'pending'
    });

    await chargerRequest.save();

    console.log('✅ Charger request submitted:', chargerRequest._id, 'by user:', userId);

    res.status(201).json({
      success: true,
      message: 'Charger request submitted successfully',
      request: chargerRequest
    });
  } catch (error) {
    console.error('❌ Submit charger request error:', error);
    res.status(500).json({ error: 'Failed to submit charger request' });
  }
});

// Get user's charger requests
app.get('/api/charger-requests', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    const requests = await ChargerRequest.find({ user_id: userId })
      .sort({ created_at: -1 });

    res.json({ requests });
  } catch (error) {
    console.error('❌ Get charger requests error:', error);
    res.status(500).json({ error: 'Failed to get charger requests' });
  }
});

// Get single charger request by ID
app.get('/api/charger-requests/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    const request = await ChargerRequest.findOne({
      _id: id,
      user_id: userId
    });

    if (!request) {
      return res.status(404).json({ error: 'Charger request not found' });
    }

    res.json({ request });
  } catch (error) {
    console.error('❌ Get charger request error:', error);
    res.status(500).json({ error: 'Failed to get charger request' });
  }
});

// ============================================
// Booking Routes
// ============================================
app.post('/api/bookings', authenticateToken, async (req, res) => {
  try {
    const bookingData = {
      ...req.body,
      user_id: req.user.userId
    };

    console.log('📝 Creating booking with data:', JSON.stringify(bookingData, null, 2));
    console.log('🔍 Booking context:', bookingData.booking_context);
    console.log('👤 User ID:', req.user.userId);

    // Validate booking_context
    if (!bookingData.booking_context || !['driver-booking', 'host-booking'].includes(bookingData.booking_context)) {
      console.error('❌ Invalid or missing booking_context:', bookingData.booking_context);
      return res.status(400).json({ error: 'Invalid booking context' });
    }

    // Check if charger exists and is available
    if (bookingData.charger_id) {
      const charger = await Charger.findById(bookingData.charger_id);
      if (!charger) {
        console.error('❌ Charger not found:', bookingData.charger_id);
        return res.status(404).json({ error: 'Charger not found' });
      }
      
      if (!charger.available) {
        console.error('❌ Charger is not available for booking:', bookingData.charger_id);
        return res.status(400).json({ 
          error: 'Charger is currently unavailable', 
          message: 'This charger is not accepting bookings at the moment. Please try another charger or check back later.'
        });
      }
      
      console.log('✅ Charger availability verified:', charger.available);
    }

    const booking = new Booking(bookingData);
    await booking.save();

    console.log('✅ Booking created successfully:', booking._id);
    
    // Real-time update: notify about new booking
    const bookingUpdateData = {
      type: 'booking-created',
      booking: booking,
      user_id: req.user.userId,
      charger_id: bookingData.charger_id,
      booking_context: bookingData.booking_context
    };
    
    // Emit to the user who made the booking for immediate UI update
    io.to(`user-${req.user.userId}`).emit('booking-list-changed', bookingUpdateData);
    
    // Also emit to charger host if it's a charger booking (so host sees new booking on their charger)
    if (bookingData.charger_id) {
      const charger = await Charger.findById(bookingData.charger_id);
      if (charger && charger.host_id) {
        io.to(`host-${charger.host_id}`).emit('booking-list-changed', bookingUpdateData);
      }
    }
    
    console.log('📡 Real-time booking update broadcasted:', bookingUpdateData);
    
    res.status(201).json(booking);
  } catch (error) {
    console.error('Create booking error:', error);
    res.status(500).json({ error: 'Failed to create booking' });
  }
});

app.get('/api/bookings', authenticateToken, async (req, res) => {
  try {
    const bookings = await Booking.find({ user_id: req.user.userId })
      .populate('charger_id')
      .sort({ created_at: -1 });

    console.log(`📊 All bookings for user ${req.user.userId}:`, bookings.length);
    bookings.forEach(booking => {
      console.log(`  - Booking ${booking._id}: context=${booking.booking_context}, status=${booking.status}`);
    });

    res.json(bookings);
  } catch (error) {
    console.error('Get bookings error:', error);
    res.status(500).json({ error: 'Failed to get bookings' });
  }
});

// Debug route - get all bookings with context info
app.get('/api/bookings/debug', authenticateToken, async (req, res) => {
  try {
    const allBookings = await Booking.find({ user_id: req.user.userId })
      .populate('charger_id')
      .sort({ created_at: -1 });

    const driverBookings = allBookings.filter(b => b.booking_context === 'driver-booking');
    const hostBookings = allBookings.filter(b => b.booking_context === 'host-booking');
    const noContextBookings = allBookings.filter(b => !b.booking_context);

    res.json({
      total: allBookings.length,
      driver_bookings: driverBookings.length,
      host_bookings: hostBookings.length,
      no_context_bookings: noContextBookings.length,
      bookings: allBookings.map(b => ({
        id: b._id,
        context: b.booking_context,
        charger: b.charger_id?.name || 'Unknown',
        status: b.status,
        created_at: b.created_at
      }))
    });
  } catch (error) {
    console.error('Debug bookings error:', error);
    res.status(500).json({ error: 'Failed to get debug info' });
  }
});

// Migration route - fix bookings without context (run once)
app.post('/api/bookings/migrate-context', authenticateToken, async (req, res) => {
  try {
    console.log('🔧 Running booking context migration...');
    
    // Find bookings without booking_context
    const bookingsWithoutContext = await Booking.find({
      booking_context: { $exists: false }
    });
    
    console.log(`Found ${bookingsWithoutContext.length} bookings without context`);
    
    let updated = 0;
    for (const booking of bookingsWithoutContext) {
      // For existing bookings without context, default to 'driver-booking'
      // since most bookings would be made in driver context
      const context = 'driver-booking';
      await Booking.updateOne(
        { _id: booking._id },
        { booking_context: context }
      );
      updated++;
      console.log(`Updated booking ${booking._id} with context: ${context}`);
    }
    
    res.json({
      message: 'Migration completed',
      bookings_found: bookingsWithoutContext.length,
      bookings_updated: updated
    });
  } catch (error) {
    console.error('Migration error:', error);
    res.status(500).json({ error: 'Migration failed' });
  }
});

// Get bookings made as a driver
app.get('/api/bookings/driver', authenticateToken, async (req, res) => {
  try {
    console.log('🚗 Getting DRIVER bookings for user:', req.user.userId);
    const bookings = await Booking.find({ 
      user_id: req.user.userId,
      booking_context: 'driver-booking'
    })
      .populate('charger_id')
      .sort({ created_at: -1 });

    console.log('🚗 Driver bookings found:', bookings.length);
    console.log('🚗 Driver bookings contexts:', bookings.map(b => ({ id: b._id, context: b.booking_context })));
    res.json(bookings);
  } catch (error) {
    console.error('Get driver bookings error:', error);
    res.status(500).json({ error: 'Failed to get driver bookings' });
  }
});

// Get bookings made as a host (when host books chargers for personal use)
app.get('/api/bookings/host-personal', authenticateToken, async (req, res) => {
  try {
    console.log('🏠 Getting HOST PERSONAL bookings for user:', req.user.userId);
    const bookings = await Booking.find({ 
      user_id: req.user.userId,
      booking_context: 'host-booking'
    })
      .populate('charger_id')
      .sort({ created_at: -1 });

    console.log('🏠 Host personal bookings found:', bookings.length);
    console.log('🏠 Host personal bookings contexts:', bookings.map(b => ({ id: b._id, context: b.booking_context })));
    res.json(bookings);
  } catch (error) {
    console.error('Get host personal bookings error:', error);
    res.status(500).json({ error: 'Failed to get host personal bookings' });
  }
});

// Get bookings for host's chargers
app.get('/api/bookings/host', authenticateToken, async (req, res) => {
  try {
    console.log('Getting bookings for host:', req.user.userId);
    
    // First get all chargers owned by this host
    const hostChargers = await Charger.find({ host_id: req.user.userId });
    console.log('Host chargers found:', hostChargers.length);
    const chargerIds = hostChargers.map(c => c._id);
    console.log('Charger IDs:', chargerIds);
    
    // Then get all bookings for those chargers
    const bookings = await Booking.find({ charger_id: { $in: chargerIds } })
      .populate('charger_id', 'name location')
      .populate('user_id', 'name')
      .sort({ created_at: -1 });

    console.log('Bookings found for host chargers:', bookings.length);
    res.json(bookings);
  } catch (error) {
    console.error('Get host bookings error:', error);
    res.status(500).json({ error: 'Failed to get host bookings' });
  }
});

// Update booking status
app.put('/api/bookings/:id/status', authenticateToken, async (req, res) => {
  try {
    const { status } = req.body;
    const bookingId = req.params.id;
    
    console.log('🔄 Updating booking status:', bookingId, 'to:', status, 'by user:', req.user.userId);
    
    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
      console.log('❌ Invalid booking ID format:', bookingId);
      return res.status(400).json({ error: 'Invalid booking ID format' });
    }
    
    const booking = await Booking.findById(bookingId);
    
    if (!booking) {
      console.log('❌ Booking not found:', bookingId);
      return res.status(404).json({ error: 'Booking not found' });
    }
    
    // Authorization: allow either booking owner OR charger host (with restrictions)
    console.log('🔍 Checking ownership:');
    console.log('  - Booking user_id:', booking.user_id.toString());
    console.log('  - Current user_id:', req.user.userId);
    console.log('  - Types:', typeof booking.user_id.toString(), 'vs', typeof req.user.userId);

    const isBookingOwner = booking.user_id.toString() === req.user.userId;
    let isChargerHost = false;
    let charger = null;
    
    if (!isBookingOwner) {
      // Fetch charger to check host ownership
      try {
        charger = await Charger.findById(booking.charger_id);
        if (charger) {
          console.log('  - Charger host_id:', charger.host_id.toString());
          isChargerHost = charger.host_id.toString() === req.user.userId;
        } else {
          console.log('  - Charger not found for booking.charger_id:', booking.charger_id?.toString?.());
        }
      } catch (e) {
        console.log('  - Error loading charger for host check:', e.message);
      }
    }

    if (!isBookingOwner && !isChargerHost) {
      console.log('❌ Unauthorized: user is neither booking owner nor charger host');
      return res.status(403).json({ error: 'Not authorized to update this booking' });
    }

    // If user is charger host but not booking owner, restrict allowed transitions
    if (isChargerHost && !isBookingOwner) {
      if (status !== 'cancelled') {
        console.log('❌ Host permission denied: hosts can only cancel bookings on their chargers');
        return res.status(403).json({ error: 'Hosts can only cancel bookings on their chargers' });
      }
    }
    
    console.log('✅ Current booking status:', booking.status, 'updating to:', status);
    booking.status = status;
    await booking.save();
    
    // Real-time update: notify about booking status change
    const bookingUpdateData = {
      type: 'booking-updated',
      booking: booking,
      previous_status: booking.status,
      new_status: status,
      user_id: booking.user_id,
      charger_id: booking.charger_id
    };
    
    // Emit to the booking owner for immediate UI update
    io.to(`user-${booking.user_id}`).emit('booking-list-changed', bookingUpdateData);
    
    // Also emit to charger host if it's a charger booking
    if (booking.charger_id && charger && charger.host_id) {
      io.to(`host-${charger.host_id}`).emit('booking-list-changed', bookingUpdateData);
    }
    
    console.log('📡 Real-time booking status update broadcasted:', bookingUpdateData);
    
    console.log('✅ Booking updated successfully');
    res.json(booking);
  } catch (error) {
    console.error('❌ Update booking status error:', error);
    res.status(500).json({ error: 'Failed to update booking status' });
  }
});

// ============================================
// PAYMENT ROUTES (Razorpay Integration)
// ============================================
const paymentService = require('./razorpayService');

// Create payment order
app.post('/api/payments/create-order', authenticateToken, async (req, res) => {
  try {
    const { amount, booking_id, charger_id } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    // Create receipt object with booking details
    const receipt = {
      booking_id: booking_id || 'no_booking',
      charger_id: charger_id || 'no_charger',
      user_id: req.user.userId,
      timestamp: new Date().toISOString(),
    };

    // Create Razorpay order
  console.log('💳 Create-order request:', { amount, booking_id, charger_id, user: req.user?.userId });
  const order = await paymentService.createOrder(amount, 'INR', receipt);

    console.log('✅ Payment order created:', order.id, 'Amount:', amount);
    
    res.json({
      success: true,
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      key_id: process.env.RAZORPAY_KEY_ID, // Send to frontend for checkout
    });
  } catch (error) {
    const reason = error?.message || 'Failed to create payment order';
    console.error('❌ Create payment order error:', reason);
    res.status(500).json({ error: reason });
  }
});

// Verify payment
app.post('/api/payments/verify', authenticateToken, async (req, res) => {
  try {
    const { order_id, payment_id, signature, booking_id } = req.body;

    if (!order_id || !payment_id || !signature) {
      return res.status(400).json({ error: 'Missing payment verification data' });
    }

    // Verify payment signature
    const isValid = paymentService.verifyPaymentSignature(order_id, payment_id, signature);

    if (!isValid) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid payment signature' 
      });
    }

    // Get payment details from Razorpay
    const paymentDetails = await paymentService.getPaymentDetails(payment_id);

    // Update booking status if booking_id provided
    if (booking_id) {
      const booking = await Booking.findById(booking_id);
      if (booking) {
        booking.payment_status = 'paid';
        booking.payment_id = payment_id;
        booking.razorpay_order_id = order_id;
        booking.status = 'confirmed';
        await booking.save();

        console.log('✅ Booking payment updated:', booking_id);

        // Emit real-time update
        io.to(`user-${req.user.userId}`).emit('payment-success', {
          booking_id: booking._id,
          payment_id: payment_id,
          status: 'paid',
        });
      }
    }

    console.log('✅ Payment verified successfully:', payment_id);
    
    res.json({
      success: true,
      payment_id: payment_id,
      order_id: order_id,
      payment_details: paymentDetails,
    });
  } catch (error) {
    console.error('❌ Payment verification error:', error);
    res.status(500).json({ error: 'Failed to verify payment' });
  }
});

// Get payment details
app.get('/api/payments/:paymentId', authenticateToken, async (req, res) => {
  try {
    const { paymentId } = req.params;
    const payment = await paymentService.getPaymentDetails(paymentId);
    
    res.json({
      success: true,
      payment: payment,
    });
  } catch (error) {
    console.error('❌ Get payment details error:', error);
    res.status(500).json({ error: 'Failed to fetch payment details' });
  }
});

// Initiate refund
app.post('/api/payments/refund', authenticateToken, async (req, res) => {
  try {
    const { payment_id, amount, booking_id } = req.body;

    if (!payment_id) {
      return res.status(400).json({ error: 'Payment ID required' });
    }

    // Initiate refund
    const refund = await paymentService.initiateRefund(payment_id, amount);

    // Update booking if booking_id provided
    if (booking_id) {
      const booking = await Booking.findById(booking_id);
      if (booking) {
        booking.payment_status = 'refunded';
        booking.refund_id = refund.id;
        booking.status = 'cancelled';
        await booking.save();

        console.log('✅ Booking refund processed:', booking_id);

        // Emit real-time update
        io.to(`user-${req.user.userId}`).emit('refund-processed', {
          booking_id: booking._id,
          refund_id: refund.id,
          amount: refund.amount / 100,
        });
      }
    }

    console.log('✅ Refund initiated:', refund.id);
    
    res.json({
      success: true,
      refund: refund,
    });
  } catch (error) {
    console.error('❌ Refund error:', error);
    res.status(500).json({ error: 'Failed to process refund' });
  }
});

// Razorpay webhook endpoint
app.post('/api/payments/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const signature = req.headers['x-razorpay-signature'];

    // Verify webhook signature if secret is configured
    if (webhookSecret) {
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(JSON.stringify(req.body))
        .digest('hex');

      if (signature !== expectedSignature) {
        return res.status(400).json({ error: 'Invalid webhook signature' });
      }
    }

    const event = req.body.event;
    const payload = req.body.payload;

    console.log('📥 Razorpay Webhook received:', event);

    // Handle different webhook events
    switch (event) {
      case 'payment.captured':
        console.log('✅ Payment captured:', payload.payment.entity.id);
        // Handle payment capture
        break;
      
      case 'payment.failed':
        console.log('❌ Payment failed:', payload.payment.entity.id);
        // Handle payment failure
        break;
      
      case 'refund.processed':
        console.log('💰 Refund processed:', payload.refund.entity.id);
        // Handle refund
        break;
      
      default:
        console.log('ℹ️ Unhandled webhook event:', event);
    }

    res.json({ status: 'ok' });
  } catch (error) {
    console.error('❌ Webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// ============================================
// EMERGENCY RESCUE ROUTES (Portable Charger Service)
// ============================================

// Create a new rescue request (for stranded EV)
app.post('/api/rescue-requests', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const {
      location_name,
      coordinates,
      vehicle_details,
      battery_level,
      notes
    } = req.body;

    // Validate required fields
    if (!location_name || !coordinates || !coordinates.lat || !coordinates.lng) {
      return res.status(400).json({ error: 'Location and coordinates are required' });
    }

    // Get user details
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if user already has a pending rescue request
    const existingRequest = await RescueRequest.findOne({
      requester_id: userId,
      status: { $in: ['pending', 'accepted', 'in-progress'] }
    });

    if (existingRequest) {
      return res.status(400).json({ 
        error: 'You already have an active rescue request',
        request: existingRequest
      });
    }

    // Create rescue request
    const rescueRequest = new RescueRequest({
      requester_id: userId,
      requester_name: user.name,
      requester_phone: user.phone,
      requester_type: user.user_type,
      location_name,
      coordinates,
      vehicle_details,
      battery_level,
      notes,
      status: 'pending'
    });

    await rescueRequest.save();

    console.log('🚨 Emergency rescue request created:', rescueRequest._id, 'by', user.name);

    // Broadcast to all nearby hosts via Socket.io
    io.emit('new-rescue-request', {
      type: 'new-rescue-request',
      request: rescueRequest
    });

    res.status(201).json({
      success: true,
      message: 'Rescue request sent to nearby hosts',
      request: rescueRequest
    });
  } catch (error) {
    console.error('❌ Create rescue request error:', error);
    res.status(500).json({ error: 'Failed to create rescue request' });
  }
});

// Get all pending rescue requests (for hosts to view)
app.get('/api/rescue-requests/pending', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    // Get pending requests that haven't been rejected by this user
    const requests = await RescueRequest.find({
      status: 'pending',
      rejected_by: { $ne: userId },
      requester_id: { $ne: userId } // Don't show own requests
    }).sort({ created_at: -1 });

    res.json({ requests });
  } catch (error) {
    console.error('❌ Get pending rescue requests error:', error);
    res.status(500).json({ error: 'Failed to get rescue requests' });
  }
});

// Get user's own rescue requests
app.get('/api/rescue-requests/my-requests', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    const requests = await RescueRequest.find({ requester_id: userId })
      .sort({ created_at: -1 });

    res.json({ requests });
  } catch (error) {
    console.error('❌ Get my rescue requests error:', error);
    res.status(500).json({ error: 'Failed to get your rescue requests' });
  }
});

// Get rescue requests accepted by this host
app.get('/api/rescue-requests/accepted', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    const requests = await RescueRequest.find({ 
      accepted_by: userId,
      status: { $in: ['accepted', 'in-progress'] }
    }).sort({ accepted_at: -1 });

    res.json({ requests });
  } catch (error) {
    console.error('❌ Get accepted rescue requests error:', error);
    res.status(500).json({ error: 'Failed to get accepted rescue requests' });
  }
});

// Accept a rescue request (host accepts to help)
app.post('/api/rescue-requests/:id/accept', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;
    const { price, estimated_time } = req.body;

    if (!price || price <= 0) {
      return res.status(400).json({ error: 'Valid price is required' });
    }

    // Get user details
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.user_type !== 'host') {
      return res.status(403).json({ error: 'Only hosts can accept rescue requests' });
    }

    // Find the rescue request
    const request = await RescueRequest.findById(id);
    if (!request) {
      return res.status(404).json({ error: 'Rescue request not found' });
    }

    // Check if already accepted by someone
    if (request.status !== 'pending') {
      return res.status(400).json({ 
        error: 'This rescue request has already been accepted by another host'
      });
    }

    // Update rescue request
    request.status = 'accepted';
    request.accepted_by = userId;
    request.accepted_by_name = user.name;
    request.accepted_by_phone = user.phone;
    request.accepted_at = new Date();
    request.price = price;
    request.estimated_time = estimated_time || 30;

    await request.save();

    console.log('✅ Rescue request accepted:', id, 'by host:', user.name);

    // Notify the requester via Socket.io (broadcast to all + specific user room)
    io.emit('rescue-request-accepted', {
      type: 'rescue-request-accepted',
      request: request,
      request_id: request._id
    });

    // Also emit to the specific requester's room
    io.to(`user-${request.requester_id}`).emit('rescue-request-accepted', {
      type: 'rescue-request-accepted',
      request: request,
      request_id: request._id
    });

    res.json({
      success: true,
      message: 'Rescue request accepted successfully',
      request: request
    });
  } catch (error) {
    console.error('❌ Accept rescue request error:', error);
    res.status(500).json({ error: 'Failed to accept rescue request' });
  }
});

// Reject a rescue request (host declines)
app.post('/api/rescue-requests/:id/reject', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    const request = await RescueRequest.findById(id);
    if (!request) {
      return res.status(404).json({ error: 'Rescue request not found' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ error: 'Can only reject pending requests' });
    }

    // Add user to rejected_by list
    if (!request.rejected_by.includes(userId)) {
      request.rejected_by.push(userId);
      await request.save();
    }

    console.log('❌ Rescue request rejected:', id, 'by user:', userId);

    res.json({
      success: true,
      message: 'Rescue request rejected'
    });
  } catch (error) {
    console.error('❌ Reject rescue request error:', error);
    res.status(500).json({ error: 'Failed to reject rescue request' });
  }
});

// Start rescue (host is on the way)
app.post('/api/rescue-requests/:id/start', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    const request = await RescueRequest.findById(id);
    if (!request) {
      return res.status(404).json({ error: 'Rescue request not found' });
    }

    if (request.accepted_by.toString() !== userId) {
      return res.status(403).json({ error: 'You did not accept this rescue request' });
    }

    if (request.status !== 'accepted') {
      return res.status(400).json({ error: 'Request must be in accepted state' });
    }

    request.status = 'in-progress';
    await request.save();

    // Notify requester (broadcast + specific user)
    io.emit('rescue-in-progress', {
      type: 'rescue-in-progress',
      request: request,
      request_id: request._id
    });
    
    io.to(`user-${request.requester_id}`).emit('rescue-in-progress', {
      type: 'rescue-in-progress',
      request: request,
      request_id: request._id
    });

    res.json({
      success: true,
      message: 'Rescue started',
      request: request
    });
  } catch (error) {
    console.error('❌ Start rescue error:', error);
    res.status(500).json({ error: 'Failed to start rescue' });
  }
});

// Complete rescue request
app.post('/api/rescue-requests/:id/complete', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    const request = await RescueRequest.findById(id);
    if (!request) {
      return res.status(404).json({ error: 'Rescue request not found' });
    }

    if (request.accepted_by.toString() !== userId) {
      return res.status(403).json({ error: 'You did not accept this rescue request' });
    }

    if (request.status !== 'in-progress') {
      return res.status(400).json({ error: 'Request must be in progress' });
    }

    request.status = 'completed';
    request.completed_at = new Date();
    await request.save();

    console.log('✅ Rescue completed:', id);

    // Notify requester (broadcast + specific user)
    io.emit('rescue-completed', {
      type: 'rescue-completed',
      request: request,
      request_id: request._id
    });
    
    io.to(`user-${request.requester_id}`).emit('rescue-completed', {
      type: 'rescue-completed',
      request: request,
      request_id: request._id
    });

    res.json({
      success: true,
      message: 'Rescue completed successfully',
      request: request
    });
  } catch (error) {
    console.error('❌ Complete rescue error:', error);
    res.status(500).json({ error: 'Failed to complete rescue' });
  }
});

// Cancel rescue request (by requester)
app.post('/api/rescue-requests/:id/cancel', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    const request = await RescueRequest.findById(id);
    if (!request) {
      return res.status(404).json({ error: 'Rescue request not found' });
    }

    if (request.requester_id.toString() !== userId) {
      return res.status(403).json({ error: 'You can only cancel your own rescue requests' });
    }

    if (request.status === 'completed' || request.status === 'cancelled') {
      return res.status(400).json({ error: 'Cannot cancel completed or already cancelled request' });
    }

    request.status = 'cancelled';
    request.cancelled_at = new Date();
    await request.save();

    // Notify host if accepted (broadcast + specific host)
    if (request.accepted_by) {
      io.emit('rescue-cancelled', {
        type: 'rescue-cancelled',
        request: request,
        request_id: request._id
      });
      
      io.to(`user-${request.accepted_by}`).emit('rescue-cancelled', {
        type: 'rescue-cancelled',
        request: request,
        request_id: request._id
      });
    }

    res.json({
      success: true,
      message: 'Rescue request cancelled',
      request: request
    });
  } catch (error) {
    console.error('❌ Cancel rescue request error:', error);
    res.status(500).json({ error: 'Failed to cancel rescue request' });
  }
});

// ============================================
// Initialize with sample data
// ============================================
app.post('/api/init-sample-data', async (req, res) => {
  try {
    // Check if chargers already exist
    const existingChargers = await Charger.countDocuments();
    if (existingChargers > 0) {
      return res.json({ message: 'Sample data already exists' });
    }

    // Create a sample host user if doesn't exist
    let hostUser = await User.findOne({ email: 'host@example.com' });
    if (!hostUser) {
      const hashedPassword = await bcrypt.hash('password123', 10);
      hostUser = new User({
        email: 'host@example.com',
        password: hashedPassword,
        name: 'Sample Host',
        phone: '+91-9876543210',
        user_type: 'host',
        has_ev: false
      });
      await hostUser.save();
    }

    // Create sample chargers
    const sampleChargers = [
      {
        host_id: hostUser._id,
        name: 'EcoCharge Station - Phoenix Mall',
        location: 'Phoenix Mall, Kurla West',
        plug_type: 'Type 2',
        power: 22,
        price: 8.5,
        available: true,
        rating: 4.8,
        reviews: 156,
        features: ['Fast Charging', 'Covered Parking', 'WiFi', 'Cafe Nearby'],
        green_energy: true
      },
      {
        host_id: hostUser._id,
        name: 'GreenPower Hub - Bandra',
        location: 'Bandra West, Near Station',
        plug_type: 'CCS',
        power: 50,
        price: 12.0,
        available: false,
        rating: 4.6,
        reviews: 89,
        features: ['Ultra Fast', 'Security Guard', '24/7', 'Restaurant'],
        green_energy: false
      },
      {
        host_id: hostUser._id,
        name: 'Solar Charge Point - Andheri',
        location: 'Andheri East, IT Park',
        plug_type: 'Type 2',
        power: 11,
        price: 6.5,
        available: true,
        rating: 4.9,
        reviews: 203,
        features: ['Solar Powered', 'Green Energy', 'Parking', 'Mall Access'],
        green_energy: true
      },
      {
        host_id: hostUser._id,
        name: 'QuickCharge - Marine Drive',
        location: 'Marine Drive, South Mumbai',
        plug_type: 'CHAdeMO',
        power: 40,
        price: 15.0,
        available: true,
        rating: 4.4,
        reviews: 67,
        features: ['Sea View', 'Premium Location', 'Valet Parking'],
        green_energy: false
      },
      {
        host_id: hostUser._id,
        name: 'Community Charger - Powai',
        location: 'Powai Lake, Residential Complex',
        plug_type: 'Type 2',
        power: 7.4,
        price: 5.0,
        available: true,
        rating: 4.7,
        reviews: 124,
        features: ['Community Access', 'Lake View', 'Garden'],
        green_energy: true
      }
    ];

    await Charger.insertMany(sampleChargers);

    res.json({ message: 'Sample data initialized successfully' });
  } catch (error) {
    console.error('Init sample data error:', error);
    res.status(500).json({ error: 'Failed to initialize sample data' });
  }
});

// Enhanced Analytics and Monitoring Routes

// Session Analytics Routes
app.post('/api/analytics/session', authenticateToken, async (req, res) => {
  try {
    const sessionData = {
      ...req.body,
      user_id: req.user.userId
    };
    
    const sessionAnalytics = new SessionAnalytics(sessionData);
    await sessionAnalytics.save();
    
    res.status(201).json(sessionAnalytics);
  } catch (error) {
    console.error('Create session analytics error:', error);
    res.status(500).json({ error: 'Failed to create session analytics' });
  }
});

app.get('/api/analytics/session/:bookingId', authenticateToken, async (req, res) => {
  try {
    const sessionAnalytics = await SessionAnalytics.findOne({ 
      booking_id: req.params.bookingId,
      user_id: req.user.userId 
    }).populate('booking_id charger_id');
    
    if (!sessionAnalytics) {
      return res.status(404).json({ error: 'Session analytics not found' });
    }
    
    res.json(sessionAnalytics);
  } catch (error) {
    console.error('Get session analytics error:', error);
    res.status(500).json({ error: 'Failed to get session analytics' });
  }
});

// User Activity Logging
app.post('/api/analytics/track-activity', authenticateToken, async (req, res) => {
  try {
    const activityData = {
      ...req.body,
      user_id: req.user.userId,
      device_info: {
        ...req.body.device_info,
        user_agent: req.headers['user-agent']
      },
      location_data: {
        ...req.body.location_data,
        ip_address: req.ip || req.connection.remoteAddress
      }
    };
    
    const userActivity = new UserActivityLog(activityData);
    await userActivity.save();
    
    res.status(201).json({ message: 'Activity tracked successfully' });
  } catch (error) {
    console.error('Track activity error:', error);
    res.status(500).json({ error: 'Failed to track activity' });
  }
});

app.get('/api/analytics/user-activity', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate, activityType, limit = 50 } = req.query;
    
    let query = { user_id: req.user.userId };
    
    if (startDate && endDate) {
      query.created_at = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    
    if (activityType) {
      query.activity_type = activityType;
    }
    
    const activities = await UserActivityLog.find(query)
      .sort({ created_at: -1 })
      .limit(parseInt(limit));
    
    res.json(activities);
  } catch (error) {
    console.error('Get user activity error:', error);
    res.status(500).json({ error: 'Failed to get user activity' });
  }
});

// System Performance Monitoring
app.post('/api/analytics/system-performance', async (req, res) => {
  try {
    const performanceData = {
      ...req.body,
      ip_address: req.ip || req.connection.remoteAddress,
      user_agent: req.headers['user-agent']
    };
    
    const systemPerformance = new SystemPerformance(performanceData);
    await systemPerformance.save();
    
    res.status(201).json({ message: 'Performance data recorded' });
  } catch (error) {
    console.error('Record performance error:', error);
    res.status(500).json({ error: 'Failed to record performance data' });
  }
});

app.get('/api/analytics/system-performance', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate, endpoint, statusCode, limit = 100 } = req.query;
    
    let query = {};
    
    if (startDate && endDate) {
      query.created_at = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    
    if (endpoint) {
      query.endpoint = endpoint;
    }
    
    if (statusCode) {
      query.status_code = parseInt(statusCode);
    }
    
    const performanceData = await SystemPerformance.find(query)
      .sort({ created_at: -1 })
      .limit(parseInt(limit));
    
    // Calculate aggregated metrics
    const avgResponseTime = await SystemPerformance.aggregate([
      { $match: query },
      { $group: { _id: null, avgResponseTime: { $avg: '$response_time' } } }
    ]);
    
    const errorRate = await SystemPerformance.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalRequests: { $sum: 1 },
          errorRequests: {
            $sum: {
              $cond: [{ $gte: ['$status_code', 400] }, 1, 0]
            }
          }
        }
      },
      {
        $project: {
          errorRate: {
            $multiply: [
              { $divide: ['$errorRequests', '$totalRequests'] },
              100
            ]
          }
        }
      }
    ]);
    
    res.json({
      data: performanceData,
      metrics: {
        averageResponseTime: avgResponseTime[0]?.avgResponseTime || 0,
        errorRate: errorRate[0]?.errorRate || 0
      }
    });
  } catch (error) {
    console.error('Get system performance error:', error);
    res.status(500).json({ error: 'Failed to get system performance data' });
  }
});

// Business Metrics and Reports
app.get('/api/analytics/business-metrics', authenticateToken, async (req, res) => {
  try {
    const { period = 'daily', startDate, endDate } = req.query;
    
    let query = { period_type: period };
    
    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    } else {
      // Default to last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      query.date = { $gte: thirtyDaysAgo };
    }
    
    const businessMetrics = await BusinessMetrics.find(query)
      .sort({ date: -1 });
    
    res.json(businessMetrics);
  } catch (error) {
    console.error('Get business metrics error:', error);
    res.status(500).json({ error: 'Failed to get business metrics' });
  }
});

app.post('/api/analytics/business-metrics', async (req, res) => {
  try {
    const metricsData = req.body;
    
    // Check if metrics for this date and period already exist
    const existingMetrics = await BusinessMetrics.findOne({
      date: metricsData.date,
      period_type: metricsData.period_type
    });
    
    if (existingMetrics) {
      // Update existing metrics
      Object.assign(existingMetrics, metricsData);
      await existingMetrics.save();
      res.json(existingMetrics);
    } else {
      // Create new metrics
      const businessMetrics = new BusinessMetrics(metricsData);
      await businessMetrics.save();
      res.status(201).json(businessMetrics);
    }
  } catch (error) {
    console.error('Create/update business metrics error:', error);
    res.status(500).json({ error: 'Failed to create/update business metrics' });
  }
});

// Dashboard Analytics Summary
app.get('/api/analytics/dashboard-summary', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const user = await User.findById(userId);
    
    if (user.user_type === 'host') {
      // Host analytics summary
      const hostChargers = await Charger.find({ host_id: userId });
      const chargerIds = hostChargers.map(c => c._id);
      
      const totalBookings = await Booking.countDocuments({ charger_id: { $in: chargerIds } });
      const activeBookings = await Booking.countDocuments({ 
        charger_id: { $in: chargerIds }, 
        status: 'active' 
      });
      
      const totalRevenue = await Booking.aggregate([
        { $match: { charger_id: { $in: chargerIds }, status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$total_cost' } } }
      ]);
      
      const avgUtilization = await SessionAnalytics.aggregate([
        { $match: { charger_id: { $in: chargerIds } } },
        { $group: { _id: null, avgEfficiency: { $avg: '$charging_efficiency' } } }
      ]);
      
      res.json({
        userType: 'host',
        summary: {
          totalChargers: hostChargers.length,
          activeChargers: hostChargers.filter(c => c.available).length,
          totalBookings,
          activeBookings,
          totalRevenue: totalRevenue[0]?.total || 0,
          averageUtilization: avgUtilization[0]?.avgEfficiency || 0
        }
      });
    } else {
      // Driver analytics summary
      const userBookings = await Booking.find({ user_id: userId });
      const completedBookings = userBookings.filter(b => b.status === 'completed');
      
      const totalEnergyConsumed = await SessionAnalytics.aggregate([
        { $match: { user_id: new mongoose.Types.ObjectId(userId) } },
        { $group: { _id: null, total: { $sum: '$energy_delivered' } } }
      ]);
      
      const totalCO2Saved = await SessionAnalytics.aggregate([
        { $match: { user_id: new mongoose.Types.ObjectId(userId) } },
        { $group: { _id: null, total: { $sum: '$environmental_impact.co2_saved' } } }
      ]);
      
      res.json({
        userType: 'driver',
        summary: {
          totalSessions: userBookings.length,
          completedSessions: completedBookings.length,
          totalEnergyConsumed: totalEnergyConsumed[0]?.total || 0,
          totalCO2Saved: totalCO2Saved[0]?.total || 0,
          carbonCredits: user.eco_miles || 0
        }
      });
    }
  } catch (error) {
    console.error('Get dashboard summary error:', error);
    res.status(500).json({ error: 'Failed to get dashboard summary' });
  }
});

// ============================================
// CARBON CREDIT TRADING ROUTES
// ============================================

// Add distance traveled and calculate carbon credits
// POST /api/carbon-credits/add-distance
app.post('/api/carbon-credits/add-distance', authenticateToken, async (req, res) => {
  try {
    const { distance_km } = req.body;
    
    if (!distance_km || distance_km <= 0) {
      return res.status(400).json({ error: 'Valid distance is required' });
    }
    
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Update distance traveled
    user.total_distance_km = (user.total_distance_km || 0) + distance_km;
    
    // Calculate carbon credits (100g CO2 per km = 0.1kg per km)
    // 1000kg CO2 = 1 credit, so 10,000 km = 1 credit
    const co2_saved_kg = user.total_distance_km * 0.1; // 100g per km
    const new_credits = Math.floor(co2_saved_kg / 1000); // 1 credit per 1000kg
    
    // Update credits (only if new credits earned)
    const credits_to_add = new_credits - user.carbon_credits_earned;
    if (credits_to_add > 0) {
      user.carbon_credits = (user.carbon_credits || 0) + credits_to_add;
      user.carbon_credits_earned = new_credits;
    }
    
    await user.save();
    
    console.log(`✅ Added ${distance_km}km for user ${user.name}. Total: ${user.total_distance_km}km, Credits: ${user.carbon_credits}`);
    
    res.json({
      success: true,
      total_distance_km: user.total_distance_km,
      co2_saved_kg: co2_saved_kg,
      carbon_credits: user.carbon_credits,
      carbon_credits_earned: user.carbon_credits_earned,
      credits_added: credits_to_add
    });
  } catch (error) {
    console.error('❌ Error adding distance:', error);
    res.status(500).json({ error: 'Failed to add distance' });
  }
});

// Get user's carbon credit stats
// GET /api/carbon-credits/stats
app.get('/api/carbon-credits/stats', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const co2_saved_kg = (user.total_distance_km || 0) * 0.1;
    
    res.json({
      total_distance_km: user.total_distance_km || 0,
      co2_saved_kg: co2_saved_kg,
      carbon_credits: user.carbon_credits || 0,
      carbon_credits_earned: user.carbon_credits_earned || 0,
      carbon_credits_sold: user.carbon_credits_sold || 0,
      carbon_earnings: user.carbon_earnings || 0
    });
  } catch (error) {
    console.error('❌ Error fetching carbon stats:', error);
    res.status(500).json({ error: 'Failed to fetch carbon stats' });
  }
});

// List carbon credits for sale
// POST /api/carbon-credits/list
app.post('/api/carbon-credits/list', authenticateToken, async (req, res) => {
  try {
    const { credits_amount, price_per_credit } = req.body;
    
    if (!credits_amount || credits_amount <= 0) {
      return res.status(400).json({ error: 'Valid credits amount is required' });
    }
    
    if (!price_per_credit || price_per_credit <= 0) {
      return res.status(400).json({ error: 'Valid price per credit is required' });
    }
    
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Check if user has enough credits
    if ((user.carbon_credits || 0) < credits_amount) {
      return res.status(400).json({ 
        error: 'Insufficient carbon credits',
        available: user.carbon_credits || 0,
        requested: credits_amount
      });
    }
    
    // Create listing
    const listing = new CarbonCreditListing({
      seller_id: user._id,
      seller_name: user.name,
      seller_phone: user.phone,
      credits_amount,
      price_per_credit,
      total_price: credits_amount * price_per_credit,
      status: 'active'
    });
    
    await listing.save();
    
    // Deduct credits from user (locked in listing)
    user.carbon_credits -= credits_amount;
    await user.save();
    
    console.log(`✅ User ${user.name} listed ${credits_amount} credits at ₹${price_per_credit}/credit`);
    
    // Emit WebSocket event for real-time marketplace update
    io.emit('new-credit-listing', {
      listing_id: listing._id,
      seller_name: listing.seller_name,
      credits_amount: listing.credits_amount,
      price_per_credit: listing.price_per_credit,
      total_price: listing.total_price
    });
    
    res.json({
      success: true,
      listing,
      remaining_credits: user.carbon_credits
    });
  } catch (error) {
    console.error('❌ Error creating credit listing:', error);
    res.status(500).json({ error: 'Failed to create listing' });
  }
});

// Get marketplace listings (active listings from other users)
// GET /api/carbon-credits/marketplace
app.get('/api/carbon-credits/marketplace', authenticateToken, async (req, res) => {
  try {
    // Get all active listings except user's own
    const listings = await CarbonCreditListing.find({
      status: 'active',
      seller_id: { $ne: req.user.userId } // Exclude own listings
    }).sort({ createdAt: -1 }).limit(50);
    
    res.json({ listings });
  } catch (error) {
    console.error('❌ Error fetching marketplace:', error);
    res.status(500).json({ error: 'Failed to fetch marketplace' });
  }
});

// Get user's own listings
// GET /api/carbon-credits/my-listings
app.get('/api/carbon-credits/my-listings', authenticateToken, async (req, res) => {
  try {
    const listings = await CarbonCreditListing.find({
      seller_id: req.user.userId
    }).sort({ createdAt: -1 });
    
    res.json({ listings });
  } catch (error) {
    console.error('❌ Error fetching user listings:', error);
    res.status(500).json({ error: 'Failed to fetch listings' });
  }
});

// Cancel a listing
// POST /api/carbon-credits/cancel/:listingId
app.post('/api/carbon-credits/cancel/:listingId', authenticateToken, async (req, res) => {
  try {
    const listing = await CarbonCreditListing.findById(req.params.listingId);
    
    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }
    
    if (listing.seller_id.toString() !== req.user.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    if (listing.status !== 'active') {
      return res.status(400).json({ error: 'Listing is not active' });
    }
    
    // Return credits to seller
    const seller = await User.findById(listing.seller_id);
    seller.carbon_credits += listing.credits_amount;
    await seller.save();
    
    // Update listing
    listing.status = 'cancelled';
    listing.cancelled_at = new Date();
    await listing.save();
    
    console.log(`✅ Listing ${listing._id} cancelled, ${listing.credits_amount} credits returned to ${seller.name}`);
    
    // Emit WebSocket event
    io.emit('credit-listing-cancelled', { listing_id: listing._id });
    
    res.json({
      success: true,
      message: 'Listing cancelled and credits returned',
      returned_credits: listing.credits_amount
    });
  } catch (error) {
    console.error('❌ Error cancelling listing:', error);
    res.status(500).json({ error: 'Failed to cancel listing' });
  }
});

// Buy carbon credits
// POST /api/carbon-credits/buy/:listingId
app.post('/api/carbon-credits/buy/:listingId', authenticateToken, async (req, res) => {
  try {
    const listing = await CarbonCreditListing.findById(req.params.listingId);
    
    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }
    
    if (listing.status !== 'active') {
      return res.status(400).json({ error: 'Listing is not available' });
    }
    
    if (listing.seller_id.toString() === req.user.userId) {
      return res.status(400).json({ error: 'Cannot buy your own listing' });
    }
    
    const buyer = await User.findById(req.user.userId);
    const seller = await User.findById(listing.seller_id);
    
    if (!buyer || !seller) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // In a real app, you'd integrate Razorpay payment here
    // For now, we'll assume payment is successful
    
    // Transfer credits to buyer
    buyer.carbon_credits = (buyer.carbon_credits || 0) + listing.credits_amount;
    await buyer.save();
    
    // Update seller earnings
    seller.carbon_credits_sold = (seller.carbon_credits_sold || 0) + listing.credits_amount;
    seller.carbon_earnings = (seller.carbon_earnings || 0) + listing.total_price;
    await seller.save();
    
    // Update listing
    listing.status = 'sold';
    listing.buyer_id = buyer._id;
    listing.buyer_name = buyer.name;
    listing.sold_at = new Date();
    listing.payment_status = 'completed';
    await listing.save();
    
    console.log(`✅ ${buyer.name} bought ${listing.credits_amount} credits from ${seller.name} for ₹${listing.total_price}`);
    
    // Emit WebSocket events
    io.emit('credit-listing-sold', { listing_id: listing._id });
    io.to(`user-${seller._id}`).emit('credits-sold', {
      credits_amount: listing.credits_amount,
      total_price: listing.total_price,
      buyer_name: buyer.name
    });
    io.to(`user-${buyer._id}`).emit('credits-purchased', {
      credits_amount: listing.credits_amount,
      total_price: listing.total_price,
      seller_name: seller.name
    });
    
    res.json({
      success: true,
      message: 'Purchase successful',
      credits_purchased: listing.credits_amount,
      amount_paid: listing.total_price,
      new_credit_balance: buyer.carbon_credits
    });
  } catch (error) {
    console.error('❌ Error buying credits:', error);
    res.status(500).json({ error: 'Failed to purchase credits' });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// WebSocket connection handling
io.on('connection', (socket) => {
  console.log('🔌 Client connected:', socket.id);
  
  // Join charger updates room for real-time notifications
  socket.join('charger-updates');
  
  socket.on('disconnect', () => {
    console.log('🔌 Client disconnected:', socket.id);
  });
  
  // Handle host joining their charger management room
  socket.on('join-host-room', (hostId) => {
    socket.join(`host-${hostId}`);
    console.log(`🏠 Host ${hostId} joined their management room`);
  });
  
  // Handle users joining their personal booking room
  socket.on('join-user-room', (userId) => {
    socket.join(`user-${userId}`);
    console.log(`👤 User ${userId} joined their personal room`);
  });
  
  // Handle drivers joining location-based rooms
  socket.on('join-location-room', (location) => {
    socket.join(`location-${location}`);
    console.log(`📍 Client joined location room: ${location}`);
  });
});

// Start periodic session cleanup (every hour)
setInterval(cleanupExpiredSessions, 60 * 60 * 1000);

// Initial cleanup on startup
cleanupExpiredSessions();

server.listen(PORT, () => {
  console.log(`🚀 ChargeNet Backend Server running on port ${PORT}`);
  console.log(`📊 API endpoints available at http://localhost:${PORT}/api/`);
  console.log(`🔐 Session-based authentication enabled (no localStorage)`);
  console.log(`🔌 WebSocket server enabled for real-time updates`);
});
