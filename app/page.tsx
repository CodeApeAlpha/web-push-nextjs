'use client';
import { useEffect, useState } from 'react';
import styles from './page.module.css';
import {
  checkPermissionStateAndAct,
  notificationUnsupported,
  registerAndSubscribe,
  sendWebPush,
} from './Push';

export default function Home() {
  const [unsupported, setUnsupported] = useState<boolean>(false);
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(true);

  useEffect(() => {
    const isUnsupported = notificationUnsupported();
    setUnsupported(isUnsupported);
    if (isUnsupported) {
      return;
    }
    checkPermissionStateAndAct(setSubscription);
  }, []);

  // Add offline/online detection
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    // Set initial state
    setIsOnline(navigator.onLine);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Add service worker status logging
  useEffect(() => {
    const checkSWStatus = async () => {
      if ('serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.getRegistration();
          if (registration?.active) {
            console.log('✅ Service Worker Status: ACTIVE');
            console.log('SW Scope:', registration.scope);
            console.log('SW State:', registration.active.state);
          } else if (registration?.installing) {
            console.log('⏳ Service Worker Status: INSTALLING');
          } else if (registration?.waiting) {
            console.log('⏸️ Service Worker Status: WAITING');
          } else {
            console.log('❌ Service Worker Status: NOT FOUND');
          }
        } catch (error) {
          console.log('❌ Service Worker Status: ERROR -', error);
        }
      } else {
        console.log('❌ Service Worker Status: NOT SUPPORTED');
      }
    };

    checkSWStatus();
  }, []);

  return (
    <main>
      {/* Offline Indicator */}
      {!isOnline && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          background: 'linear-gradient(90deg, #ff6b6b, #ff8e8e)',
          color: 'white',
          padding: '12px 20px',
          textAlign: 'center',
          zIndex: 1000,
          fontSize: '14px',
          fontWeight: '500',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
          animation: 'slideDown 0.3s ease-out'
        }}>
          📡 You're offline - App is running in offline mode
        </div>
      )}
      
      <div className={styles.center} style={{ marginTop: !isOnline ? '50px' : '0' }}>
        <button
          disabled={unsupported}
          onClick={() => registerAndSubscribe(setSubscription)}
          className={subscription ? styles.activeButton : ''}>
          {unsupported
            ? 'Notification Unsupported'
            : subscription
              ? 'Notification allowed'
              : 'Allow notification'}
        </button>
        {subscription ? (
          <>
            <input
              placeholder={'Type push message ...'}
              style={{ marginTop: '5rem' }}
              value={message ?? ''}
              onChange={e => setMessage(e.target.value)}
            />
            <button 
              disabled={!isOnline}
              onClick={() => sendWebPush(message)}
              style={{ 
                opacity: !isOnline ? 0.6 : 1,
                cursor: !isOnline ? 'not-allowed' : 'pointer'
              }}
            >
              {!isOnline ? 'Offline - Cannot send push' : 'Test Web Push'}
            </button>
          </>
        ) : null}
        <div className={styles.subscriptionLabel}>
          <span>Push subscription:</span>
        </div>
        <code className={styles.codeBox}>
          {subscription
            ? JSON.stringify(subscription?.toJSON(), undefined, 2)
            : 'There is no subscription'}
        </code>
      </div>
    </main>
  );
}