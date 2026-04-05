'use client';

/**
 * Login Page - Hotel Manager
 * User authentication with email/password + phone OTP
 */

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, LogIn, Loader2, AlertCircle, Smartphone, Mail } from 'lucide-react';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';

const API_URL = '/api/graphql';

type LoginMode = 'email' | 'otp';

function getRoleRedirect(role?: string): string {
  switch (role) {
    case 'HOTEL_ADMIN': return '/admin';
    default: return '/dashboard';
  }
}

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectParam = searchParams.get('redirect');
  const { login, isLoading: authLoading } = useAuth();

  const [mode, setMode] = useState<LoginMode>('email');

  // Email/password state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // OTP state
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpCountdown, setOtpCountdown] = useState(0);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Google Sign-In handler
  const handleGoogleLogin = async () => {
    setError('');
    setIsSubmitting(true);

    try {
      // Load the Google Identity Services SDK
      const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
      if (!googleClientId) {
        setError('Google login is not configured yet. Please use email or OTP.');
        setIsSubmitting(false);
        return;
      }

      // Use the Google Identity Services library
      const { google } = window as any;
      if (!google?.accounts?.id) {
        // Load the Google script dynamically
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://accounts.google.com/gsi/client';
          script.onload = () => resolve();
          script.onerror = () => reject(new Error('Failed to load Google SDK'));
          document.head.appendChild(script);
        });

        // Wait a moment for initialization
        await new Promise((r) => setTimeout(r, 500));
      }

      // Initialize and trigger Google sign-in
      const gsi = (window as any).google?.accounts?.id;
      if (!gsi) {
        setError('Google Sign-In could not be loaded');
        setIsSubmitting(false);
        return;
      }

      gsi.initialize({
        client_id: googleClientId,
        callback: async (response: any) => {
          try {
            const res = await fetch(API_URL, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                query: `mutation GoogleLogin($idToken: String!) {
                  googleLogin(idToken: $idToken) {
                    success message accessToken refreshToken
                    user { id email name role avatarUrl }
                  }
                }`,
                variables: { idToken: response.credential },
              }),
            });

            const { data, errors } = await res.json();
            if (errors?.[0]) {
              setError(errors[0].message);
              setIsSubmitting(false);
              return;
            }

            const result = data?.googleLogin;
            if (result?.success && result?.accessToken) {
              localStorage.setItem('accessToken', result.accessToken);
              localStorage.setItem('refreshToken', result.refreshToken);
              window.location.href = redirectParam || getRoleRedirect(result.user?.role);
            } else {
              setError(result?.message || 'Google login failed');
              setIsSubmitting(false);
            }
          } catch {
            setError('Network error during Google login');
            setIsSubmitting(false);
          }
        },
      });

      gsi.prompt();
      // The prompt handles its own UI, so we can reset submitting after a delay
      setTimeout(() => setIsSubmitting(false), 3000);
    } catch {
      setError('Failed to initialize Google Sign-In');
      setIsSubmitting(false);
    }
  };

  // Email login handler
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const result = await login(email, password);
      if (result.success) {
        const dest = redirectParam || getRoleRedirect(result.user?.role);
        router.push(dest);
      } else {
        setError(result.message || 'Invalid email or password');
      }
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Request OTP
  const handleRequestOTP = async () => {
    if (!phone || phone.length < 10) {
      setError('Please enter a valid phone number');
      return;
    }

    setError('');
    setSuccess('');
    setIsSubmitting(true);

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `mutation RequestOTP($input: RequestOTPInput!) {
            requestOTP(input: $input) { success message }
          }`,
          variables: { input: { phone: phone.startsWith('+91') ? phone : `+91${phone}` } },
        }),
      });

      const { data, errors } = await response.json();
      if (errors?.[0]) {
        setError(errors[0].message);
        return;
      }

      if (data?.requestOTP?.success) {
        setOtpSent(true);
        setSuccess('OTP sent to your phone! (Check console in dev mode)');
        // Start countdown
        setOtpCountdown(30);
        const interval = setInterval(() => {
          setOtpCountdown((c) => {
            if (c <= 1) {
              clearInterval(interval);
              return 0;
            }
            return c - 1;
          });
        }, 1000);
      } else {
        setError(data?.requestOTP?.message || 'Failed to send OTP');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Verify OTP
  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp || otp.length < 4) {
      setError('Please enter the OTP');
      return;
    }

    setError('');
    setIsSubmitting(true);

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `mutation VerifyOTP($input: VerifyOTPInput!) {
            verifyOTP(input: $input) {
              success message accessToken refreshToken
              user { id email name phone role avatarUrl hotelId }
            }
          }`,
          variables: {
            input: {
              phone: phone.startsWith('+91') ? phone : `+91${phone}`,
              otp,
            },
          },
        }),
      });

      const { data, errors } = await response.json();
      if (errors?.[0]) {
        setError(errors[0].message);
        return;
      }

      const result = data?.verifyOTP;
      if (result?.success && result?.accessToken) {
        localStorage.setItem('accessToken', result.accessToken);
        localStorage.setItem('refreshToken', result.refreshToken);
        // Force page reload to update auth context
        window.location.href = redirectParam || getRoleRedirect(result.user?.role);
      } else {
        setError(result?.message || 'Invalid OTP');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Header />
      <main className="min-h-[calc(100vh-200px)] bg-gray-50 flex items-center justify-center py-12 px-4">
        <div className="w-full max-w-md">
          {/* Logo/Brand */}
          <div className="text-center mb-8">
            <Link href="/" className="inline-block">
              <span className="text-3xl font-bold text-brand-600">Blue</span>
              <span className="text-3xl font-bold text-gray-900">Stay</span>
            </Link>
            <p className="mt-2 text-gray-600">Sign in to your account</p>
          </div>

          {/* Login Card */}
          <div className="bg-white rounded-2xl shadow-lg p-8">
            {/* Login Mode Tabs */}
            <div className="flex bg-gray-100 rounded-lg p-1 mb-6">
              <button
                type="button"
                onClick={() => { setMode('email'); setError(''); setSuccess(''); }}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-all ${
                  mode === 'email'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Mail size={16} />
                Email
              </button>
              <button
                type="button"
                onClick={() => { setMode('otp'); setError(''); setSuccess(''); }}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-all ${
                  mode === 'otp'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Smartphone size={16} />
                Phone OTP
              </button>
            </div>

            {/* Error Alert */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* Success Alert */}
            {success && (
              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-700">{success}</p>
              </div>
            )}

            {/* Email/Password Form */}
            {mode === 'email' && (
              <form onSubmit={handleEmailSubmit} className="space-y-5">
                <div>
                  <Label htmlFor="email" className="text-gray-700">
                    Email Address
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    className="mt-1"
                    autoComplete="email"
                    autoFocus
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <Label htmlFor="password" className="text-gray-700">
                      Password
                    </Label>
                    <Link
                      href="/auth/forgot-password"
                      className="text-sm text-brand-600 hover:text-brand-700"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      className="pr-10"
                      autoComplete="current-password"
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <Button type="submit" className="w-full" size="lg" disabled={isSubmitting || authLoading}>
                  {isSubmitting ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Signing in...</>
                  ) : (
                    <><LogIn className="w-4 h-4 mr-2" />Sign In</>
                  )}
                </Button>
              </form>
            )}

            {/* Phone OTP Form */}
            {mode === 'otp' && (
              <form onSubmit={handleVerifyOTP} className="space-y-5">
                <div>
                  <Label htmlFor="phone" className="text-gray-700">
                    Phone Number
                  </Label>
                  <div className="flex gap-2 mt-1">
                    <div className="flex items-center px-3 bg-gray-50 border border-gray-200 rounded-md text-sm text-gray-500">
                      +91
                    </div>
                    <Input
                      id="phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      placeholder="9876543210"
                      maxLength={10}
                      required
                      disabled={otpSent}
                      autoFocus
                    />
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    We&apos;ll send a one-time password to this number
                  </p>
                </div>

                {!otpSent ? (
                  <Button
                    type="button"
                    className="w-full"
                    size="lg"
                    onClick={handleRequestOTP}
                    disabled={isSubmitting || phone.length < 10}
                  >
                    {isSubmitting ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sending OTP...</>
                    ) : (
                      <><Smartphone className="w-4 h-4 mr-2" />Send OTP</>
                    )}
                  </Button>
                ) : (
                  <>
                    <div>
                      <Label htmlFor="otp" className="text-gray-700">
                        Enter OTP
                      </Label>
                      <Input
                        id="otp"
                        type="text"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="123456"
                        maxLength={6}
                        required
                        className="mt-1 text-center text-lg tracking-widest font-mono"
                        autoFocus
                      />
                    </div>

                    <Button type="submit" className="w-full" size="lg" disabled={isSubmitting || otp.length < 4}>
                      {isSubmitting ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Verifying...</>
                      ) : (
                        <><LogIn className="w-4 h-4 mr-2" />Verify & Sign In</>
                      )}
                    </Button>

                    <div className="flex items-center justify-between text-sm">
                      <button
                        type="button"
                        onClick={() => { setOtpSent(false); setOtp(''); setSuccess(''); }}
                        className="text-brand-600 hover:text-brand-700"
                      >
                        Change number
                      </button>
                      <button
                        type="button"
                        onClick={handleRequestOTP}
                        disabled={otpCountdown > 0 || isSubmitting}
                        className="text-brand-600 hover:text-brand-700 disabled:text-gray-400"
                      >
                        {otpCountdown > 0 ? `Resend in ${otpCountdown}s` : 'Resend OTP'}
                      </button>
                    </div>
                  </>
                )}
              </form>
            )}

            {/* Divider */}
            <div className="my-6 flex items-center">
              <div className="flex-1 border-t border-gray-200" />
              <span className="px-4 text-sm text-gray-500">or continue with</span>
              <div className="flex-1 border-t border-gray-200" />
            </div>

            {/* Social Login Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" className="w-full" onClick={handleGoogleLogin} disabled={isSubmitting}>
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Google
              </Button>
              <Button variant="outline" className="w-full" disabled>
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701" />
                </svg>
                Apple
              </Button>
            </div>

            {/* Register Link */}
            <p className="mt-6 text-center text-sm text-gray-600">
              Don&apos;t have an account?{' '}
              <Link
                href={`/auth/register${redirectParam ? `?redirect=${encodeURIComponent(redirectParam)}` : ''}`}
                className="font-medium text-brand-600 hover:text-brand-700"
              >
                Sign up for free
              </Link>
            </p>
          </div>

          {/* Demo Credentials */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
            <p className="text-sm text-blue-800 font-medium mb-2">Demo Credentials:</p>
            <div className="text-sm text-blue-700 space-y-1">
              <p><strong>Guest:</strong> guest@example.com / password123</p>
              <p><strong>Hotel Admin:</strong> admin@radhikaresort.in / password123</p>
              <p><strong>Platform Admin:</strong> admin@hotel.local / password123</p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
