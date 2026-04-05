'use client';

import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';

const API_URL = '/api/graphql';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Invalid verification link.');
      return;
    }

    (async () => {
      try {
        const res = await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: `mutation VerifyEmail($input: VerifyEmailInput!) {
              verifyEmail(input: $input) { success message }
            }`,
            variables: { input: { token } },
          }),
        });
        const data = await res.json();
        if (data.errors) throw new Error(data.errors[0].message);
        setStatus('success');
        setMessage('Your email has been verified!');
      } catch (err: any) {
        setStatus('error');
        setMessage(err.message || 'Verification failed. The link may have expired.');
      }
    })();
  }, [token]);

  return (
    <div className="text-center">
      {status === 'loading' && (
        <>
          <Loader2 className="w-12 h-12 text-blue-500 mx-auto mb-4 animate-spin" />
          <h1 className="text-2xl font-bold mb-2">Verifying...</h1>
          <p className="text-gray-600">Please wait while we verify your email.</p>
        </>
      )}
      {status === 'success' && (
        <>
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Email Verified!</h1>
          <p className="text-gray-600 mb-6">{message}</p>
          <Link href="/auth/login" className="inline-block bg-blue-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-blue-700">
            Log In
          </Link>
        </>
      )}
      {status === 'error' && (
        <>
          <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Verification Failed</h1>
          <p className="text-gray-600 mb-6">{message}</p>
          <Link href="/auth/login" className="text-blue-600 hover:underline font-medium">
            Back to Login
          </Link>
        </>
      )}
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="bg-white w-full max-w-md rounded-2xl shadow-lg p-8">
          <Suspense fallback={<div className="flex justify-center"><Loader2 className="w-6 h-6 animate-spin" /></div>}>
            <VerifyEmailContent />
          </Suspense>
        </div>
      </main>
      <Footer />
    </>
  );
}
