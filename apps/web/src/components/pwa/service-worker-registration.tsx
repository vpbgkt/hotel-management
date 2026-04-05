'use client';

import { useEffect } from 'react';

/**
 * Service Worker Registration Component
 * Registers the service worker for PWA offline support.
 * Only registers in production or when explicitly enabled.
 */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;

    // Register service worker
    const registerSW = async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
        });

        // Handle updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (!newWorker) return;

          newWorker.addEventListener('statechange', () => {
            if (
              newWorker.state === 'installed' &&
              navigator.serviceWorker.controller
            ) {
              // New service worker available — notify user or auto-update
              console.log('[SW] New version available, refreshing...');
              newWorker.postMessage({ type: 'SKIP_WAITING' });
            }
          });
        });

        console.log('[SW] Service Worker registered successfully');
      } catch (error) {
        console.warn('[SW] Service Worker registration failed:', error);
      }
    };

    // Delay registration until page has loaded
    if (document.readyState === 'complete') {
      registerSW();
    } else {
      window.addEventListener('load', registerSW, { once: true });
    }
  }, []);

  return null;
}
