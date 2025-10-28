# 🚀 ChargeNet Deployment Guide

## Complete Step-by-Step Deployment (For Beginners)

---

## 📋 What You Need

1. **GitHub Account** - To store your code
2. **Vercel Account** - To deploy frontend (FREE)
3. **Render Account** - To deploy backend (FREE)
4. **MongoDB Atlas** - Already set up ✅
5. **Razorpay Account** - Already set up ✅

---

## PART 1: PUSH CODE TO GITHUB (5 minutes)

### Step 1: Commit Your Changes

```bash
cd C:\Users\radhe\Downloads\ChargeNet

# Check what changed
git status

# Add all changes
git add .

# Commit changes
git commit -m "Prepared app for deployment - Updated CORS, env variables, and configs"

# Push to GitHub
git push origin main
```

---

## PART 2: DEPLOY BACKEND TO RENDER (10 minutes)

### Step 1: Sign Up on Render

1. Go to: https://render.com
2. Click **"Get Started for Free"**
3. Sign up with **GitHub account** (easiest way)
4. Authorize Render to access your GitHub

### Step 2: Create New Web Service

1. Click **"New +"** button (top right)
2. Select **"Web Service"**
3. Click **"Build and deploy from a Git repository"**
4. Click **"Next"**

### Step 3: Connect Your Repository

1. Find and select **"ChargeNet"** repository
2. Click **"Connect"**

### Step 4: Configure Service

Fill in these settings:

| Setting | Value |
|---------|-------|
| **Name** | `chargenet-backend` |
| **Region** | `Singapore` (closest to India) |
| **Branch** | `main` |
| **Root Directory** | `project/backend` |
| **Runtime** | `Node` |
| **Build Command** | `npm install` |
| **Start Command** | `node server.js` |
| **Instance Type** | `Free` |

### Step 5: Add Environment Variables

Click **"Advanced"** → **"Add Environment Variable"**

Add these one by one:

```env
MONGODB_URI=mongodb+srv://amrendrabahubali9500:NliTHOaXCOlBpnb7@chargenet.djic8n6.mongodb.net/?retryWrites=true&w=majority&appName=Chargenet

JWT_SECRET=chargenet-super-secret-jwt-key-production-2025

RAZORPAY_KEY_ID=rzp_test_RRoCzP8PpVdxfg

RAZORPAY_KEY_SECRET=h677k7PN3TeHiZwvk12gI0hd

FRONTEND_URL=https://chargenet.vercel.app

PORT=5000

NODE_ENV=production
```

**Note:** We'll update `FRONTEND_URL` later after deploying frontend

### Step 6: Deploy!

1. Click **"Create Web Service"** (bottom)
2. Wait 5-10 minutes for deployment
3. You'll see logs appearing - wait for "✅ Connected to MongoDB Atlas"
4. When done, you'll see **"Your service is live 🎉"**

### Step 7: Copy Your Backend URL

1. At the top, you'll see your URL like: `https://chargenet-backend.onrender.com`
2. **Copy this URL** - you'll need it for frontend!
3. Test it by visiting: `https://chargenet-backend.onrender.com/api/health`
   - You should see: `{"status":"ok",...}`

---

## PART 3: DEPLOY FRONTEND TO VERCEL (10 minutes)

### Step 1: Sign Up on Vercel

1. Go to: https://vercel.com
2. Click **"Start Deploying"**
3. Sign up with **GitHub account**
4. Authorize Vercel to access GitHub

### Step 2: Import Project

1. Click **"Add New..."** → **"Project"**
2. Find **"ChargeNet"** in your repositories
3. Click **"Import"**

### Step 3: Configure Project

Fill in these settings:

| Setting | Value |
|---------|-------|
| **Project Name** | `chargenet` |
| **Framework Preset** | `Vite` |
| **Root Directory** | `project` ← Click "Edit" and select |
| **Build Command** | `npm run build` |
| **Output Directory** | `dist` |
| **Install Command** | `npm install` |

### Step 4: Add Environment Variables

Click **"Environment Variables"** section

Add these:

| Name | Value |
|------|-------|
| `VITE_API_URL` | `https://chargenet-backend.onrender.com/api` |
| `VITE_RAZORPAY_KEY_ID` | `rzp_test_RRoCzP8PpVdxfg` |

**Replace** `chargenet-backend.onrender.com` with YOUR actual Render URL from Part 2!

### Step 5: Deploy!

1. Click **"Deploy"**
2. Wait 3-5 minutes
3. You'll see **"Congratulations! 🎉"** when done

### Step 6: Get Your Frontend URL

1. You'll see your live URL like: `https://chargenet.vercel.app`
2. Click on it to visit your live app!

---

## PART 4: UPDATE BACKEND WITH FRONTEND URL (5 minutes)

Now that frontend is deployed, update backend to allow requests from it:

### Step 1: Update Render Environment Variable

1. Go back to **Render Dashboard**: https://dashboard.render.com
2. Click on **"chargenet-backend"** service
3. Click **"Environment"** (left sidebar)
4. Find **`FRONTEND_URL`**
5. Click **"Edit"**
6. Change value to: `https://chargenet.vercel.app` (your actual Vercel URL)
7. Click **"Save Changes"**
8. Backend will automatically redeploy (wait 2-3 minutes)

