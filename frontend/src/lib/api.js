import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'https://apiphilatelic.servicetiers.fr';

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

// Catégories & Styles API
export const categoriesApi = {
  getAll: () => api.get('/categories'),
  create: (name) => api.post('/categories', { name }),
  delete: (id) => api.delete(`/categories/${id}`)
};

export const stylesApi = {
  getAll: () => api.get('/styles'),
  create: (name) => api.post('/styles', { name }),
  delete: (id) => api.delete(`/styles/${id}`)
};

export const colorsApi = {
  getAll: () => api.get('/colors'),
  create: (name) => api.post('/colors', { name }),
  delete: (id) => api.delete(`/colors/${id}`)
};

// Orders API
export const ordersApi = {
  create: (data) => api.post('/orders', data),
  getById: (id) => api.get(`/orders/${id}`),
  track: (trackingCode, email) => api.get(`/orders/track/${trackingCode}`, { params: { email } }),
  confirmReception: (trackingCode, email) => {
    // Utilise fetch natif pour éviter les problèmes CORS avec axios
    return fetch(`${API_URL}/api/orders/track/${trackingCode}/confirm-reception`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ customer_email: email }),
    }).then(async (res) => {
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw { response: { data, status: res.status } };
      }
      return { data: await res.json() };
    });
  },
  cancelPending: (id) => api.delete(`/orders/${id}/cancel`),
  downloadPdf: (trackingCode) => `${API_URL}/api/orders/track/${trackingCode}/pdf`,
  getAll: (params = {}) => api.get('/admin/orders', { params }),
  getAllArchived: (params = {}) => api.get('/admin/orders', { params: { ...params, archived: true } }),
  updateStatus: (id, status) => api.put(`/admin/orders/${id}/status`, null, { params: { status } }),
  update: (id, data) => api.put(`/admin/orders/${id}`, data),
  delete: (id) => api.delete(`/admin/orders/${id}`),
  archive: (id) => api.post(`/admin/orders/${id}/archive`),
  unarchive: (id) => api.post(`/admin/orders/${id}/unarchive`),
  getForPrint: (id) => api.get(`/admin/orders/${id}/print`),
  downloadAdminPdf: async (id) => {
    const response = await api.get(`/admin/orders/${id}/pdf`, { responseType: 'blob' });
    return response;
  }
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
  analyze: (imageBase64, provider = 'gemini') => api.post('/ai/analyze', { 
    image_base64: imageBase64,
    provider: provider 
  }),
  checkStatus: () => api.get('/ai/status'),
  generateClassificationId: (data) => api.post('/ai/generate-classification-id', data)
};

// Admin API
export const adminApi = {
  getStats: () => api.get('/admin/stats'),
  getOrders: (params = {}) => api.get('/admin/orders', { params })
};

export default api;