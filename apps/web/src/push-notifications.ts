export type PushConfig = {
  available: boolean;
  publicKey: string | null;
  payloadMode: 'empty';
  detailLocation: string;
};

export type PushClientState = {
  supported: boolean;
  configured: boolean;
  permission: NotificationPermission | 'unsupported';
  subscribed: boolean;
};

async function apiRequest<T>(url: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('accept', 'application/json');
  if (init.body) headers.set('content-type', 'application/json');
  const response = await fetch(url, { ...init, headers, credentials: 'include' });
  if (!response.ok) {
    const error = new Error(`HTTP ${response.status}`) as Error & { status?: number };
    error.status = response.status;
    throw error;
  }
  return response.json() as Promise<T>;
}

async function apiVoid(url: string, init: RequestInit = {}): Promise<void> {
  const headers = new Headers(init.headers);
  headers.set('accept', 'application/json');
  if (init.body) headers.set('content-type', 'application/json');
  const response = await fetch(url, { ...init, headers, credentials: 'include' });
  if (!response.ok) {
    const error = new Error(`HTTP ${response.status}`) as Error & { status?: number };
    error.status = response.status;
    throw error;
  }
}

function supportsWebPush(): boolean {
  return typeof window !== 'undefined'
    && window.isSecureContext
    && 'serviceWorker' in navigator
    && 'PushManager' in window
    && 'Notification' in window;
}

function applicationServerKey(value: string): ArrayBuffer {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=');
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes.buffer;
}

async function getConfig(): Promise<PushConfig> {
  return apiRequest<PushConfig>('/api/v1/account/push/config');
}

export async function getPushClientState(): Promise<PushClientState> {
  if (!supportsWebPush()) {
    return { supported: false, configured: false, permission: 'unsupported', subscribed: false };
  }

  const config = await getConfig();
  if (!config.available || !config.publicKey) {
    return {
      supported: true,
      configured: false,
      permission: Notification.permission,
      subscribed: false,
    };
  }

  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  return {
    supported: true,
    configured: true,
    permission: Notification.permission,
    subscribed: Boolean(subscription),
  };
}

export async function enablePushNotifications(): Promise<PushClientState> {
  if (!supportsWebPush()) {
    throw new Error('Este navegador no admite Web Push en este contexto seguro.');
  }

  // Keep the browser permission request before any network await so it remains
  // directly attached to the user's click gesture on browsers with strict activation rules.
  const permission = Notification.permission === 'granted'
    ? 'granted'
    : await Notification.requestPermission();

  const config = await getConfig();
  if (!config.available || !config.publicKey) {
    throw new Error('Web Push no está configurado en este entorno.');
  }

  if (permission !== 'granted') {
    return {
      supported: true,
      configured: true,
      permission,
      subscribed: false,
    };
  }

  const registration = await navigator.serviceWorker.ready;
  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: applicationServerKey(config.publicKey),
    });
  }

  await apiRequest('/api/v1/account/push/subscriptions', {
    method: 'POST',
    body: JSON.stringify({
      endpoint: subscription.endpoint,
      expirationTime: subscription.expirationTime,
    }),
  });

  return {
    supported: true,
    configured: true,
    permission: Notification.permission,
    subscribed: true,
  };
}

export async function disablePushNotifications(): Promise<PushClientState> {
  if (!supportsWebPush()) {
    return { supported: false, configured: false, permission: 'unsupported', subscribed: false };
  }

  const config = await getConfig();
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  let serverError: unknown = null;

  if (subscription) {
    try {
      await apiVoid('/api/v1/account/push/subscriptions', {
        method: 'DELETE',
        body: JSON.stringify({ endpoint: subscription.endpoint }),
      });
    } catch (error) {
      serverError = error;
    }
    await subscription.unsubscribe();
  }

  if (serverError) throw serverError;
  return {
    supported: true,
    configured: config.available,
    permission: Notification.permission,
    subscribed: false,
  };
}
