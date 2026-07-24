import client from "./client";

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------
export const authApi = {
  login: (email, password) => client.post("/api/auth/login", { email, password }),
  register: (payload) => client.post("/api/auth/register", payload),
  me: () => client.get("/api/auth/me"),
  profile: () => client.get("/api/auth/profile"),
  updateProfile: (payload) => client.put("/api/auth/profile", payload),
  changePassword: (payload) => client.put("/api/auth/change-password", payload),
};

// ---------------------------------------------------------------------------
// Common
// ---------------------------------------------------------------------------
export const commonApi = {
  categories: () => client.get("/api/categories"),
  publicSettings: () => client.get("/api/settings/public"),
  notifications: () => client.get("/api/notifications"),
  unreadCount: () => client.get("/api/notifications/unread-count"),
  markRead: (id) => client.post(`/api/notifications/${id}/read`),
  markAllRead: () => client.post("/api/notifications/read-all"),
};

// ---------------------------------------------------------------------------
// AI Chat
// ---------------------------------------------------------------------------
export const chatApi = {
  sendMessage: (message) => client.post("/api/chat", { message }),
};

// ---------------------------------------------------------------------------
// Uploads
// ---------------------------------------------------------------------------
export const uploadApi = {
  image: (file) => {
    const formData = new FormData();
    formData.append("file", file);
    return client.post("/api/uploads/image", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
};

// ---------------------------------------------------------------------------
// Consumer
// ---------------------------------------------------------------------------
export const consumerApi = {
  listAddresses: () => client.get("/api/consumer/addresses"),
  createAddress: (payload) => client.post("/api/consumer/addresses", payload),
  updateAddress: (id, payload) => client.put(`/api/consumer/addresses/${id}`, payload),
  deleteAddress: (id) => client.delete(`/api/consumer/addresses/${id}`),

  createRequest: (payload) => client.post("/api/consumer/requests", payload),
  listRequests: (status) => client.get("/api/consumer/requests", { params: status ? { status } : {} }),
  getRequest: (id) => client.get(`/api/consumer/requests/${id}`),
  acceptQuote: (id) => client.post(`/api/consumer/requests/${id}/accept-quote`),
  rejectQuote: (id) => client.post(`/api/consumer/requests/${id}/reject-quote`),
  cancelRequest: (id) => client.post(`/api/consumer/requests/${id}/cancel`),
};

// ---------------------------------------------------------------------------
// Centre
// ---------------------------------------------------------------------------
export const centreApi = {
  listRequests: (scope) => client.get("/api/centre/requests", { params: { scope } }),
  getRequest: (id) => client.get(`/api/centre/requests/${id}`),
  quote: (id, payload) => client.post(`/api/centre/requests/${id}/quote`, payload),
  listPartners: () => client.get("/api/centre/partners"),
  assignPartner: (id, partnerUserId) => client.post(`/api/centre/requests/${id}/assign`, { partner_user_id: partnerUserId }),
  completeRequest: (id) => client.post(`/api/centre/requests/${id}/complete`),
  inventory: () => client.get("/api/centre/inventory"),
  dashboard: () => client.get("/api/centre/dashboard"),
};

// ---------------------------------------------------------------------------
// Partner
// ---------------------------------------------------------------------------
export const partnerApi = {
  listRequests: (scope) => client.get("/api/partner/requests", { params: { scope } }),
  getRequest: (id) => client.get(`/api/partner/requests/${id}`),
  startPickup: (id) => client.post(`/api/partner/requests/${id}/start`),
  verifyOtp: (id, payload) => client.post(`/api/partner/requests/${id}/verify-otp`, payload),
  deliver: (id) => client.post(`/api/partner/requests/${id}/deliver`),
  dashboard: () => client.get("/api/partner/dashboard"),
};

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------
export const adminApi = {
  dashboard: () => client.get("/api/admin/dashboard"),
  listUsers: (role) => client.get("/api/admin/users", { params: role ? { role } : {} }),
  toggleActive: (id) => client.patch(`/api/admin/users/${id}/toggle-active`),
  listCategories: () => client.get("/api/admin/categories"),
  createCategory: (payload) => client.post("/api/admin/categories", payload),
  updateCategory: (id, payload) => client.put(`/api/admin/categories/${id}`, payload),
  deleteCategory: (id) => client.delete(`/api/admin/categories/${id}`),
  listSettings: () => client.get("/api/admin/settings"),
  updateSetting: (key, value) => client.put(`/api/admin/settings/${key}`, { value }),
  listCentres: () => client.get("/api/admin/centres"),
  listPartners: () => client.get("/api/admin/partners"),
  listAllRequests: (status) => client.get("/api/admin/requests", { params: status ? { status } : {} }),
};
