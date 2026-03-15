import { Navigate, useLocation } from "react-router-dom";
import useStore from "../store/useStore";

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { isAuthenticated, user } = useStore();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default ProtectedRoute;
