'use client';

/**
 * Apollo Provider for Client Components
 * Wraps the app to enable GraphQL queries in client components
 */

import { ApolloClient, InMemoryCache, HttpLink } from '@apollo/client/core';
import { setContext } from '@apollo/client/link/context';
import { ApolloProvider } from '@apollo/client/react';
import { useMemo } from 'react';

// Use same-origin proxy to avoid CORS/cross-origin issues (e.g. in Codespaces)
const API_URL = '/api/graphql';

export function ApolloWrapper({ children }: { children: React.ReactNode }) {
  const client = useMemo(() => {
    const httpLink = new HttpLink({
      uri: API_URL,
    });

    const authLink = setContext((_, { headers }) => {
      const token = typeof window !== 'undefined' 
        ? localStorage.getItem('accessToken') 
        : null;
      return {
        headers: {
          ...headers,
          ...(token ? { authorization: `Bearer ${token}` } : {}),
        },
      };
    });

    return new ApolloClient({
      cache: new InMemoryCache({
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
          Review: { keyFields: ['id'] },
        },
      }),
      link: authLink.concat(httpLink),
      defaultOptions: {
        watchQuery: {
          fetchPolicy: 'cache-and-network',
        },
      },
    });
  }, []);

  return (
    <ApolloProvider client={client}>
      {children}
    </ApolloProvider>
  );
}
