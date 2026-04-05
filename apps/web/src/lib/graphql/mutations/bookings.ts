/**
 * GraphQL Mutations for Bookings
 */

import { gql } from '@apollo/client';

// Booking fragment
export const BOOKING_FRAGMENT = gql`
  fragment BookingDetails on Booking {
    id
    bookingNumber
    hotelId
    roomTypeId
    bookingType
    checkInDate
    checkOutDate
    checkInTime
    checkOutTime
    numHours
    numRooms
    numGuests
    numExtraGuests
    roomTotal
    extraGuestTotal
    taxes
    discountAmount
    totalAmount
    source
    status
    paymentStatus
    guestName
    guestEmail
    guestPhone
    specialRequests
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
  }
`;

// Mutations
export const CREATE_DAILY_BOOKING = gql`
  mutation CreateDailyBooking($input: CreateDailyBookingInput!) {
    createDailyBooking(input: $input) {
      success
      message
      booking {
        ...BookingDetails
      }
      paymentOrderId
      paymentAmount
    }
  }
  ${BOOKING_FRAGMENT}
`;

export const CREATE_HOURLY_BOOKING = gql`
  mutation CreateHourlyBooking($input: CreateHourlyBookingInput!) {
    createHourlyBooking(input: $input) {
      success
      message
      booking {
        ...BookingDetails
      }
      paymentOrderId
      paymentAmount
    }
  }
  ${BOOKING_FRAGMENT}
`;

export const CONFIRM_BOOKING_PAYMENT = gql`
  mutation ConfirmBookingPayment($input: ConfirmPaymentInput!) {
    confirmBookingPayment(input: $input) {
      success
      message
      booking {
        ...BookingDetails
      }
    }
  }
  ${BOOKING_FRAGMENT}
`;

export const CANCEL_BOOKING = gql`
  mutation CancelBooking($bookingId: ID!, $reason: String) {
    cancelBooking(bookingId: $bookingId, reason: $reason) {
      success
      message
      refundAmount
    }
  }
`;

// Queries
export const GET_BOOKING = gql`
  query GetBooking($id: ID!) {
    booking(id: $id) {
      ...BookingDetails
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
  ${BOOKING_FRAGMENT}
`;

export const GET_BOOKING_BY_NUMBER = gql`
  query GetBookingByNumber($bookingNumber: String!) {
    bookingByNumber(bookingNumber: $bookingNumber) {
      ...BookingDetails
    }
  }
  ${BOOKING_FRAGMENT}
`;

export const GET_MY_BOOKINGS = gql`
  query GetMyBookings($pagination: PaginationInput) {
    myBookings(pagination: $pagination) {
      bookings {
        ...BookingDetails
      }
      total
      page
      limit
      hasMore
    }
  }
  ${BOOKING_FRAGMENT}
`;

export const MODIFY_BOOKING = gql`
  mutation ModifyBooking($input: ModifyBookingInput!) {
    modifyBooking(input: $input) {
      ...BookingDetails
    }
  }
  ${BOOKING_FRAGMENT}
`;
