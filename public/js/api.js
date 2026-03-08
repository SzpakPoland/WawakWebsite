const API_BASE = '/api';

async function apiFetch(path, options = {}) {
  const token = localStorage.getItem('sw_token');
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (options.body instanceof FormData) { delete headers['Content-Type']; }

  const res = await fetch(API_BASE + path, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

const API = {
  // Auth
  login: (username, password) => apiFetch('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  logout: () => apiFetch('/auth/logout', { method: 'POST' }),
  me: () => apiFetch('/auth/me'),
  updateProfile: (data) => apiFetch('/auth/profile', { method: 'PUT', body: JSON.stringify(data) }),
  uploadAvatar: (formData) => apiFetch('/auth/avatar', { method: 'POST', body: formData, headers: {} }),

  // Users
  getUsers: () => apiFetch('/users'),
  createUser: (data) => apiFetch('/users', { method: 'POST', body: JSON.stringify(data) }),
  updateUser: (id, data) => apiFetch(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteUser: (id) => apiFetch(`/users/${id}`, { method: 'DELETE' }),
  getRoles: () => apiFetch('/users/roles/list'),
  createRole: (data) => apiFetch('/users/roles', { method: 'POST', body: JSON.stringify(data) }),
  deleteRole: (id) => apiFetch(`/users/roles/${id}`, { method: 'DELETE' }),
  getAllPermissions: () => apiFetch('/users/permissions/all'),
  getRolePermissions: (roleId) => apiFetch(`/users/roles/${roleId}/permissions`),
  setRolePermissions: (roleId, permissions) => apiFetch(`/users/roles/${roleId}/permissions`, { method: 'PUT', body: JSON.stringify({ permissions }) }),
  getUserPermissions: (userId) => apiFetch(`/users/${userId}/permissions`),
  setUserPermissions: (userId, permissions) => apiFetch(`/users/${userId}/permissions`, { method: 'PUT', body: JSON.stringify({ permissions }) }),

  // Announcements
  getAnnouncements: () => apiFetch('/announcements'),
  getAllAnnouncements: () => apiFetch('/announcements/all'),
  uploadAnnouncementImage: (fd) => apiFetch('/announcements/upload-image', { method: 'POST', body: fd, headers: {} }),
  getAnnouncement: (id) => apiFetch(`/announcements/${id}`),
  createAnnouncement: (data) => apiFetch('/announcements', { method: 'POST', body: JSON.stringify(data) }),
  updateAnnouncement: (id, data) => apiFetch(`/announcements/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteAnnouncement: (id) => apiFetch(`/announcements/${id}`, { method: 'DELETE' }),

  // Gallery
  getGallery: () => apiFetch('/gallery'),
  uploadPhoto: (formData) => apiFetch('/gallery', { method: 'POST', body: formData, headers: {} }),
  updatePhoto: (id, data) => apiFetch(`/gallery/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deletePhoto: (id) => apiFetch(`/gallery/${id}`, { method: 'DELETE' }),

  // Staff
  getStaff: () => apiFetch('/staff'),
  getAllStaff: () => apiFetch('/staff/all'),
  createStaffMember: (formData) => apiFetch('/staff', { method: 'POST', body: formData, headers: {} }),
  updateStaffMember: (id, formData) => apiFetch(`/staff/${id}`, { method: 'PUT', body: formData, headers: {} }),
  deleteStaffMember: (id) => apiFetch(`/staff/${id}`, { method: 'DELETE' }),

  // Upload quotas (superadmin only)
  getUploadLimits: () => apiFetch('/users/upload-limits'),
  getUserUploadLimit: (id) => apiFetch(`/users/${id}/upload-limit`),
  setUserUploadLimit: (id, limitMb) => apiFetch(`/users/${id}/upload-limit`, { method: 'PUT', body: JSON.stringify({ limit_mb: limitMb }) }),

  // Logs
  getLogs: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return apiFetch(`/logs${q ? '?' + q : ''}`);
  },
  getLogCategories: () => apiFetch('/logs/categories'),

  // Suggestions
  submitSuggestion: (data) => apiFetch('/suggestions', { method: 'POST', body: JSON.stringify(data) }),
  getSuggestions: (params = {}) => { const q = new URLSearchParams(params).toString(); return apiFetch(`/suggestions${q ? '?' + q : ''}`); },
  updateSuggestion: (id, data) => apiFetch(`/suggestions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteSuggestion: (id) => apiFetch(`/suggestions/${id}`, { method: 'DELETE' }),

  // Discounts
  getDiscounts: () => apiFetch('/discounts'),
  getAllDiscounts: () => apiFetch('/discounts/all'),
  uploadDiscount: (formData) => apiFetch('/discounts', { method: 'POST', body: formData, headers: {} }),
  updateDiscount: (id, data) => apiFetch(`/discounts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteDiscount: (id) => apiFetch(`/discounts/${id}`, { method: 'DELETE' }),
};

// Global toast helper
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3100);
}

function showLoading(show) {
  const el = document.getElementById('loading-overlay');
  if (show) el.classList.remove('hidden');
  else el.classList.add('hidden');
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('pl-PL', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDateTime(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function renderAvatar(user) {
  if (user && user.avatar_url) {
    return `<div class="user-avatar"><img src="${escapeHtml(user.avatar_url)}" alt="${escapeHtml(user.display_name)}" /></div>`;
  }
  const initials = (user && user.display_name) ? user.display_name.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase() : '?';
  return `<div class="user-avatar">${initials}</div>`;
}

function openModal(contentHtml, wide = false) {
  const overlay = document.getElementById('modal-overlay');
  const box = document.getElementById('modal-box');
  document.getElementById('modal-content').innerHTML = contentHtml;
  overlay.classList.remove('hidden');
  if (wide) box.style.maxWidth = '720px'; else box.style.maxWidth = '540px';
}

function closeModal() {
  document.getElementById('modal-overlay').classList.add('hidden');
  document.getElementById('modal-content').innerHTML = '';
}
