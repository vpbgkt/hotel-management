/**
 * Apollo Client Configuration for Next.js App Router
 * Using @apollo/experimental-nextjs-app-support
 */

import { HttpLink } from '@apollo/client';
import { ApolloClient, InMemoryCache } from '@apollo/client';

// API URL configuration
// Server-side: use direct backend URL; Client-side: use same-origin proxy
const API_URL = typeof window === 'undefined'
  ? (process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/graphql')
  : '/api/graphql';

// Cache configuration
const cache = new InMemoryCache({
  typePolicies: {
    Query: {
      fields: {
        hotels: {
          keyArgs: ['filters', 'pagination'],
          merge(existing, incoming, { args }) {
            if (!args?.pagination?.page || args.pagination.page === 1) {
              return incoming;
            }
            return {
              ...incoming,
              hotels: [...(existing?.hotels || []), ...incoming.hotels],
            };
          },
        },
      },
    },
    Hotel: { keyFields: ['id'] },
    RoomType: { keyFields: ['id'] },
    Booking: { keyFields: ['id'] },
  },
});

// Create Apollo Client for client components
export function makeClient() {
  return new ApolloClient({
    cache,
    link: new HttpLink({
      uri: API_URL,
    }),
  });
}

// Create Apollo Client for server components (direct use)
export function getClient() {
  return new ApolloClient({
    cache: new InMemoryCache(),
    link: new HttpLink({
      uri: API_URL,
      fetchOptions: { cache: 'no-store' },
    }),
  });
}

export { ApolloClient, InMemoryCache };
