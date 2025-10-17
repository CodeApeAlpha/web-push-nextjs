const SERVICE_WORKER_FILE_PATH = './sw.js';

export function notificationUnsupported(): boolean {
  let unsupported = false;
  if (
    !('serviceWorker' in navigator) ||
    !('PushManager' in window) ||
    !('showNotification' in ServiceWorkerRegistration.prototype)
  ) {
    unsupported = true;
  }
  return unsupported;
}

export function checkPermissionStateAndAct(
  onSubscribe: (subs: PushSubscription | null) => void,
): void {
  const state: NotificationPermission = Notification.permission;
  switch (state) {
    case 'denied':
      break;
    case 'granted':
      registerAndSubscribe(onSubscribe);
      break;
    case 'default':
      break;
  }
}

async function subscribe(onSubscribe: (subs: PushSubscription | null) => void): Promise<void> {
  navigator.serviceWorker.ready
    .then((registration: ServiceWorkerRegistration) => {
      return registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
      });
    })
    .then((subscription: PushSubscription) => {
      console.info('Created subscription Object: ', subscription.toJSON());
      submitSubscription(subscription).then(_ => {
        onSubscribe(subscription);
      });
    })
    .catch(e => {
      console.error('Failed to subscribe cause of: ', e);
    });
}

async function submitSubscription(subscription: PushSubscription): Promise<void> {
  const endpointUrl = '/api/web-push/subscription';
  
  try {
    const res = await fetch(endpointUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.NEXT_PUBLIC_API_KEY || 'default-secret-key',
      },
      body: JSON.stringify({ subscription }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`HTTP error! status: ${res.status}, message: ${errorText}`);
    }

    const result = await res.json();
    console.log('Subscription submitted successfully:', result);
  } catch (error) {
    console.error('Failed to submit subscription:', error);
    throw error;
  }
}

export async function registerAndSubscribe(
  onSubscribe: (subs: PushSubscription | null) => void,
): Promise<void> {
  try {
    await navigator.serviceWorker.register(SERVICE_WORKER_FILE_PATH);
    await subscribe(onSubscribe);
  } catch (e) {
    console.error('Failed to register service-worker: ', e);
  }
}

export async function sendWebPush(message: string | null): Promise<void> {
  const endPointUrl = '/api/web-push/send';
  const pushBody = {
    title: 'Test Push',
    body: message ?? 'This is a test push message',
    image: '/next.png',
    icon: 'nextjs.png',
    url: 'https://google.com',
  };
  
  try {
    const res = await fetch(endPointUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.NEXT_PUBLIC_API_KEY || 'default-secret-key',
      },
      body: JSON.stringify(pushBody),
    });
    
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`HTTP error! status: ${res.status}, message: ${errorText}`);
    }
    
    const result = await res.json();
    console.log('Push sent successfully:', result);
  } catch (error) {
    console.error('Failed to send push notification:', error);
    throw error; // Re-throw so the UI can handle it
  }
}
