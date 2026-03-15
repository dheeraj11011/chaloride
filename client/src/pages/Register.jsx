import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authAPI } from "../api/fetch";
import useStore from "../store/useStore";

const Register = () => {
  const navigate = useNavigate();
  const { login, setNotification } = useStore();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    role: "passenger",
    vehicle: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    if (form.role === "driver" && !form.vehicle) {
      setError("Please enter your vehicle details");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const res = await authAPI.register(form);
      const { user, accessToken } = res.data;
      login(user, accessToken);
      setNotification(`Welcome to ChaloRide, ${user.name.split(" ")[0]}!`, "success");
      navigate(user.role === "driver" ? "/driver" : "/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-amber-50 px-4 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <span className="text-5xl">🚖</span>
          <h1 className="text-3xl font-bold text-gray-900 mt-3">Join ChaloRide</h1>
          <p className="text-gray-500 mt-1">Create your account in seconds</p>
        </div>

        <div className="card">
          {/* Role Toggle */}
          <div className="flex rounded-xl overflow-hidden border border-gray-200 mb-5">
            <button
              type="button"
              onClick={() => setForm({ ...form, role: "passenger" })}
              className={`flex-1 py-3 text-sm font-semibold transition-all ${
                form.role === "passenger"
                  ? "bg-orange-500 text-white"
                  : "bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              🛗 Passenger
            </button>
            <button
              type="button"
              onClick={() => setForm({ ...form, role: "driver" })}
              className={`flex-1 py-3 text-sm font-semibold transition-all ${
                form.role === "driver"
                  ? "bg-blue-500 text-white"
                  : "bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              🚖 Driver (Earn Money)
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                className="input-field"
                placeholder="Rahul Sharma"
                required
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                className="input-field"
                placeholder="you@example.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone Number</label>
              <input
                type="tel"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                className="input-field"
                placeholder="+91 98765 43210"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                className="input-field"
                placeholder="Min. 6 characters"
                required
              />
            </div>

            {/* Driver-only: vehicle info */}
            {form.role === "driver" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Vehicle (e.g., "Maruti Swift DL3C 1234")
                </label>
                <input
                  type="text"
                  name="vehicle"
                  value={form.vehicle}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="Car model & number plate"
                />
                <p className="text-xs text-blue-600 mt-1.5">
                  💰 Earn money by accepting rides on your schedule!
                </p>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl">
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
              {loading ? "Creating account..." : "Create Account"}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-5">
            Already have an account?{" "}
            <Link to="/login" className="text-orange-500 font-medium hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
