const API_BASE_URL = process.env.REACT_APP_API_URL;

export const apiClient = async (endpoint, options = {}) => {
  const token = localStorage.getItem('authToken');

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers
    },
    ...options
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.message || 'API Error');
  }

  return data;
};
