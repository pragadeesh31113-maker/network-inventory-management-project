// frontend/src/api.ts
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8000/api', // Your FastAPI backend
});

// This is an "interceptor"
// It automatically adds the login token (if we have one)
// to every single API request we make.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;