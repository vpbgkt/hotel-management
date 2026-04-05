/**
 * GraphQL Queries for Rooms and Availability
 */

import { gql } from '@apollo/client';

// Room type fragment
export const ROOM_TYPE_FRAGMENT = gql`
  fragment RoomTypeCard on RoomType {
    id
    name
    slug
    description
    basePriceDaily
    basePriceHourly
    maxGuests
    maxExtraGuests
    extraGuestCharge
    totalRooms
    amenities
    images
    isActive
    availableTonight
  }
`;

// Queries
export const GET_ROOM_TYPES = gql`
  query GetRoomTypes($hotelId: ID!, $filters: RoomTypeFiltersInput) {
    roomTypes(hotelId: $hotelId, filters: $filters) {
      ...RoomTypeCard
    }
  }
  ${ROOM_TYPE_FRAGMENT}
`;

export const GET_ROOM_TYPE_BY_SLUG = gql`
  query GetRoomTypeBySlug($hotelId: ID!, $slug: String!) {
    roomTypeBySlug(hotelId: $hotelId, slug: $slug) {
      ...RoomTypeCard
    }
  }
  ${ROOM_TYPE_FRAGMENT}
`;

export const CHECK_DAILY_AVAILABILITY = gql`
  query CheckDailyAvailability($input: CheckAvailabilityInput!) {
    checkDailyAvailability(input: $input) {
      hotelId
      checkIn
      checkOut
      nights
      numRooms
      roomTypes {
        roomType {
          id
          name
          slug
          basePriceDaily
          maxGuests
          amenities
          images
        }
        nights
        minAvailable
        isAvailable
        totalPrice
        pricePerNight
      }
      unavailableRoomTypes {
        roomType {
          id
          name
          slug
        }
        isAvailable
      }
    }
  }
`;

export const CHECK_HOURLY_AVAILABILITY = gql`
  query CheckHourlyAvailability($input: CheckHourlyAvailabilityInput!) {
    checkHourlyAvailability(input: $input) {
      hotelId
      date
      numHours
      numRooms
      roomTypes {
        roomType {
          id
          name
          basePriceHourly
          amenities
          images
        }
        minHours
        maxHours
        slots {
          startTime
          endTime
          available
          price
          isClosed
        }
        isAvailable
      }
    }
  }
`;

export const GET_ROOM_CALENDAR = gql`
  query GetRoomCalendar($roomTypeId: ID!, $startDate: DateTime!, $endDate: DateTime!) {
    roomCalendar(roomTypeId: $roomTypeId, startDate: $startDate, endDate: $endDate) {
      date
      availableCount
      price
      minStayNights
      isClosed
    }
  }
`;
