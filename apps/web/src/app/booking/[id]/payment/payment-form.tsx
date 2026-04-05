'use client';

/**
 * Payment Form Component
 * Handles payment method selection and processing via Demo/Razorpay gateway
 */

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@apollo/client/react';
import { Button } from '@/components/ui/button';
import { INITIATE_PAYMENT, CONFIRM_PAYMENT } from '@/lib/graphql/mutations/payments';
import { 
  CreditCard, 
  Smartphone, 
  Building2, 
  Wallet,
  CheckCircle,
  AlertCircle,
  Loader2
} from 'lucide-react';

// Declare Razorpay global type
declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  prefill?: { name?: string; email?: string; contact?: string };
  theme?: { color?: string };
  method?: { upi?: boolean; card?: boolean; netbanking?: boolean; wallet?: boolean };
  handler: (response: RazorpayResponse) => void;
  modal?: { ondismiss?: () => void };
}

interface RazorpayResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

interface RazorpayInstance {
  open: () => void;
  on: (event: string, handler: (response: any) => void) => void;
}

interface PaymentFormProps {
  bookingId: string;
  amount: number;
  guestName?: string;
  guestEmail?: string;
  guestPhone?: string;
}

type PaymentMethod = 'card' | 'upi' | 'netbanking' | 'wallet';

const paymentMethods = [
  { id: 'card', label: 'Credit/Debit Card', icon: CreditCard, description: 'Visa, Mastercard, RuPay' },
  { id: 'upi', label: 'UPI', icon: Smartphone, description: 'GPay, PhonePe, Paytm' },
  { id: 'netbanking', label: 'Net Banking', icon: Building2, description: 'All major banks' },
  { id: 'wallet', label: 'Wallet', icon: Wallet, description: 'Paytm, Amazon Pay' },
] as const;

