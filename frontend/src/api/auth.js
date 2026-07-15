import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
});

/**
 * Login user — backend expects OAuth2 form-encoded data
 * (username field = email, password field = password)
 */
export const loginUser = async (email, password) => {
  const formData = new URLSearchParams();
  formData.append('username', email);
  formData.append('password', password);

  const response = await api.post('/auth/login', formData, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
  return response.data; // { access_token, token_type }
};

/**
 * Register a customer
 */
export const registerCustomer = async (data) => {
  const response = await api.post('/auth/register/customer', {
    name: data.name,
    email: data.email,
    password: data.password,
    phone_number: data.phone,
    role: 'CUSTOMER',
    address: data.address || 'N/A',
    postal_code: data.postalCode || '000000',
    city: data.city || null,
    state: data.state || null,
  });
  return response.data;
};

/**
 * Register a driver
 */
export const registerDriver = async (data) => {
  const response = await api.post('/auth/register/driver', {
    name: data.name,
    email: data.email,
    password: data.password,
    phone_number: data.phone,
    role: 'DRIVER',
    vehicle_type: data.vehicleType || null,
    vehicle_registration_number: data.vehicleRegNumber || 'PENDING',
    max_capacity_kg: data.maxCapacity || null,
  });
  return response.data;
};

/**
 * Register a recycling company (Segregation Centre)
 */
export const registerCompany = async (data) => {
  const response = await api.post('/auth/register/company', {
    name: data.name,
    email: data.email,
    password: data.password,
    phone_number: data.phone,
    role: 'RECYCLING_COMPANY',
    certification_id: data.certificationId || null,
    address: data.address || 'N/A',
    postal_code: data.postalCode || '000000',
    city: data.city || null,
    state: data.state || null,
  });
  return response.data;
};

/**
 * Store JWT token in localStorage
 */
export const storeToken = (tokenData) => {
  localStorage.setItem('access_token', tokenData.access_token);
  localStorage.setItem('token_type', tokenData.token_type);
};

/**
 * Get stored token
 */
export const getToken = () => {
  return localStorage.getItem('access_token');
};

/**
 * Remove stored token (logout)
 */
export const removeToken = () => {
  localStorage.removeItem('access_token');
  localStorage.removeItem('token_type');
};
