'use client';

/**
 * Staff Management - Hotel Manager Admin
 * Manage hotel staff members and their permissions
 */

import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { gql } from '@apollo/client';
import { useAuth } from '@/lib/auth/auth-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Users,
  Plus,
  Loader2,
  AlertCircle,
  Trash2,
  Edit,
  Shield,
  CheckCircle,
  XCircle,
} from 'lucide-react';

const GET_HOTEL_STAFF = gql`
  query GetHotelStaff($hotelId: ID!) {
    hotelStaff(hotelId: $hotelId) {
      id
      name
      email
      phone
      role
      isActive
      lastLoginAt
      createdAt
      staffPermission {
        id
        canManageBookings
        canManageRooms
        canManagePricing
        canManageReviews
        canManageContent
        canViewAnalytics
        canManageStaff
      }
    }
  }
`;

const CREATE_STAFF = gql`
  mutation CreateStaff($input: CreateStaffInput!) {
    createStaffMember(input: $input) {
      id
      name
      email
    }
  }
`;

const UPDATE_STAFF = gql`
  mutation UpdateStaff($input: UpdateStaffInput!) {
    updateStaffMember(input: $input) {
      id
      name
      email
      isActive
    }
  }
`;

const DELETE_STAFF = gql`
  mutation DeleteStaff($hotelId: ID!, $staffId: ID!) {
    deleteStaffMember(hotelId: $hotelId, staffId: $staffId) {
      success
      message
    }
  }
`;

interface StaffPermission {
  canManageBookings: boolean;
  canManageRooms: boolean;
  canManagePricing: boolean;
  canManageReviews: boolean;
  canManageContent: boolean;
  canViewAnalytics: boolean;
  canManageStaff: boolean;
}

interface StaffMember {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
  staffPermission?: StaffPermission;
}

const PERMISSION_LABELS: Record<keyof StaffPermission, string> = {
  canManageBookings: 'Manage Bookings',
  canManageRooms: 'Manage Rooms',
  canManagePricing: 'Manage Pricing',
  canManageReviews: 'Manage Reviews',
  canManageContent: 'Manage Content',
  canViewAnalytics: 'View Analytics',
  canManageStaff: 'Manage Staff',
};

const DEFAULT_PERMISSIONS: StaffPermission = {
  canManageBookings: true,
  canManageRooms: false,
  canManagePricing: false,
  canManageReviews: true,
  canManageContent: false,
  canViewAnalytics: false,
  canManageStaff: false,
};

