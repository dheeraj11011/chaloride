# 🚖 ChaloRide — Complete Deployment Guide

## Project Structure

```
chaloride/
├── server/          ← Express + Socket.io backend (deploy to Render)
│   ├── config/      db.js
│   ├── models/      User.js, Ride.js, Token.js
│   ├── middleware/  auth.js, rateLimiter.js, errorHandler.js
│   ├── controllers/ authController.js, rideController.js, driverController.js
│   ├── routes/      auth.js, rides.js, driver.js
│   ├── utils/       generateTokens.js, haversine.js, fareEstimator.js
│   ├── socket/      socketHandler.js
│   └── server.js    ← Main entry
└── client/          ← React + Vite frontend (deploy to Vercel)
    └── src/
        ├── api/     fetch.js (Axios + auto token refresh)
        ├── store/   useStore.js (Zustand)
        ├── hooks/   useSocket.js
        ├── components/ Navbar, Toast, RideMap, ProtectedRoute
        └── pages/   Login, Register, Dashboard, BookRide,
                     RideTracker, DriverDashboard, History, Home
```

---

## ⚡ STEP 1 — MongoDB Atlas Setup (5 min)

1. Go to https://cloud.mongodb.com → Create free account
2. Create a **Free Cluster** (M0 tier)
3. Database Access → Add User → Username + Password (save these!)
4. Network Access → Add IP Address → **Allow access from anywhere** (0.0.0.0/0)
5. Connect → Drivers → Copy the connection string:
   ```
   mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/chaloride?retryWrites=true&w=majority
   ```

---

## ⚡ STEP 2 — Backend on Render (10 min)

1. Push `server/` folder to GitHub as its own repo (or a folder in a monorepo)

2. Go to https://render.com → New → Web Service

3. Connect your GitHub repo

4. Settings:
   - **Name**: chaloride-server
   - **Branch**: main
   - **Root Directory**: `server` (if monorepo)
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Region**: Singapore (closest to India)
   - **Plan**: Free

5. Environment Variables — Add these:
   ```
   NODE_ENV=production
   PORT=10000
   MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/chaloride
   ACCESS_TOKEN_SECRET=<random 64-char string>
   REFRESH_TOKEN_SECRET=<random 64-char string>
   ACCESS_TOKEN_EXPIRY=15m
   REFRESH_TOKEN_EXPIRY=7d
   CLIENT_URL=https://your-app.vercel.app
   ```
   
   Generate secrets: run `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` twice

6. Click **Deploy**

7. Note your Render URL: `https://chaloride-server.onrender.com`

> ⚠️ Free Render instances sleep after 15 min of inactivity. First request may take ~30s to wake up. Upgrade to $7/mo to keep it always-on.

---

## ⚡ STEP 3 — Frontend on Vercel (5 min)

1. Push `client/` folder to GitHub

2. Create `client/.env.production`:
   ```
   VITE_API_URL=https://chaloride-server.onrender.com/api
   VITE_SOCKET_URL=https://chaloride-server.onrender.com
   ```

3. Go to https://vercel.com → New Project → Import GitHub repo

4. Settings:
   - **Framework**: Vite
   - **Root Directory**: `client` (if monorepo)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

5. Environment Variables in Vercel Dashboard:
   ```
   VITE_API_URL = https://chaloride-server.onrender.com/api
   VITE_SOCKET_URL = https://chaloride-server.onrender.com
   ```

6. Click **Deploy** → Your app is live!

7. Copy the Vercel URL, then go back to Render and update:
   ```
   CLIENT_URL = https://your-actual-app.vercel.app
   ```
   Then trigger a redeploy on Render.

---

## ⚡ STEP 4 — Local Development Setup

### Backend
```bash
cd server
npm install
cp .env.example .env
# Fill in .env with your values
npm run dev    # Starts on http://localhost:5000
```

### Frontend
```bash
cd client
npm install
# Create .env.local:
echo "VITE_API_URL=http://localhost:5000/api" > .env.local
echo "VITE_SOCKET_URL=http://localhost:5000" >> .env.local
npm run dev    # Starts on http://localhost:5173
```

---

## 🔑 Features Implemented

| Feature | Status |
|---------|--------|
| JWT Auth (Access + Refresh token rotation) | ✅ |
| Role-based auth (Passenger / Driver) | ✅ |
| Secure httpOnly cookie for refresh token | ✅ |
| Token reuse detection & revocation | ✅ |
| Ride booking with fare estimation | ✅ |
| Haversine distance calculation | ✅ |
| Surge pricing based on driver availability | ✅ |
| Real-time driver location (Socket.io) | ✅ |
| Real-time ride status updates | ✅ |
| Interactive map (Leaflet, no API key needed) | ✅ |
| Driver online/offline toggle with GPS | ✅ |
| Rate limiting (Helmet + express-rate-limit) | ✅ |
| Global error handling | ✅ |
| Zustand state + session persistence | ✅ |
| Auto access token refresh on 401 | ✅ |
| Ride rating system | ✅ |
| Driver earnings & stats dashboard | ✅ |
| Ride history for both roles | ✅ |

---

## 🌐 API Endpoints

### Auth  `POST /api/auth/*`
- `POST /register` — Create account (passenger or driver)
- `POST /login` — Login, returns accessToken + sets refresh cookie
- `POST /refresh` — Rotate tokens
- `POST /logout` — Revoke refresh token
- `GET /me` — Get current user (protected)

### Rides  `* /api/rides/*` (require auth)
- `POST /estimate` — Fare estimate (no booking)
- `POST /book` — Book a ride (passenger only)
- `GET /active` — Get current active ride
- `GET /my` — Ride history
- `GET /:id` — Get specific ride
- `PATCH /:id/cancel` — Cancel ride
- `PATCH /:id/rate` — Rate completed ride

### Driver  `* /api/driver/*` (require driver role)
- `PATCH /availability` — Toggle online/offline
- `PATCH /location` — Update GPS location
- `GET /nearby-rides` — List pending rides
- `GET /stats` — Earnings & stats
- `PATCH /rides/:id/accept` — Accept a ride
- `PATCH /rides/:id/start` — Start ride (arrived at pickup)
- `PATCH /rides/:id/complete` — Complete ride

### Socket Events
| Event | Direction | Description |
|-------|-----------|-------------|
| `new_ride_request` | Server→Driver | New ride available |
| `ride_accepted` | Server→Passenger | Driver accepted |
| `ride_started` | Server→Passenger | Ride in progress |
| `ride_completed` | Server→Passenger | Ride done |
| `ride_cancelled` | Server→Both | Ride cancelled |
| `driver:update_location` | Driver→Server | GPS update |
| `driver_location_{id}` | Server→Passenger | Driver moved |

---

## 🔧 Tech Stack

- **Backend**: Node.js, Express, Socket.io, MongoDB (Mongoose)
- **Auth**: JWT, bcryptjs, httpOnly cookies, token rotation
- **Frontend**: React 18, Vite, Zustand, Axios, Leaflet, Tailwind CSS
- **Deploy**: Render (backend), Vercel (frontend), MongoDB Atlas

---

## ✅ Quick Health Check

After deployment, visit:
```
https://chaloride-server.onrender.com/health
```
Should return: `{ "status": "OK", "timestamp": "..." }`
