import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Navbar from "./components/Navbar";
import Toast from "./components/Toast";
import ProtectedRoute from "./components/ProtectedRoute";

import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import BookRide from "./pages/BookRide";
import RideTracker from "./pages/RideTracker";
import DriverDashboard from "./pages/DriverDashboard";
import History from "./pages/History";

import useStore from "./store/useStore";

const App = () => {
  const { isAuthenticated, user } = useStore();

  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <Toast />
        <main className="flex-1">
          <Routes>
            {/* Public */}
            <Route path="/" element={<Home />} />
            <Route path="/login" element={isAuthenticated ? <Navigate to={user?.role === "driver" ? "/driver" : "/dashboard"} /> : <Login />} />
            <Route path="/register" element={isAuthenticated ? <Navigate to="/dashboard" /> : <Register />} />

            {/* Passenger routes */}
            <Route path="/dashboard" element={
              <ProtectedRoute allowedRoles={["passenger"]}>
                <Dashboard />
              </ProtectedRoute>
            } />
            <Route path="/book" element={
              <ProtectedRoute allowedRoles={["passenger"]}>
                <BookRide />
              </ProtectedRoute>
            } />

            {/* Shared ride tracker */}
            <Route path="/ride/:rideId" element={
              <ProtectedRoute>
                <RideTracker />
              </ProtectedRoute>
            } />

            {/* Ride history (both roles) */}
            <Route path="/history" element={
              <ProtectedRoute>
                <History />
              </ProtectedRoute>
            } />

            {/* Driver routes */}
            <Route path="/driver" element={
              <ProtectedRoute allowedRoles={["driver"]}>
                <DriverDashboard />
              </ProtectedRoute>
            } />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
};

export default App;
