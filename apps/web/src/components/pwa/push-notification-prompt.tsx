'use client';

/**
 * Push Notification Manager Component
 * 
 * Handles Web Push subscription:
 *  - Fetches VAPID public key from the API
 *  - Subscribes to push notifications via the Push API
 *  - Shows an opt-in prompt for push notifications
 */

import { useState, useEffect, useCallback } from 'react';
import { Bell, BellOff, BellRing, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

const API_BASE = process.env.NEXT_PUBLIC_API_URL?.replace('/graphql', '') || 'http://localhost:4000';

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

export function PushNotificationPrompt() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;

    setPermission(Notification.permission);

    // Check if already subscribed
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        registration.pushManager.getSubscription().then((sub) => {
          setIsSubscribed(!!sub);
        });
      });
    }

    // Show banner after a delay if not yet decided
    if (Notification.permission === 'default') {
      const dismissed = localStorage.getItem('push-prompt-dismissed');
      if (!dismissed) {
        const timer = setTimeout(() => setShowBanner(true), 10000); // 10s delay
        return () => clearTimeout(timer);
      }
    }
  }, []);

  const subscribeToPush = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Request notification permission
      const perm = await Notification.requestPermission();
      setPermission(perm);

      if (perm !== 'granted') {
        setShowBanner(false);
        setLoading(false);
        return;
      }

      // 2. Get VAPID public key from server
      const res = await fetch(`${API_BASE}/api/push/vapid-key`);
      const { vapidPublicKey } = await res.json();

      if (!vapidPublicKey) {
        console.warn('Push notifications not configured on server');
        setShowBanner(false);
        setLoading(false);
        return;
      }

      // 3. Subscribe via Push API
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as any,
      });

      // 4. Send subscription to server
      const subJson = subscription.toJSON();
      const token = localStorage.getItem('accessToken');

      await fetch(`${API_BASE}/api/push/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          subscription: {
            endpoint: subJson.endpoint,
            keys: subJson.keys,
          },
        }),
      });

      setIsSubscribed(true);
      setShowBanner(false);
    } catch (err) {
      console.error('Push subscription failed:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const dismissBanner = () => {
    setShowBanner(false);
    localStorage.setItem('push-prompt-dismissed', 'true');
  };

  // Don't render if push is not supported or already subscribed
  if (typeof window === 'undefined' || !('Notification' in window) || !('PushManager' in window)) {
    return null;
  }

  if (permission === 'denied' || isSubscribed) {
    return null;
  }

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm animate-in slide-in-from-bottom-5">
      <div className="bg-white rounded-xl shadow-2xl border p-5">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
            <BellRing className="w-5 h-5 text-blue-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 text-sm">Stay Updated!</h3>
            <p className="text-gray-600 text-xs mt-1">
              Get instant notifications about booking updates, special offers, and check-in reminders.
            </p>
            <div className="mt-3 flex gap-2">
              <Button
                size="sm"
                onClick={subscribeToPush}
                disabled={loading}
                className="text-xs"
              >
                <Bell className="w-3.5 h-3.5 mr-1" />
                {loading ? 'Enabling...' : 'Enable'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={dismissBanner}
                className="text-xs"
              >
                Not now
              </Button>
            </div>
          </div>
          <button
            onClick={dismissBanner}
            className="text-gray-400 hover:text-gray-600 -mt-1 -mr-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
