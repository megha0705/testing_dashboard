import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';  // ← CSS imported here applies to entire app
import App from './App';

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
