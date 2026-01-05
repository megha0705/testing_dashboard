import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

// Your Firebase config - get this from Firebase Console
const firebaseConfig = {
   apiKey: "AIzaSyDoU7obqbATNyeLPW-sKlSWE50mX94yuW8",
      authDomain: "lab-notification-9178e.firebaseapp.com",
      projectId: "lab-notification-9178e",
      storageBucket: "lab-notification-9178e.firebasestorage.app",
      messagingSenderId: "179709179692",
      appId: "1:179709179692:web:0ede6031a6fa29d83d9e89"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

// Request notification permission and get FCM token
export const requestNotificationPermission = async () => {
  try {
    const permission = await Notification.requestPermission();
    
    if (permission === 'granted') {
      console.log('Notification permission granted.');
      
      // Get FCM token
      const token = await getToken(messaging, {
        vapidKey: 'BCZpUYxQKm4GP9K0688yPJAAoi_y0O7i1EBhXbu5E4ZbVq85MT-cFNbERxwwOE4AVo6q0jPOxO-hz26Db5_feW8' // Get this from Firebase Console -> Project Settings -> Cloud Messaging
      });
      
      console.log('FCM Token:', token);
      console.log('Auth Token:', localStorage.getItem('authToken'));
      
      // Send this token to your backend to register the device
      return token;
    } else {
      console.log('Notification permission denied.');
      return null;
    }
  } catch (error) {
    console.error('Error getting notification permission:', error);
    return null;
  }
};


// Listen for foreground messages

  export const onMessageListener = () =>
  new Promise((resolve) => {
    onMessage(messaging, (payload) => {
      console.log("🔥 FCM PAYLOAD:", payload);

      const { title, body } = payload.data;

      if (Notification.permission === "granted") {
        new Notification(title, {
          body,
          icon: "/logo192.png",
        });
      }

      resolve(payload);
    });
  });


 


export { messaging , onMessage };