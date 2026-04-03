// Centralized API Client
// All communication with the backend goes through this module.

const appEnv = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env : {};
const BASE_URL = appEnv.VITE_API_URL || '/api';
const REQUEST_TIMEOUT_MS = Number(appEnv.VITE_API_TIMEOUT_MS || 15000);
const inflightGetRequests = new Map();
const CSRF_COOKIE_NAME = 'csrf_token';

export class ApiError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = options.status || 0;
    this.code = options.code || '';
    this.details = options.details || null;
    this.userMessage = options.userMessage || message;
    this.isNetworkError = Boolean(options.isNetworkError);
    this.isTimeout = Boolean(options.isTimeout);
    this.canRetry =
      options.canRetry ??
      (this.isNetworkError || this.isTimeout || this.status >= 500);
  }
}

const getCookieValue = (name) => {
  if (typeof document === 'undefined') return '';
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}=([^;]*)`),
  );
  return match ? decodeURIComponent(match[1]) : '';
};

function createNetworkError(message, options = {}) {
  return new ApiError(message, {
    isNetworkError: true,
    canRetry: true,
    ...options,
  });
}

async function request(method, path, data = null, isFormData = false) {
  const isMultipartPayload =
    isFormData || (typeof FormData !== 'undefined' && data instanceof FormData);
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;

  const options = {
    method,
    credentials: 'include',
    headers: {},
    signal: controller?.signal,
  };

  const csrfToken = getCookieValue(CSRF_COOKIE_NAME);
  if (csrfToken && !['GET', 'HEAD'].includes(method.toUpperCase())) {
    options.headers['X-CSRF-Token'] = csrfToken;
  }

  if (data) {
    if (isMultipartPayload) {
      options.body = data;
    } else {
      options.headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(data);
    }
  }

  const url = `${BASE_URL}${path}`;
  const requestKey = method === 'GET' ? JSON.stringify({ method, url }) : null;

  if (requestKey && inflightGetRequests.has(requestKey)) {
    return inflightGetRequests.get(requestKey);
  }

  const executeRequest = async () => {
    let timeoutId;

    try {
      if (controller && typeof window !== 'undefined') {
        timeoutId = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
      }

      const response = await fetch(url, options);
      const contentType = response.headers.get('content-type') || '';
      const json = contentType.includes('application/json')
        ? await response.json().catch(() => ({}))
        : {};

      if (!response.ok) {
        throw new ApiError(json.message || `Request failed with status ${response.status}`, {
          status: response.status,
          code: json.code || '',
          details: json,
          userMessage:
            json.message ||
            (response.status >= 500
              ? 'The server hit a problem. Please try again.'
              : 'We could not complete that request.'),
        });
      }

      return json;
    } catch (error) {
      if (error?.name === 'AbortError') {
        throw createNetworkError('The request took too long to complete.', {
          isTimeout: true,
          userMessage: 'The request timed out. Please try again.',
        });
      }

      if (error instanceof ApiError) {
        throw error;
      }

      throw createNetworkError('Unable to reach the server.', {
        userMessage:
          typeof navigator !== 'undefined' && navigator.onLine === false
            ? 'No internet connection. Check your network and try again.'
            : 'Network issue detected. Please try again.',
      });
    } finally {
      if (timeoutId && typeof window !== 'undefined') {
        window.clearTimeout(timeoutId);
      }
    }
  };

  const requestPromise = executeRequest();

  if (requestKey) {
    inflightGetRequests.set(requestKey, requestPromise);
    requestPromise.finally(() => {
      if (inflightGetRequests.get(requestKey) === requestPromise) {
        inflightGetRequests.delete(requestKey);
      }
    });
  }

  return requestPromise;
}

const get = (path) => request('GET', path);
const post = (path, data, isFormData = false) => request('POST', path, data, isFormData);
const put = (path, data, isFormData = false) => request('PUT', path, data, isFormData);
const patch = (path, data) => request('PATCH', path, data);
const del = (path) => request('DELETE', path);

export const authApi = {
  login: (email, password) => post('/auth/restaurant/login', { email, password }),
  adminLogin: (email, password) => post('/auth/admin/login', { email, password }),
  register: (ownerName, email, password, name) => post('/auth/register', { ownerName, email, password, name }),
  initiateRegister: (ownerName, email, password, name) =>
    post('/auth/register/initiate', { ownerName, email, password, name }),
  verifyRegister: (email, otp) => post('/auth/register/verify', { email, otp }),
  logout: () => post('/auth/logout'),
  me: () => get('/auth/me'),
};

export const publicApi = {
  getMenu: (slug) => get(`/public/menu/${slug}`),
  getContext: (slug, qrToken) => get(`/public/context/${slug}/${qrToken}`),
  getRecommendations: (payload) => post('/public/recommendations', payload),
  getSessionOrders: () => get('/public/orders/session'),
};

export const paymentsApi = {
  createOrder: (orderData) => post('/payments/create-order', orderData),
  verifyOrder: (orderRef) => post('/payments/verify-order', { orderRef }),
};

export const restaurantApi = {
  getProfile: () => get('/restaurant/profile'),
  updateProfile: (data) => put('/restaurant/profile', data, data instanceof FormData),
  uploadLogo: (file) => {
    const fd = new FormData();
    fd.append('image', file);
    return post('/restaurant/upload/logo', fd, true);
  },
  uploadCover: (file) => {
    const fd = new FormData();
    fd.append('image', file);
    return post('/restaurant/upload/cover', fd, true);
  },
  changePassword: (currentPassword, newPassword) =>
    put('/restaurant/change-password', { currentPassword, newPassword }),
  requestEmailChangeOtp: (newEmail) => post('/restaurant/change-email/request-otp', { newEmail }),
  verifyEmailChangeOtp: (newEmail, otp) => post('/restaurant/change-email/verify-otp', { newEmail, otp }),
  getAnalytics: () => get('/restaurant/analytics'),
  getPayouts: () => get('/restaurant/payouts'),
  updateOperatingHours: (operatingHours) => put('/restaurant/operating-hours', { operatingHours }),
};

export const menuApi = {
  getCategories: () => get('/menu/categories'),
  createCategory: (name) => post('/menu/categories', { name }),
  updateCategory: (id, data) => put(`/menu/categories/${id}`, data),
  deleteCategory: (id) => del(`/menu/categories/${id}`),
  toggleCategory: (id) => patch(`/menu/categories/${id}/toggle`),
  reorderCategories: (orderedIds) => put('/menu/categories-reorder', { orderedIds }),
  getItems: (categoryId) => get(`/menu/items${categoryId ? `?categoryId=${categoryId}` : ''}`),
  createItem: (data) => {
    if (data instanceof FormData) return post('/menu/items', data, true);
    return post('/menu/items', data);
  },
  updateItem: (id, data) => {
    if (data instanceof FormData) return put(`/menu/items/${id}`, data, true);
    return put(`/menu/items/${id}`, data);
  },
  deleteItem: (id) => del(`/menu/items/${id}`),
  toggleItem: (id) => patch(`/menu/items/${id}/toggle`),
  reorderItems: (orderedIds) => put('/menu/items-reorder', { orderedIds }),
};

export const tablesApi = {
  getTables: () => get('/tables'),
  createTable: (tableName, tableNumber) => post('/tables', { tableName, tableNumber }),
  bulkCreateTables: (count, startFrom, prefix) => post('/tables/bulk', { count, startFrom, prefix }),
  updateTable: (id, tableName) => put(`/tables/${id}`, { tableName }),
  toggleTable: (id) => patch(`/tables/${id}/toggle`),
  deleteTable: (id) => del(`/tables/${id}`),
  deleteAllTables: () => del('/tables/all'),
  regenerateQR: (id) => patch(`/tables/${id}/regenerate-qr`),
};

export const ordersApi = {
  getOrders: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return get(`/orders${qs ? `?${qs}` : ''}`);
  },
  getLiveOrders: () => get('/orders/live'),
  getStats: () => get('/orders/stats'),
  getDailyEarnings: () => get('/orders/daily-earnings'),
  getDailyEarningsSummary: () => get('/orders/daily-earnings-summary'),
  updateStatus: (id, status) => patch(`/orders/${id}/status`, { status }),
  verifyPin: (id, pin) => post(`/orders/${id}/verify-pin`, { pin }),
  resendPin: (id) => post(`/orders/${id}/resend-pin`),
};

export const adminApi = {
  getDashboard: () => get('/admin/dashboard'),
  getRestaurants: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return get(`/admin/restaurants${qs ? `?${qs}` : ''}`);
  },
  createRestaurant: (data) => post('/admin/restaurants', data),
  updateRestaurant: (id, data) => put(`/admin/restaurants/${id}`, data),
  toggleRestaurant: (id) => patch(`/admin/restaurants/${id}/toggle`),
  deleteRestaurant: (id) => del(`/admin/restaurants/${id}`),
  resetPassword: (id) => patch(`/admin/restaurants/${id}/reset-password`),
  getOrders: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return get(`/admin/orders${qs ? `?${qs}` : ''}`);
  },
  getPlans: () => get('/admin/plans'),
  createPlan: (data) => post('/admin/plans', data),
  updatePlan: (id, data) => put(`/admin/plans/${id}`, data),
  deletePlan: (id) => del(`/admin/plans/${id}`),
  togglePlan: (id) => patch(`/admin/plans/${id}/toggle`),
  getSubscriptions: () => get('/admin/subscriptions'),
  grantSubscription: (data) => post('/admin/subscriptions/grant', data),
  getSettings: () => get('/admin/settings'),
  getPayouts: () => get('/admin/payouts'),
  createPayout: (data) => post('/admin/payouts', data),
  updatePayout: (id, data) => put(`/admin/payouts/${id}`, data),
  deletePayout: (id) => del(`/admin/payouts/${id}`),
  getEarningsOverview: () => get('/admin/earnings-overview'),
  quickSendPayout: (data) => post('/admin/payouts/quick-send', data),
};

export const couponsApi = {
  getCoupons: () => get('/coupons'),
  createCoupon: (data) => post('/coupons', data),
  updateCoupon: (id, data) => put(`/coupons/${id}`, data),
  deleteCoupon: (id) => del(`/coupons/${id}`),
};

export const subscriptionApi = {
  getSubscription: () => get('/restaurant/subscription'),
  getHistory: () => get('/restaurant/subscription/history'),
  getPlans: () => get('/restaurant/plans'),
  cancelSubscription: () => post('/restaurant/subscription/cancel'),
  createPaymentOrder: (planId, returnUrl) => post('/sub-payments/create-order', { planId, returnUrl }),
  verifyPaymentOrder: (checkoutId) => post('/sub-payments/verify-order', { checkoutId }),
};
