// Centralized API endpoint constants (English comments per instructions)
export const API_PREFIX = '/api';

// Auth endpoints (Cookie/Session mode)
export const AUTH_LOGIN = `${API_PREFIX}/auth/login`;
export const AUTH_REGISTER = `${API_PREFIX}/auth/register`;
export const AUTH_LOGOUT = `${API_PREFIX}/auth/logout`;

// Current user (self)
export const SELF_PROFILE = `${API_PREFIX}/me`;

// Reviews
export const REVIEWS_BASE = `${API_PREFIX}/reviews`;
export const REVIEWS_LATEST = `${REVIEWS_BASE}/latest`;

// Subjects
export const SUBJECTS_BASE = `${API_PREFIX}/subjects`;
