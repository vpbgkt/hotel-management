/**
 * BlueStay — k6 Load Test: API Stress Test
 *
 * Tests individual API endpoints under heavy load.
 *
 * Run:
 *   k6 run tests/load/k6-stress-test.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

const BASE_URL = __ENV.API_URL || 'http://localhost:4000';
const GRAPHQL = `${BASE_URL}/graphql`;

export const options = {
  scenarios: {
    // Scenario 1: Constant load on health check
    health_check: {
      executor: 'constant-vus',
      vus: 20,
      duration: '2m',
      exec: 'healthCheck',
    },
    // Scenario 2: Ramp up hotel search
    hotel_search: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 30 },
        { duration: '1m', target: 100 },
        { duration: '30s', target: 0 },
      ],
      exec: 'hotelSearch',
    },
    // Scenario 3: Spike test on GraphQL
    graphql_spike: {
      executor: 'ramping-arrival-rate',
      startRate: 10,
      timeUnit: '1s',
      preAllocatedVUs: 200,
      stages: [
        { duration: '30s', target: 50 },
        { duration: '10s', target: 200 },  // Spike!
        { duration: '30s', target: 50 },
        { duration: '10s', target: 0 },
      ],
      exec: 'graphqlQuery',
    },
  },
  thresholds: {
    http_req_duration: ['p(99)<3000'],     // 99% under 3s
    errors: ['rate<0.1'],                   // <10% errors
    http_req_failed: ['rate<0.1'],
  },
};

const headers = { 'Content-Type': 'application/json' };

function gql(query, variables = {}) {
  return JSON.stringify({ query, variables });
}

export function healthCheck() {
  const res = http.get(`${BASE_URL}/health`);
  const passed = check(res, {
    'health 200': (r) => r.status === 200,
    'health response time < 200ms': (r) => r.timings.duration < 200,
  });
  errorRate.add(!passed);
  sleep(0.1);
}

export function hotelSearch() {
  const cities = ['Kausani', 'Mumbai', 'Delhi', 'Goa', 'Jaipur'];
  const city = cities[Math.floor(Math.random() * cities.length)];

  const res = http.post(
    GRAPHQL,
    gql(
      `query Hotels($filter: HotelFilterInput) {
        hotels(filter: $filter) { id name slug city starRating }
      }`,
      { filter: { city, isActive: true } },
    ),
    { headers },
  );
  const passed = check(res, {
    'search 200': (r) => r.status === 200,
    'search < 2s': (r) => r.timings.duration < 2000,
  });
  errorRate.add(!passed);
  sleep(0.5 + Math.random());
}

export function graphqlQuery() {
  const queries = [
    // Light query
    `query { hotels(filter: { isActive: true }) { id name } }`,
    // Medium query
    `query { hotelBySlug(slug: "radhika-resort") { id name roomTypes { id name basePrice } } }`,
    // Introspection query (heavier)
    `query { __schema { types { name } } }`,
  ];
  const query = queries[Math.floor(Math.random() * queries.length)];

  const res = http.post(GRAPHQL, gql(query), { headers });
  const passed = check(res, {
    'gql 200': (r) => r.status === 200,
    'gql < 3s': (r) => r.timings.duration < 3000,
  });
  errorRate.add(!passed);
}
