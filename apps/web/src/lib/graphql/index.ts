/**
 * GraphQL exports
 */

// Client
export { getClient, makeClient } from './client';
export { ApolloWrapper } from './provider';

// Queries
export * from './queries/hotels';
export * from './queries/rooms';

// Mutations
export * from './mutations/bookings';
