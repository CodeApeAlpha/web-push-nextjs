import webpush from 'web-push';
import type { PushSubscription as WebPushSubscription } from 'web-push';

const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const privateKey = process.env.NEXT_PUBLIC_VAPID_PRIVATE_KEY;

if (!publicKey || !privateKey) {
  throw new Error('VAPID keys are not configured. Run `npm run dev` to generate them.');
}

webpush.setVapidDetails(
  'mailto:mail@example.com',
  publicKey,
  privateKey,
);

let subscription: WebPushSubscription;

export async function POST(request: Request) {
  const { pathname } = new URL(request.url);
  switch (pathname) {
    case '/api/web-push/subscription':
      return setSubscription(request);
    case '/api/web-push/send':
      return sendPush(request);
    default:
      return notFoundApi();
  }
}

async function setSubscription(request: Request) {
  const body: { subscription: WebPushSubscription } = await request.json();
  subscription = body.subscription;
  return new Response(JSON.stringify({ message: 'Subscription set.' }), {});
}

async function sendPush(request: Request) {
  console.log(subscription, 'subs');
  const body = await request.json();
  const pushPayload = JSON.stringify(body);
  await webpush.sendNotification(subscription, pushPayload);
  return new Response(JSON.stringify({ message: 'Push sent.' }), {});
}

async function notFoundApi() {
  return new Response(JSON.stringify({ error: 'Invalid endpoint' }), {
    headers: { 'Content-Type': 'application/json' },
    status: 404,
  });
}
