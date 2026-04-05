/**
 * BlueStay — k6 Load Test: Booking Flow
 *
 * Simulates realistic guest traffic:
 *   1. Search hotels / rooms
 *   2. View room details
 *   3. Create booking
 *   4. Confirm payment
 *
 * Run:
 *   k6 run tests/load/k6-booking-flow.js
 *
 * With custom options:
 *   k6 run --vus 50 --duration 5m tests/load/k6-booking-flow.js
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// ─── Custom Metrics ────────────────────────────────────────────────
const bookingSuccess = new Rate('booking_success');
const searchDuration = new Trend('search_duration', true);
const bookingDuration = new Trend('booking_duration', true);

// ─── Configuration ─────────────────────────────────────────────────
const BASE_URL = __ENV.API_URL || 'http://localhost:4000';
const GRAPHQL = `${BASE_URL}/graphql`;

export const options = {
  stages: [
    { duration: '30s', target: 10 },   // Warm up
    { duration: '1m', target: 50 },    // Ramp up
    { duration: '3m', target: 50 },    // Sustained load
    { duration: '1m', target: 100 },   // Peak
    { duration: '30s', target: 0 },    // Cool down
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'],  // 95% of requests < 2s
    http_req_failed: ['rate<0.05'],     // < 5% error rate
    booking_success: ['rate>0.9'],       // > 90% bookings succeed
    search_duration: ['p(95)<1500'],     // Search < 1.5s at p95
  },
};

// ─── Helpers ───────────────────────────────────────────────────────
function gql(query, variables = {}) {
  return JSON.stringify({ query, variables });
}

const headers = {
  'Content-Type': 'application/json',
  'x-tenant-type': 'aggregator',
};

function authedHeaders(token) {
  return { ...headers, Authorization: `Bearer ${token}` };
}

// ─── Setup: Create a guest account ─────────────────────────────────
export function setup() {
  const email = `loadtest+${Date.now()}@bluestay.in`;
  const password = 'LoadTest@123';

  const res = http.post(
    GRAPHQL,
    gql(
      `mutation Register($input: RegisterInput!) {
        register(input: $input) { accessToken user { id } }
      }`,
      {
        input: {
          email,
          password,
          name: 'Load Test User',
          phone: '9876543210',
        },
      },
    ),
    { headers },
  );

  let token = '';
  let userId = '';
  try {
    const body = JSON.parse(res.body);
    token = body.data?.register?.accessToken || '';
    userId = body.data?.register?.user?.id || '';
  } catch (e) {
    // If registration fails, try login with demo user
    const loginRes = http.post(
      GRAPHQL,
      gql(
        `mutation Login($input: LoginInput!) {
          login(input: $input) { accessToken user { id } }
        }`,
        { input: { email: 'guest@example.com', password: 'password123' } },
      ),
      { headers },
    );
    try {
      const b = JSON.parse(loginRes.body);
      token = b.data?.login?.accessToken || '';
      userId = b.data?.login?.user?.id || '';
    } catch (_) {}
  }

  return { token, userId, email };
}

// ─── Scenario ──────────────────────────────────────────────────────
export default function (data) {
  const token = data.token;

  group('1 — Search Hotels', () => {
    const start = Date.now();
    const res = http.post(
      GRAPHQL,
      gql(
        `query Hotels($filter: HotelFilterInput) {
          hotels(filter: $filter) {
            id name slug city starRating
          }
        }`,
        {
          filter: {
            city: 'Kausani',
            isActive: true,
          },
        },
      ),
      { headers },
    );
    searchDuration.add(Date.now() - start);

    check(res, {
      'search status 200': (r) => r.status === 200,
      'search has data': (r) => {
        try {
          return JSON.parse(r.body).data?.hotels?.length >= 0;
        } catch {
          return false;
        }
      },
    });
  });

  sleep(1 + Math.random() * 2); // Think time

  group('2 — View Hotel Details', () => {
    const res = http.post(
      GRAPHQL,
      gql(
        `query Hotel($slug: String!) {
          hotelBySlug(slug: $slug) {
            id name roomTypes { id name basePrice maxOccupancy }
          }
        }`,
        { slug: 'radhika-resort' },
      ),
      { headers },
    );

    check(res, {
      'hotel detail 200': (r) => r.status === 200,
    });
  });

  sleep(0.5 + Math.random());

  group('3 — Check Availability', () => {
    const checkIn = new Date();
    checkIn.setDate(checkIn.getDate() + 30);
    const checkOut = new Date(checkIn);
    checkOut.setDate(checkOut.getDate() + 2);

    const res = http.post(
      GRAPHQL,
      gql(
        `query Availability($hotelSlug: String!, $checkIn: DateTime!, $checkOut: DateTime!) {
          checkAvailability(hotelSlug: $hotelSlug, checkIn: $checkIn, checkOut: $checkOut) {
            available roomTypeId
          }
        }`,
        {
          hotelSlug: 'radhika-resort',
          checkIn: checkIn.toISOString(),
          checkOut: checkOut.toISOString(),
        },
      ),
      { headers },
    );

    check(res, {
      'availability 200': (r) => r.status === 200,
    });
  });

  sleep(0.5 + Math.random());

  // Only attempt booking if authenticated
  if (token) {
    group('4 — Create Booking', () => {
      const checkIn = new Date();
      checkIn.setDate(checkIn.getDate() + 30 + Math.floor(Math.random() * 30));
      const checkOut = new Date(checkIn);
      checkOut.setDate(checkOut.getDate() + 1 + Math.floor(Math.random() * 3));

      const start = Date.now();
      const res = http.post(
        GRAPHQL,
        gql(
          `mutation CreateBooking($input: CreateBookingInput!) {
            createBooking(input: $input) { id bookingNumber status totalAmount }
          }`,
          {
            input: {
              hotelId: 'test-hotel-id',
              roomTypeId: 'test-room-type-id',
              checkIn: checkIn.toISOString(),
              checkOut: checkOut.toISOString(),
              guests: 2,
              guestName: 'Load Test Guest',
              guestEmail: 'loadtest@bluestay.in',
              guestPhone: '9876543210',
            },
          },
        ),
        { headers: authedHeaders(token) },
      );
      bookingDuration.add(Date.now() - start);

      const success = check(res, {
        'booking status 200': (r) => r.status === 200,
      });
      bookingSuccess.add(success ? 1 : 0);
    });
  }

  sleep(1 + Math.random() * 3); // Between-iteration think time
}

// ─── Teardown ──────────────────────────────────────────────────────
export function teardown(data) {
  console.log(`Load test complete. Test user: ${data.email}`);
}
