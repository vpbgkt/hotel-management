/**
 * GraphQL Mutations for Payments
 */

import { gql } from '@apollo/client';

export const INITIATE_PAYMENT = gql`
  mutation InitiatePayment($bookingId: ID!, $method: String!) {
    initiatePayment(bookingId: $bookingId, method: $method) {
      paymentId
      orderId
      amount
      currency
      gateway
      bookingNumber
      gatewayData
    }
  }
`;

export const CONFIRM_PAYMENT = gql`
  mutation ConfirmPayment(
    $paymentId: ID!
    $gatewayPaymentId: String
    $gatewaySignature: String
  ) {
    confirmPayment(
      paymentId: $paymentId
      gatewayPaymentId: $gatewayPaymentId
      gatewaySignature: $gatewaySignature
    ) {
      success
      message
      bookingId
      bookingNumber
    }
  }
`;

export const PROCESS_REFUND = gql`
  mutation ProcessRefund($bookingId: ID!, $amount: Float) {
    processRefund(bookingId: $bookingId, amount: $amount) {
      success
      refundId
      amount
      message
    }
  }
`;

export const GET_PAYMENTS_BY_BOOKING = gql`
  query PaymentsByBooking($bookingId: ID!) {
    paymentsByBooking(bookingId: $bookingId) {
      id
      bookingId
      gateway
      gatewayPaymentId
      gatewayOrderId
      amount
      currency
      status
      refundAmount
      refundId
      createdAt
      updatedAt
    }
  }
`;
