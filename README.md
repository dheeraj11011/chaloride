# 🚖 ChaloRide — Real-Time Ride Booking Platform

ChaloRide is a **full-stack ride-booking platform** similar to Uber/Ola.
It enables passengers to book rides and drivers to accept trips in **real-time using WebSockets**.

The system includes **secure authentication, role-based access, real-time ride tracking, surge pricing, and driver dashboards**.

---

# 🌐 Live Architecture

Frontend → Vercel
Backend → Render
Database → MongoDB Atlas
Realtime Communication → Socket.io

---

# 📁 Project Structure

```
chaloride/
├── server/          # Express + Socket.io backend
│   ├── config/      # MongoDB connection
│   ├── models/      # User, Ride, Token schemas
│   ├── middleware/  # Auth, Rate Limiter, Error Handler
│   ├── controllers/ # Business logic
│   ├── routes/      # API routes
│   ├── utils/       # Distance + fare calculations
│   ├── socket/      # Real-time socket handlers
│   └── server.js    # Entry point
│
└── client/          # React + Vite frontend
    └── src/
        ├── api/         # Axios API client
        ├── store/       # Zustand state store
        ├── hooks/       # Custom React hooks
        ├── components/  # Reusable UI components
        └── pages/       # Application pages
```

---

# ✨ Features

### 🔐 Authentication

* JWT access + refresh token system
* Token rotation & reuse detection
* Secure httpOnly cookies
* Role-based authentication (Passenger / Driver)

### 🚗 Ride System

* Book rides instantly
* Real-time ride status updates
* Driver acceptance workflow
* Ride cancellation and completion
* Passenger ride rating

### 📍 Real-Time Location

* Driver GPS updates
* Passenger ride tracking
* Socket.io based communication
* Live driver movement updates

### 💰 Smart Fare Calculation

* Distance calculation using **Haversine formula**
* Dynamic surge pricing
* Driver availability detection

### 📊 Driver Dashboard

* Earnings overview
* Ride statistics
* Online / Offline toggle
* Nearby ride discovery

### 🛡 Security

* Helmet security headers
* Express rate limiting
* Global error handling
* Token revocation

---

# 🧰 Tech Stack

### Backend

* Node.js
* Express.js
* MongoDB + Mongoose
* Socket.io
* JWT Authentication
* bcryptjs

### Frontend

* React 18
* Vite
* Zustand (state management)
* Axios
* Tailwind CSS
* Leaflet Maps

### Deployment

* Backend → Render
* Frontend → Vercel
* Database → MongoDB Atlas

---

# ⚙️ Environment Variables

Backend `.env`

```
NODE_ENV=production
PORT=10000
MONGO_URI=your_mongodb_connection_string
ACCESS_TOKEN_SECRET=your_secret
REFRESH_TOKEN_SECRET=your_secret
ACCESS_TOKEN_EXPIRY=15m
REFRESH_TOKEN_EXPIRY=7d
CLIENT_URL=https://your-vercel-app.vercel.app
```

Frontend `.env.production`

```
VITE_API_URL=https://chaloride-server.onrender.com/api
VITE_SOCKET_URL=https://chaloride-server.onrender.com
```

---

# 🚀 Local Development

### Backend

```
cd server
npm install
npm run dev
```

Runs at:

```
http://localhost:5000
```

---

### Frontend

```
cd client
npm install
npm run dev
```

Runs at:

```
http://localhost:5173
```

---

# 📡 API Endpoints

## Auth

```
POST /api/auth/register
POST /api/auth/login
POST /api/auth/refresh
POST /api/auth/logout
GET  /api/auth/me
```

## Rides

```
POST /api/rides/estimate
POST /api/rides/book
GET  /api/rides/active
GET  /api/rides/my
GET  /api/rides/:id
PATCH /api/rides/:id/cancel
PATCH /api/rides/:id/rate
```

## Driver

```
PATCH /api/driver/availability
PATCH /api/driver/location
GET   /api/driver/nearby-rides
GET   /api/driver/stats
PATCH /api/driver/rides/:id/accept
PATCH /api/driver/rides/:id/start
PATCH /api/driver/rides/:id/complete
```

---

# 🔌 Socket Events

| Event                  | Direction          | Description            |
| ---------------------- | ------------------ | ---------------------- |
| new_ride_request       | Server → Driver    | New ride available     |
| ride_accepted          | Server → Passenger | Driver accepted ride   |
| ride_started           | Server → Passenger | Ride started           |
| ride_completed         | Server → Passenger | Ride finished          |
| ride_cancelled         | Server → Both      | Ride cancelled         |
| driver:update_location | Driver → Server    | Driver GPS update      |
| driver_location_{id}   | Server → Passenger | Driver location update |

---

# 🧪 Health Check

```
GET /health
```

Response:

```
{
 "status": "OK",
 "timestamp": "..."
}
```

---

# 👨‍💻 Author

Dheeraj Kotla
Computer Science Undergraduate
Full-Stack Developer | MERN | Backend Engineering

GitHub:
https://github.com/dheeraj11011
