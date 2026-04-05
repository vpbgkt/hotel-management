/**
 * User / Guest GraphQL Queries & Mutations
 */

import { gql } from '@apollo/client';

export const ME_QUERY = gql`
  query Me {
    me {
      id
      email
      name
      phone
      role
      avatarUrl
      hotelId
      createdAt
    }
  }
`;

export const USER_PROFILE = gql`
  query UserProfile {
    userProfile {
      id
      email
      name
      phone
      avatarUrl
      role
      hotelId
      isActive
      emailVerified
      phoneVerified
      lastLoginAt
      createdAt
      updatedAt
    }
  }
`;

export const UPDATE_PROFILE = gql`
  mutation UpdateProfile($input: UpdateProfileInput!) {
    updateProfile(input: $input) {
      id
      email
      name
      phone
      avatarUrl
      role
      isActive
      emailVerified
      phoneVerified
      updatedAt
    }
  }
`;

export const MY_BOOKINGS = gql`
  query MyBookings($limit: Int, $offset: Int) {
    myBookings(limit: $limit, offset: $offset) {
      id
      bookingNumber
      bookingType
      status
      paymentStatus
      checkInDate
      checkOutDate
      checkInTime
      checkOutTime
      numHours
      numGuests
      numRooms
      totalAmount
      guestName
      guestEmail
      specialRequests
      cancellationReason
      cancelledAt
      createdAt
      hotel {
        id
        name
        slug
        city
      }
      roomType {
        id
        name
        images
      }
    }
  }
`;

export const MY_REVIEWS = gql`
  query MyReviews($limit: Int, $offset: Int) {
    myReviews(limit: $limit, offset: $offset) {
      id
      hotelId
      bookingId
      rating
      title
      comment
      photos
      hotelReply
      isVerified
      isPublished
      createdAt
    }
  }
`;

export const CANCEL_BOOKING = gql`
  mutation CancelBooking($input: CancelBookingInput!) {
    cancelBooking(input: $input) {
      id
      bookingNumber
      status
      cancellationReason
      cancelledAt
    }
  }
`;

export const DEACTIVATE_ACCOUNT = gql`
  mutation DeactivateMyAccount {
    deactivateMyAccount {
      success
      message
    }
  }
`;

export const GET_BOOKING = gql`
  query GetBooking($id: ID!) {
    booking(id: $id) {
      id
      bookingNumber
      bookingType
      status
      paymentStatus
      checkInDate
      checkOutDate
      checkInTime
      checkOutTime
      numHours
      numGuests
      numRooms
      numExtraGuests
      roomTotal
      extraGuestTotal
      taxes
      discountAmount
      totalAmount
      guestName
      guestEmail
      guestPhone
      specialRequests
      cancellationReason
      cancelledAt
      createdAt
      hotel {
        id
        name
        slug
        address
        city
        phone
      }
      roomType {
        id
        name
        slug
        images
      }
      payments {
        id
        gateway
        amount
        currency
        status
        createdAt
      }
    }
  }
`;
