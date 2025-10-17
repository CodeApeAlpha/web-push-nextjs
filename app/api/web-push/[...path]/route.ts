import webpush from 'web-push';
import type { PushSubscription as WebPushSubscription } from 'web-push';

const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const privateKey = process.env.NEXT_PUBLIC_VAPID_PRIVATE_KEY;
const API_KEY = process.env.API_SECRET_KEY || 'default-secret-key';

// Simple rate limiting
const rateLimitMap = new Map();

if (!publicKey || !privateKey) {
  throw new Error('VAPID keys are not configured. Run `npm run dev` to generate them.');
}

webpush.setVapidDetails(
  'mailto:mail@example.com',
  publicKey,
  privateKey,
);

let subscription: WebPushSubscription;

// Basic validation function
function validatePushData(data: any) {
  if (!data.title || typeof data.title !== 'string' || data.title.length > 100) {
    throw new Error('Invalid title - must be string and under 100 characters');
  }
  if (!data.body || typeof data.body !== 'string' || data.body.length > 500) {
    throw new Error('Invalid body - must be string and under 500 characters');
  }
  if (data.url && (!data.url.startsWith('https://') || data.url.length > 2000)) {
    throw new Error('Invalid URL - must start with https:// and be under 2000 characters');
  }
  return true;
}

// Basic rate limiting function
function checkRateLimit(clientIP: string) {
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute
  const maxRequests = 10; // 10 requests per minute
  
  const clientData = rateLimitMap.get(clientIP) || { count: 0, resetTime: now + windowMs };
  
  if (now > clientData.resetTime) {
    clientData.count = 0;
    clientData.resetTime = now + windowMs;
  }
  
  if (clientData.count >= maxRequests) {
    throw new Error('Rate limit exceeded - too many requests');
  }
  
  clientData.count++;
  rateLimitMap.set(clientIP, clientData);
}

export async function POST(request: Request) {
  try {
    // 1. API Key validation
    const apiKey = request.headers.get('x-api-key');
    if (!apiKey || apiKey !== API_KEY) {
      return new Response('Unauthorized - Invalid API key', { status: 401 });
    }
    
    // 2. Rate limiting
    const clientIP = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    checkRateLimit(clientIP);
    
    // 3. Origin validation
    const origin = request.headers.get('origin');
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'https://re-rent.netlify.app' // Replace with your production domain
    ];
    if (!origin || !allowedOrigins.includes(origin)) {
      return new Response('Forbidden - Invalid origin', { status: 403 });
    }
    
    const { pathname } = new URL(request.url);
    switch (pathname) {
      case '/api/web-push/subscription':
        return setSubscription(request);
      case '/api/web-push/send':
        return sendPush(request);
      default:
        return notFoundApi();
    }
  } catch (error) {
    console.error('API Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(errorMessage, { status: 400 });
  }
}

async function setSubscription(request: Request) {
  const body: { subscription: WebPushSubscription } = await request.json();
  subscription = body.subscription;
  return new Response(JSON.stringify({ message: 'Subscription set.' }), {});
}

async function sendPush(request: Request) {
  if (!subscription) {
    return new Response('No subscription found', { status: 400 });
  }
  
  const body = await request.json();
  
  // 4. Input validation
  validatePushData(body);
  
  console.log(subscription, 'subs');
  const pushPayload = JSON.stringify(body);
  await webpush.sendNotification(subscription, pushPayload);
  return new Response(JSON.stringify({ message: 'Push sent.' }), {
    headers: { 'Content-Type': 'application/json' }
  });
}

async function notFoundApi() {
  return new Response(JSON.stringify({ error: 'Invalid endpoint' }), {
    headers: { 'Content-Type': 'application/json' },
    status: 404,
  });
}
