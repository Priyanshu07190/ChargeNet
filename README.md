# ⚡ ChargeNet - Smart EV Charging Platform

<div align="center">

![ChargeNet Logo](https://img.shields.io/badge/ChargeNet-EV%20Charging-green?style=for-the-badge&logo=electric-vehicle)

**Revolutionizing Electric Vehicle Charging with Smart Technology & Carbon Trading**

[![React](https://img.shields.io/badge/React-18.3.1-blue?logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5.3-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-Latest-green?logo=node.js)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-green?logo=mongodb)](https://www.mongodb.com/)
[![Socket.io](https://img.shields.io/badge/Socket.io-4.8.1-black?logo=socket.io)](https://socket.io/)

[Features](#-features) • [Demo](#-demo) • [Quick Start](#-quick-start) • [Tech Stack](#-tech-stack) • [Documentation](#-documentation)

</div>

---

## 🌟 About ChargeNet

ChargeNet is a **full-stack EV charging platform** that connects electric vehicle drivers with charging station hosts. Built with React, TypeScript, Node.js, and MongoDB, it offers real-time booking, emergency rescue services, carbon credit trading, and seamless payments.

### 🎯 Problem We Solve

- **Limited Charging Infrastructure**: Help drivers find available chargers instantly
- **Emergency Situations**: Provide immediate portable charging for stranded EVs
- **Environmental Impact**: Enable users to monetize CO₂ savings through carbon credits
- **Host Opportunities**: Allow charger owners to earn by sharing their infrastructure

---

## ✨ Key Features

### 🚗 For Drivers
- 🗺️ **Real-time Charger Discovery** - Interactive map with live availability
- 📅 **Instant Booking** - Book charging slots with flexible timings
- 🆘 **Emergency SOS** - Get portable charging help (₹500 fixed price)
- 🌱 **Carbon Credits** - Earn credits for every km traveled (100g CO₂/km)
- 💱 **Carbon Trading** - Buy/sell credits on the marketplace
- 💰 **Secure Payments** - Razorpay integration

### 🏠 For Hosts
- ➕ **List Chargers** - Add your charging stations easily
- 📊 **Manage Bookings** - Accept/reject requests in real-time
- 🚨 **Emergency Response** - Offer portable charging services
- 📈 **Analytics Dashboard** - Track earnings and performance
- 🌿 **Earn from Green Energy** - List carbon credits for sale

### 🌱 Carbon Trading System
- **Calculation**: 1 km = 100g CO₂ saved → 10,000 km = 1 Carbon Credit
- **Marketplace**: List credits at your price
- **Real-time Trading**: Instant transactions via WebSocket
- **Milestones**: Unlock rewards at 1k, 2k, 3k, 4k, 5k credits

---

## 🚀 Quick Start

### Prerequisites

- Node.js 16+ ([Download](https://nodejs.org/))
- npm 8+
- MongoDB Atlas account ([Free tier](https://www.mongodb.com/cloud/atlas))
- Razorpay account ([Test keys](https://dashboard.razorpay.com/))

### Installation (5 minutes)

```bash
# 1. Clone the repository
git clone https://github.com/Priyanshu07190/ChargeNet.git
cd ChargeNet/project

# 2. Install dependencies
npm install
cd backend && npm install && cd ..

# 3. Setup environment variables
cd backend
cp .env.example .env
# Edit .env with your MongoDB URI and Razorpay keys

# 4. Run the application
# Terminal 1 - Backend
cd backend
npm start

# Terminal 2 - Frontend
npm run dev
```

### Access the App

```
Frontend: http://localhost:5173
Backend:  http://localhost:5000
```

**📖 Detailed Setup**: See [project/QUICK_START.md](project/QUICK_START.md)

---

## 🛠️ Tech Stack

### Frontend
- **React 18.3.1** - UI Library
- **TypeScript 5.5.3** - Type Safety
- **Vite 5.4.2** - Build Tool
- **TailwindCSS 3.4.1** - Styling
- **Socket.io Client** - Real-time Updates
- **React Router 7.7.1** - Navigation

### Backend
- **Node.js** - Runtime
- **Express 4.18.2** - Web Framework
- **MongoDB Atlas** - Database
- **Mongoose 7.5.0** - ODM
- **Socket.io 4.8.1** - WebSocket Server
- **JWT** - Authentication
- **Razorpay 2.9.6** - Payments
- **bcryptjs** - Password Hashing

---

## 📁 Project Structure

```
ChargeNet/
├── project/
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── pages/           # Dashboard, Map, Login, etc.
│   │   ├── contexts/        # Auth & Charger contexts
│   │   ├── lib/             # API services, WebSocket
│   │   └── types/           # TypeScript definitions
│   │
│   ├── backend/
│   │   ├── server.js        # Main API (2500+ lines)
│   │   ├── .env.example     # Environment template
│   │   └── test/            # Backend tests
│   │
│   ├── README.md            # Main documentation
│   ├── QUICK_START.md       # 5-minute setup guide
│   ├── API_DOCS.md          # Complete API reference
│   ├── ARCHITECTURE.md      # System architecture
│   └── CONTRIBUTING.md      # Contribution guidelines
│
└── README.md                # This file
```

---

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [📖 Main README](project/README.md) | Complete project documentation |
| [⚡ Quick Start](project/QUICK_START.md) | Get running in 5 minutes |
| [📡 API Docs](project/API_DOCS.md) | Complete API reference (45+ endpoints) |
| [🏗️ Architecture](project/ARCHITECTURE.md) | System design & data flow |
| [🤝 Contributing](project/CONTRIBUTING.md) | Contribution guidelines |
| [📝 Changelog](project/CHANGELOG.md) | Version history |

---

## 🎨 Features Showcase

### Real-time WebSocket Updates
- Instant booking confirmations
- Live emergency rescue status
- Marketplace updates
- Charger availability changes

### Carbon Credit Calculation
```
Formula: 
- 1 km traveled = 100g CO₂ saved
- 10,000 km = 1,000 kg CO₂ = 1 Carbon Credit
- Trade credits on marketplace
- Earn ₹ from environmental impact
```

### Emergency Rescue System
- Fixed ₹500 pricing (no negotiation)
- Location-based matching
- Real-time status tracking
- Instant host notifications

---

## 🎯 Key Highlights for Hackathon Judges

✅ **Full-Stack MERN Application** (MongoDB, Express, React, Node.js)  
✅ **Real-time WebSocket** communication via Socket.io  
✅ **TypeScript** for type safety  
✅ **Secure Authentication** (JWT + bcrypt + HTTP-only cookies)  
✅ **Payment Integration** (Razorpay)  
✅ **45+ API Endpoints** with comprehensive error handling  
✅ **Responsive Design** (Mobile-first approach)  
✅ **Carbon Credit Trading** - Innovative environmental feature  
✅ **Emergency SOS System** - Social impact feature  
✅ **Comprehensive Documentation** (1000+ lines)  
✅ **Production-Ready** code with best practices  

---

## 🔐 Environment Setup

Create `backend/.env`:

```env
PORT=5000
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/chargenet
JWT_SECRET=your_secret_key_min_32_characters
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=your_razorpay_secret
FRONTEND_URL=http://localhost:5173
```

**Get MongoDB URI**: https://www.mongodb.com/cloud/atlas  
**Get Razorpay Keys**: https://dashboard.razorpay.com/

---

## 🧪 Testing

```bash
# Frontend tests
npm test
npm run test:coverage

# Backend tests
cd backend
npm test
```

---

## 🚀 API Overview

### Authentication
```
POST /api/auth/register    # Register user
POST /api/auth/login       # Login
GET  /api/auth/session     # Get session
POST /api/auth/logout      # Logout
```

### Chargers
```
GET    /api/chargers       # Get all chargers
POST   /api/chargers       # Create charger (Host)
PUT    /api/chargers/:id   # Update charger
DELETE /api/chargers/:id   # Delete charger
```

### Emergency Rescue
```
POST /api/rescue-requests            # Create SOS
GET  /api/rescue-requests            # Get requests (Host)
POST /api/rescue-requests/:id/accept # Accept rescue (₹500)
POST /api/rescue-requests/:id/complete # Complete
```

### Carbon Trading
```
POST /api/carbon-credits/add-distance # Add km traveled
GET  /api/carbon-credits/stats        # Get user stats
POST /api/carbon-credits/list         # List for sale
GET  /api/carbon-credits/marketplace  # View marketplace
POST /api/carbon-credits/buy/:id      # Buy credits
```

**Full API Documentation**: [project/API_DOCS.md](project/API_DOCS.md)

---

## 🤝 Contributing

We welcome contributions! See [project/CONTRIBUTING.md](project/CONTRIBUTING.md) for guidelines.

```bash
# Fork the repo
git clone https://github.com/YourUsername/ChargeNet.git

# Create feature branch
git checkout -b feature/amazing-feature

# Commit changes
git commit -m "Add: Amazing feature"

# Push and create PR
git push origin feature/amazing-feature
```

---

## 📊 Database Schema

```javascript
Users          → Authentication, carbon credits, earnings
Chargers       → Location, pricing, availability
Bookings       → Reservations, payments, status
RescueRequests → Emergency SOS with location tracking
CarbonCredits  → Marketplace listings, transactions
Sessions       → Secure session management
```

**Full Schema**: [project/ARCHITECTURE.md](project/ARCHITECTURE.md#-database-schema-architecture)

---

## 🐛 Troubleshooting

### Backend won't start?
```bash
# Check MongoDB connection in .env
# Ensure port 5000 is free
netstat -ano | findstr :5000  # Windows
```

### Frontend errors?
```bash
# Clear and reinstall
rm -rf node_modules package-lock.json
npm install
```

**More help**: [project/README.md#-troubleshooting](project/README.md)

---

## 🌟 Future Roadmap

- [ ] Mobile App (React Native)
- [ ] AI-based Route Optimization
- [ ] Multi-language Support
- [ ] Advanced Analytics with Charts
- [ ] Blockchain-based Carbon Credits
- [ ] AR Navigation for Chargers
- [ ] Fleet Management Dashboard
- [ ] Third-party API Integrations

---

## 👥 Team

Built with ❤️ by **Team ChargeNet** for hackathon

- **GitHub**: [Priyanshu07190](https://github.com/Priyanshu07190)
- **Repository**: [ChargeNet](https://github.com/Priyanshu07190/ChargeNet)

---

## 📜 License

This project is licensed under the **MIT License** - see [project/LICENSE](project/LICENSE)

---

## 📞 Support & Contact

- 🐛 **Issues**: [GitHub Issues](https://github.com/Priyanshu07190/ChargeNet/issues)
- 📧 **Email**: support@chargenet.com
- 💬 **Discord**: [Join community](https://discord.gg/chargenet)

---

## 🙏 Acknowledgments

- [React](https://reactjs.org/) - UI Library
- [MongoDB](https://www.mongodb.com/) - Database
- [Razorpay](https://razorpay.com/) - Payments
- [Socket.io](https://socket.io/) - Real-time
- [TailwindCSS](https://tailwindcss.com/) - Styling

---

<div align="center">

### ⭐ Star this repository if you find it helpful!

**Made with 💚 for a Sustainable Future**

[Documentation](project/README.md) • [Quick Start](project/QUICK_START.md) • [API Docs](project/API_DOCS.md) • [Architecture](project/ARCHITECTURE.md)

</div>

