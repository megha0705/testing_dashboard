// Give the service worker access to Firebase Messaging.
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// Initialize the Firebase app in the service worker
firebase.initializeApp({
    apiKey: "AIzaSyDoU7obqbATNyeLPW-sKlSWE50mX94yuW8",
      authDomain: "lab-notification-9178e.firebaseapp.com",
      projectId: "lab-notification-9178e",
      storageBucket: "lab-notification-9178e.firebasestorage.app",
      messagingSenderId: "179709179692",
      appId: "1:179709179692:web:0ede6031a6fa29d83d9e89"
});

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('Received background message:', payload);
  
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/logo192.png'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});