'use client';

/**
 * Profile Page - Hotel Manager Dashboard
 * User profile management — wired to real GraphQL API
 */

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/auth-context';
import { useQuery, useMutation } from '@apollo/client/react';
import { USER_PROFILE, UPDATE_PROFILE, DEACTIVATE_ACCOUNT } from '@/lib/graphql/queries/user';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  User, 
  Mail, 
  Phone, 
  Camera,
  Loader2,
  Check,
  AlertCircle,
  Shield,
  ShieldCheck,
  LogOut
} from 'lucide-react';

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [showDeactivate, setShowDeactivate] = useState(false);

  const { data: profileData, loading: profileLoading, refetch } = useQuery<any>(USER_PROFILE, {
    skip: !user,
  });

  const profile = profileData?.userProfile;

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
  });

  // Populate form when profile loads
  useEffect(() => {
    if (profile) {
      setFormData({
        name: profile.name || '',
        email: profile.email || '',
        phone: profile.phone || '',
      });
    }
  }, [profile]);

  const [updateProfile, { loading: saving }] = useMutation(UPDATE_PROFILE, {
    onCompleted: () => {
      setSuccess('Profile updated successfully!');
      setIsEditing(false);
      setError('');
      refetch();
      setTimeout(() => setSuccess(''), 3000);
    },
    onError: (err) => {
      setError(err.message || 'Failed to update profile. Please try again.');
    },
  });

  const [deactivateAccount, { loading: deactivating }] = useMutation(DEACTIVATE_ACCOUNT, {
    onCompleted: () => {
      logout();
    },
    onError: (err) => {
      setError(err.message || 'Failed to deactivate account.');
    },
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const input: Record<string, string> = {};
    if (formData.name !== profile?.name) input.name = formData.name;
    if (formData.phone !== (profile?.phone || '')) input.phone = formData.phone;

    if (Object.keys(input).length === 0) {
      setIsEditing(false);
      return;
    }

    updateProfile({ variables: { input } });
  };

  const handleCancel = () => {
    setIsEditing(false);
    setError('');
    if (profile) {
      setFormData({
        name: profile.name || '',
        email: profile.email || '',
        phone: profile.phone || '',
      });
    }
  };

  if (profileLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
        <p className="text-gray-600 mt-1">Manage your personal information</p>
      </div>

      {/* Profile Card */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            {/* Avatar */}
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white text-3xl font-bold">
                {profile?.avatarUrl ? (
                  <img src={profile.avatarUrl} alt={profile.name} className="w-full h-full rounded-full object-cover" />
                ) : (
                  profile?.name?.charAt(0).toUpperCase() || 'U'
                )}
              </div>
              <button className="absolute bottom-0 right-0 p-2 bg-white rounded-full shadow-md hover:shadow-lg transition-shadow">
                <Camera size={16} className="text-gray-600" />
              </button>
            </div>

            {/* User Info */}
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-gray-900">{profile?.name}</h2>
              <p className="text-gray-500">{profile?.email}</p>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span className="px-2 py-1 bg-brand-100 text-brand-700 text-xs font-medium rounded-full capitalize">
                  {profile?.role?.toLowerCase().replace('_', ' ') || 'guest'}
                </span>
                {profile?.emailVerified && (
                  <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full flex items-center gap-1">
                    <ShieldCheck size={12} /> Email Verified
                  </span>
                )}
                {profile?.phoneVerified && (
                  <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full flex items-center gap-1">
                    <ShieldCheck size={12} /> Phone Verified
                  </span>
                )}
                <span className="text-sm text-gray-500">
                  Member since {profile?.createdAt
                    ? new Date(profile.createdAt).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
                    : '-'}
                </span>
              </div>
              {profile?.lastLoginAt && (
                <p className="text-xs text-gray-400 mt-1">
                  Last login: {new Date(profile.lastLoginAt).toLocaleString('en-IN')}
                </p>
              )}
            </div>

            {/* Edit Button */}
            {!isEditing && (
              <Button variant="outline" onClick={() => setIsEditing(true)}>
                Edit Profile
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Success/Error Messages */}
      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
          <Check className="w-5 h-5 text-green-600" />
          <p className="text-sm text-green-700">{success}</p>
        </div>
      )}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Profile Form */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Personal Information</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Name */}
              <div>
                <Label htmlFor="name" className="flex items-center gap-2 text-gray-700">
                  <User size={16} />
                  Full Name
                </Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  disabled={!isEditing}
                  className="mt-1"
                />
              </div>

              {/* Email */}
              <div>
                <Label htmlFor="email" className="flex items-center gap-2 text-gray-700">
                  <Mail size={16} />
                  Email Address
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  disabled={true}
                  className="mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
              </div>

              {/* Phone */}
              <div>
                <Label htmlFor="phone" className="flex items-center gap-2 text-gray-700">
                  <Phone size={16} />
                  Phone Number
                </Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={handleChange}
                  disabled={!isEditing}
                  placeholder="+91 98765 43210"
                  className="mt-1"
                />
              </div>
            </div>

            {/* Form Actions */}
            {isEditing && (
              <div className="flex items-center justify-end gap-3 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </Button>
              </div>
            )}
          </form>
        </CardContent>
      </Card>

      {/* Security Section */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield size={20} />
            Security
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <h4 className="font-medium text-gray-900">Password</h4>
              <p className="text-sm text-gray-500">Change your account password</p>
            </div>
            <Button variant="outline" size="sm">
              Change Password
            </Button>
          </div>
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <h4 className="font-medium text-gray-900">Two-Factor Authentication</h4>
              <p className="text-sm text-gray-500">Add an extra layer of security</p>
            </div>
            <Button variant="outline" size="sm">
              Enable
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-0 shadow-sm border-red-100">
        <CardHeader>
          <CardTitle className="text-lg text-red-600">Danger Zone</CardTitle>
        </CardHeader>
        <CardContent>
          {showDeactivate ? (
            <div className="p-4 bg-red-50 rounded-lg">
              <h4 className="font-medium text-red-900 mb-2">Are you sure?</h4>
              <p className="text-sm text-red-600 mb-4">
                This will deactivate your account. You will lose access to all your bookings and data.
              </p>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDeactivate(false)}
                  disabled={deactivating}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="bg-red-600 hover:bg-red-700 text-white"
                  onClick={() => deactivateAccount()}
                  disabled={deactivating}
                >
                  {deactivating ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <LogOut size={14} className="mr-2" />
                  )}
                  Deactivate Account
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg">
              <div>
                <h4 className="font-medium text-red-900">Deactivate Account</h4>
                <p className="text-sm text-red-600">
                  Permanently deactivate your account and lose access
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="text-red-600 border-red-300 hover:bg-red-100"
                onClick={() => setShowDeactivate(true)}
              >
                Deactivate Account
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
