# ⚡ ChargeNet - Quick Start Guide

## 🚀 Get Running in 5 Minutes!

This guide will get you up and running with ChargeNet as quickly as possible.

---

## ✅ Prerequisites Checklist

Make sure you have these installed:

```bash
# Check Node.js (need 16+)
node --version

# Check npm (need 8+)
npm --version

# Check Git
git --version
```

If any command fails, install from:
- **Node.js**: https://nodejs.org/ (Download LTS version)
- **Git**: https://git-scm.com/

---

## 📥 Step 1: Clone & Install (2 minutes)

```bash
# Clone the repository
git clone https://github.com/Priyanshu07190/ChargeNet.git

# Go to project folder
cd ChargeNet/project

# Install frontend dependencies
npm install

# Go to backend and install
cd backend
npm install
cd ..
```

---

## ⚙️ Step 2: Setup Environment (1 minute)

Create `backend/.env` file with this content:

```env
PORT=5000
MONGODB_URI=mongodb+srv://your_username:your_password@cluster0.xxxxx.mongodb.net/chargenet
JWT_SECRET=your_super_secret_key_change_this
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=your_razorpay_secret
FRONTEND_URL=http://localhost:5173
```

### 🔑 Get MongoDB URI (Free):
1. Go to https://www.mongodb.com/cloud/atlas
2. Sign up → Create Free Cluster
3. Click "Connect" → "Connect your application"
4. Copy the connection string
5. Replace `<username>` and `<password>` in the URI

### 💳 Get Razorpay Keys (Test Mode - Free):
1. Visit https://dashboard.razorpay.com/
2. Sign up → Go to Settings → API Keys
3. Generate Test Keys
4. Copy Key ID and Secret

---

## 🏃 Step 3: Run the App (1 minute)

### Open TWO terminals:

**Terminal 1 - Backend:**
```bash
cd backend
npm start
```

Wait for:
```
✅ Connected to MongoDB Atlas
🚀 ChargeNet Backend Server running on port 5000
```

**Terminal 2 - Frontend:**
```bash
# From project root
npm run dev
```

Wait for:
```
➜  Local:   http://localhost:5173/
```

---

## 🎉 Step 4: Access the App

Open your browser and go to:
```
http://localhost:5173
```

---

## 🧪 Step 5: Test It Out

### Create Your First Account:

1. Click **"Sign Up"**
2. Fill in:
   - Name: `Test User`
   - Email: `test@example.com`
   - Phone: `9876543210`
   - Password: `password123`
   - User Type: **Driver** or **Host**
3. Click **Register**

### As a Driver:
- ✅ Browse charging stations on the map
- ✅ Book a charger
- ✅ Request emergency rescue
- ✅ View carbon credits

### As a Host:
- ✅ Add your charger to the platform
- ✅ Manage booking requests
- ✅ Respond to emergency rescues
- ✅ List carbon credits for trading

---

## 🆘 Troubleshooting

### Backend won't start?
```bash
# Make sure MongoDB URI is correct in .env
# Check if port 5000 is free:
netstat -ano | findstr :5000  # Windows
lsof -ti:5000  # Mac/Linux
```

### Frontend won't start?
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Can't connect to database?
```bash
# Make sure:
1. MongoDB Atlas IP Whitelist includes 0.0.0.0/0
2. Username and password are correct
3. Internet connection is working
```

---

## 📚 Next Steps

Now that you're running:

1. 📖 Read the full [README.md](README.md) for detailed features
2. 🔌 Check [API Documentation](README.md#-api-documentation)
3. 🎨 Explore the [Project Structure](README.md#-project-structure)
4. 🤝 Learn how to [Contribute](CONTRIBUTING.md)

---

## 💡 Pro Tips

- **Use Test Mode**: Keep Razorpay in test mode for development
- **Real-time Updates**: Keep both terminals running to see live WebSocket updates
- **Database Browser**: Install MongoDB Compass to view your database
- **API Testing**: Use Postman to test API endpoints
- **Browser DevTools**: Open F12 to see console logs and network requests

---

## 🎯 Common Development Tasks

### Add Distance for Carbon Credits:
```bash
# Make a POST request to:
POST http://localhost:5000/api/carbon-credits/add-distance
{
  "distance_km": 100
}
```

### View All Chargers:
```bash
GET http://localhost:5000/api/chargers
```

### Create a Booking:
```bash
POST http://localhost:5000/api/bookings
{
  "charger_id": "...",
  "start_time": "2025-10-11T10:00:00",
  "duration": 60
}
```

---

## ⚡ Quick Commands Reference

```bash
# Frontend
npm run dev          # Start dev server
npm run build        # Build for production
npm run preview      # Preview production build
npm test             # Run tests

# Backend
cd backend
npm start            # Start server
npm run dev          # Start with nodemon (auto-restart)
npm test             # Run backend tests
```

---

## 🎊 You're All Set!

Congratulations! You're now running ChargeNet locally. Happy coding! 🚀

Need help? Open an issue: https://github.com/Priyanshu07190/ChargeNet/issues

---

[← Back to Main README](README.md)
