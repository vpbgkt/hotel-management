'use client';

/**
 * Settings Page - Hotel Manager Dashboard
 * Account & notification settings
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Bell, 
  Globe, 
  Shield, 
  Monitor,
  Moon,
  Sun,
  Check
} from 'lucide-react';

interface SettingToggle {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
}

export default function SettingsPage() {
  const [saved, setSaved] = useState(false);

  const [notifications, setNotifications] = useState<SettingToggle[]>([
    { id: 'booking_confirm', label: 'Booking Confirmations', description: 'Get notified when your booking is confirmed', enabled: true },
    { id: 'booking_reminder', label: 'Check-in Reminders', description: 'Remind me before check-in date', enabled: true },
    { id: 'review_prompt', label: 'Review Prompts', description: 'Prompt to leave a review after checkout', enabled: true },
    { id: 'promo_emails', label: 'Promotional Emails', description: 'Receive deals and special offers', enabled: false },
    { id: 'newsletter', label: 'Newsletter', description: 'Monthly travel tips and recommendations', enabled: false },
  ]);

  const [preferences, setPreferences] = useState({
    language: 'en',
    currency: 'INR',
    theme: 'light',
  });

  const toggleNotification = (id: string) => {
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, enabled: !n.enabled } : n)
    );
  };

  const handleSave = () => {
    // In a real app, this would call the API
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600 mt-1">Manage your account preferences</p>
        </div>
        <Button onClick={handleSave}>
          {saved ? (
            <>
              <Check size={16} className="mr-2" />
              Saved!
            </>
          ) : (
            'Save Settings'
          )}
        </Button>
      </div>

      {/* Notification Settings */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Bell size={20} />
            Notifications
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className="flex items-center justify-between p-4 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div>
                <h4 className="font-medium text-gray-900">{notification.label}</h4>
                <p className="text-sm text-gray-500">{notification.description}</p>
              </div>
              <button
                onClick={() => toggleNotification(notification.id)}
                className={`relative w-11 h-6 rounded-full transition-colors ${
                  notification.enabled ? 'bg-brand-600' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                    notification.enabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Regional Preferences */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Globe size={20} />
            Regional Preferences
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Language</label>
              <select
                value={preferences.language}
                onChange={(e) => setPreferences(p => ({ ...p, language: e.target.value }))}
                className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              >
                <option value="en">English</option>
                <option value="hi">Hindi (हिन्दी)</option>
                <option value="gu">Gujarati (ગુજરાતી)</option>
                <option value="mr">Marathi (मराठी)</option>
                <option value="ta">Tamil (தமிழ்)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
              <select
                value={preferences.currency}
                onChange={(e) => setPreferences(p => ({ ...p, currency: e.target.value }))}
                className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              >
                <option value="INR">₹ Indian Rupee (INR)</option>
                <option value="USD">$ US Dollar (USD)</option>
                <option value="EUR">€ Euro (EUR)</option>
                <option value="GBP">£ British Pound (GBP)</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Display Settings */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Monitor size={20} />
            Display
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Theme</label>
            <div className="flex gap-3">
              {[
                { value: 'light', label: 'Light', icon: Sun },
                { value: 'dark', label: 'Dark', icon: Moon },
                { value: 'system', label: 'System', icon: Monitor },
              ].map((option) => {
                const Icon = option.icon;
                return (
                  <button
                    key={option.value}
                    onClick={() => setPreferences(p => ({ ...p, theme: option.value }))}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border transition-colors ${
                      preferences.theme === option.value
                        ? 'border-brand-600 bg-brand-50 text-brand-700'
                        : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <Icon size={16} />
                    <span className="text-sm font-medium">{option.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Privacy */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield size={20} />
            Privacy
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <h4 className="font-medium text-gray-900">Profile Visibility</h4>
              <p className="text-sm text-gray-500">Show your name on reviews you leave</p>
            </div>
            <button className="relative w-11 h-6 rounded-full bg-brand-600 transition-colors">
              <span className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow translate-x-5 transition-transform" />
            </button>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-1">Data & Privacy</h4>
            <p className="text-sm text-gray-500 mb-3">
              You can request a copy of your data or delete your account from the Profile page.
            </p>
            <Button variant="outline" size="sm">
              Download My Data
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
