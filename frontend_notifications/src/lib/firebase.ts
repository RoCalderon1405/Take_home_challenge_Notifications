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

async function getMessagingInstance(): Promise<Messaging> {
  if (!(await isSupported())) {
    throw new Error(
      "Firebase Cloud Messaging is not supported by this browser",
    );
  }

  return getMessaging(app);
}

async function getServiceWorkerRegistration(): Promise<ServiceWorkerRegistration> {
  if (!("serviceWorker" in navigator)) {
    throw new Error("Service Workers are not supported by this browser");
  }

  await navigator.serviceWorker.register("/firebase-messaging-sw.js");
  return navigator.serviceWorker.ready;
}

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
      if (settled) return;
      settled = true;
      unsubscribe();
      reject(new Error("Timed out waiting for Firebase Installation ID"));
    }, 15_000);

    const unsubscribe = onRegistered(messaging, (installationId) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      unsubscribe();
      resolve(installationId);
    });

    void register(messaging, {
      vapidKey,
      serviceWorkerRegistration,
    }).catch((error: unknown) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      unsubscribe();
      reject(error);
    });
  });
}

export async function resetPushRegistration(): Promise<string> {
  const messaging = await getMessagingInstance();
  const unregisteredListener = onUnregistered(messaging, () => undefined);

  try {
    await unregister(messaging);
  } finally {
    unregisteredListener();
  }

  return registerForPushNotifications();
}

export async function listenForForegroundMessages(
  listener: (payload: MessagePayload) => void,
): Promise<() => void> {
  const messaging = await getMessagingInstance();
  const registration = await getServiceWorkerRegistration();

  return onMessage(messaging, (payload) => {
    // Mantiene el comportamiento actual de la aplicación, incluido el snackbar.
    listener(payload);

    if (!("Notification" in window) || Notification.permission !== "granted") {
      return;
    }

    const title =
      payload.notification?.title ?? payload.data?.title ?? "Notifications";

    const options: NotificationOptions = {
      body: payload.notification?.body ?? payload.data?.body ?? "",
      data: payload.data ?? {},
      ...(payload.messageId ? { tag: payload.messageId } : {}),
    };

    void registration
      .showNotification(title, options)
      .catch((error: unknown) => {
        console.error(
          "[Firebase] Could not display foreground notification:",
          error,
        );
      });
  });
}
