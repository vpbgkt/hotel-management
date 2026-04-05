/**
 * GraphQL Queries for Hotel
 * Single-hotel standalone queries
 */

import { gql } from '@apollo/client';

export const HOTEL_CARD_FRAGMENT = gql`
  fragment HotelCard on Hotel {
    id
    name
    slug
    description
    city
    state
    address
    starRating
    heroImageUrl
    logoUrl
    averageRating
    reviewCount
    startingPrice
    bookingModel
  }
`;

export const HOTEL_DETAIL_FRAGMENT = gql`
  fragment HotelDetail on Hotel {
    ...HotelCard
    phone
    email
    whatsapp
    latitude
    longitude
    pincode
    checkInTime
    checkOutTime
    hourlyMinHours
    hourlyMaxHours
    themeConfig
    template
  }
  ${HOTEL_CARD_FRAGMENT}
`;

export const GET_HOTEL_BY_SLUG = gql`
  query GetHotelBySlug($slug: String!) {
    hotelBySlug(slug: $slug) {
      ...HotelDetail
      roomTypes {
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
      }
      reviews {
        id
        rating
        title
        comment
        createdAt
        guest {
          name
          avatarUrl
        }
      }
    }
  }
  ${HOTEL_DETAIL_FRAGMENT}
`;

export const GET_HOTEL_BY_ID = gql`
  query GetHotelById($id: ID!) {
    hotel(id: $id) {
      ...HotelDetail
    }
  }
  ${HOTEL_DETAIL_FRAGMENT}
`;
