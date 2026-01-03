import { Navigate } from 'react-router-dom';
import { getAuthData } from '../utils/authUtil';

const ProtectedRoute = ({ allowedRoles, children }) => {
  const auth = getAuthData();

  // ❌ Not logged in
  if (!auth) {
    return <Navigate to="/login" replace />;
  }

  // ❌ Logged in but wrong role
  if (allowedRoles && !allowedRoles.includes(auth.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  // ✅ Allowed
  return children;
};

export default ProtectedRoute;
