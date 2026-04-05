import { gql } from '@apollo/client';

// ============================================
// Public Queries
// ============================================

export const HOTEL_REVIEWS = gql`
  query HotelReviews($hotelId: ID!, $page: Int, $limit: Int, $sortBy: String) {
    hotelReviews(hotelId: $hotelId, page: $page, limit: $limit, sortBy: $sortBy) {
      reviews {
        id
        hotelId
        bookingId
        rating
        title
        comment
        photos
        hotelReply
        isVerified
        createdAt
        guest {
          name
          avatarUrl
        }
      }
      total
      page
      totalPages
    }
  }
`;

export const HOTEL_REVIEW_STATS = gql`
  query HotelReviewStats($hotelId: ID!) {
    hotelReviewStats(hotelId: $hotelId) {
      averageRating
      totalReviews
      ratingDistribution
    }
  }
`;

export const CAN_REVIEW_BOOKING = gql`
  query CanReviewBooking($bookingId: ID!) {
    canReviewBooking(bookingId: $bookingId)
  }
`;

// ============================================
// Guest Mutations
// ============================================

export const CREATE_REVIEW = gql`
  mutation CreateReview($input: CreateReviewInput!) {
    createReview(input: $input) {
      id
      rating
      title
      comment
      photos
      createdAt
    }
  }
`;

export const MY_GUEST_REVIEWS = gql`
  query MyGuestReviews {
    myGuestReviews {
      id
      hotelId
      rating
      title
      comment
      photos
      hotelReply
      isPublished
      createdAt
    }
  }
`;

// ============================================
// Hotel Admin
// ============================================

export const HOTEL_ALL_REVIEWS = gql`
  query HotelAllReviews {
    hotelAllReviews {
      id
      rating
      title
      comment
      photos
      hotelReply
      isVerified
      isPublished
      createdAt
      guest {
        name
        avatarUrl
      }
    }
  }
`;

export const REPLY_TO_REVIEW = gql`
  mutation ReplyToReview($input: HotelReplyInput!) {
    replyToReview(input: $input) {
      id
      hotelReply
    }
  }
`;
