import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './components/auth/LoginPage';
import RegisterPage from './components/auth/RegisterPage';
import AdminDashboard from './components/dashboard/AdminDashboard';
import LabDashboard from './components/dashboard/LabDashboard';
import ProtectedRoute from './routes/ProtectedRoute';
import { onMessageListener } from "./config/firebase";



function App() {


   useEffect(() => {
    // Listen for foreground messages
    const unsubscribe = onMessageListener()
      .then((payload) => {
        console.log("✅ FOREGROUND MESSAGE:", payload);

        // Extract data payload
        const { title, body } = payload.data;

        // Show notification in-browser
        if (Notification.permission === "granted") {
          new Notification(title, {
            body,
            icon: "/logo192.png",
          });
        }
      })
      .catch((err) => console.error("FCM Foreground Error:", err));

    // Cleanup function (optional)
   
  }, []);

  return (
<Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
          {/* Protected Routes */}
        <Route
        path="/admin/dashboard"
        element={
          <ProtectedRoute allowedRoles={['ROLE_ADMIN']}>
            <AdminDashboard />
          </ProtectedRoute>
        }
        />

      
        <Route
        path="/lab/dashboard"
        element={
          <ProtectedRoute allowedRoles={['ROLE_LAB']}>
            <LabDashboard />
          </ProtectedRoute>
        }
        />
        <Route path="/" element={<Navigate to="/login" />} />
      </Routes>
    </Router>
      );
}

export default App;