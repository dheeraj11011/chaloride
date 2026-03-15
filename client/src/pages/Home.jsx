import { Link } from "react-router-dom";
import useStore from "../store/useStore";

const Home = () => {
  const { isAuthenticated, user } = useStore();

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <div className="bg-gradient-to-br from-orange-500 to-amber-500 text-white py-24 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="text-7xl mb-6">🚖</div>
          <h1 className="text-5xl md:text-6xl font-black mb-4">ChaloRide</h1>
          <p className="text-xl text-orange-100 mb-8 max-w-xl mx-auto">
            Book rides instantly or earn money as a part-time driver — all on your schedule.
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            {isAuthenticated ? (
              <>
                <Link
                  to={user?.role === "driver" ? "/driver" : "/book"}
                  className="bg-white text-orange-500 font-bold px-8 py-4 rounded-2xl text-lg hover:bg-orange-50 transition-colors"
                >
                  {user?.role === "driver" ? "Go to Driver Panel →" : "Book a Ride →"}
                </Link>
              </>
            ) : (
              <>
                <Link to="/register" className="bg-white text-orange-500 font-bold px-8 py-4 rounded-2xl text-lg hover:bg-orange-50 transition-colors">
                  Get Started Free
                </Link>
                <Link to="/login" className="border-2 border-white text-white font-bold px-8 py-4 rounded-2xl text-lg hover:bg-white/10 transition-colors">
                  Sign In
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="max-w-5xl mx-auto px-4 py-20">
        <h2 className="text-3xl font-black text-center mb-12">Why ChaloRide?</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { icon: "⚡", title: "Instant Matching", desc: "Real-time driver matching with live location tracking via Socket.io" },
            { icon: "💰", title: "Earn as a Driver", desc: "Register as a part-time driver and earn money on your own schedule" },
            { icon: "🔒", title: "Secure & Reliable", desc: "JWT auth with refresh token rotation, rate limiting, and encrypted data" },
            { icon: "📊", title: "Smart Fare Engine", desc: "Haversine distance + surge pricing based on live driver availability" },
            { icon: "🗺️", title: "Live Map Tracking", desc: "Track your ride and driver location in real-time on an interactive map" },
            { icon: "📱", title: "Works Everywhere", desc: "Responsive design — works perfectly on mobile, tablet, and desktop" },
          ].map((f) => (
            <div key={f.title} className="card text-center hover:shadow-md transition-shadow">
              <div className="text-4xl mb-3">{f.icon}</div>
              <h3 className="font-bold text-lg mb-2">{f.title}</h3>
              <p className="text-gray-500 text-sm">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="bg-gray-900 text-white py-16 px-4 text-center">
        <h2 className="text-3xl font-black mb-4">Ready to ride?</h2>
        <p className="text-gray-400 mb-8">Join thousands of riders and drivers on ChaloRide</p>
        {!isAuthenticated && (
          <Link to="/register" className="btn-primary text-lg px-10 py-4">
            Create Free Account →
          </Link>
        )}
      </div>
    </div>
  );
};

export default Home;
