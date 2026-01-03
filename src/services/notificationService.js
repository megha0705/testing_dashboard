import { apiClient } from '../utils/apiClient';

// Fetch all notifications for the current user
export const getAllNotifications = () => {
  return apiClient('/user/get-all-notifications', {
    method: 'GET'
  });
};

// Mark a notification as read
export const markNotificationAsRead = (notificationId) => {
  return apiClient(`/user/notifications/${notificationId}/read`, {
    method: 'PUT'
  });
};