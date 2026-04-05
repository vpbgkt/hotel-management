/**
 * GraphQL Proxy Route
 * 
 * Proxies GraphQL requests from the browser to the API server.
 * This avoids cross-origin issues in environments like GitHub Codespaces
 * where port-forwarded URLs require authentication cookies that fetch() can't send.
 */

const backendBase = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
const BACKEND_URL = backendBase.includes('graphql') ? backendBase : `${backendBase}/graphql`;

export async function POST(request: Request) {
  const body = await request.text();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Forward auth header
  const authHeader = request.headers.get('Authorization');
  if (authHeader) {
    headers['Authorization'] = authHeader;
  }

  // Forward all tenant headers
  const tenantHeaders = ['x-hotel-id', 'x-tenant-type', 'x-tenant-id'];
  tenantHeaders.forEach(h => {
    const val = request.headers.get(h);
    if (val) headers[h] = val;
  });

  try {
    const response = await fetch(BACKEND_URL, {
      method: 'POST',
      headers,
      body,
      cache: 'no-store',
    });

    if (!response.ok) {
        console.error('GraphQL Proxy Error:', response.status, response.statusText);
        const errorText = await response.text();
        console.error('Error Body:', errorText);
        return new Response(errorText, { status: response.status });
    }

    const data = await response.text();
    return new Response(data, {
      status: response.status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('GraphQL Proxy Network Error:', error);
    return new Response(JSON.stringify({ errors: [{ message: 'Network error connecting to API' }] }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' }
    });
  }
}
