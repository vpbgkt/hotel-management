/**
 * GraphQL Queries & Mutations for Hotel Admin Panel
 */

import { gql } from '@apollo/client';

// ============================================
// Dashboard
// ============================================

export const GET_ADMIN_DASHBOARD_STATS = gql`
  query GetAdminDashboardStats($hotelId: ID!) {
    adminDashboardStats(hotelId: $hotelId) {
      totalBookings
      monthlyBookings
      todayCheckIns
      todayCheckOuts
      totalRevenue
      monthlyRevenue
      totalRooms
      occupiedRooms
      occupancyRate
      recentBookings {
        id
        bookingNumber
        guestName
        guestEmail
        guestPhone
        status
        paymentStatus
        totalAmount
        checkInDate
        checkOutDate
        bookingType
        numRooms
        numGuests
        createdAt
        roomType {
          name
        }
      }
    }
  }
`;

// ============================================
// Room Types
// ============================================

export const GET_ADMIN_ROOM_TYPES = gql`
  query GetAdminRoomTypes($hotelId: ID!) {
    adminRoomTypes(hotelId: $hotelId) {
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
      sortOrder
      createdAt
    }
  }
`;

export const CREATE_ROOM_TYPE = gql`
  mutation CreateRoomType($input: CreateRoomTypeInput!) {
    createRoomType(input: $input) {
      id
      name
      slug
      basePriceDaily
      basePriceHourly
      maxGuests
      totalRooms
      isActive
    }
  }
`;

export const UPDATE_ROOM_TYPE = gql`
  mutation UpdateRoomType($input: UpdateRoomTypeInput!) {
    updateRoomType(input: $input) {
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
      sortOrder
    }
  }
`;

export const DELETE_ROOM_TYPE = gql`
  mutation DeleteRoomType($id: ID!) {
    deleteRoomType(id: $id) {
      success
      message
    }
  }
`;

// ============================================
// Hotel Management
// ============================================

export const UPDATE_HOTEL = gql`
  mutation UpdateHotel($input: UpdateHotelInput!) {
    updateHotel(input: $input) {
      id
      name
      description
      address
      city
      state
      pincode
      phone
      email
      whatsapp
      heroImageUrl
      logoUrl
      starRating
      bookingModel
      checkInTime
      checkOutTime
      hourlyMinHours
      hourlyMaxHours
      latitude
      longitude
      template
      themeConfig
    }
  }
`;

// ============================================
// Bookings (reuse existing queries with hotelId filter)
// ============================================

export const GET_ADMIN_BOOKINGS = gql`
  query GetAdminBookings($filters: BookingFiltersInput, $pagination: BookingPaginationInput) {
    bookings(filters: $filters, pagination: $pagination) {
      bookings {
        id
        bookingNumber
        guestName
        guestEmail
        guestPhone
        status
        paymentStatus
        bookingType
        checkInDate
        checkOutDate
        checkInTime
        checkOutTime
        numHours
        numRooms
        numGuests
        totalAmount
        source
        createdAt
        roomType {
          name
          slug
        }
      }
      total
      page
      limit
      hasMore
    }
  }
`;

export const UPDATE_BOOKING_STATUS = gql`
  mutation UpdateBookingStatus($input: UpdateBookingStatusInput!) {
    updateBookingStatus(input: $input) {
      id
      status
      paymentStatus
      bookingNumber
    }
  }
`;

// ============================================
// Inventory / Pricing Calendar
// ============================================

export const GET_ADMIN_INVENTORY_CALENDAR = gql`
  query GetAdminInventoryCalendar($roomTypeId: ID!, $startDate: DateTime!, $endDate: DateTime!) {
    adminInventoryCalendar(roomTypeId: $roomTypeId, startDate: $startDate, endDate: $endDate) {
      roomTypeId
      roomTypeName
      basePriceDaily
      totalRooms
      calendar {
        date
        available
        price
        basePrice
        isClosed
        minStayNights
        hasCustomPrice
        hasCustomAvailability
      }
    }
  }
`;

export const BULK_UPDATE_INVENTORY = gql`
  mutation BulkUpdateInventory($input: BulkInventoryUpdateInput!) {
    bulkUpdateInventory(input: $input) {
      success
      message
      daysUpdated
    }
  }
`;

export const UPDATE_DATE_INVENTORY = gql`
  mutation UpdateDateInventory($input: SingleDateInventoryInput!) {
    updateDateInventory(input: $input) {
      id
      date
      availableCount
      priceOverride
      isClosed
      minStayNights
    }
  }
`;

// ============================================
// Analytics
// ============================================

export const GET_ADMIN_ANALYTICS = gql`
  query GetAdminAnalytics($hotelId: ID!, $months: Int) {
    adminAnalytics(hotelId: $hotelId, months: $months) {
      monthlyData {
        month
        bookings
        revenue
      }
      roomTypePopularity {
        roomTypeName
        bookings
        revenue
      }
      bookingsBySource {
        source
        count
      }
      bookingsByStatus {
        status
        count
      }
      averageBookingValue
      averageStayNights
    }
  }
`;

// ============================================
// Smart Pricing
// ============================================

export const GET_PRICE_SUGGESTIONS = gql`
  query GetPriceSuggestions($input: PriceSuggestionsInput!) {
    priceSuggestions(input: $input) {
      roomTypeId
      roomTypeName
      basePrice
      averageOccupancy
      period {
        from
        to
      }
      suggestions {
        date
        currentPrice
        suggestedPrice
        changePercent
        demandLevel
        occupancyRate
        reason
      }
      revenue {
        current
        projected
        uplift
      }
    }
  }
`;

export const APPLY_PRICE_SUGGESTIONS = gql`
  mutation ApplyPriceSuggestions($input: ApplyPriceSuggestionsInput!) {
    applyPriceSuggestions(input: $input) {
      applied
      skipped
    }
  }
`;

export const GET_OCCUPANCY_FORECAST = gql`
  query GetOccupancyForecast($input: OccupancyForecastInput!) {
    occupancyForecast(input: $input) {
      date
      occupancyRate
      revenue
    }
  }
`;
