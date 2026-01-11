import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';  // ← CSS imported here applies to entire app
import App from './App';
  // Add this to the TOP of AdminDashboard.js or index.js
if (typeof window !== 'undefined') {
  const originalSetItem = localStorage.setItem;
  localStorage.setItem = function(key, value) {
    if (key === 'authToken') {
      console.error('🚨 AUTH TOKEN BEING SET/CHANGED:');
      console.error('New value:', value);
      console.trace('Called from:'); // Shows full stack trace
    }
    return originalSetItem.apply(this, arguments);
  };

  const originalRemoveItem = localStorage.removeItem;
  localStorage.removeItem = function(key) {
    if (key === 'authToken') {
      console.error('🗑️ AUTH TOKEN BEING REMOVED');
      console.trace('Called from:');
    }
    return originalRemoveItem.apply(this, arguments);
  };
}

  
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

if ("serviceWorker" in navigator) {
  navigator.serviceWorker
    .register("/firebase-messaging-sw.js")
    .then((reg) => {
      console.log("✅ Firebase SW registered:", reg.scope);
    })
    .catch((err) => {
      console.error("❌ Firebase SW registration failed:", err);
    });
}
