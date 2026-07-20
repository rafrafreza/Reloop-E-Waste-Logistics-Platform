import axios from 'axios';
import { getToken } from './auth';
import { isBypassActive, getBypassProfile, getBypassPickupRequests, createBypassPickupRequest } from './bypass';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
});

/**
 * Attach JWT token to every request via interceptor
 */
const authHeaders = () => {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

/**
 * Get current user's profile (name, email, role, etc.)
 */
export const getUserProfile = async () => {
  if (isBypassActive()) {
    return getBypassProfile();
  }
  const response = await api.get('/profile', {
    headers: authHeaders(),
  });
  return response.data;
};

/**
 * Create a new pickup request
 * Maps frontend wizard state → backend PickupRequestCreate schema
 */
export const createPickupRequest = async (formData) => {
  if (isBypassActive()) {
    return createBypassPickupRequest(formData);
  }
  const payload = {
    pickup_address: [
      formData.address,
      formData.city,
      formData.state,
      formData.postalCode,
    ]
      .filter(Boolean)
      .join(', '),
    latitude: null,
    longitude: null,
    scheduled_date:
      formData.fulfillmentType === 'priority'
        ? new Date().toISOString()
        : getNextWeekendDate(),
    notes: formData.fulfillmentType === 'priority'
      ? 'Priority Immediate Pickup'
      : 'Standard Weekend Pickup',
    items: [
      {
        item_name: formData.applianceType,
        item_category: formData.applianceType,
        width_cm: parseFloat(formData.dimensions?.width) || null,
        length_cm: parseFloat(formData.dimensions?.length) || null,
        height_cm: parseFloat(formData.dimensions?.height) || null,
        estimated_weight_kg: parseFloat(formData.estimatedWeight) || null,
        estimated_price: null,
      },
    ],
  };

  const response = await api.post('/pickups/', payload, {
    headers: authHeaders(),
  });
  return response.data;
};

/**
 * Get all pickup requests for the current user
 */
export const getPickupRequests = async () => {
  if (isBypassActive()) {
    return getBypassPickupRequests();
  }
  const response = await api.get('/pickups/', {
    headers: authHeaders(),
  });
  return response.data;
};

/**
 * Helper: get the next Saturday's ISO date string
 */
function getNextWeekendDate() {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const daysUntilSaturday = (6 - dayOfWeek + 7) % 7 || 7;
  const nextSaturday = new Date(today);
  nextSaturday.setDate(today.getDate() + daysUntilSaturday);
  nextSaturday.setHours(10, 0, 0, 0);
  return nextSaturday.toISOString();
}
