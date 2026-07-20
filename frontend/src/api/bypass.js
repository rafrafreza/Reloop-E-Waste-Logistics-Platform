// Temporary mock bypass implementation for offline development

const MOCK_PROFILES = {
  consumer: {
    id: 999,
    name: 'Developer Customer',
    email: 'devloper1@mail.com',
    phone_number: '+1234567890',
    role: 'CUSTOMER',
    is_active: true,
    created_at: new Date().toISOString(),
    customer_profile: {
      address: '123 Developer Lane',
      city: 'Silicon Valley',
      state: 'CA',
      postal_code: '94025'
    }
  },
  driver: {
    id: 998,
    name: 'Developer Driver',
    email: 'devloper1@mail.com',
    phone_number: '+1234567891',
    role: 'DRIVER',
    is_active: true,
    created_at: new Date().toISOString(),
    driver_profile: {
      vehicle_type: 'Truck',
      vehicle_registration_number: 'DEV-1234',
      max_capacity_kg: 500.0,
      is_available: true
    }
  },
  segregation: {
    id: 997,
    name: 'Developer Recycling Co',
    email: 'devloper1@mail.com',
    phone_number: '+1234567892',
    role: 'RECYCLING_COMPANY',
    is_active: true,
    created_at: new Date().toISOString(),
    company_profile: {
      certification_id: 'CERT-DEV-999',
      address: '456 Recycler Way',
      city: 'Green City',
      state: 'WA',
      postal_code: '98001'
    }
  }
};

export const checkBypassLogin = (email, password, role) => {
  if (email === 'devloper1@mail.com' && password === '123456') {
    localStorage.setItem('bypass_active', 'true');
    localStorage.setItem('bypass_role', role || 'consumer');
    return {
      access_token: 'mock-token-for-devloper1',
      token_type: 'bearer'
    };
  }
  return null;
};

export const isBypassActive = () => {
  return localStorage.getItem('bypass_active') === 'true';
};

export const getBypassProfile = () => {
  const role = localStorage.getItem('bypass_role') || 'consumer';
  return MOCK_PROFILES[role] || MOCK_PROFILES.consumer;
};

export const getBypassPickupRequests = () => {
  const storageKey = 'bypass_pickups';
  let pickups = localStorage.getItem(storageKey);
  if (!pickups) {
    // Generate initial mock requests
    const initialPickups = [
      {
        request_id: 101,
        customer_id: 999,
        driver_id: null,
        status: 'PENDING',
        pickup_address: '123 Developer Lane, Silicon Valley, CA, 94025',
        latitude: 37.4538,
        longitude: -122.1822,
        scheduled_date: new Date(Date.now() + 86400000 * 2).toISOString(), // 2 days from now
        notes: 'Please call before arriving.',
        total_estimated_weight_kg: 15.5,
        total_estimated_price: null,
        items: [
          {
            item_id: 1001,
            request_id: 101,
            item_name: 'Old Monitor',
            item_category: 'Monitor',
            width_cm: 45.0,
            length_cm: 20.0,
            height_cm: 40.0,
            estimated_weight_kg: 5.5,
            estimated_price: null
          },
          {
            item_id: 1002,
            request_id: 101,
            item_name: 'Broken Microwave',
            item_category: 'Microwave',
            width_cm: 50.0,
            length_cm: 35.0,
            height_cm: 30.0,
            estimated_weight_kg: 10.0,
            estimated_price: null
          }
        ]
      },
      {
        request_id: 102,
        customer_id: 999,
        driver_id: 998,
        status: 'COMPLETED',
        pickup_address: '123 Developer Lane, Silicon Valley, CA, 94025',
        latitude: 37.4538,
        longitude: -122.1822,
        scheduled_date: new Date(Date.now() - 86400000 * 3).toISOString(), // 3 days ago
        completed_date: new Date(Date.now() - 86400000 * 3).toISOString(),
        notes: 'Standard weekend pickup.',
        total_estimated_weight_kg: 25.0,
        total_estimated_price: null,
        items: [
          {
            item_id: 1003,
            request_id: 102,
            item_name: 'Washing Machine',
            item_category: 'Washing Machine',
            width_cm: 60.0,
            length_cm: 60.0,
            height_cm: 85.0,
            estimated_weight_kg: 25.0,
            estimated_price: null
          }
        ]
      },
      {
        request_id: 103,
        customer_id: 999,
        driver_id: null,
        status: 'CANCELLED',
        pickup_address: '123 Developer Lane, Silicon Valley, CA, 94025',
        latitude: 37.4538,
        longitude: -122.1822,
        scheduled_date: new Date(Date.now() - 86400000 * 5).toISOString(),
        notes: 'Duplicate request.',
        total_estimated_weight_kg: 2.0,
        total_estimated_price: null,
        items: [
          {
            item_id: 1004,
            request_id: 103,
            item_name: 'Broken Keyboard',
            item_category: 'Keyboard',
            width_cm: 45.0,
            length_cm: 15.0,
            height_cm: 3.0,
            estimated_weight_kg: 2.0,
            estimated_price: null
          }
        ]
      }
    ];
    localStorage.setItem(storageKey, JSON.stringify(initialPickups));
    return initialPickups;
  }
  return JSON.parse(pickups);
};

export const createBypassPickupRequest = (formData) => {
  const storageKey = 'bypass_pickups';
  const pickups = getBypassPickupRequests();
  
  const nextId = pickups.length > 0 ? Math.max(...pickups.map(p => p.request_id)) + 1 : 101;
  const nextItemId = 1000 + nextId;

  const newRequest = {
    request_id: nextId,
    customer_id: 999,
    driver_id: null,
    status: 'PENDING',
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
    scheduled_date: formData.fulfillmentType === 'priority'
      ? new Date().toISOString()
      : new Date(Date.now() + 86400000 * 4).toISOString(), // Next weekend simulation
    notes: formData.fulfillmentType === 'priority'
      ? 'Priority Immediate Pickup'
      : 'Standard Weekend Pickup',
    total_estimated_weight_kg: parseFloat(formData.estimatedWeight) || null,
    total_estimated_price: null,
    items: [
      {
        item_id: nextItemId,
        request_id: nextId,
        item_name: formData.applianceType,
        item_category: formData.applianceType,
        width_cm: parseFloat(formData.dimensions?.width) || null,
        length_cm: parseFloat(formData.dimensions?.length) || null,
        height_cm: parseFloat(formData.dimensions?.height) || null,
        estimated_weight_kg: parseFloat(formData.estimatedWeight) || null,
        estimated_price: null,
      }
    ]
  };

  pickups.push(newRequest);
  localStorage.setItem(storageKey, JSON.stringify(pickups));
  return newRequest;
};

export const clearBypass = () => {
  localStorage.removeItem('bypass_active');
  localStorage.removeItem('bypass_role');
  localStorage.removeItem('bypass_pickups');
};
