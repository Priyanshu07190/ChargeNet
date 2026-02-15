# ChargeNet - Design Document

## Project Overview

**Project Name:** ChargeNet - Smart EV Charging Platform

**Version:** 1.0.0

**Date:** February 15, 2026

**Team:** ChargeNet Development Team

---

## Table of Contents

1. [System Architecture](#1-system-architecture)
2. [Technology Stack](#2-technology-stack)
3. [Database Design](#3-database-design)
4. [API Design](#4-api-design)
5. [Frontend Architecture](#5-frontend-architecture)
6. [Real-time Communication](#6-real-time-communication)
7. [Security Design](#7-security-design)
8. [UI/UX Design](#8-uiux-design)
9. [Payment Integration](#9-payment-integration)
10. [Deployment Architecture](#10-deployment-architecture)

---

## 1. System Architecture

### 1.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Web App    │  │  Mobile Web  │  │   Tablet     │      │
│  │  (React)     │  │  (Responsive)│  │  (Adaptive)  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ HTTPS / WebSocket
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                     APPLICATION LAYER                        │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Express.js Backend Server               │   │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐    │   │
│  │  │    REST    │  │  WebSocket │  │   Auth     │    │   │
│  │  │    API     │  │  (Socket.io)│  │   (JWT)    │    │   │
│  │  └────────────┘  └────────────┘  └────────────┘    │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      DATA LAYER                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   MongoDB    │  │   Razorpay   │  │  Google Maps │      │
│  │    Atlas     │  │   Payment    │  │     API      │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 Component Architecture

**Frontend Components:**
- React 18.3.1 with TypeScript
- Vite for build tooling
- React Router for navigation
- Context API for state management
- TailwindCSS for styling
- Socket.io client for real-time updates

**Backend Components:**
- Node.js runtime
- Express.js web framework
- Mongoose ODM for MongoDB
- Socket.io server for WebSocket
- JWT for authentication
- Razorpay SDK for payments

**Data Storage:**
- MongoDB Atlas (Cloud Database)
- Collections: Users, Chargers, Bookings, RescueRequests, CarbonCreditListings

---

## 2. Technology Stack

### 2.1 Frontend Technologies


| Technology | Version | Purpose |
|------------|---------|---------|
| React | 18.3.1 | UI library for building component-based interface |
| TypeScript | 5.5.3 | Type safety and better developer experience |
| Vite | 5.4.2 | Fast build tool and dev server |
| React Router | 7.7.1 | Client-side routing and navigation |
| TailwindCSS | 3.4.1 | Utility-first CSS framework |
| Socket.io Client | 4.8.1 | Real-time bidirectional communication |
| Axios | 1.12.2 | HTTP client for API requests |
| Lucide React | 0.344.0 | Icon library |

### 2.2 Backend Technologies

| Technology | Version | Purpose |
|------------|---------|---------|
| Node.js | 22.x | JavaScript runtime environment |
| Express | 4.18.2 | Web application framework |
| MongoDB | 7.x | NoSQL database |
| Mongoose | 7.5.0 | MongoDB object modeling |
| Socket.io | 4.8.1 | WebSocket server for real-time features |
| JWT | 9.0.2 | Token-based authentication |
| bcryptjs | 2.4.3 | Password hashing |
| Razorpay | 2.9.6 | Payment gateway integration |
| CORS | 2.8.5 | Cross-origin resource sharing |

### 2.3 Development Tools

| Tool | Purpose |
|------|---------|
| ESLint | Code linting and quality |
| Vitest | Frontend unit testing |
| Jest | Backend unit testing |
| Git | Version control |
| Postman | API testing |

---

## 3. Database Design

### 3.1 Database Schema

#### 3.1.1 User Collection

```javascript
{
  _id: ObjectId,                    // Primary key
  email: String,                    // Unique, required
  password: String,                 // Hashed with bcrypt
  name: String,                     // Required
  phone: String,                    // Required
  user_type: String,                // 'driver' | 'host' | 'passenger'
  has_ev: Boolean,                  // Whether user owns EV
  vehicle_type: String,             // e.g., "Tesla Model 3"
  vehicle_model: String,            // Vehicle model details
  total_distance_km: Number,        // Total distance traveled
  carbon_credits: Number,           // Available credits
  carbon_credits_earned: Number,    // Total credits earned
  carbon_credits_sold: Number,      // Total credits sold
  carbon_earnings: Number,          // Earnings from credit sales
  created_at: Date,                 // Account creation timestamp
  updated_at: Date                  // Last update timestamp
}
```

**Indexes:**
- `email`: Unique index for fast lookup
- `user_type`: Index for filtering by role
- `created_at`: Index for sorting

#### 3.1.2 Charger Collection

```javascript
{
  _id: ObjectId,                    // Primary key
  host_id: ObjectId,                // Reference to User collection
  name: String,                     // Charger name/title
  location: String,                 // Address string
  coordinates: {
    lat: Number,                    // Latitude
    lng: Number                     // Longitude
  },
  plug_type: String,                // e.g., "Type 2", "CCS", "CHAdeMO"
  power: Number,                    // Power rating in kW
  price: Number,                    // Price per hour in ₹
  available: Boolean,               // Current availability status
  green_energy: Boolean,            // Uses renewable energy
  host_name: String,                // Host's name
  host_phone: String,               // Host's contact
  amenities: [String],              // e.g., ["WiFi", "Restroom"]
  rating: Number,                   // Average rating (0-5)
  total_bookings: Number,           // Total bookings count
  created_at: Date,                 // Listing creation timestamp
  updated_at: Date                  // Last update timestamp
}
```

**Indexes:**
- `host_id`: Index for host's chargers
- `available`: Index for filtering available chargers
- `coordinates`: Geospatial index for location-based queries
- `plug_type`: Index for filtering by plug type

#### 3.1.3 Booking Collection

```javascript
{
  _id: ObjectId,                    // Primary key
  driver_id: ObjectId,              // Reference to User
  charger_id: ObjectId,             // Reference to Charger
  host_id: ObjectId,                // Reference to User (host)
  start_time: Date,                 // Booking start time
  end_time: Date,                   // Booking end time
  duration: Number,                 // Duration in minutes
  total_price: Number,              // Total booking cost
  status: String,                   // 'pending' | 'confirmed' | 'in-progress' | 'completed' | 'cancelled'
  vehicle_details: String,          // Vehicle information
  payment_id: String,               // Razorpay payment ID
  payment_status: String,           // 'pending' | 'completed' | 'refunded'
  cancellation_reason: String,      // If cancelled
  rating: Number,                   // Driver's rating (0-5)
  review: String,                   // Driver's review
  created_at: Date,                 // Booking creation timestamp
  updated_at: Date                  // Last update timestamp
}
```

**Indexes:**
- `driver_id`: Index for driver's bookings
- `host_id`: Index for host's bookings
- `charger_id`: Index for charger's bookings
- `status`: Index for filtering by status
- `start_time`: Index for time-based queries

#### 3.1.4 RescueRequest Collection

```javascript
{
  _id: ObjectId,                    // Primary key
  requester_id: ObjectId,           // Reference to User (driver)
  requester_name: String,           // Driver's name
  requester_phone: String,          // Driver's contact
  location_name: String,            // Location description
  coordinates: {
    lat: Number,                    // Latitude
    lng: Number                     // Longitude
  },
  vehicle_details: String,          // Vehicle information
  battery_level: String,            // Current battery percentage
  status: String,                   // 'pending' | 'accepted' | 'in-progress' | 'completed' | 'cancelled'
  accepted_by: ObjectId,            // Reference to User (host)
  host_name: String,                // Host's name
  host_phone: String,               // Host's contact
  price: Number,                    // Fixed at 500
  estimated_time: Number,           // ETA in minutes
  actual_time: Number,              // Actual time taken
  payment_id: String,               // Razorpay payment ID
  payment_status: String,           // 'pending' | 'completed'
  cancellation_reason: String,      // If cancelled
  rating: Number,                   // Driver's rating (0-5)
  created_at: Date,                 // Request creation timestamp
  updated_at: Date,                 // Last update timestamp
  completed_at: Date                // Completion timestamp
}
```

**Indexes:**
- `requester_id`: Index for user's requests
- `accepted_by`: Index for host's accepted requests
- `status`: Index for filtering by status
- `coordinates`: Geospatial index for location-based queries
- `created_at`: Index for sorting

#### 3.1.5 CarbonCreditListing Collection

```javascript
{
  _id: ObjectId,                    // Primary key
  seller_id: ObjectId,              // Reference to User
  seller_name: String,              // Seller's name
  credits_amount: Number,           // Number of credits for sale
  price_per_credit: Number,         // Price per credit in ₹
  total_price: Number,              // Total listing price
  status: String,                   // 'active' | 'sold' | 'cancelled'
  buyer_id: ObjectId,               // Reference to User (if sold)
  buyer_name: String,               // Buyer's name (if sold)
  payment_id: String,               // Razorpay payment ID
  payment_status: String,           // 'pending' | 'completed'
  created_at: Date,                 // Listing creation timestamp
  sold_at: Date,                    // Sale timestamp
  cancelled_at: Date                // Cancellation timestamp
}
```

**Indexes:**
- `seller_id`: Index for seller's listings
- `buyer_id`: Index for buyer's purchases
- `status`: Index for filtering active listings
- `created_at`: Index for sorting

### 3.2 Data Relationships

```
User (Driver) ──┬─── 1:N ──→ Booking
                ├─── 1:N ──→ RescueRequest (as requester)
                └─── 1:N ──→ CarbonCreditListing (as seller/buyer)

User (Host) ───┬─── 1:N ──→ Charger
               ├─── 1:N ──→ Booking (through chargers)
               └─── 1:N ──→ RescueRequest (as responder)

Charger ───────── 1:N ──→ Booking
```

### 3.3 Data Validation Rules

**User:**
- Email must be unique and valid format
- Password minimum 6 characters
- Phone must be 10 digits
- User type must be one of: driver, host, passenger

**Charger:**
- Host must exist and be of type 'host'
- Coordinates must be valid lat/lng
- Power must be positive number
- Price must be positive number

**Booking:**
- Driver and charger must exist
- Start time must be in future
- Duration must be positive
- Total price must match calculation

**RescueRequest:**
- Requester must exist
- Price fixed at 500
- Coordinates must be valid

**CarbonCreditListing:**
- Seller must have sufficient credits
- Credits amount must be positive
- Price per credit must be positive

---

## 4. API Design

### 4.1 API Architecture

**Base URL:** `http://localhost:5000/api` (Development)
**Production URL:** `https://chargenet-backend.onrender.com/api`

**Authentication:** JWT token in Authorization header
```
Authorization: Bearer <token>
```

### 4.2 API Endpoints

#### 4.2.1 Authentication APIs


**POST /api/auth/register**
- Description: Register new user
- Request Body:
  ```json
  {
    "email": "user@example.com",
    "password": "password123",
    "name": "John Doe",
    "phone": "9876543210",
    "user_type": "driver",
    "has_ev": true,
    "vehicle_type": "Tesla Model 3"
  }
  ```
- Response: `{ success: true, user: {...}, token: "jwt_token" }`

**POST /api/auth/login**
- Description: User login
- Request Body: `{ "email": "user@example.com", "password": "password123" }`
- Response: `{ success: true, user: {...}, token: "jwt_token" }`

**GET /api/auth/session**
- Description: Get current user session
- Headers: `Authorization: Bearer <token>`
- Response: `{ success: true, user: {...} }`

**POST /api/auth/logout**
- Description: Logout user
- Response: `{ success: true, message: "Logged out successfully" }`

#### 4.2.2 Charger APIs

**GET /api/chargers**
- Description: Get all chargers
- Query Params: `?plug_type=Type2&available=true`
- Response: `{ success: true, chargers: [...] }`

**POST /api/chargers**
- Description: Create new charger (Host only)
- Request Body:
  ```json
  {
    "name": "Home Charger",
    "location": "123 Main St",
    "coordinates": { "lat": 28.6139, "lng": 77.2090 },
    "plug_type": "Type 2",
    "power": 7.4,
    "price": 50,
    "green_energy": true
  }
  ```
- Response: `{ success: true, charger: {...} }`

**GET /api/chargers/:id**
- Description: Get charger details
- Response: `{ success: true, charger: {...} }`

**PUT /api/chargers/:id**
- Description: Update charger (Host only)
- Request Body: `{ "price": 60, "available": false }`
- Response: `{ success: true, charger: {...} }`

**DELETE /api/chargers/:id**
- Description: Delete charger (Host only)
- Response: `{ success: true, message: "Charger deleted" }`

#### 4.2.3 Booking APIs

**POST /api/bookings**
- Description: Create booking
- Request Body:
  ```json
  {
    "charger_id": "65abc123...",
    "start_time": "2026-02-20T10:00:00Z",
    "duration": 60,
    "vehicle_details": "Tesla Model 3"
  }
  ```
- Response: `{ success: true, booking: {...}, order: {...} }`

**GET /api/bookings/driver**
- Description: Get driver's bookings
- Response: `{ success: true, bookings: [...] }`

**GET /api/bookings/host**
- Description: Get host's bookings
- Response: `{ success: true, bookings: [...] }`

**PUT /api/bookings/:id/status**
- Description: Update booking status
- Request Body: `{ "status": "confirmed" }`
- Response: `{ success: true, booking: {...} }`


#### 4.2.4 Emergency Rescue APIs

**POST /api/rescue-requests**
- Description: Create SOS rescue request
- Request Body:
  ```json
  {
    "location_name": "Highway NH-8, Near Exit 12",
    "coordinates": { "lat": 28.5355, "lng": 77.3910 },
    "vehicle_details": "Tesla Model 3, White",
    "battery_level": "5%"
  }
  ```
- Response: `{ success: true, request: {...} }`

**GET /api/rescue-requests**
- Description: Get all rescue requests (Host view)
- Response: `{ success: true, requests: [...] }`

**GET /api/rescue-requests/user**
- Description: Get user's rescue requests
- Response: `{ success: true, requests: [...] }`

**POST /api/rescue-requests/:id/accept**
- Description: Accept rescue request (Host)
- Request Body: `{ "estimated_time": 30 }`
- Response: `{ success: true, request: {...} }`

**POST /api/rescue-requests/:id/start**
- Description: Start rescue operation
- Response: `{ success: true, request: {...} }`

**POST /api/rescue-requests/:id/complete**
- Description: Complete rescue
- Response: `{ success: true, request: {...}, order: {...} }`

**POST /api/rescue-requests/:id/cancel**
- Description: Cancel rescue request
- Request Body: `{ "reason": "Found alternative solution" }`
- Response: `{ success: true, request: {...} }`

#### 4.2.5 Carbon Credit APIs

**POST /api/carbon-credits/add-distance**
- Description: Add distance traveled
- Request Body: `{ "distance_km": 150 }`
- Response: `{ success: true, stats: {...} }`

**GET /api/carbon-credits/stats**
- Description: Get user's carbon credit statistics
- Response:
  ```json
  {
    "success": true,
    "stats": {
      "total_distance_km": 50000,
      "total_co2_saved_kg": 5000,
      "carbon_credits": 5,
      "carbon_credits_earned": 10,
      "carbon_credits_sold": 5,
      "carbon_earnings": 2500
    }
  }
  ```

**POST /api/carbon-credits/list**
- Description: List credits for sale
- Request Body:
  ```json
  {
    "credits_amount": 2,
    "price_per_credit": 500
  }
  ```
- Response: `{ success: true, listing: {...} }`

**GET /api/carbon-credits/marketplace**
- Description: View marketplace listings
- Response: `{ success: true, listings: [...] }`

**GET /api/carbon-credits/my-listings**
- Description: Get user's listings
- Response: `{ success: true, listings: [...] }`

**POST /api/carbon-credits/buy/:id**
- Description: Purchase carbon credits
- Response: `{ success: true, listing: {...}, order: {...} }`

**POST /api/carbon-credits/cancel/:id**
- Description: Cancel listing
- Response: `{ success: true, listing: {...} }`

#### 4.2.6 Payment APIs

**POST /api/payment/create-order**
- Description: Create Razorpay order
- Request Body:
  ```json
  {
    "amount": 500,
    "currency": "INR",
    "receipt": "booking_123"
  }
  ```
- Response: `{ success: true, order: {...} }`

**POST /api/payment/verify**
- Description: Verify payment signature
- Request Body:
  ```json
  {
    "razorpay_order_id": "order_xxx",
    "razorpay_payment_id": "pay_xxx",
    "razorpay_signature": "signature_xxx"
  }
  ```
- Response: `{ success: true, verified: true }`

### 4.3 Error Handling

**Standard Error Response:**
```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

**HTTP Status Codes:**
- 200: Success
- 201: Created
- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 500: Internal Server Error

---

## 5. Frontend Architecture

### 5.1 Component Structure

```
src/
├── components/              # Reusable UI components
│   ├── ChargerCard.tsx     # Display charger information
│   ├── EmergencyRescue.tsx # SOS request component
│   ├── HostRescueRequests.tsx # Host rescue management
│   ├── MapView.tsx         # Interactive map
│   ├── Navbar.tsx          # Navigation bar
│   ├── PaymentComponent.tsx # Razorpay integration
│   ├── TripPlanner.tsx     # Route planning
│   ├── UrgentBooking.tsx   # Quick booking
│   └── VoiceAssistant.tsx  # Voice commands
│
├── pages/                   # Page components
│   ├── Dashboard.tsx       # Driver dashboard
│   ├── HostDashboard.tsx   # Host dashboard
│   ├── ChargerMap.tsx      # Charger discovery
│   ├── Login.tsx           # Login page
│   ├── Register.tsx        # Registration page
│   ├── Profile.tsx         # User profile
│   └── Booking.tsx         # Booking management
│
├── contexts/                # React Context
│   ├── AuthContext.tsx     # Authentication state
│   └── ChargerContext.tsx  # Charger data state
│
├── lib/                     # Utility libraries
│   ├── apiService.ts       # API calls
│   ├── auth.ts             # Auth helpers
│   ├── socketService.ts    # WebSocket client
│   ├── paymentService.ts   # Razorpay integration
│   └── mapService.ts       # Map utilities
│
├── types/                   # TypeScript types
│   └── index.ts            # Global type definitions
│
└── styles/                  # CSS styles
    ├── animations.css      # Animations
    └── map.css             # Map styles
```


### 5.2 State Management

**AuthContext:**
- Manages user authentication state
- Provides login, logout, register functions
- Stores current user information
- Handles token management

**ChargerContext:**
- Manages charger data
- Provides CRUD operations for chargers
- Handles charger filtering and search
- Manages booking state

### 5.3 Routing Structure

```typescript
/                          → Landing page / Dashboard
/login                     → Login page
/register                  → Registration page
/dashboard                 → Driver dashboard
/host-dashboard            → Host dashboard
/chargers                  → Charger map view
/bookings                  → Booking management
/profile                   → User profile
/emergency                 → Emergency rescue
/carbon-trading            → Carbon credit marketplace
```

### 5.4 Component Design Patterns

**Container/Presentational Pattern:**
- Container components handle logic and state
- Presentational components handle UI rendering

**Custom Hooks:**
- `useAuth()`: Authentication operations
- `useChargers()`: Charger data management
- `useSocket()`: WebSocket connection
- `usePayment()`: Payment processing

**Error Boundaries:**
- Catch and handle component errors
- Display fallback UI
- Log errors for debugging

---

## 6. Real-time Communication

### 6.1 WebSocket Architecture

**Socket.io Implementation:**

**Server-side (backend/server.js):**
```javascript
const io = require('socket.io')(server, {
  cors: {
    origin: process.env.FRONTEND_URL,
    credentials: true
  }
});

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  // Join user-specific room
  socket.on('join-user-room', (userId) => {
    socket.join(`user-${userId}`);
  });
  
  // Join host-specific room
  socket.on('join-host-room', (hostId) => {
    socket.join(`host-${hostId}`);
  });
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});
```

**Client-side (src/lib/socketService.ts):**
```typescript
import io from 'socket.io-client';

const socket = io(API_URL, {
  withCredentials: true,
  transports: ['websocket', 'polling']
});

export const joinUserRoom = (userId: string) => {
  socket.emit('join-user-room', userId);
};

export const onNewBooking = (callback: (data: any) => void) => {
  socket.on('new-booking', callback);
};
```

### 6.2 Real-time Events

**Booking Events:**
- `new-booking`: New booking created
- `booking-updated`: Booking status changed
- `booking-cancelled`: Booking cancelled

**Rescue Events:**
- `new-rescue-request`: New SOS request
- `rescue-request-accepted`: Host accepted request
- `rescue-in-progress`: Rescue started
- `rescue-completed`: Rescue completed

**Carbon Credit Events:**
- `new-credit-listing`: New listing created
- `credit-listing-sold`: Listing sold
- `credit-listing-cancelled`: Listing cancelled

### 6.3 Room-based Broadcasting

**User Rooms:**
- `user-{userId}`: Personal notifications
- `host-{hostId}`: Host-specific notifications
- `location-{lat}-{lng}`: Location-based notifications

**Broadcasting Strategy:**
```javascript
// Notify specific user
io.to(`user-${userId}`).emit('booking-updated', data);

// Notify all hosts in area
io.to(`location-${lat}-${lng}`).emit('new-rescue-request', data);

// Broadcast to all connected clients
io.emit('new-credit-listing', data);
```

---

## 7. Security Design

### 7.1 Authentication Flow

```
1. User submits login credentials
   ↓
2. Backend validates credentials
   ↓
3. Backend generates JWT token
   ↓
4. Token sent to client
   ↓
5. Client stores token in memory
   ↓
6. Client includes token in API requests
   ↓
7. Backend validates token on each request
```

### 7.2 Password Security

**Hashing Strategy:**
```javascript
const bcrypt = require('bcryptjs');

// Hash password during registration
const salt = await bcrypt.genSalt(10);
const hashedPassword = await bcrypt.hash(password, salt);

// Verify password during login
const isMatch = await bcrypt.compare(password, user.password);
```

### 7.3 JWT Token Structure

```javascript
{
  payload: {
    userId: "65abc123...",
    email: "user@example.com",
    user_type: "driver"
  },
  expiresIn: "24h"
}
```

### 7.4 API Security Measures

**CORS Configuration:**
```javascript
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true
}));
```

**Input Validation:**
- Validate all user inputs
- Sanitize data before database operations
- Use Mongoose schema validation

**Rate Limiting:**
- Limit API requests per IP
- Prevent brute force attacks
- Throttle expensive operations

**SQL Injection Prevention:**
- Use Mongoose ODM
- Parameterized queries
- Input sanitization

**XSS Prevention:**
- Escape user-generated content
- Content Security Policy headers
- Sanitize HTML inputs

---

## 8. UI/UX Design

### 8.1 Design Principles

**Simplicity:**
- Clean, uncluttered interface
- Intuitive navigation
- Minimal learning curve

**Consistency:**
- Uniform color scheme
- Consistent component styling
- Predictable interactions

**Responsiveness:**
- Mobile-first design
- Adaptive layouts
- Touch-friendly controls

**Accessibility:**
- WCAG 2.1 AA compliance
- Keyboard navigation
- Screen reader support
- High contrast mode

### 8.2 Color Palette

```css
/* Primary Colors */
--primary-green: #10b981;      /* Main brand color */
--primary-dark: #059669;       /* Hover states */
--primary-light: #d1fae5;      /* Backgrounds */

/* Secondary Colors */
--secondary-blue: #3b82f6;     /* Links, info */
--secondary-yellow: #fbbf24;   /* Warnings */
--secondary-red: #ef4444;      /* Errors, alerts */

/* Neutral Colors */
--gray-50: #f9fafb;            /* Light backgrounds */
--gray-100: #f3f4f6;           /* Borders */
--gray-900: #111827;           /* Text */

/* Status Colors */
--success: #10b981;            /* Success messages */
--warning: #f59e0b;            /* Warnings */
--error: #ef4444;              /* Errors */
--info: #3b82f6;               /* Information */
```

### 8.3 Typography

```css
/* Font Family */
font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;

/* Font Sizes */
--text-xs: 0.75rem;    /* 12px */
--text-sm: 0.875rem;   /* 14px */
--text-base: 1rem;     /* 16px */
--text-lg: 1.125rem;   /* 18px */
--text-xl: 1.25rem;    /* 20px */
--text-2xl: 1.5rem;    /* 24px */
--text-3xl: 1.875rem;  /* 30px */
--text-4xl: 2.25rem;   /* 36px */
```

### 8.4 Component Library

**Buttons:**
- Primary: Green background, white text
- Secondary: White background, green border
- Danger: Red background, white text
- Ghost: Transparent background, colored text

**Cards:**
- Elevated with shadow
- Rounded corners (8px)
- Padding: 16px-24px
- Hover effects

**Forms:**
- Clear labels
- Inline validation
- Error messages below fields
- Success indicators

**Modals:**
- Centered overlay
- Backdrop blur
- Close button
- Keyboard accessible


### 8.5 Responsive Breakpoints

```css
/* Mobile First Approach */
/* Mobile: 320px - 639px (default) */

/* Tablet: 640px and up */
@media (min-width: 640px) { ... }

/* Desktop: 1024px and up */
@media (min-width: 1024px) { ... }

/* Large Desktop: 1280px and up */
@media (min-width: 1280px) { ... }
```

### 8.6 User Flows

**Driver Registration Flow:**
```
Landing Page → Register → Select "Driver" → 
Enter Details → Select Vehicle → Submit → 
Auto-login → Dashboard
```

**Booking Flow:**
```
Dashboard → Find Chargers → View Map → 
Select Charger → View Details → Select Time → 
Book Now → Payment → Confirmation → Dashboard
```

**Emergency Rescue Flow:**
```
Dashboard → Emergency Button → Confirm Location → 
Enter Details → Submit Request → Wait for Host → 
Host Accepts → Track Status → Complete → Payment
```

**Carbon Trading Flow:**
```
Dashboard → Carbon Trading → Add Distance → 
View Credits → List for Sale → Set Price → 
Publish → Marketplace → Buyer Purchases → 
Receive Payment
```

---

## 9. Payment Integration

### 9.1 Razorpay Integration Architecture

**Payment Flow:**
```
1. User initiates payment (booking/rescue/credit purchase)
   ↓
2. Frontend calls backend API to create order
   ↓
3. Backend creates Razorpay order
   ↓
4. Backend returns order details to frontend
   ↓
5. Frontend opens Razorpay checkout
   ↓
6. User completes payment
   ↓
7. Razorpay returns payment details
   ↓
8. Frontend sends payment details to backend
   ↓
9. Backend verifies payment signature
   ↓
10. Backend updates database (booking/rescue/listing)
   ↓
11. Success response sent to frontend
```

### 9.2 Razorpay Configuration

**Backend Setup:**
```javascript
const Razorpay = require('razorpay');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

// Create order
const order = await razorpay.orders.create({
  amount: amount * 100, // Convert to paise
  currency: 'INR',
  receipt: `receipt_${Date.now()}`
});
```

**Frontend Integration:**
```typescript
const options = {
  key: import.meta.env.VITE_RAZORPAY_KEY_ID,
  amount: order.amount,
  currency: order.currency,
  name: 'ChargeNet',
  description: 'Charger Booking Payment',
  order_id: order.id,
  handler: async (response) => {
    // Verify payment
    await verifyPayment(response);
  },
  prefill: {
    name: user.name,
    email: user.email,
    contact: user.phone
  },
  theme: {
    color: '#10b981'
  }
};

const razorpay = new window.Razorpay(options);
razorpay.open();
```

### 9.3 Payment Verification

**Signature Verification:**
```javascript
const crypto = require('crypto');

const verifyPayment = (orderId, paymentId, signature) => {
  const text = orderId + '|' + paymentId;
  const generated_signature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(text)
    .digest('hex');
  
  return generated_signature === signature;
};
```

### 9.4 Test Cards

**Razorpay Test Mode:**
```
Card Number: 4111 1111 1111 1111
CVV: 123
Expiry: Any future date (e.g., 12/28)
Name: Any name

Success: Payment will succeed
Failure: Use card 4000 0000 0000 0002
```

### 9.5 Refund Processing

```javascript
const refund = await razorpay.payments.refund(paymentId, {
  amount: amount * 100, // Full or partial refund
  notes: {
    reason: 'Booking cancelled by user'
  }
});
```

---

## 10. Deployment Architecture

### 10.1 Deployment Overview

```
┌─────────────────────────────────────────────────────────┐
│                    PRODUCTION STACK                      │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Frontend (Vercel)                                       │
│  ├─ Static files served via CDN                         │
│  ├─ Automatic HTTPS                                     │
│  ├─ Global edge network                                 │
│  └─ Environment variables configured                    │
│                                                          │
│  Backend (Render)                                        │
│  ├─ Node.js server                                      │
│  ├─ Auto-deploy from GitHub                             │
│  ├─ Environment variables configured                    │
│  └─ Health check endpoint                               │
│                                                          │
│  Database (MongoDB Atlas)                                │
│  ├─ Cloud-hosted MongoDB                                │
│  ├─ Automatic backups                                   │
│  ├─ IP whitelist configured                             │
│  └─ Connection pooling                                  │
│                                                          │
│  Payment Gateway (Razorpay)                              │
│  ├─ Test mode for development                           │
│  ├─ Live mode for production                            │
│  └─ Webhook integration                                 │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### 10.2 Frontend Deployment (Vercel)

**Configuration:**
```json
{
  "framework": "vite",
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "installCommand": "npm install",
  "devCommand": "npm run dev"
}
```

**Environment Variables:**
```
VITE_API_URL=https://chargenet-backend.onrender.com/api
VITE_RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxx
```

**Build Settings:**
- Root Directory: `project`
- Node Version: 18.x
- Auto-deploy: Enabled on git push

### 10.3 Backend Deployment (Render)

**Configuration:**
```yaml
services:
  - type: web
    name: chargenet-backend
    env: node
    region: singapore
    plan: free
    buildCommand: npm install
    startCommand: node server.js
    envVars:
      - key: MONGODB_URI
        sync: false
      - key: JWT_SECRET
        sync: false
      - key: RAZORPAY_KEY_ID
        sync: false
      - key: RAZORPAY_KEY_SECRET
        sync: false
      - key: FRONTEND_URL
        sync: false
      - key: PORT
        value: 5000
      - key: NODE_ENV
        value: production
```

**Health Check:**
```javascript
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});
```

### 10.4 Database Configuration

**MongoDB Atlas Setup:**
- Cluster: M0 (Free tier)
- Region: Mumbai (ap-south-1)
- IP Whitelist: 0.0.0.0/0 (Allow all)
- Connection String: Stored in environment variables

**Connection Pooling:**
```javascript
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000
});
```

### 10.5 Environment Variables

**Development (.env):**
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb+srv://...
JWT_SECRET=dev_secret_key
RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=...
FRONTEND_URL=http://localhost:5173
```

**Production (Render/Vercel):**
```env
PORT=5000
NODE_ENV=production
MONGODB_URI=mongodb+srv://...
JWT_SECRET=production_secret_key
RAZORPAY_KEY_ID=rzp_live_...
RAZORPAY_KEY_SECRET=...
FRONTEND_URL=https://chargenet.vercel.app
```

### 10.6 CI/CD Pipeline

**Automatic Deployment:**
```
Git Push → GitHub → Vercel/Render → Build → Deploy → Live
```

**Deployment Triggers:**
- Push to main branch
- Pull request merge
- Manual deployment via dashboard

**Rollback Strategy:**
- Vercel: Instant rollback to previous deployment
- Render: Redeploy previous commit
- Database: Restore from backup

---

## 11. Performance Optimization

### 11.1 Frontend Optimization

**Code Splitting:**
```typescript
// Lazy load routes
const Dashboard = lazy(() => import('./pages/Dashboard'));
const HostDashboard = lazy(() => import('./pages/HostDashboard'));
```

**Image Optimization:**
- Use WebP format
- Lazy loading for images
- Responsive images with srcset

**Bundle Optimization:**
- Tree shaking
- Minification
- Compression (gzip/brotli)

### 11.2 Backend Optimization

**Database Indexing:**
```javascript
// Create indexes for frequently queried fields
userSchema.index({ email: 1 });
chargerSchema.index({ host_id: 1, available: 1 });
bookingSchema.index({ driver_id: 1, status: 1 });
```

**Caching Strategy:**
- Cache frequently accessed data
- Use Redis for session storage (future)
- Cache API responses

**Query Optimization:**
- Use projection to limit fields
- Populate only necessary references
- Implement pagination

### 11.3 Network Optimization

**API Response Compression:**
```javascript
const compression = require('compression');
app.use(compression());
```

**CDN Usage:**
- Serve static assets via CDN
- Cache static resources
- Reduce latency

---

## 12. Monitoring and Logging

### 12.1 Application Monitoring

**Metrics to Track:**
- Response times
- Error rates
- Active users
- Database queries
- Memory usage
- CPU usage

**Tools:**
- Render Dashboard: Server metrics
- Vercel Analytics: Frontend performance
- MongoDB Atlas: Database metrics

### 12.2 Error Logging

```javascript
// Log errors to console
console.error('Error:', error.message, error.stack);

// Future: Integrate with error tracking service
// - Sentry
// - LogRocket
// - Rollbar
```

### 12.3 Access Logging

```javascript
const morgan = require('morgan');
app.use(morgan('combined'));
```

---

## 13. Testing Strategy

### 13.1 Unit Testing

**Frontend (Vitest):**
```typescript
describe('ChargerCard', () => {
  it('renders charger information', () => {
    const charger = { name: 'Test Charger', price: 50 };
    render(<ChargerCard charger={charger} />);
    expect(screen.getByText('Test Charger')).toBeInTheDocument();
  });
});
```

**Backend (Jest):**
```javascript
describe('Auth API', () => {
  it('should register new user', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'test@test.com', password: '123456' });
    expect(res.status).toBe(201);
  });
});
```

### 13.2 Integration Testing

- Test API endpoints
- Test database operations
- Test payment integration
- Test WebSocket communication

### 13.3 End-to-End Testing

- Test complete user workflows
- Test across different browsers
- Test on mobile devices
- Test payment flows

---

## 14. Scalability Considerations

### 14.1 Horizontal Scaling

- Stateless backend design
- Load balancer support
- Multiple server instances
- Database replication

### 14.2 Vertical Scaling

- Upgrade server resources
- Increase database capacity
- Optimize queries
- Add caching layers

### 14.3 Future Scaling Plans

- Microservices architecture
- Message queue (RabbitMQ/Kafka)
- Redis caching
- CDN for static assets
- Database sharding

---

## 15. Conclusion

This design document outlines the complete architecture and implementation details of the ChargeNet platform. The system is built with modern technologies, follows best practices, and is designed for scalability, security, and performance.

**Key Highlights:**
- Full-stack TypeScript/JavaScript application
- Real-time features with WebSocket
- Secure payment integration
- Responsive and accessible UI
- Cloud-based deployment
- Comprehensive API design
- Scalable architecture

---

**Document Version:** 1.0.0
**Last Updated:** February 15, 2026
**Status:** Final

---

**End of Design Document**
