import axios from 'axios';

// Base API URL (from environment or default to localhost)
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Create axios instance
const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Request interceptor - Add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Log detailed error for debugging
    if (error.response) {
      console.error('API Error Response:', {
        status: error.response.status,
        data: error.response.data,
        url: error.config?.url,
      });
    } else if (error.request) {
      console.error('API No Response:', error.request);
    } else {
      console.error('API Error:', error.message);
    }

    if (error.response?.status === 401) {
      // Unauthorized - Clear token and redirect to login
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// API Methods
export const api = {
  // Auth
  login: (credentials) => apiClient.post('/auth/login', credentials),
  register: (userData) => apiClient.post('/auth/register', userData),
  logout: () => apiClient.post('/auth/logout'),
  getProfile: () => apiClient.get('/auth/profile'),

  // User Profile
  getUserProfile: () => apiClient.get('/user/me'),
  updateUserProfile: (formData) => apiClient.post('/user/update', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  }),
  updateUserAPIKeys: (data) => apiClient.post('/user/keys', data),

  // Projects
  getProjects: () => apiClient.get('/projects'),
  createProject: (data) => apiClient.post('/projects', data),
  getProject: (id) => apiClient.get(`/projects/${id}`),
  updateProject: (id, data) => apiClient.put(`/projects/${id}`, data),
  deleteProject: (id) => apiClient.delete(`/projects/${id}`),
  joinProject: (code) => apiClient.post('/projects/join', { code }),

  // Rooms
  getRooms: (projectId) => apiClient.get(`/projects/${projectId}/rooms`),
  createRoom: (projectId, data) => apiClient.post(`/projects/${projectId}/rooms`, data),
  getRoom: (id) => apiClient.get(`/rooms/${id}`),
  joinRoom: (id) => apiClient.post(`/rooms/${id}/join`),
  leaveRoom: (id) => apiClient.post(`/rooms/${id}/leave`),

  // Files
  getFiles: (projectId) => apiClient.get(`/projects/${projectId}/files`),
  createFile: (projectId, data) => apiClient.post(`/projects/${projectId}/files`, data),
  getFile: (id) => apiClient.get(`/files/${id}`),
  updateFile: (id, data) => apiClient.put(`/files/${id}`, data),
  deleteFile: (id) => apiClient.delete(`/files/${id}`),

  // Messages
  getMessages: (roomId, params) => apiClient.get(`/rooms/${roomId}/messages`, { params }),

  // AI
  sendAIRequest: (data) => apiClient.post('/ai/request', data),
  getAIHistory: (params) => apiClient.get('/ai/history', { params }),
  getAIStats: (params) => apiClient.get('/ai/stats', { params }),

  // User API Keys
  getUserAPIKeys: () => apiClient.get('/auth/api-keys'),
  updateAPIKey: (provider, data) => apiClient.put(`/auth/api-keys/${provider}`, data),
  deleteAPIKey: (provider) => apiClient.delete(`/auth/api-keys/${provider}`),

  // Call Sessions (Video)
  createCallToken: (roomId) => apiClient.post(`/rooms/${roomId}/call-token`),
  endCall: (roomId) => apiClient.post(`/rooms/${roomId}/end-call`),
  getCallHistory: (roomId) => apiClient.get(`/rooms/${roomId}/call-history`),

  // Direct axios methods for backward compatibility
  get: (url, config) => apiClient.get(url, config),
  post: (url, data, config) => apiClient.post(url, data, config),
  put: (url, data, config) => apiClient.put(url, data, config),
  delete: (url, config) => apiClient.delete(url, config),
  patch: (url, data, config) => apiClient.patch(url, data, config),
};

export default apiClient;
