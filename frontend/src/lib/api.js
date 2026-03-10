import axios from 'axios';

// Utilise la variable d'environnement OU localhost par défaut
const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

// Create axios instance with default config
const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add auth token to requests if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  const sessionId = localStorage.getItem('cart_session_id');
  if (sessionId) {
    config.headers['X-Session-ID'] = sessionId;
  }
  
  return config;
});

// Products API
export const productsApi = {
  getAll: (params = {}) => api.get('/products', { params }),
  getById: (id) => api.get(`/products/${id}`),
  create: (data) => api.post('/products', data),
  update: (id, data) => api.put(`/products/${id}`, data),
  delete: (id) => api.delete(`/products/${id}`),
  getStats: () => api.get('/products/stats/summary')
};

// Orders API
export const ordersApi = {
  create: (data) => api.post('/orders', data),
  getById: (id) => api.get(`/orders/${id}`),
  getAll: (params = {}) => api.get('/admin/orders', { params }),
  updateStatus: (id, status) => api.put(`/admin/orders/${id}/status`, null, { params: { status } })
};

// Payments API
export const paymentsApi = {
  createStripeCheckout: (orderId, originUrl) => 
    api.post('/payments/stripe/checkout', { order_id: orderId, origin_url: originUrl }),
  getStripeStatus: (sessionId) => 
    api.get(`/payments/stripe/status/${sessionId}`),
  createPayPalOrder: (orderId, originUrl) => 
    api.post('/payments/paypal/create', { order_id: orderId, origin_url: originUrl }),
  capturePayPalPayment: (paypalOrderId) => 
    api.post(`/payments/paypal/capture/${paypalOrderId}`)
};

// AI API
export const aiApi = {
  analyze: (imageBase64) => api.post('/ai/analyze', { image_base64: imageBase64 }),
  checkStatus: () => api.get('/ai/status')
};

// Admin API
export const adminApi = {
  getStats: () => api.get('/admin/stats'),
  getOrders: (params = {}) => api.get('/admin/orders', { params })
};

export default api;
