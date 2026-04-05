'use client';

import { useState } from 'react';
import { RoomCard } from './room-card';
import { BookingWidget } from '@/components/booking/booking-widget';

interface RoomListProps {
  rooms: any[];
  hotel: any;
}

export function RoomList({ rooms, hotel }: RoomListProps) {
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(
    rooms.length > 0 ? rooms[0].id : null
  );

  const selectedRoom = rooms.find((r) => r.id === selectedRoomId);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-4">
        {rooms.map((room) => (
          <RoomCard
            key={room.id}
            room={room}
            hotelSlug={hotel.slug}
            bookingModel={hotel.bookingModel}
            onSelectRoom={setSelectedRoomId}
          />
        ))}
      </div>
      <div className="lg:col-span-1">
        <div className="sticky top-24">
          <BookingWidget
            hotelId={hotel.id}
            hotelName={hotel.name}
            hotelSlug={hotel.slug}
            bookingModel={hotel.bookingModel}
            minStayNights={hotel.minStayNights}
            minStayHours={hotel.minStayHours}
            checkInTime={hotel.checkInTime}
            checkOutTime={hotel.checkOutTime}
            selectedRoom={selectedRoom}
          />
        </div>
      </div>
    </div>
  );
}
