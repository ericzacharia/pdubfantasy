import axios from 'axios';

// API base URL - change this to your deployed backend URL
const API_BASE_URL = '/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Helper function to get token from either storage
const getToken = (key) => {
  return localStorage.getItem(key) || sessionStorage.getItem(key);
};

// Helper function to set token in the appropriate storage
const setToken = (key, value) => {
  // Store in localStorage if it already exists there, otherwise use sessionStorage
  if (localStorage.getItem(key) !== null) {
    localStorage.setItem(key, value);
  } else {
    sessionStorage.setItem(key, value);
  }
};

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = getToken('accessToken');
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

    // If error is 401 and we haven't retried yet, try refreshing token
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = getToken('refreshToken');
        const response = await axios.post(`${API_BASE_URL}/accounts/token/refresh/`, {
          refresh: refreshToken,
        });

        const { access } = response.data;
        setToken('accessToken', access);

        // Retry original request with new token
        originalRequest.headers.Authorization = `Bearer ${access}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed, logout user
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        sessionStorage.removeItem('accessToken');
        sessionStorage.removeItem('refreshToken');
        window.location.href = '/signin';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// API Methods

// Authentication
export const authAPI = {
  login: (credentials) => api.post('/accounts/token/', credentials),
  register: (userData) => api.post('/accounts/register/', userData),
  refreshToken: (refresh) => api.post('/accounts/token/refresh/', { refresh }),
  getProfile: () => api.get('/accounts/profile/'),
  updateProfile: (data) => api.patch('/accounts/profile/', data),

  // Generic methods for email management and other authenticated requests
  post: (endpoint, data) => {
    const url = `${API_BASE_URL}${endpoint}`;
    return axios.post(url, data, {
      headers: {
        'Authorization': `Bearer ${getToken('accessToken')}`,
        'Content-Type': 'application/json',
      },
    });
  },
  get: (endpoint) => {
    const url = `${API_BASE_URL}${endpoint}`;
    return axios.get(url, {
      headers: {
        'Authorization': `Bearer ${getToken('accessToken')}`,
      },
    });
  },
  delete: (endpoint) => {
    const url = `${API_BASE_URL}${endpoint}`;
    return axios.delete(url, {
      headers: {
        'Authorization': `Bearer ${getToken('accessToken')}`,
      },
    });
  },
};

// Blog
export const blogAPI = {
  // Blog Posts
  getPosts: (params) => api.get('/blog/posts/', { params }),
  getPostBySlug: (slug) => api.get(`/blog/posts/${slug}/`),
  createPost: (data) => api.post('/blog/posts/', data),
  updatePost: (slug, data) => api.patch(`/blog/posts/${slug}/`, data),
  deletePost: (slug) => api.delete(`/blog/posts/${slug}/`),

  // User's own blogs
  getMyBlogs: (params) => api.get('/blog/posts/my_blogs/', { params }),

  // Submission workflow
  submitForReview: (slug) => api.post(`/blog/posts/${slug}/submit_for_review/`),

  // Admin actions
  getPendingPosts: (params) => api.get('/blog/posts/pending_review/', { params }),
  approvePost: (slug) => api.post(`/blog/posts/${slug}/approve/`),
  rejectPost: (slug, reason) => api.post(`/blog/posts/${slug}/reject/`, { reason }),

  // Comments
  getComments: (postId) => api.get('/blog/comments/', { params: { post: postId } }),
  createComment: (data) => api.post('/blog/comments/', data),
  updateComment: (id, data) => api.patch(`/blog/comments/${id}/`, data),
  deleteComment: (id) => api.delete(`/blog/comments/${id}/`),
  toggleCommentLike: (commentId) => api.post(`/blog/comments/${commentId}/toggle_like/`),

  // Categories and Tags
  getCategories: () => api.get('/blog/categories/'),
  getTags: () => api.get('/blog/tags/'),
};

// Core (Testimonials, Clients, FAQs, Contact, Services)
export const coreAPI = {
  getTestimonials: () => api.get('/core/testimonials/'),
  getClients: () => api.get('/core/clients/'),
  getFAQs: () => api.get('/core/faqs/'),
  submitContact: (data) => api.post('/core/contact/', data),
  getServices: (params) => api.get('/core/services/', { params }),
  getServiceBySlug: (slug) => api.get(`/core/services/${slug}/`),
};

// Documents
export const documentsAPI = {
  getDocuments: () => api.get('/documents/'),
  getDocument: (id) => api.get(`/documents/${id}/`),
  downloadDocument: (id) => api.get(`/documents/${id}/download/`),
};

// Payments
export const paymentsAPI = {
  getPayments: () => api.get('/payments/'),
  createPaymentIntent: (data) => api.post('/payments/create-intent/', data),
  getInvoices: () => api.get('/payments/invoices/'),
  getInvoice: (id) => api.get(`/payments/invoices/${id}/`),
};

// Scheduling
export const schedulingAPI = {
  getAppointments: () => api.get('/scheduling/appointments/'),
  createAppointment: (data) => api.post('/scheduling/appointments/', data),
  getAvailability: () => api.get('/scheduling/availability/'),
};

// Admin Inspection (admin-only endpoints)
// Messaging
export const messagingAPI = {
  getConversations: ()                    => api.get('/messaging/conversations/'),
  getConversation:  (id)                  => api.get(`/messaging/conversations/${id}/`),
  sendMessage:      (id, content)         => api.post(`/messaging/conversations/${id}/messages/`, { content }),
  markAsRead:       (id)                  => api.post(`/messaging/conversations/${id}/read/`),
  createConversation: (data)              => api.post('/messaging/conversations/', data),
};

export const adminAPI = {
  getUsers: (params) => api.get('/accounts/admin/inspect/users/', { params }),
  getServices: (params) => api.get('/accounts/admin/inspect/services/', { params }),
  getBlogs: (params) => api.get('/accounts/admin/inspect/blogs/', { params }),
  getCategories: () => api.get('/accounts/admin/inspect/categories/'),
  getTags: () => api.get('/accounts/admin/inspect/tags/'),
  getStats: () => api.get('/accounts/admin/inspect/stats/'),
  getChatSessions: (params) => api.get('/accounts/admin/inspect/chat-sessions/', { params }),
};

export default api;
