'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';

const API_URL = '/api/graphql';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
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
          query: `mutation RequestPasswordReset($input: RequestPasswordResetInput!) {
            requestPasswordReset(input: $input) { success message }
          }`,
          variables: { input: { email } },
        }),
      });
      const data = await res.json();
      if (data.errors) throw new Error(data.errors[0].message);
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Header />
      <main className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="bg-white w-full max-w-md rounded-2xl shadow-lg p-8">
          {submitted ? (
            <div className="text-center">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <h1 className="text-2xl font-bold mb-2">Check Your Email</h1>
              <p className="text-gray-600 mb-6">
                If an account exists for <strong>{email}</strong>, we&apos;ve sent a password reset link.
              </p>
              <Link href="/auth/login" className="text-blue-600 hover:underline font-medium">
                Back to Login
              </Link>
            </div>
          ) : (
            <>
              <Link href="/auth/login" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-6">
                <ArrowLeft className="w-4 h-4 mr-1" /> Back to Login
              </Link>
              <h1 className="text-2xl font-bold mb-2">Forgot Password</h1>
              <p className="text-gray-600 mb-6">Enter your email and we&apos;ll send you a reset link.</p>

              {error && (
                <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm mb-4">{error}</div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <div className="relative mt-1">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      id="email"
                      type="email"
                      required
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Send Reset Link
                </Button>
              </form>
            </>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
