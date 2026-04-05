'use client';

/**
 * Admin Room Management - Hotel Manager
 * CRUD room types with pricing, amenities, and capacity
 */

import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { useAuth } from '@/lib/auth/auth-context';
import {
  GET_ADMIN_ROOM_TYPES,
  CREATE_ROOM_TYPE,
  UPDATE_ROOM_TYPE,
  DELETE_ROOM_TYPE,
} from '@/lib/graphql/queries/admin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Plus,
  Pencil,
  Trash2,
  X,
  Loader2,
  AlertCircle,
  BedDouble,
  IndianRupee,
  Users,
  Check,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';

interface RoomType {
  id: string;
  name: string;
  slug: string;
  description?: string;
  basePriceDaily: number;
  basePriceHourly?: number;
  maxGuests: number;
  maxExtraGuests: number;
  extraGuestCharge: number;
  totalRooms: number;
  amenities: string[];
  images: string[];
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
}

const AMENITY_OPTIONS = [
  'wifi', 'ac', 'tv', 'minibar', 'room-service', 'ocean-view',
  'balcony', 'bathtub', 'safe', 'breakfast', 'pool-access', 'gym-access',
  'parking', 'laundry', 'iron', 'coffee-maker',
];

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

export default function AdminRoomsPage() {
  const { user } = useAuth();
  const hotelId = user?.hotelId;
  const [showForm, setShowForm] = useState(false);
  const [editingRoom, setEditingRoom] = useState<RoomType | null>(null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, loading, error, refetch } = useQuery<any>(GET_ADMIN_ROOM_TYPES, {
    variables: { hotelId },
    skip: !hotelId,
  });

  const [createRoom, { loading: creating }] = useMutation(CREATE_ROOM_TYPE, {
    onCompleted: () => {
      refetch();
      setShowForm(false);
      resetForm();
    },
  });

  const [updateRoom, { loading: updating }] = useMutation(UPDATE_ROOM_TYPE, {
    onCompleted: () => {
      refetch();
      setEditingRoom(null);
      setShowForm(false);
      resetForm();
    },
  });

  const [deleteRoom] = useMutation(DELETE_ROOM_TYPE, {
    onCompleted: () => refetch(),
  });

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    basePriceDaily: '',
    basePriceHourly: '',
    maxGuests: '2',
    maxExtraGuests: '0',
    extraGuestCharge: '0',
    totalRooms: '1',
    amenities: [] as string[],
    sortOrder: '0',
  });

  const resetForm = () => {
    setFormData({
      name: '', slug: '', description: '', basePriceDaily: '',
      basePriceHourly: '', maxGuests: '2', maxExtraGuests: '0',
      extraGuestCharge: '0', totalRooms: '1', amenities: [], sortOrder: '0',
    });
  };

  const openEditForm = (room: RoomType) => {
    setEditingRoom(room);
    setFormData({
      name: room.name,
      slug: room.slug,
      description: room.description || '',
      basePriceDaily: String(room.basePriceDaily),
      basePriceHourly: room.basePriceHourly ? String(room.basePriceHourly) : '',
      maxGuests: String(room.maxGuests),
      maxExtraGuests: String(room.maxExtraGuests),
      extraGuestCharge: String(room.extraGuestCharge),
      totalRooms: String(room.totalRooms),
      amenities: room.amenities || [],
      sortOrder: String(room.sortOrder),
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (editingRoom) {
      await updateRoom({
        variables: {
          input: {
            id: editingRoom.id,
            name: formData.name,
            description: formData.description || undefined,
            basePriceDaily: parseFloat(formData.basePriceDaily),
            basePriceHourly: formData.basePriceHourly ? parseFloat(formData.basePriceHourly) : undefined,
            maxGuests: parseInt(formData.maxGuests),
            maxExtraGuests: parseInt(formData.maxExtraGuests),
            extraGuestCharge: parseFloat(formData.extraGuestCharge),
            totalRooms: parseInt(formData.totalRooms),
            amenities: formData.amenities,
            sortOrder: parseInt(formData.sortOrder),
          },
        },
      });
    } else {
      await createRoom({
        variables: {
          input: {
            hotelId,
            name: formData.name,
            slug: formData.slug || slugify(formData.name),
            description: formData.description || undefined,
            basePriceDaily: parseFloat(formData.basePriceDaily),
            basePriceHourly: formData.basePriceHourly ? parseFloat(formData.basePriceHourly) : undefined,
            maxGuests: parseInt(formData.maxGuests),
            maxExtraGuests: parseInt(formData.maxExtraGuests),
            extraGuestCharge: parseFloat(formData.extraGuestCharge),
            totalRooms: parseInt(formData.totalRooms),
            amenities: formData.amenities,
            sortOrder: parseInt(formData.sortOrder),
          },
        },
      });
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to deactivate "${name}"? This won't delete existing bookings.`)) {
      await deleteRoom({ variables: { id } });
    }
  };

  const toggleAmenity = (amenity: string) => {
    setFormData(prev => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter(a => a !== amenity)
        : [...prev.amenities, amenity],
    }));
  };

  const toggleActive = async (room: RoomType) => {
    await updateRoom({
      variables: {
        input: { id: room.id, isActive: !room.isActive },
      },
    });
  };

  const roomTypes: RoomType[] = (data as any)?.adminRoomTypes || [];

  if (!hotelId) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold">No Hotel Assigned</h2>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Room Types</h1>
          <p className="text-gray-500 mt-1">Manage room types, pricing, and capacity</p>
        </div>
        <Button
          onClick={() => { resetForm(); setEditingRoom(null); setShowForm(true); }}
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Room Type
        </Button>
      </div>

      {/* Room Type Form (Modal overlay) */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold">
                {editingRoom ? 'Edit Room Type' : 'New Room Type'}
              </h2>
              <button onClick={() => { setShowForm(false); setEditingRoom(null); }} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {/* Name & Slug */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Room Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      name: e.target.value,
                      slug: editingRoom ? prev.slug : slugify(e.target.value),
                    }))}
                    placeholder="e.g., Deluxe Ocean View"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Slug</label>
                  <input
                    type="text"
                    value={formData.slug}
                    onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                    placeholder="auto-generated"
                    disabled={!!editingRoom}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 disabled:bg-gray-50"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  placeholder="Describe the room type..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500"
                />
              </div>

              {/* Pricing */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Daily Price (₹) *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={formData.basePriceDaily}
                    onChange={(e) => setFormData(prev => ({ ...prev, basePriceDaily: e.target.value }))}
                    placeholder="e.g., 3500"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Hourly Price (₹)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.basePriceHourly}
                    onChange={(e) => setFormData(prev => ({ ...prev, basePriceHourly: e.target.value }))}
                    placeholder="Leave empty for daily only"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              {/* Capacity */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max Guests *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formData.maxGuests}
                    onChange={(e) => setFormData(prev => ({ ...prev, maxGuests: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Extra Guests</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.maxExtraGuests}
                    onChange={(e) => setFormData(prev => ({ ...prev, maxExtraGuests: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Extra Charge (₹)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.extraGuestCharge}
                    onChange={(e) => setFormData(prev => ({ ...prev, extraGuestCharge: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              {/* Rooms & Sort */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Total Rooms *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formData.totalRooms}
                    onChange={(e) => setFormData(prev => ({ ...prev, totalRooms: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sort Order</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.sortOrder}
                    onChange={(e) => setFormData(prev => ({ ...prev, sortOrder: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              {/* Amenities */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Amenities</label>
                <div className="flex flex-wrap gap-2">
                  {AMENITY_OPTIONS.map((amenity) => (
                    <button
                      key={amenity}
                      type="button"
                      onClick={() => toggleAmenity(amenity)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border transition-colors ${
                        formData.amenities.includes(amenity)
                          ? 'bg-brand-50 border-brand-300 text-brand-700'
                          : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {formData.amenities.includes(amenity) && <Check className="w-3.5 h-3.5" />}
                      {amenity}
                    </button>
                  ))}
                </div>
              </div>

              {/* Submit */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => { setShowForm(false); setEditingRoom(null); }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={creating || updating}>
                  {(creating || updating) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {editingRoom ? 'Update Room Type' : 'Create Room Type'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Room Types Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
        </div>
      ) : error ? (
        <div className="text-center py-12 text-red-500">
          <AlertCircle className="w-8 h-8 mx-auto mb-2" />
          {error.message}
        </div>
      ) : roomTypes.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-100 shadow-sm">
          <BedDouble className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Room Types</h3>
          <p className="text-gray-500 mb-4">Get started by creating your first room type</p>
          <Button onClick={() => { resetForm(); setShowForm(true); }}>
            <Plus className="w-4 h-4 mr-2" />
            Add Room Type
          </Button>
        </div>
      ) : (
        <div className="grid gap-4">
          {roomTypes.map((room) => (
            <Card key={room.id} className={`border-0 shadow-sm ${!room.isActive ? 'opacity-60' : ''}`}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg font-semibold text-gray-900">{room.name}</h3>
                      {!room.isActive && (
                        <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full font-medium">
                          Inactive
                        </span>
                      )}
                    </div>
                    {room.description && (
                      <p className="text-sm text-gray-500 mb-3 line-clamp-2">{room.description}</p>
                    )}

                    <div className="flex flex-wrap items-center gap-4 text-sm">
                      <div className="flex items-center gap-1.5 text-gray-600">
                        <IndianRupee className="w-4 h-4" />
                        <span className="font-medium">₹{room.basePriceDaily.toLocaleString('en-IN')}</span>
                        <span className="text-gray-400">/night</span>
                        {room.basePriceHourly && (
                          <>
                            <span className="text-gray-300 mx-1">|</span>
                            <span className="font-medium">₹{room.basePriceHourly.toLocaleString('en-IN')}</span>
                            <span className="text-gray-400">/hour</span>
                          </>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-gray-600">
                        <Users className="w-4 h-4" />
                        <span>{room.maxGuests} guests</span>
                        {room.maxExtraGuests > 0 && (
                          <span className="text-gray-400">(+{room.maxExtraGuests} extra)</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-gray-600">
                        <BedDouble className="w-4 h-4" />
                        <span>{room.totalRooms} rooms</span>
                      </div>
                    </div>

                    {room.amenities.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {room.amenities.slice(0, 6).map((a) => (
                          <span
                            key={a}
                            className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full"
                          >
                            {a}
                          </span>
                        ))}
                        {room.amenities.length > 6 && (
                          <span className="px-2 py-0.5 text-gray-400 text-xs">
                            +{room.amenities.length - 6} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => toggleActive(room)}
                      className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                      title={room.isActive ? 'Deactivate' : 'Activate'}
                    >
                      {room.isActive ? (
                        <ToggleRight className="w-5 h-5 text-green-600" />
                      ) : (
                        <ToggleLeft className="w-5 h-5 text-gray-400" />
                      )}
                    </button>
                    <button
                      onClick={() => openEditForm(room)}
                      className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
                      title="Edit"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(room.id, room.name)}
                      className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
