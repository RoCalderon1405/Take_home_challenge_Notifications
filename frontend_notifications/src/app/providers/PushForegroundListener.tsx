import { useEffect, useState } from 'react';
import { Alert, Snackbar } from '@mui/material';

import { listenForForegroundMessages } from '../../lib/firebase';

export function PushForegroundListener() {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    let active = true;

    void listenForForegroundMessages((payload) => {
      if (!active) return;

      const title = payload.notification?.title ?? 'Notifications';
      const body = payload.notification?.body ?? '';
      setMessage(body ? `${title}: ${body}` : title);
    })
      .then((listener) => {
        if (active) {
          unsubscribe = listener;
        } else {
          listener();
        }
      })
      .catch(() => {
        // Push is optional and may be unavailable in unsupported browsers.
      });

    return () => {
      active = false;
      unsubscribe?.();
    };
  }, []);

  return (
    <Snackbar
      open={Boolean(message)}
      autoHideDuration={6000}
      onClose={() => setMessage(null)}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
    >
      <Alert severity="info" variant="filled" onClose={() => setMessage(null)}>
        {message}
      </Alert>
    </Snackbar>
  );
}
