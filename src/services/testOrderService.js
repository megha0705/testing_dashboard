import { apiClient } from '../utils/apiClient';

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
};