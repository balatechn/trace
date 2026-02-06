import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

// Create axios instance
export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        const refreshToken = localStorage.getItem('refresh_token');
        if (refreshToken) {
          const response = await axios.post(`${API_URL}/auth/refresh`, {
            refresh_token: refreshToken,
          });
          
          const { access_token, refresh_token } = response.data;
          localStorage.setItem('access_token', access_token);
          localStorage.setItem('refresh_token', refresh_token);
          
          originalRequest.headers.Authorization = `Bearer ${access_token}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/login';
      }
    }
    
    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  
  logout: () => api.post('/auth/logout'),
  
  register: (data: { email: string; password: string; full_name: string; department?: string }) =>
    api.post('/auth/register', data),
  
  getMe: () => api.get('/auth/me'),
  
  giveConsent: (consent_given: boolean, privacy_policy_accepted: boolean) =>
    api.post('/auth/consent', { consent_given, privacy_policy_accepted }),
};

// Users API
export const usersApi = {
  list: (params?: { page?: number; per_page?: number; search?: string; department?: string; role?: string }) =>
    api.get('/users', { params }),
  
  get: (id: string) => api.get(`/users/${id}`),
  
  create: (data: any) => api.post('/users', data),
  
  update: (id: string, data: any) => api.patch(`/users/${id}`, data),
  
  delete: (id: string) => api.delete(`/users/${id}`),
  
  activate: (id: string) => api.post(`/users/${id}/activate`),
  
  changePassword: (current_password: string, new_password: string) =>
    api.post('/users/me/change-password', { current_password, new_password }),
};

// Devices API
export const devicesApi = {
  list: (params?: { page?: number; per_page?: number; search?: string; department?: string; status?: string }) =>
    api.get('/devices', { params }),
  
  get: (id: string) => api.get(`/devices/${id}`),
  
  create: (data: any) => api.post('/devices', data),
  
  update: (id: string, data: any) => api.patch(`/devices/${id}`, data),
  
  delete: (id: string) => api.delete(`/devices/${id}`),
  
  lock: (id: string, reason: string) => api.post(`/devices/${id}/lock`, { reason }),
  
  unlock: (id: string) => api.post(`/devices/${id}/unlock`),
  
  wipe: (id: string, reason: string, confirm: boolean) =>
    api.post(`/devices/${id}/wipe`, { reason, confirm }),
  
  getStats: () => api.get('/devices/stats/summary'),
};

// Locations API
export const locationsApi = {
  getAll: (params?: { department?: string }) =>
    api.get('/locations/all', { params }),
  
  getDevice: (deviceId: string) => api.get(`/locations/${deviceId}`),
  
  getHistory: (deviceId: string, params?: { start_date?: string; end_date?: string; limit?: number }) =>
    api.get(`/locations/${deviceId}/history`, { params }),
  
  exportHistory: (deviceId: string, params?: { start_date?: string; end_date?: string; format?: string }) =>
    api.get(`/locations/${deviceId}/export`, { params }),
};

// Geofences API
export const geofencesApi = {
  list: (params?: { is_active?: boolean; department?: string }) =>
    api.get('/geofences', { params }),
  
  get: (id: string) => api.get(`/geofences/${id}`),
  
  create: (data: any) => api.post('/geofences', data),
  
  update: (id: string, data: any) => api.patch(`/geofences/${id}`, data),
  
  delete: (id: string) => api.delete(`/geofences/${id}`),
  
  checkPoint: (id: string, latitude: number, longitude: number) =>
    api.post(`/geofences/${id}/check`, { latitude, longitude }),
};

// Alerts API
export const alertsApi = {
  list: (params?: {
    page?: number;
    per_page?: number;
    alert_type?: string;
    severity?: string;
    is_acknowledged?: boolean;
    is_resolved?: boolean;
    device_id?: string;
  }) => api.get('/alerts', { params }),
  
  get: (id: string) => api.get(`/alerts/${id}`),
  
  getStats: () => api.get('/alerts/stats'),
  
  acknowledge: (id: string, notes?: string) =>
    api.post(`/alerts/${id}/acknowledge`, { notes }),
  
  resolve: (id: string, notes?: string) =>
    api.post(`/alerts/${id}/resolve`, { notes }),
};

// Audit API
export const auditApi = {
  list: (params?: {
    page?: number;
    per_page?: number;
    action?: string;
    user_id?: string;
    target_type?: string;
    start_date?: string;
    end_date?: string;
  }) => api.get('/audit', { params }),
  
  getSummary: (days?: number) => api.get('/audit/summary', { params: { days } }),
  
  getDeviceLogs: (deviceId: string, params?: { page?: number; per_page?: number }) =>
    api.get(`/audit/device/${deviceId}`, { params }),
  
  getUserLogs: (userId: string, params?: { page?: number; per_page?: number }) =>
    api.get(`/audit/user/${userId}`, { params }),
};

export default api;
