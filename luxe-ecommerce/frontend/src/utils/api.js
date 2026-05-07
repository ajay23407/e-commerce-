import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL + '/api',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' }
});

// Attach token from localStorage
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('luxe_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401 globally
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('luxe_token');
      localStorage.removeItem('luxe_user');
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login?expired=1';
      }
    }
    return Promise.reject(err);
  }
);

export default api;