export function PaymentForm({ bookingId, amount, guestName, guestEmail, guestPhone }: PaymentFormProps) {
  const router = useRouter();
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('upi');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);
  
  // Apollo mutations
  const [initiatePayment] = useMutation<any>(INITIATE_PAYMENT);
  const [confirmPayment] = useMutation<any>(CONFIRM_PAYMENT);
  
  // Card details state
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [cardName, setCardName] = useState('');
  
  // UPI state
  const [upiId, setUpiId] = useState('');

  // Load Razorpay Checkout script
  useEffect(() => {
    if (typeof window !== 'undefined' && !window.Razorpay) {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => setRazorpayLoaded(true);
      script.onerror = () => console.warn('Failed to load Razorpay script — will use demo mode');
      document.body.appendChild(script);
    } else if (typeof window !== 'undefined' && window.Razorpay) {
      setRazorpayLoaded(true);
    }
  }, []);

  const openRazorpayCheckout = useCallback((gatewayData: any, paymentId: string) => {
    return new Promise<RazorpayResponse>((resolve, reject) => {
      const options: RazorpayOptions = {
        key: gatewayData.razorpayKeyId,
        amount: gatewayData.amount,
        currency: gatewayData.currency || 'INR',
        name: gatewayData.name || process.env.NEXT_PUBLIC_APP_NAME || 'Hotel',
        description: gatewayData.description || 'Hotel Booking Payment',
        order_id: gatewayData.razorpayOrderId,
        prefill: {
          name: guestName || '',
          email: guestEmail || '',
          contact: guestPhone || '',
        },
        theme: { color: '#2563eb' },
        handler: (response: RazorpayResponse) => {
          resolve(response);
        },
        modal: {
          ondismiss: () => {
            reject(new Error('Payment cancelled by user'));
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', (response: any) => {
        reject(new Error(response.error?.description || 'Payment failed'));
      });
      rzp.open();
    });
  }, [guestName, guestEmail, guestPhone]);

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || '';
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    return parts.length ? parts.join(' ') : v;
  };

  const formatExpiry = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    if (v.length >= 2) {
      return v.slice(0, 2) + '/' + v.slice(2, 4);
    }
    return v;
  };

  const handlePayment = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Step 1: Initiate payment via API
      const { data: initData } = await initiatePayment({
        variables: {
          bookingId,
          method: selectedMethod,
        },
      });

      if (!initData?.initiatePayment?.paymentId) {
        throw new Error('Failed to initiate payment');
      }

      const { paymentId, gateway, gatewayData: gatewayDataStr } = initData.initiatePayment;
      const gatewayData = gatewayDataStr ? JSON.parse(gatewayDataStr) : {};

      let gatewayPaymentId: string | null = null;
      let gatewaySignature: string | null = null;

      if (gateway === 'RAZORPAY' && razorpayLoaded && window.Razorpay) {
        // Open Razorpay Checkout modal
        const response = await openRazorpayCheckout(gatewayData, paymentId);
        gatewayPaymentId = response.razorpay_payment_id;
        gatewaySignature = response.razorpay_signature;
      } else if (gateway === 'DEMO') {
        // Demo mode: small delay for UX
        await new Promise(resolve => setTimeout(resolve, 1500));
      }

      // Step 2: Confirm payment with backend
      const { data: confirmData } = await confirmPayment({
        variables: {
          paymentId,
          gatewayPaymentId,
          gatewaySignature,
        },
      });

      if (!confirmData?.confirmPayment?.success) {
        throw new Error(confirmData?.confirmPayment?.message || 'Payment confirmation failed');
      }

      // Step 3: Redirect to confirmation page
      router.push(`/booking/${bookingId}/confirmation`);
    } catch (err: any) {
      if (err?.message === 'Payment cancelled by user') {
        setError('Payment was cancelled. You can try again.');
      } else {
        setError(err?.message || 'Payment failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = () => {
    if (selectedMethod === 'card') {
      return cardNumber.replace(/\s/g, '').length === 16 &&
             expiry.length === 5 &&
             cvv.length >= 3 &&
             cardName.length >= 2;
    }
    if (selectedMethod === 'upi') {
      return upiId.includes('@');
    }
    return true;
  };

  return (
    <div className="space-y-6">
      {/* Payment Method Selection */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Select Payment Method
        </h2>
        
        <div className="grid grid-cols-2 gap-3">
          {paymentMethods.map((method) => (
            <button
              key={method.id}
              onClick={() => setSelectedMethod(method.id)}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                selectedMethod === method.id
                  ? 'border-brand-500 bg-brand-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-3 mb-1">
                <method.icon className={`w-5 h-5 ${
                  selectedMethod === method.id ? 'text-brand-600' : 'text-gray-500'
                }`} />
                <span className={`font-medium ${
                  selectedMethod === method.id ? 'text-brand-700' : 'text-gray-900'
                }`}>
                  {method.label}
                </span>
              </div>
              <p className="text-xs text-gray-500 ml-8">{method.description}</p>
            </button>
          ))}
        </div>
      </div>
      
      {/* Payment Details */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Payment Details
        </h2>
        
        {selectedMethod === 'card' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Card Number
              </label>
              <div className="relative">
                <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                  placeholder="1234 5678 9012 3456"
                  maxLength={19}
                  className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Expiry Date
                </label>
                <input
                  type="text"
                  value={expiry}
                  onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                  placeholder="MM/YY"
                  maxLength={5}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  CVV
                </label>
                <input
                  type="password"
                  value={cvv}
                  onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="•••"
                  maxLength={4}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Name on Card
              </label>
              <input
                type="text"
                value={cardName}
                onChange={(e) => setCardName(e.target.value)}
                placeholder="John Doe"
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              />
            </div>
          </div>
        )}
        
        {selectedMethod === 'upi' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              UPI ID
            </label>
            <div className="relative">
              <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                placeholder="yourname@upi"
                className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              />
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Enter your UPI ID (e.g., name@okicici, name@ybl)
            </p>
          </div>
        )}
        
        {selectedMethod === 'netbanking' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Select Bank
            </label>
            <select className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent">
              <option value="">Select your bank</option>
              <option value="sbi">State Bank of India</option>
              <option value="hdfc">HDFC Bank</option>
              <option value="icici">ICICI Bank</option>
              <option value="axis">Axis Bank</option>
              <option value="kotak">Kotak Mahindra Bank</option>
              <option value="pnb">Punjab National Bank</option>
            </select>
          </div>
        )}
        
        {selectedMethod === 'wallet' && (
          <div className="grid grid-cols-3 gap-3">
            {['Paytm', 'Amazon Pay', 'Mobikwik'].map((wallet) => (
              <button
                key={wallet}
                className="p-4 border border-gray-200 rounded-lg hover:border-brand-500 hover:bg-brand-50 transition-colors text-center"
              >
                <span className="text-sm font-medium text-gray-700">{wallet}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      
      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-50 text-red-700 rounded-lg">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
      
      {/* Pay Button */}
      <Button
        onClick={handlePayment}
        disabled={loading || !isFormValid()}
        className="w-full py-4 text-lg"
        size="lg"
      >
        {loading ? (
          <>
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            Pay ₹{amount.toLocaleString('en-IN')}
          </>
        )}
      </Button>
      
      {/* Terms */}
      <p className="text-xs text-center text-gray-500">
        By completing this payment, you agree to our{' '}
        <a href="/terms" className="text-brand-600 hover:underline">Terms of Service</a>
        {' '}and{' '}
        <a href="/privacy" className="text-brand-600 hover:underline">Privacy Policy</a>.
      </p>
    </div>
  );
}
