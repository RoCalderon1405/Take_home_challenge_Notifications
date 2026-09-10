import { initializeApp } from "firebase/app";

import {
  getMessaging,
  isSupported,
  onMessage,
  onRegistered,
  onUnregistered,
  register,
  unregister,
  type MessagePayload,
  type Messaging,
} from "firebase/messaging";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);

/**
 * Returns the Firebase Messaging instance after verifying
 * that Firebase Cloud Messaging is supported by the browser.
 */
async function getMessagingInstance(): Promise<Messaging> {
  const supported = await isSupported();

  if (!supported) {
    throw new Error(
      "Firebase Cloud Messaging is not supported by this browser",
    );
  }

  return getMessaging(app);
}

/**
 * Registers the Firebase Messaging service worker.
 *
 * The returned registration is passed explicitly to Firebase
 * so FCM uses the service worker located at:
 *
 * /firebase-messaging-sw.js
 */
async function getServiceWorkerRegistration(): Promise<ServiceWorkerRegistration> {
  if (!("serviceWorker" in navigator)) {
    throw new Error("Service Workers are not supported by this browser");
  }

  await navigator.serviceWorker.register("/firebase-messaging-sw.js");

  return navigator.serviceWorker.ready;
}

/**
 * Completely resets the FCM registration for this browser instance
 * and establishes it again.
 *
 * Intended for recovery/testing when FCM reports that the current
 * Firebase Installation ID is no longer registered.
 */
export async function resetPushRegistration(): Promise<string> {
    if (!("Notification" in window)) {
      throw new Error(
        "Notifications are not supported by this browser",
      );
    }
  
    const permission =
      await Notification.requestPermission();
  
    if (permission !== "granted") {
      throw new Error(
        "Notification permission was not granted",
      );
    }
  
    const vapidKey =
      import.meta.env.VITE_FIREBASE_VAPID_KEY;
  
    if (!vapidKey) {
      throw new Error(
        "VITE_FIREBASE_VAPID_KEY is not configured",
      );
    }
  
    const messaging =
      await getMessagingInstance();
  
    const serviceWorkerRegistration =
      await getServiceWorkerRegistration();
  
    const unregisteredListener =
      onUnregistered(
        messaging,
        (installationId) => {
          console.log(
            "FCM UNREGISTERED FID:",
            installationId,
          );
        },
      );
  
    try {
      await unregister(messaging);
    } finally {
      unregisteredListener();
    }
  
    return new Promise<string>(
      (resolve, reject) => {
        let settled = false;
  
        const timeout =
          window.setTimeout(() => {
            if (settled) {
              return;
            }
  
            settled = true;
            registeredListener();
  
            reject(
              new Error(
                "Timed out waiting for Firebase re-registration",
              ),
            );
          }, 15_000);
  
        const registeredListener =
          onRegistered(
            messaging,
            (installationId) => {
              if (settled) {
                return;
              }
  
              settled = true;
  
              window.clearTimeout(timeout);
              registeredListener();
  
              console.log(
                "FCM RE-REGISTERED FID:",
                installationId,
              );
  
              resolve(installationId);
            },
          );
  
        void register(messaging, {
          vapidKey,
          serviceWorkerRegistration,
        }).catch((error: unknown) => {
          if (settled) {
            return;
          }
  
          settled = true;
  
          window.clearTimeout(timeout);
          registeredListener();
  
          reject(error);
        });
      },
    );
  }

/**
 * Requests notification permission and registers the current
 * browser installation with Firebase Cloud Messaging.
 *
 * @returns Firebase Installation ID (FID).
 */
export async function registerForPushNotifications(): Promise<string> {
  if (!("Notification" in window)) {
    throw new Error("Notifications are not supported by this browser");
  }

  const permission = await Notification.requestPermission();

  if (permission !== "granted") {
    throw new Error("Notification permission was not granted");
  }

  const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;

  if (!vapidKey) {
    throw new Error("VITE_FIREBASE_VAPID_KEY is not configured");
  }

  const messaging = await getMessagingInstance();

  const serviceWorkerRegistration = await getServiceWorkerRegistration();

  return new Promise<string>((resolve, reject) => {
    let settled = false;

    const timeout = window.setTimeout(() => {
      if (settled) {
        return;
      }

      settled = true;
      unsubscribe();

      reject(new Error("Timed out waiting for Firebase Installation ID"));
    }, 15_000);

    const unsubscribe = onRegistered(messaging, (installationId) => {
      if (settled) {
        return;
      }

      settled = true;

      window.clearTimeout(timeout);
      unsubscribe();

      resolve(installationId);
    });

    void register(messaging, {
      vapidKey,
      serviceWorkerRegistration,
    }).catch((error: unknown) => {
      if (settled) {
        return;
      }

      settled = true;

      window.clearTimeout(timeout);
      unsubscribe();

      reject(error);
    });
  });
}

/**
 * Subscribes to FCM messages received while the application
 * is open and active in the foreground.
 *
 * @returns Function that removes the foreground listener.
 */
export async function listenForForegroundMessages(
  listener: (payload: MessagePayload) => void,
): Promise<() => void> {
  const messaging = await getMessagingInstance();

  return onMessage(messaging, listener);
}
