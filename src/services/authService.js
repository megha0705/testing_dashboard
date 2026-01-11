import { API_BASE_URL } from '../config/config';
import { jwtDecode } from 'jwt-decode'; // NEW: Import jwt-decode library

export const authService = {
  register: async (userData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData)
      });

      // Try to parse JSON response
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        // If we got JSON with a message, use it
        const errorMessage = data?.message || data?.error || `Registration failed (${response.status})`;
        throw new Error(errorMessage);
      }

      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

login: async (credentials) => {
   try {
     const response = await fetch(`${API_BASE_URL}/auth/login`, {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify(credentials),
     });
     const data = await response.json().catch(() => null);
     if (!response.ok) {
       const errorMessage = data?.message || data?.error || 'Login failed. Please check your credentials.';
       throw new Error(errorMessage);
     }
     // Store token if returned
     if (data?.token) {
       localStorage.setItem('authToken', data.token);
       try {
         const decoded = jwtDecode(data.token);
         // ✅ CORRECT ROLE EXTRACTION (matches your JWT)
         const userRole = decoded?.roles?.[0]?.authority || 'USER';
         console.log('Extracted role:', userRole);

        if (userRole === "ROLE_ADMIN") {
          localStorage.setItem("admin_token", data.token);
        } else if (userRole === "ROLE_LAB") {
          localStorage.setItem("lab_token", data.token);
        }

         return {
           success: true,
           data: { token: data.token, role: userRole, decoded },
         };
       } catch (decodeError) {
         console.error('Error decoding token:', decodeError);
         return { success: true, data: { token: data.token } };
       }
     }
     return { success: true, data };
   } catch (error) {
     return { success: false, error: error.message };
   }
}
}