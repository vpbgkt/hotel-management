/**
 * E2E Test: API Health & GraphQL Endpoint
 * 
 * Verifies the API is accessible and responding correctly.
 */

import { test, expect } from '@playwright/test';

const API_URL = 'http://localhost:4000';

test.describe('API Health', () => {
  test('should return health check', async ({ request }) => {
    const response = await request.get(`${API_URL}/health`);
    expect(response.ok()).toBeTruthy();
  });

  test('should serve GraphQL endpoint', async ({ request }) => {
    const response = await request.post(`${API_URL}/graphql`, {
      data: {
        query: '{ __typename }',
      },
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.data).toBeDefined();
    expect(body.data.__typename).toBe('Query');
  });

  test('should list hotels via GraphQL', async ({ request }) => {
    const response = await request.post(`${API_URL}/graphql`, {
      data: {
        query: `
          query {
            hotels(filters: { limit: 5 }) {
              hotels {
                id
                name
                slug
              }
              total
            }
          }
        `,
      },
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.data?.hotels).toBeDefined();
    expect(body.data.hotels.hotels).toBeInstanceOf(Array);
  });
});

test.describe('API Security', () => {
  test('should reject unauthenticated admin requests', async ({ request }) => {
    const response = await request.post(`${API_URL}/graphql`, {
      data: {
        query: `
          query {
            adminBookings(filters: { limit: 5 }) {
              bookings {
                id
              }
            }
          }
        `,
      },
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    const body = await response.json();
    // Should return errors for unauthorized access
    expect(body.errors || body.data?.adminBookings === null).toBeTruthy();
  });
});
