import { jwtDecode } from 'jwt-decode';

export const getAuthData = () => {
  const token = localStorage.getItem('authToken');
  if (!token) return null;

  try {
    const decoded = jwtDecode(token);

    // check expiry
    if (decoded.exp * 1000 < Date.now()) {
      localStorage.removeItem('authToken');
      return null;
    }

    const role = decoded?.roles?.[0]?.authority || 'USER';

    return { token, role };
  } catch {
    localStorage.removeItem('authToken');
    return null;
  }
};
