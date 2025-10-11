# ⚡ ChargeNet - Smart EV Charging Platform

<div align="center">

![ChargeNet Logo](https://img.shields.io/badge/ChargeNet-EV%20Charging-green?style=for-the-badge&logo=electric-vehicle)

**Revolutionizing Electric Vehicle Charging with Smart Technology & Carbon Trading**

[![React](https://img.shields.io/badge/React-18.3.1-blue?logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5.3-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-Latest-green?logo=node.js)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-green?logo=mongodb)](https://www.mongodb.com/)
[![Socket.io](https://img.shields.io/badge/Socket.io-4.8.1-black?logo=socket.io)](https://socket.io/)

[Features](#-features) • [Demo](#-demo) • [Installation](#-installation) • [Usage](#-usage) • [Tech Stack](#-tech-stack) • [Contributing](#-contributing)

</div>

---

## 📋 Table of Contents

- [About ChargeNet](#-about-chargenet)
- [Key Features](#-key-features)
- [Tech Stack](#-tech-stack)
- [Prerequisites](#-prerequisites)
- [Installation Guide](#-installation-guide)
- [Project Structure](#-project-structure)
- [Environment Setup](#-environment-setup)
- [Running the Application](#-running-the-application)
- [API Documentation](#-api-documentation)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🌟 About ChargeNet

ChargeNet is a **comprehensive EV charging platform** that connects electric vehicle drivers with charging station hosts. Built for the modern electric vehicle ecosystem, ChargeNet offers real-time booking, emergency rescue services, carbon credit trading, and a seamless payment experience.

### 🎯 Problem Statement

- **Limited Charging Infrastructure**: EV drivers struggle to find available charging stations
- **Emergency Situations**: Stranded EVs with no immediate help
- **Environmental Impact**: No way to monetize the environmental benefits of using green energy
- **Host Challenges**: Charger owners can't easily share their infrastructure

### 💡 Our Solution

ChargeNet provides:
- 🗺️ **Real-time Charger Discovery** with interactive maps
- 🆘 **Emergency Rescue System** for stranded EVs (₹500 fixed price)
- 🌱 **Carbon Credit Trading** marketplace (100g CO₂ saved per km = credits)
- 💰 **Seamless Payments** via Razorpay integration
- ⚡ **Live Updates** using WebSocket technology
- 📊 **Analytics Dashboard** for both drivers and hosts

---

## ✨ Key Features

### For Drivers 🚗

| Feature | Description |
|---------|-------------|
| **Smart Charger Search** | Find nearby charging stations with real-time availability |
| **Instant Booking** | Book chargers with flexible time slots |
| **Emergency SOS** | Get portable charging help when stranded (₹500 fixed) |
| **Carbon Credits** | Earn credits for every km traveled (100g CO₂/km) |
| **Trip Planner** | Plan routes with charging stops |
| **Payment Integration** | Secure payments via Razorpay |

### For Hosts 🏠

| Feature | Description |
|---------|-------------|
| **List Chargers** | Add your charging stations to the platform |
| **Manage Bookings** | Accept/reject booking requests in real-time |
| **Emergency Response** | Offer portable charging services |
| **Carbon Trading** | Earn from green energy contributions |
| **Analytics** | Track earnings, bookings, and performance |
| **Host Dashboard** | Comprehensive management interface |

### Carbon Trading System 🌱

- **Calculation**: 1 km = 100g CO₂ saved → 10,000 km = 1 Carbon Credit
- **Marketplace**: List credits for sale at your price
- **Trading**: Buy/sell credits with instant payments
- **Milestones**: Unlock gifts at 1k, 2k, 3k, 4k, 5k credits
- **Real-time Updates**: Live marketplace via WebSocket

---

## 🛠️ Tech Stack

### Frontend
```
React 18.3.1          → UI Library
TypeScript 5.5.3      → Type Safety
Vite 5.4.2           → Build Tool
React Router 7.7.1    → Routing
TailwindCSS 3.4.1    → Styling
Socket.io Client     → Real-time Updates
Lucide React         → Icons
```

### Backend
```
Node.js              → Runtime
Express 4.18.2       → Web Framework
MongoDB Atlas        → Database
Mongoose 7.5.0       → ODM
Socket.io 4.8.1      → WebSocket Server
JWT                  → Authentication
Razorpay 2.9.6       → Payments
bcryptjs             → Password Hashing
```

### Testing & Tools
```
Vitest               → Unit Testing
Jest                 → Backend Testing
ESLint               → Code Linting
```

---

## 📦 Prerequisites

Before you begin, ensure you have the following installed:

| Software | Version | Download Link | Check Command |
|----------|---------|---------------|---------------|
| **Node.js** | 16.x or higher | [nodejs.org](https://nodejs.org/) | `node --version` |
| **npm** | 8.x or higher | (comes with Node.js) | `npm --version` |
| **MongoDB** | 4.x or higher | [mongodb.com](https://www.mongodb.com/) | `mongod --version` |
| **Git** | Latest | [git-scm.com](https://git-scm.com/) | `git --version` |

### Additional Requirements

- 🌐 **MongoDB Atlas Account** (Free tier available)
- 💳 **Razorpay Account** (Test mode for development)
- 🗺️ **Google Maps API Key** (Optional for maps)

---

## 🚀 Installation Guide

### Step 1: Clone the Repository

```bash
# Clone the repository
git clone https://github.com/Priyanshu07190/ChargeNet.git

# Navigate to project directory
cd ChargeNet/project
```

### Step 2: Install Frontend Dependencies

```bash
# Install frontend dependencies
npm install
```

Expected output:
```
added 234 packages in 45s
✓ Dependencies installed successfully
```

### Step 3: Install Backend Dependencies

```bash
# Navigate to backend directory
cd backend

# Install backend dependencies
npm install
```

Expected output:
```
added 156 packages in 32s
✓ Backend dependencies installed
```

---

## ⚙️ Environment Setup

### Backend Environment Variables

Create a `.env` file in the `backend/` directory:

```bash
cd backend
touch .env  # On Windows: type nul > .env
```

Add the following configuration:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# MongoDB Configuration
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/chargenet?retryWrites=true&w=majority

# JWT Secret (Generate a random string)
JWT_SECRET=your_super_secret_jwt_key_here_change_this_in_production

# Razorpay Configuration
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=your_razorpay_secret_here

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:5173
```

### 📝 How to Get Credentials

#### MongoDB Atlas Setup

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free account
3. Create a new cluster (Free M0 tier)
4. Click "Connect" → "Connect your application"
5. Copy the connection string
6. Replace `<username>` and `<password>` with your database credentials

#### Razorpay Setup

1. Visit [Razorpay Dashboard](https://dashboard.razorpay.com/)
2. Sign up for a free account
3. Go to Settings → API Keys
4. Generate Test Keys (Key ID and Secret)
5. Copy both keys to your `.env` file

#### JWT Secret Generation

```bash
# Generate a random JWT secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

## 📁 Project Structure

```
ChargeNet/
├── project/                          # Main Frontend Application
│   ├── src/
│   │   ├── components/              # Reusable React Components
│   │   │   ├── ChargerCard.tsx      # Charger display card
│   │   │   ├── EmergencyRescue.tsx  # SOS component (driver view)
│   │   │   ├── HostRescueRequests.tsx # Rescue requests (host view)
│   │   │   ├── MapView.tsx          # Interactive charger map
│   │   │   ├── Navbar.tsx           # Navigation bar
│   │   │   ├── PaymentComponent.tsx # Razorpay integration
│   │   │   ├── TripPlanner.tsx      # Route planning
│   │   │   ├── UrgentBooking.tsx    # Quick booking
│   │   │   └── VoiceAssistant.tsx   # Voice commands
│   │   │
│   │   ├── pages/                   # Main Application Pages
│   │   │   ├── Dashboard.tsx        # Driver dashboard
│   │   │   ├── HostDashboard.tsx    # Host management dashboard
│   │   │   ├── ChargerMap.tsx       # Charger discovery map
│   │   │   ├── Login.tsx            # User authentication
│   │   │   ├── Register.tsx         # User registration
│   │   │   ├── Profile.tsx          # User profile
│   │   │   └── Booking.tsx          # Booking management
│   │   │
│   │   ├── contexts/                # React Context Providers
│   │   │   ├── AuthContext.tsx      # Authentication state
│   │   │   └── ChargerContext.tsx   # Charger data state
│   │   │
│   │   ├── lib/                     # Utility Libraries
│   │   │   ├── apiService.ts        # API calls
│   │   │   ├── auth.ts              # Auth helpers
│   │   │   ├── socketService.ts     # WebSocket client
│   │   │   ├── paymentService.ts    # Razorpay integration
│   │   │   └── mapService.ts        # Map utilities
│   │   │
│   │   ├── types/                   # TypeScript Definitions
│   │   │   └── index.ts             # Global types
│   │   │
│   │   ├── styles/                  # CSS Styles
│   │   │   ├── animations.css       # Animations
│   │   │   └── map.css              # Map styles
│   │   │
│   │   ├── App.tsx                  # Main App component
│   │   ├── main.tsx                 # App entry point
│   │   └── index.css                # Global styles
│   │
│   ├── backend/                     # Backend API Server
│   │   ├── server.js                # Main server file (2500+ lines)
│   │   │   ├── MongoDB Schemas      # User, Charger, Booking, RescueRequest, CarbonCreditListing
│   │   │   ├── Authentication APIs  # Login, Register, Session management
│   │   │   ├── Charger APIs         # CRUD operations for chargers
│   │   │   ├── Booking APIs         # Booking management
│   │   │   ├── Payment APIs         # Razorpay integration
│   │   │   ├── Emergency APIs       # SOS rescue system
│   │   │   ├── Carbon Trading APIs  # Credit marketplace
│   │   │   └── WebSocket Handlers   # Real-time updates
│   │   │
│   │   ├── .env                     # Environment variables (create this!)
│   │   ├── package.json             # Backend dependencies
│   │   └── test/                    # Backend tests
│   │
│   ├── public/                      # Static Assets
│   ├── package.json                 # Frontend dependencies
│   ├── tsconfig.json                # TypeScript config
│   ├── vite.config.ts               # Vite configuration
│   ├── tailwind.config.js           # Tailwind CSS config
│   └── postcss.config.js            # PostCSS config
│
└── README.md                        # This file!
```

---

## 🏃 Running the Application

### Option 1: Run Both Servers Separately (Recommended)

#### Terminal 1 - Backend Server

```bash
# Navigate to backend directory
cd backend

# Start the backend server
npm start
```

✅ **Expected Output:**
```
🚀 ChargeNet Backend Server running on port 5000
📊 API endpoints available at http://localhost:5000/api/
✅ Connected to MongoDB Atlas
🔐 Session-based authentication enabled
🔌 WebSocket server enabled for real-time updates
```

#### Terminal 2 - Frontend Development Server

```bash
# Navigate to project root (if in backend, go back)
cd ..

# Start the frontend dev server
npm run dev
```

✅ **Expected Output:**
```
  VITE v5.4.2  ready in 1234 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
  ➜  press h to show help
```

### Option 2: Using npm-run-all (Concurrent)

```bash
# Install npm-run-all globally
npm install -g npm-run-all

# Run both servers concurrently
npm-run-all --parallel dev backend
```

---

## 🌐 Accessing the Application

Once both servers are running:

| Service | URL | Description |
|---------|-----|-------------|
| **Frontend** | http://localhost:5173 | Main application UI |
| **Backend API** | http://localhost:5000 | REST API server |
| **API Health** | http://localhost:5000/api/health | Server status |

### 🧪 Test Accounts

For testing, you can create accounts or use these test credentials:

```
Driver Account:
Email: driver@test.com
Password: password123

Host Account:
Email: host@test.com
Password: password123
```

---

## 🔌 API Documentation

### Authentication Endpoints

```http
POST   /api/auth/register          # Register new user
POST   /api/auth/login             # User login
GET    /api/auth/session           # Get current session
POST   /api/auth/logout            # User logout
POST   /api/auth/forgot-password   # Password reset
```

### Charger Endpoints

```http
GET    /api/chargers               # Get all chargers
POST   /api/chargers               # Create new charger (Host)
GET    /api/chargers/:id           # Get charger details
PUT    /api/chargers/:id           # Update charger (Host)
DELETE /api/chargers/:id           # Delete charger (Host)
GET    /api/host/chargers          # Get host's chargers
```

### Booking Endpoints

```http
POST   /api/bookings               # Create booking
GET    /api/bookings/driver        # Get driver's bookings
GET    /api/bookings/host          # Get host's bookings
PUT    /api/bookings/:id/status    # Update booking status
POST   /api/bookings/:id/cancel    # Cancel booking
```

### Emergency Rescue Endpoints

```http
POST   /api/rescue-requests        # Create SOS request
GET    /api/rescue-requests        # Get all requests (Host)
GET    /api/rescue-requests/user   # Get user's requests
POST   /api/rescue-requests/:id/accept    # Accept rescue (Host)
POST   /api/rescue-requests/:id/start     # Start rescue
POST   /api/rescue-requests/:id/complete  # Complete rescue
POST   /api/rescue-requests/:id/cancel    # Cancel rescue
```

### Carbon Credit Endpoints

```http
POST   /api/carbon-credits/add-distance   # Add distance traveled
GET    /api/carbon-credits/stats          # Get user's stats
POST   /api/carbon-credits/list           # List credits for sale
GET    /api/carbon-credits/marketplace    # View marketplace
GET    /api/carbon-credits/my-listings    # Get user's listings
POST   /api/carbon-credits/buy/:id        # Buy credits
POST   /api/carbon-credits/cancel/:id     # Cancel listing
```

### Payment Endpoints

```http
POST   /api/payment/create-order   # Create Razorpay order
POST   /api/payment/verify         # Verify payment
```

### WebSocket Events

```javascript
// Client → Server
socket.emit('join-user-room', userId)
socket.emit('join-host-room', hostId)
socket.emit('join-location-room', location)

// Server → Client
socket.on('new-rescue-request', data)
socket.on('rescue-request-accepted', data)
socket.on('rescue-in-progress', data)
socket.on('rescue-completed', data)
socket.on('new-credit-listing', data)
socket.on('credit-listing-sold', data)
socket.on('booking-created', data)
socket.on('booking-updated', data)
```

---

## 🎨 Key Features Walkthrough

### 1️⃣ Driver Registration & Login

```typescript
// Navigate to http://localhost:5173/register
1. Select "Driver" user type
2. Fill in details (name, email, phone, password)
3. Select vehicle type and model
4. Register → Auto-login → Redirect to Dashboard
```

### 2️⃣ Finding & Booking Chargers

```typescript
// Dashboard → Find Chargers
1. View interactive map with all available chargers
2. Filter by plug type, power, price
3. Click on charger marker → View details
4. Select time slot → Book Now
5. Complete payment via Razorpay
6. Receive real-time booking confirmation
```

### 3️⃣ Emergency SOS System

```typescript
// Dashboard → Emergency Rescue
1. Click "Request Emergency Help"
2. System captures your current location
3. Enter vehicle details and battery level
4. Request sent to all nearby hosts
5. Fixed price: ₹500 (no negotiation)
6. Host accepts → See ETA and host details
7. Track rescue status: Accepted → In Progress → Completed
8. Real-time updates via WebSocket
```

### 4️⃣ Carbon Credit Trading

```typescript
// Dashboard → Carbon Trading
1. View your credits: 100g CO₂ saved per km
2. 10,000 km traveled = 1 Carbon Credit
3. Click "List for Trading" button
4. Enter amount and price per credit
5. Listed on marketplace for all users
6. Buyers can purchase instantly
7. Track earnings in real-time
```

### 5️⃣ Host Features

```typescript
// Host Dashboard
1. Add Chargers: Location, plug type, power, price
2. Manage Bookings: Accept/Reject requests
3. View Analytics: Earnings, bookings, ratings
4. Emergency Response: Accept SOS requests (₹500)
5. Carbon Trading: List credits from green energy
```

---

## 🧪 Testing

### Run Frontend Tests

```bash
npm run test              # Run all tests
npm run test:ui           # Open test UI
npm run test:coverage     # Generate coverage report
```

### Run Backend Tests

```bash
cd backend
npm test                  # Run all backend tests
npm run test:watch        # Watch mode
npm run test:coverage     # Coverage report
```

---

## 🐛 Troubleshooting

### Common Issues & Solutions

#### ❌ MongoDB Connection Error

```
Error: MongoServerError: Authentication failed
```

**Solution:**
1. Check your `MONGODB_URI` in `.env`
2. Ensure IP whitelist includes `0.0.0.0/0` or your current IP
3. Verify username and password are correct
4. Check network connectivity

#### ❌ Port Already in Use

```
Error: listen EADDRINUSE: address already in use :::5000
```

**Solution:**
```bash
# Windows
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# macOS/Linux
lsof -ti:5000 | xargs kill -9
```

#### ❌ WebSocket Connection Failed

```
WebSocket connection to 'ws://localhost:5000' failed
```

**Solution:**
1. Ensure backend server is running
2. Check CORS settings in `backend/server.js`
3. Verify frontend is connecting to correct port
4. Clear browser cache and reload

#### ❌ Payment Integration Issues

```
Error: Invalid Razorpay key
```

**Solution:**
1. Verify `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` in `.env`
2. Ensure you're using Test mode keys
3. Check Razorpay dashboard for key status

#### ❌ Frontend Build Errors

```
Error: Cannot find module 'vite'
```

**Solution:**
```bash
# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

---

## 🌟 Advanced Features

### Real-time Updates

ChargeNet uses **Socket.io** for instant updates:
- Booking confirmations
- Emergency rescue status
- Carbon credit marketplace changes
- Charger availability updates

### Carbon Credit Calculation

```javascript
// Formula
Distance Traveled: 1 km = 100g CO₂ saved
Total CO₂ Saved: distance_km × 0.1 kg
Carbon Credits: Math.floor(total_co2_saved / 1000)

// Example
User travels: 50,000 km
CO₂ saved: 50,000 × 0.1 = 5,000 kg
Credits earned: 5,000 / 1000 = 5 credits
```

### Progress Milestones

| Milestone | Credits | Distance | Reward |
|-----------|---------|----------|--------|
| 🎁 Gift 1 | 1,000 | 10M km | Special badge |
| 🎁 Gift 2 | 2,000 | 20M km | Discount voucher |
| 🎁 Gift 3 | 3,000 | 30M km | Premium features |
| 🎁 Gift 4 | 4,000 | 40M km | Extra credits |
| 🎁 Gift 5 | 5,000 | 50M km | Platinum status |

---

## 📊 Database Schema

### User Collection

```javascript
{
  _id: ObjectId,
  email: String,
  password: String (hashed),
  name: String,
  phone: String,
  user_type: 'driver' | 'host' | 'passenger',
  has_ev: Boolean,
  vehicle_type: String,
  total_distance_km: Number,
  carbon_credits: Number,
  carbon_credits_earned: Number,
  carbon_credits_sold: Number,
  carbon_earnings: Number,
  created_at: Date,
  updated_at: Date
}
```

### Charger Collection

```javascript
{
  _id: ObjectId,
  host_id: ObjectId (ref: User),
  name: String,
  location: String,
  coordinates: { lat: Number, lng: Number },
  plug_type: String,
  power: Number,
  price: Number,
  available: Boolean,
  green_energy: Boolean,
  host_name: String,
  host_phone: String,
  created_at: Date
}
```

### RescueRequest Collection

```javascript
{
  _id: ObjectId,
  requester_id: ObjectId (ref: User),
  location_name: String,
  coordinates: { lat: Number, lng: Number },
  vehicle_details: String,
  battery_level: String,
  status: 'pending' | 'accepted' | 'in-progress' | 'completed',
  accepted_by: ObjectId (ref: User),
  price: 500,
  estimated_time: Number,
  created_at: Date
}
```

### CarbonCreditListing Collection

```javascript
{
  _id: ObjectId,
  seller_id: ObjectId (ref: User),
  seller_name: String,
  credits_amount: Number,
  price_per_credit: Number,
  total_price: Number,
  status: 'active' | 'sold' | 'cancelled',
  buyer_id: ObjectId (ref: User),
  sold_at: Date,
  created_at: Date
}
```

---

## 🤝 Contributing

We welcome contributions! Here's how you can help:

### Contribution Guidelines

1. **Fork the Repository**
   ```bash
   git clone https://github.com/YourUsername/ChargeNet.git
   ```

2. **Create a Feature Branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```

3. **Make Your Changes**
   - Follow existing code style
   - Write meaningful commit messages
   - Add tests for new features

4. **Test Your Changes**
   ```bash
   npm test
   npm run test:coverage
   ```

5. **Commit and Push**
   ```bash
   git commit -m "Add: Amazing new feature"
   git push origin feature/amazing-feature
   ```

6. **Open a Pull Request**
   - Describe your changes
   - Link related issues
   - Wait for review

### Code Style

- Use **TypeScript** for frontend
- Follow **ESLint** rules
- Use **Prettier** for formatting
- Write **meaningful comments**
- Keep functions **small and focused**

---

## 📜 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

---

## 👥 Team

Built with ❤️ by **Team ChargeNet**

- **Project Lead**: [Your Name]
- **Frontend Developer**: [Name]
- **Backend Developer**: [Name]
- **UI/UX Designer**: [Name]

---

## 🙏 Acknowledgments

- [React](https://reactjs.org/) - UI Library
- [MongoDB](https://www.mongodb.com/) - Database
- [Razorpay](https://razorpay.com/) - Payment Gateway
- [Socket.io](https://socket.io/) - Real-time Communication
- [TailwindCSS](https://tailwindcss.com/) - Styling
- [Vite](https://vitejs.dev/) - Build Tool

---

##  Future Roadmap

- [ ] Mobile App (React Native)
- [ ] AI-based Route Optimization
- [ ] Integration with more payment gateways
- [ ] Multi-language support
- [ ] Advanced analytics dashboard
- [ ] Blockchain-based carbon credits
- [ ] AR navigation for finding chargers
- [ ] Fleet management for businesses
- [ ] API for third-party integrations

---

<div align="center">

### ⭐ Star this repository if you found it helpful!

**Made with 💚 for a Sustainable Future**

[⬆ Back to Top](#-chargenet---smart-ev-charging-platform)

</div>
