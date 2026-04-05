'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Eye, EyeOff, CheckCircle, Lock } from 'lucide-react';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';

const API_URL = '/api/graphql';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `mutation ResetPassword($input: ResetPasswordInput!) {
            resetPassword(input: $input) { success message }
          }`,
          variables: { input: { token, newPassword } },
        }),
      });
      const data = await res.json();
      if (data.errors) throw new Error(data.errors[0].message);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Invalid or expired reset link');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-2">Invalid Link</h1>
        <p className="text-gray-600 mb-4">This password reset link is invalid or has expired.</p>
        <Link href="/auth/forgot-password" className="text-blue-600 hover:underline font-medium">
          Request a new link
        </Link>
      </div>
    );
  }

  if (success) {
    return (
      <div className="text-center">
        <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">Password Reset!</h1>
        <p className="text-gray-600 mb-6">Your password has been updated successfully.</p>
        <Link href="/auth/login" className="inline-block bg-blue-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-blue-700">
          Log In
        </Link>
      </div>
    );
  }

  return (
    <>
      <h1 className="text-2xl font-bold mb-2">Set New Password</h1>
      <p className="text-gray-600 mb-6">Enter your new password below.</p>

      {error && (
        <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm mb-4">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="password">New Password</Label>
          <div className="relative mt-1">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              required
              minLength={8}
              placeholder="Min 8 chars, 1 upper, 1 number"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="pl-10 pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
          Reset Password
        </Button>
      </form>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="bg-white w-full max-w-md rounded-2xl shadow-lg p-8">
          <Suspense fallback={<div className="flex justify-center"><Loader2 className="w-6 h-6 animate-spin" /></div>}>
            <ResetPasswordForm />
          </Suspense>
        </div>
      </main>
      <Footer />
    </>
  );
}
