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
  publicImpact: () => client.get("/api/impact/public"),
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
// Support tickets (shared across roles)
// ---------------------------------------------------------------------------
export const supportApi = {
  listMine: () => client.get("/api/support/tickets"),
  get: (id) => client.get(`/api/support/tickets/${id}`),
  create: (payload) => client.post("/api/support/tickets", payload),
  addMessage: (id, payload) => client.post(`/api/support/tickets/${id}/messages`, payload),
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
  acceptQuote: (id, payload) => client.post(`/api/consumer/requests/${id}/accept-quote`, payload),
  rejectQuote: (id) => client.post(`/api/consumer/requests/${id}/reject-quote`),
  cancelRequest: (id) => client.post(`/api/consumer/requests/${id}/cancel`),
  rateRequest: (id, payload) => client.post(`/api/consumer/requests/${id}/rate`, payload),
  impact: () => client.get("/api/consumer/impact"),
};

// ---------------------------------------------------------------------------
// Centre
// ---------------------------------------------------------------------------
export const centreApi = {
  listRequests: (scope) => client.get("/api/centre/requests", { params: { scope } }),
  getRequest: (id) => client.get(`/api/centre/requests/${id}`),
  quote: (id, payload) => client.post(`/api/centre/requests/${id}/quote`, payload),
  completeRequest: (id) => client.post(`/api/centre/requests/${id}/complete`),
  inventory: (status) => client.get("/api/centre/inventory", { params: status ? { status } : {} }),
  dispatchInventory: (itemIds, recyclerName) => client.post("/api/centre/inventory/dispatch", { item_ids: itemIds, recycler_name: recyclerName }),
  recycleInventory: (itemIds) => client.post("/api/centre/inventory/recycle", { item_ids: itemIds }),
  capacity: () => client.get("/api/centre/capacity"),
  dashboard: () => client.get("/api/centre/dashboard"),
  analytics: () => client.get("/api/centre/analytics"),
};

// ---------------------------------------------------------------------------
// Partner
// ---------------------------------------------------------------------------
export const partnerApi = {
  getAvailableRequests: () => client.get("/api/partner/available-requests"),
  acceptRequest: (id) => client.post(`/api/partner/requests/${id}/accept`),
  listRequests: (scope) => client.get("/api/partner/requests", { params: { scope } }),
  getRequest: (id) => client.get(`/api/partner/requests/${id}`),
  startPickup: (id) => client.post(`/api/partner/requests/${id}/start`),
  updateWeights: (id, payload) => client.post(`/api/partner/requests/${id}/weights`, payload),
  verifyOtp: (id, payload) => client.post(`/api/partner/requests/${id}/verify-otp`, payload),
  deliver: (id) => client.post(`/api/partner/requests/${id}/deliver`),
  dashboard: () => client.get("/api/partner/dashboard"),
  setAvailability: (available) => client.patch("/api/partner/availability", null, { params: { available } }),
  earnings: () => client.get("/api/partner/earnings"),
};

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------
export const adminApi = {
  dashboard: () => client.get("/api/admin/dashboard"),
  analytics: () => client.get("/api/admin/analytics"),
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
  revenue: () => client.get("/api/admin/revenue"),
  impact: () => client.get("/api/admin/impact"),
  auditLog: () => client.get("/api/admin/audit-log"),
  listTickets: (status) => client.get("/api/admin/support/tickets", { params: status ? { status } : {} }),
  respondToTicket: (id, payload) => client.put(`/api/admin/support/tickets/${id}`, payload),
  listPayouts: (status, type) => client.get("/api/admin/payouts", { params: { status, payout_type: type } }),
  retryPayout: (id) => client.post(`/api/admin/payouts/${id}/retry`),
  checkPayoutStatus: (id) => client.get(`/api/admin/payouts/${id}/status`),
  processPartnerPayout: (userId) => client.post(`/api/admin/payouts/process-partner/${userId}`),
};
