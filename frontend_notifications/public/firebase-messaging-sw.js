// Handles Firebase Cloud Messaging notifications received while the app is in the background.


importScripts(
    'https://www.gstatic.com/firebasejs/12.3.0/firebase-app-compat.js',
  );
  importScripts(
    'https://www.gstatic.com/firebasejs/12.3.0/firebase-messaging-compat.js',
  );
  
  firebase.initializeApp({
    apiKey: 'AIzaSyBDS-aq5Zz0Nxkc-sojhewWfqmWeJRCzHY',
    authDomain: 'notificationthc.firebaseapp.com',
    projectId: 'notificationthc',
    storageBucket: 'notificationthc.firebasestorage.app',
    messagingSenderId: '440364113025',
    appId: '1:440364113025:web:dec1d347899c01023f8180',
  });
  
  const messaging = firebase.messaging();
  
  messaging.onBackgroundMessage((payload) => {
    console.log(
      '[firebase-messaging-sw.js] Background message:',
      payload,
    );
  
    const title =
      payload.notification?.title ??
      'Notifications';
  
    const options = {
      body:
        payload.notification?.body ??
        '',
      data: payload.data ?? {},
    };
  
    self.registration.showNotification(
      title,
      options,
    );
  });