---

## PART 5: TEST YOUR LIVE APP! 🎉

### Step 1: Visit Your App

Go to: `https://chargenet.vercel.app` (your actual URL)

### Step 2: Test Features

Try these:

1. ✅ **Register** a new account
2. ✅ **Login**
3. ✅ **View chargers** on map
4. ✅ **Book a charger**
5. ✅ **Test payment** (use test card)
6. ✅ **Check dashboard**
7. ✅ **Carbon credits**

### Test Payment Card Details

Use these Razorpay test cards:

```
Card Number: 4111 1111 1111 1111
CVV: 123
Expiry: Any future date (e.g., 12/25)
Name: Any name
```

---

## 🎯 YOUR APP IS NOW LIVE!

✅ **Frontend**: https://chargenet.vercel.app
✅ **Backend**: https://chargenet-backend.onrender.com
✅ **Database**: MongoDB Atlas (Cloud)
✅ **Payments**: Razorpay (Test Mode)

---

## 📱 Share Your App

Share this URL with anyone:
- https://chargenet.vercel.app

They can:
- Register and use your app
- Book chargers
- Make test payments
- See live updates via WebSocket

---

## 🔧 Common Issues & Solutions

### Issue 1: Backend shows "Service Unavailable"
**Solution**: 
- Render free tier sleeps after 15 min inactivity
- First request takes 30-60 seconds to wake up
- Just wait and refresh

### Issue 2: CORS Error in Browser Console
**Solution**:
- Check `FRONTEND_URL` in Render environment variables
- Should match your exact Vercel URL
- Save and redeploy

### Issue 3: Login/Register not working
**Solution**:
- Check browser console for API errors
- Verify `VITE_API_URL` in Vercel environment variables
- Should end with `/api`
- Redeploy frontend after changes

### Issue 4: Payment not working
**Solution**:
- Using test mode cards? (4111 1111 1111 1111)
- Check Razorpay keys in both Render and Vercel
- Check browser console for errors

### Issue 5: Map not loading
**Solution**:
- Google Maps API key might be missing
- App works without it but map won't show
- Get free key from: https://console.cloud.google.com/

---

## 💰 GO LIVE WITH REAL PAYMENTS

### Step 1: Complete Razorpay KYC

1. Go to Razorpay Dashboard
2. Complete KYC verification
3. Get **LIVE API Keys**

### Step 2: Update Keys in Render

1. Go to Render → chargenet-backend → Environment
2. Update these:
   ```
   RAZORPAY_KEY_ID=rzp_live_YOUR_LIVE_KEY
   RAZORPAY_KEY_SECRET=YOUR_LIVE_SECRET
   ```
3. Save

### Step 3: Update Key in Vercel

1. Go to Vercel → chargenet → Settings → Environment Variables
2. Update:
   ```
   VITE_RAZORPAY_KEY_ID=rzp_live_YOUR_LIVE_KEY
   ```
3. Redeploy

### Step 4: Start Earning! 💸

You can now accept real payments from users!

---

## 🚀 Custom Domain (Optional)

### Get a Custom Domain

**Free Options:**
- Vercel provides: `chargenet.vercel.app`
- Use it for now!

**Paid Options (₹99-500/year):**
- Hostinger: chargenet.in
- GoDaddy: chargenet.com
- Namecheap: chargenet.co

### Add Domain to Vercel

1. Vercel Dashboard → chargenet → Settings
2. Domains → Add
3. Enter your domain
4. Follow DNS setup instructions
5. Wait 24-48 hours for propagation

---

## 📊 Monitor Your App

### Render Dashboard
- View backend logs
- Monitor uptime
- Check errors

### Vercel Dashboard  
- View frontend deployments
- Monitor traffic
- Check build logs

### MongoDB Atlas
- Monitor database usage
- Check active connections
- View collections

---

## 🎉 YOU'RE DONE!

Your ChargeNet app is now:
- ✅ Live on the internet
- ✅ Accessible by anyone
- ✅ Ready to accept payments (test mode)
- ✅ Free to run (until you scale)

**Total Cost: ₹0** 🎊

---

## 📞 Need Help?

If something doesn't work:
1. Check the "Common Issues" section above
2. Look at Render logs (Render Dashboard → Logs)
3. Look at Vercel deployment logs
4. Check browser console (F12)

**Deployment URLs to bookmark:**
- Render: https://dashboard.render.com
- Vercel: https://vercel.com/dashboard
- MongoDB: https://cloud.mongodb.com
- Razorpay: https://dashboard.razorpay.com

---

## 🎯 Next Steps

1. **Test thoroughly** - Try all features
2. **Fix any bugs** - Use browser console
3. **Share with friends** - Get feedback
4. **Submit to hackathon** - With live demo link!
5. **Switch to live payments** - When ready to earn

---

**Made with ❤️ for ChargeNet**
**Good luck with your hackathon! 🚀**
