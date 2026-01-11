import { apiClient } from '../utils/apiClient';
import { authFetch } from '../utils/authFetch';

export const createTestOrder = (orderData) => {
  return apiClient('/admin/test-order', {
    method: 'POST',
    body: JSON.stringify(orderData)
  });
};
export const getAllTestOrders = () => {
  return apiClient('/user/get-all-testorder', {
    method: 'GET'
  });
};/*
// Create a new test order
export const createTestOrder = (orderData) => {
  return authFetch(`${process.env.REACT_APP_API_URL}/admin/test-order`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(orderData),
  });
};

// Get all test orders
export const getAllTestOrders = () => {
  return authFetch(`${process.env.REACT_APP_API_URL}/user/get-all-testorder`, {
    method: 'GET',
  });
};*/