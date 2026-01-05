/* eslint-disable no-undef */
importScripts("https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyDoU7obqbATNyeLPW-sKlSWE50mX94yuW8",
  authDomain: "lab-notification-9178e.firebaseapp.com",
  projectId: "lab-notification-9178e",
  storageBucket: "lab-notification-9178e.firebasestorage.app",
  messagingSenderId: "179709179692",
  appId: "1:179709179692:web:0ede6031a6fa29d83d9e89"
});

const messaging = firebase.messaging();
messaging.onBackgroundMessage((payload) => {
  console.log("🔥 BG MESSAGE:", payload);

  const { title, body } = payload.data;

  self.registration.showNotification(title, {
    body,
    icon: "/logo192.png",
  });
});
