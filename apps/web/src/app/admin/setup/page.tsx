'use client';

/**
 * Setup Wizard - Hotel Manager Admin
 * First-run setup guide for new hotel deployments
 */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@apollo/client/react';
import { gql } from '@apollo/client';
import { useAuth } from '@/lib/auth/auth-context';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  CheckCircle,
  Circle,
  ArrowRight,
  Hotel,
  Phone,
  BedDouble,
  Image as ImageIcon,
  Clock,
  Loader2,
  PartyPopper,
} from 'lucide-react';

const GET_SETUP_STATUS = gql`
  query GetSetupStatus($hotelId: ID!) {
    setupStatus(hotelId: $hotelId) {
      hotelId
      setupCompleted
      steps {
        basicInfo
        contactInfo
        rooms
        gallery
        policies
      }
    }
  }
`;

const COMPLETE_SETUP = gql`
  mutation CompleteSetup($hotelId: ID!) {
    completeSetup(hotelId: $hotelId) {
      id
      setupCompleted
    }
  }
`;

interface SetupStep {
  key: string;
  label: string;
  description: string;
  icon: React.ComponentType<any>;
  href: string;
  complete: boolean;
}

export default function SetupPage() {
  const { user } = useAuth();
  const router = useRouter();
  const hotelId = user?.hotelId;

  const { data, loading, refetch } = useQuery<{ setupStatus: { hotelId: string; setupCompleted: boolean; steps: { basicInfo: boolean; contactInfo: boolean; rooms: boolean; gallery: boolean; policies: boolean } } }>(GET_SETUP_STATUS, {
    variables: { hotelId },
    skip: !hotelId,
  });

  const [completeSetup, { loading: completing }] = useMutation(COMPLETE_SETUP);

  const status = data?.setupStatus;

  const steps: SetupStep[] = status
    ? [
        {
          key: 'basicInfo',
          label: 'Basic Information',
          description: 'Set your hotel name, address, and location',
          icon: Hotel,
          href: '/admin/settings',
          complete: status.steps.basicInfo,
        },
        {
          key: 'contactInfo',
          label: 'Contact Details',
          description: 'Add phone number, email, and WhatsApp',
          icon: Phone,
          href: '/admin/settings',
          complete: status.steps.contactInfo,
        },
        {
          key: 'rooms',
          label: 'Room Types',
          description: 'Create at least one room type with pricing',
          icon: BedDouble,
          href: '/admin/rooms',
          complete: status.steps.rooms,
        },
        {
          key: 'gallery',
          label: 'Photo Gallery',
          description: 'Upload photos of your hotel and rooms',
          icon: ImageIcon,
          href: '/admin/gallery',
          complete: status.steps.gallery,
        },
        {
          key: 'policies',
          label: 'Check-in/Out Policy',
          description: 'Set check-in and check-out times',
          icon: Clock,
          href: '/admin/settings',
          complete: status.steps.policies,
        },
      ]
    : [];

  const completedCount = steps.filter((s) => s.complete).length;
  const allComplete = completedCount === steps.length && steps.length > 0;

  const handleComplete = async () => {
    try {
      await completeSetup({ variables: { hotelId } });
      router.push('/admin');
    } catch (err) {
      console.error('Failed to complete setup:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 size={32} className="animate-spin text-blue-600" />
      </div>
    );
  }

  if (status?.setupCompleted) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-12 text-center">
            <PartyPopper className="mx-auto h-16 w-16 text-green-500 mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Setup Complete!</h2>
            <p className="text-gray-500 mb-6">Your hotel is fully configured and ready for guests.</p>
            <Button onClick={() => router.push('/admin')}>
              Go to Dashboard
              <ArrowRight size={16} className="ml-2" />
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900">Welcome! Let&apos;s set up your hotel</h1>
        <p className="text-gray-500 mt-2">
          Complete these steps to get your hotel ready for bookings.
        </p>
        <div className="mt-4 flex items-center justify-center gap-2">
          <div className="h-2 flex-1 max-w-xs bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 rounded-full transition-all duration-500"
              style={{ width: `${steps.length > 0 ? (completedCount / steps.length) * 100 : 0}%` }}
            />
          </div>
          <span className="text-sm font-medium text-gray-600">
            {completedCount}/{steps.length}
          </span>
        </div>
      </div>

      <div className="space-y-3">
        {steps.map((step, i) => (
          <Card
            key={step.key}
            className={`cursor-pointer transition-all hover:shadow-md ${
              step.complete ? 'bg-green-50 border-green-200' : ''
            }`}
            onClick={() => router.push(step.href)}
          >
            <CardContent className="p-4 flex items-center gap-4">
              <div className={`rounded-full p-2 ${
                step.complete ? 'bg-green-100' : 'bg-gray-100'
              }`}>
                {step.complete ? (
                  <CheckCircle size={24} className="text-green-600" />
                ) : (
                  <step.icon size={24} className="text-gray-400" />
                )}
              </div>
              <div className="flex-1">
                <h3 className={`font-medium ${step.complete ? 'text-green-800' : 'text-gray-900'}`}>
                  {i + 1}. {step.label}
                </h3>
                <p className={`text-sm ${step.complete ? 'text-green-600' : 'text-gray-500'}`}>
                  {step.description}
                </p>
              </div>
              {!step.complete && (
                <ArrowRight size={20} className="text-gray-400" />
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {allComplete && (
        <div className="text-center pt-4">
          <Button size="lg" onClick={handleComplete} disabled={completing}>
            {completing && <Loader2 size={16} className="mr-2 animate-spin" />}
            Complete Setup
            <PartyPopper size={16} className="ml-2" />
          </Button>
        </div>
      )}
    </div>
  );
}
