import { Link, useNavigate, useLocation } from "react-router-dom";
import useStore from "../store/useStore";
import { authAPI } from "../api/fetch";
import useSocket from "../hooks/useSocket";

const Navbar = () => {
  const { user, isAuthenticated, logout } = useStore();
  const navigate = useNavigate();
  const location = useLocation();
  const { disconnect } = useSocket();

  const handleLogout = async () => {
    try {
      await authAPI.logout();
    } catch (_) {}
    disconnect();
    logout();
    navigate("/login");
  };

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <span className="text-2xl">🚖</span>
          <span className="font-bold text-xl text-orange-500">ChaloRide</span>
        </Link>

        {/* Nav links */}
        {isAuthenticated && (
          <div className="hidden md:flex items-center gap-1">
            {user?.role === "passenger" ? (
              <>
                <NavLink to="/dashboard" active={isActive("/dashboard")}>Dashboard</NavLink>
                <NavLink to="/book" active={isActive("/book")}>Book Ride</NavLink>
                <NavLink to="/history" active={isActive("/history")}>History</NavLink>
              </>
            ) : (
              <>
                <NavLink to="/driver" active={isActive("/driver")}>Driver Panel</NavLink>
                <NavLink to="/history" active={isActive("/history")}>History</NavLink>
              </>
            )}
          </div>
        )}

        {/* Right side */}
        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <>
              <div className="hidden md:flex items-center gap-2">
                <span className="text-sm text-gray-500">Hi, {user?.name?.split(" ")[0]}</span>
                <span
                  className={`text-xs px-2 py-1 rounded-full font-medium ${
                    user?.role === "driver"
                      ? "bg-blue-100 text-blue-700"
                      : "bg-orange-100 text-orange-700"
                  }`}
                >
                  {user?.role}
                </span>
              </div>
              <button onClick={handleLogout} className="btn-secondary text-sm py-1.5 px-3">
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn-secondary text-sm py-1.5 px-4">Login</Link>
              <Link to="/register" className="btn-primary text-sm py-1.5 px-4">Sign Up</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

const NavLink = ({ to, children, active }) => (
  <Link
    to={to}
    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
      active
        ? "bg-orange-50 text-orange-600"
        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
    }`}
  >
    {children}
  </Link>
);

export default Navbar;
