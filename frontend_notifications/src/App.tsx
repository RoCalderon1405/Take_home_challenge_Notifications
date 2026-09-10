import { useEffect, useState } from "react";

import {
  listenForForegroundMessages,
  // registerForPushNotifications,
  resetPushRegistration,
} from "./lib/firebase";

function App() {
  const [fid, setFid] = useState<string>("");

  const [status, setStatus] = useState<string>(
    "Push notifications not registered",
  );

  const [lastMessage, setLastMessage] = useState<string>(
    "No FCM message received yet",
  );

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    void listenForForegroundMessages((payload) => {
      console.log("FCM FOREGROUND MESSAGE:", payload);

      const title = payload.notification?.title ?? "Notifications";

      const body = payload.notification?.body ?? "";

      setLastMessage(JSON.stringify(payload, null, 2));

      console.log("Notification permission:", Notification.permission);

      if (Notification.permission === "granted") {
        new Notification(title, {
          body,
        });
      }
    }).then((listener) => {
      unsubscribe = listener;
    });

    return () => {
      unsubscribe?.();
    };
  }, []);

  const handleRegister = async () => {
    try {
      setStatus("Registering with Firebase...");

      const installationId = await resetPushRegistration();

      setFid(installationId);

      setStatus("Registered successfully");

      console.log("Firebase Installation ID:", installationId);

      console.log("Notification permission:", Notification.permission);
    } catch (error: unknown) {
      console.error("Push registration failed:", error);

      setStatus(error instanceof Error ? error.message : String(error));
    }
  };

  return (
    <main
      style={{
        maxWidth: "900px",
        margin: "40px auto",
        padding: "24px",
        fontFamily: "sans-serif",
      }}
    >
      <h1>Firebase Push Test</h1>

      <p>
        <strong>Status:</strong> {status}
      </p>

      <button
        type="button"
        onClick={() => {
          void handleRegister();
        }}
      >
        Enable push notifications
      </button>

      {fid && (
        <>
          <h2>Firebase Installation ID</h2>

          <textarea
            readOnly
            value={fid}
            rows={3}
            style={{
              width: "100%",
            }}
          />
        </>
      )}

      <h2>Last foreground FCM message</h2>

      <pre
        style={{
          whiteSpace: "pre-wrap",
          overflowWrap: "anywhere",
          padding: "16px",
          border: "1px solid #ccc",
        }}
      >
        {lastMessage}
      </pre>
    </main>
  );
}

export default App;
