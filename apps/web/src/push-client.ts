import { request } from './api.ts';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function requestAndSubscribePush(): Promise<{ success: boolean; message: string }> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return { success: false, message: 'Las notificaciones push no están soportadas en este navegador.' };
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    return { success: false, message: 'Permiso de notificaciones denegado por el usuario.' };
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const keyRes = await request<{ publicKey: string }>('/api/v1/push/vapid-public-key');
    const applicationServerKey = urlBase64ToUint8Array(keyRes.publicKey);

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: applicationServerKey as unknown as ArrayBuffer,
    });

    const subJson = subscription.toJSON();
    if (!subJson.endpoint || !subJson.keys?.p256dh || !subJson.keys?.auth) {
      return { success: false, message: 'La suscripción push no contiene las claves requeridas.' };
    }

    await request('/api/v1/push/subscribe', {
      method: 'POST',
      body: JSON.stringify({
        endpoint: subJson.endpoint,
        keys: {
          p256dh: subJson.keys.p256dh,
          auth: subJson.keys.auth,
        },
      }),
    });

    return { success: true, message: 'Notificaciones push nativas activadas en este dispositivo.' };
  } catch (err: any) {
    return { success: false, message: err.message || 'Error al suscribirse a notificaciones push.' };
  }
}