export default function StaffPage() {
  const { user } = useAuth();
  const hotelId = user?.hotelId;

  const [showForm, setShowForm] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
  });
  const [permissions, setPermissions] = useState<StaffPermission>(DEFAULT_PERMISSIONS);
  const [error, setError] = useState('');

  const { data, loading, refetch } = useQuery<{ hotelStaff: StaffMember[] }>(GET_HOTEL_STAFF, {
    variables: { hotelId },
    skip: !hotelId,
  });

  const [createStaff, { loading: creating }] = useMutation(CREATE_STAFF);
  const [updateStaff, { loading: updating }] = useMutation(UPDATE_STAFF);
  const [deleteStaff] = useMutation(DELETE_STAFF);

  const staff: StaffMember[] = data?.hotelStaff || [];
  const isAdmin = user?.role === 'HOTEL_ADMIN';

  const resetForm = () => {
    setFormData({ name: '', email: '', phone: '', password: '' });
    setPermissions(DEFAULT_PERMISSIONS);
    setEditingStaff(null);
    setShowForm(false);
    setError('');
  };

  const handleEdit = (member: StaffMember) => {
    setEditingStaff(member);
    setFormData({
      name: member.name,
      email: member.email,
      phone: member.phone || '',
      password: '',
    });
    setPermissions(member.staffPermission || DEFAULT_PERMISSIONS);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      if (editingStaff) {
        await updateStaff({
          variables: {
            input: {
              hotelId,
              staffId: editingStaff.id,
              name: formData.name,
              email: formData.email,
              phone: formData.phone || undefined,
              permissions,
            },
          },
        });
      } else {
        if (!formData.password || formData.password.length < 8) {
          setError('Password must be at least 8 characters');
          return;
        }
        await createStaff({
          variables: {
            input: {
              hotelId,
              name: formData.name,
              email: formData.email,
              phone: formData.phone || undefined,
              password: formData.password,
              permissions,
            },
          },
        });
      }
      resetForm();
      refetch();
    } catch (err: any) {
      setError(err.message || 'Failed to save staff member');
    }
  };

  const handleDelete = async (staffId: string) => {
    if (!confirm('Are you sure you want to remove this staff member?')) return;
    try {
      await deleteStaff({ variables: { hotelId, staffId } });
      refetch();
    } catch (err: any) {
      setError(err.message || 'Failed to delete staff member');
    }
  };

  const handleToggleActive = async (member: StaffMember) => {
    try {
      await updateStaff({
        variables: {
          input: {
            hotelId,
            staffId: member.id,
            isActive: !member.isActive,
          },
        },
      });
      refetch();
    } catch (err: any) {
      setError(err.message || 'Failed to update staff member');
    }
  };

  if (!isAdmin) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-12 text-center">
            <Shield className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Access Restricted</h2>
            <p className="text-gray-500">Only hotel admins can manage staff members.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Staff Management</h1>
          <p className="text-gray-500 mt-1">Manage your hotel staff and their permissions</p>
        </div>
        <Button onClick={() => { resetForm(); setShowForm(true); }}>
          <Plus size={16} className="mr-2" />
          Add Staff Member
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {/* Create/Edit Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>{editingStaff ? 'Edit Staff Member' : 'Add New Staff Member'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                  <input
                    type="text"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                  <input
                    type="email"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
                {!editingStaff && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
                    <input
                      type="password"
                      required
                      minLength={8}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Min 8 characters"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    />
                  </div>
                )}
              </div>

              {/* Permissions */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">Permissions</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {(Object.keys(PERMISSION_LABELS) as (keyof StaffPermission)[]).map((key) => (
                    <label key={key} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={permissions[key]}
                        onChange={(e) =>
                          setPermissions({ ...permissions, [key]: e.target.checked })
                        }
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">{PERMISSION_LABELS[key]}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <Button type="submit" disabled={creating || updating}>
                  {(creating || updating) && <Loader2 size={16} className="mr-2 animate-spin" />}
                  {editingStaff ? 'Update' : 'Create'} Staff Member
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Staff List */}
      {loading ? (
        <div className="flex items-center justify-center p-12">
          <Loader2 size={24} className="animate-spin text-blue-600" />
        </div>
      ) : staff.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h2 className="text-lg font-semibold text-gray-900 mb-2">No Staff Members</h2>
            <p className="text-gray-500 mb-4">Add staff members to help manage your hotel.</p>
            <Button onClick={() => setShowForm(true)}>
              <Plus size={16} className="mr-2" />
              Add First Staff Member
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {staff.map((member) => (
            <Card key={member.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <span className="text-blue-600 font-semibold text-sm">
                        {member.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-gray-900">{member.name}</h3>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          member.role === 'HOTEL_ADMIN'
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          {member.role === 'HOTEL_ADMIN' ? 'Admin' : 'Staff'}
                        </span>
                        {member.isActive ? (
                          <CheckCircle size={14} className="text-green-500" />
                        ) : (
                          <XCircle size={14} className="text-red-500" />
                        )}
                      </div>
                      <p className="text-sm text-gray-500">{member.email}</p>
                      {member.lastLoginAt && (
                        <p className="text-xs text-gray-400 mt-0.5">
                          Last login: {new Date(member.lastLoginAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>

                  {member.role === 'HOTEL_STAFF' && (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleActive(member)}
                      >
                        {member.isActive ? 'Disable' : 'Enable'}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(member)}
                      >
                        <Edit size={14} />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(member.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  )}
                </div>

                {/* Permissions badges */}
                {member.staffPermission && member.role === 'HOTEL_STAFF' && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {(Object.keys(PERMISSION_LABELS) as (keyof StaffPermission)[]).map((key) =>
                      member.staffPermission?.[key] ? (
                        <span
                          key={key}
                          className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-green-50 text-green-700 border border-green-200"
                        >
                          {PERMISSION_LABELS[key]}
                        </span>
                      ) : null,
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
