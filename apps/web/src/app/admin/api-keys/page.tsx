'use client';

/**
 * Admin API Keys Management - Hotel Manager
 * Generate, view, revoke, and manage API keys for external integrations
 */

import { useEffect, useState } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { useAuth } from '@/lib/auth/auth-context';
import {
  GET_MY_API_KEYS,
  GENERATE_API_KEY,
  REVOKE_API_KEY,
  DELETE_API_KEY,
  ROTATE_API_KEY,
} from '@/lib/graphql/mutations/api-keys';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Key,
  Plus,
  Copy,
  CheckCircle,
  AlertCircle,
  Loader2,
  Trash2,
  RotateCcw,
  Shield,
  Eye,
  EyeOff,
  Clock,
  Activity,
  Globe,
  XCircle,
} from 'lucide-react';

const AGGREGATOR_HOSTS = new Set(['hotel.local', 'www.hotel.local']);

const ALL_PERMISSIONS = [
  { value: 'READ_HOTEL', label: 'Read Hotel', description: 'Hotel info, theme, branding' },
  { value: 'READ_ROOMS', label: 'Read Rooms', description: 'Room types, amenities, images' },
  { value: 'READ_AVAILABILITY', label: 'Read Availability', description: 'Inventory, pricing per date' },
  { value: 'READ_REVIEWS', label: 'Read Reviews', description: 'Guest reviews and ratings' },
  { value: 'READ_BOOKINGS', label: 'Read Bookings', description: 'List bookings (admin)' },
  { value: 'CREATE_BOOKING', label: 'Create Booking', description: 'Create new bookings (checkout)' },
  { value: 'MANAGE_BOOKINGS', label: 'Manage Bookings', description: 'Update booking status' },
  { value: 'MANAGE_ROOMS', label: 'Manage Rooms', description: 'Create/update room types' },
  { value: 'MANAGE_INVENTORY', label: 'Manage Inventory', description: 'Update pricing/availability' },
];

const DEFAULT_PERMISSIONS = ['READ_HOTEL', 'READ_ROOMS', 'READ_AVAILABILITY', 'CREATE_BOOKING'];

interface ApiKey {
  id: string;
  hotelId: string;
  name: string;
  keyPrefix: string;
  permissions: string[];
  rateLimitPerMinute: number;
  allowedOrigins: string[];
  lastUsedAt: string | null;
  requestCount: number;
  isActive: boolean;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function ApiKeysPage() {
  const { user } = useAuth();
  const hotelId = user?.hotelId;
  const [hostname, setHostname] = useState('');

  const isAggregatorHost = hostname ? AGGREGATOR_HOSTS.has(hostname) : false;
  const canCreateOrRotateKey = !isAggregatorHost;

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newKeyResult, setNewKeyResult] = useState<{ key: string; prefix: string } | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [confirmRotate, setConfirmRotate] = useState<string | null>(null);
  const [rotatedKeyResult, setRotatedKeyResult] = useState<{ key: string; prefix: string } | null>(null);

  // Form state
  const [keyName, setKeyName] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>(DEFAULT_PERMISSIONS);
  const [rateLimit, setRateLimit] = useState(60);
  const [allowedOrigins, setAllowedOrigins] = useState('');
  const [expiresAt, setExpiresAt] = useState('');

  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setHostname(window.location.hostname);
    }
  }, []);

  const { data, loading, error, refetch } = useQuery<{ myApiKeys: ApiKey[] }>(GET_MY_API_KEYS, {
    variables: { hotelId },
    skip: !hotelId,
  });

  const [generateApiKey, { loading: generating }] = useMutation<{ generateApiKey: { plainTextKey: string; apiKey: ApiKey } }>(GENERATE_API_KEY);
  const [revokeApiKey, { loading: revoking }] = useMutation(REVOKE_API_KEY);
  const [deleteApiKey, { loading: deleting }] = useMutation(DELETE_API_KEY);
  const [rotateApiKey, { loading: rotating }] = useMutation<{ rotateApiKey: { plainTextKey: string; apiKey: ApiKey } }>(ROTATE_API_KEY);

  const apiKeys: ApiKey[] = data?.myApiKeys || [];

  const handleCreateKey = async () => {
    if (!canCreateOrRotateKey) {
      setStatusMessage({
        type: 'error',
        text: 'API key creation is managed by Hotel Manager team. Contact support for custom website access.',
      });
      setTimeout(() => setStatusMessage(null), 5000);
      return;
    }
    if (!keyName.trim() || !hotelId) return;

    try {
      const origins = allowedOrigins
        .split('\n')
        .map((o: string) => o.trim())
        .filter((o: string) => o.length > 0);

      const result = await generateApiKey({
        variables: {
          input: {
            hotelId,
            name: keyName.trim(),
            permissions: selectedPermissions,
            rateLimitPerMinute: rateLimit,
            allowedOrigins: origins.length > 0 ? origins : [],
            ...(expiresAt ? { expiresAt: new Date(expiresAt).toISOString() } : {}),
          },
        },
      });

      const { plainTextKey, apiKey } = result.data!.generateApiKey;
      setNewKeyResult({ key: plainTextKey, prefix: apiKey.keyPrefix });
      setShowCreateForm(false);
      setKeyName('');
      setSelectedPermissions(DEFAULT_PERMISSIONS);
      setRateLimit(60);
      setAllowedOrigins('');
      setExpiresAt('');
      refetch();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to generate API key' });
      setTimeout(() => setStatusMessage(null), 5000);
    }
  };

  const handleRevokeKey = async (keyId: string) => {
    try {
      await revokeApiKey({ variables: { keyId } });
      setStatusMessage({ type: 'success', text: 'API key revoked successfully' });
      refetch();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to revoke API key' });
    }
    setTimeout(() => setStatusMessage(null), 5000);
  };

  const handleDeleteKey = async (keyId: string) => {
    try {
      await deleteApiKey({ variables: { keyId } });
      setConfirmDelete(null);
      setStatusMessage({ type: 'success', text: 'API key deleted permanently' });
      refetch();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to delete API key' });
    }
    setTimeout(() => setStatusMessage(null), 5000);
  };

  const handleRotateKey = async (keyId: string) => {
    if (!canCreateOrRotateKey) {
      setStatusMessage({
        type: 'error',
        text: 'API key rotation is managed by Hotel Manager team. Contact support for custom website access.',
      });
      setTimeout(() => setStatusMessage(null), 5000);
      return;
    }
    try {
      const result = await rotateApiKey({ variables: { keyId } });
      const { plainTextKey, apiKey } = result.data!.rotateApiKey;
      setRotatedKeyResult({ key: plainTextKey, prefix: apiKey.keyPrefix });
      setConfirmRotate(null);
      setStatusMessage({ type: 'success', text: 'API key rotated. Old key has been deactivated.' });
      refetch();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to rotate API key' });
    }
    setTimeout(() => setStatusMessage(null), 5000);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const togglePermission = (perm: string) => {
    setSelectedPermissions((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm],
    );
  };

  if (!hotelId) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-yellow-800">
          <AlertCircle className="inline w-5 h-5 mr-2" />
          No hotel associated with your account.
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">API Keys</h1>
          <p className="text-gray-500 mt-1">
            Manage API keys for external integrations, custom frontends, and self-hosted sites.
          </p>
        </div>
        <Button
          onClick={() => { setShowCreateForm(true); setNewKeyResult(null); setRotatedKeyResult(null); }}
          className="bg-blue-600 hover:bg-blue-700 text-white"
          disabled={showCreateForm || !canCreateOrRotateKey}
        >
          <Plus className="w-4 h-4 mr-2" />
          New API Key
        </Button>
      </div>

      {!canCreateOrRotateKey && (
        <Card className="border-amber-300 bg-amber-50">
          <CardContent className="pt-6">
            <p className="text-sm text-amber-900">
              API key creation is disabled on aggregator admin. For custom website/API access, contact Hotel Manager team.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Status message */}
      {statusMessage && (
        <div className={`rounded-lg p-3 flex items-center gap-2 ${
          statusMessage.type === 'success'
            ? 'bg-green-50 text-green-800 border border-green-200'
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {statusMessage.type === 'success' ? (
            <CheckCircle className="w-4 h-4" />
          ) : (
            <AlertCircle className="w-4 h-4" />
          )}
          {statusMessage.text}
        </div>
      )}

      {/* New key display (shown only once after generation) */}
      {(newKeyResult || rotatedKeyResult) && (
        <Card className="border-green-300 bg-green-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Shield className="w-6 h-6 text-green-600 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-green-800">
                  {rotatedKeyResult ? 'Rotated Key Generated' : 'API Key Generated Successfully'}
                </p>
                <p className="text-sm text-green-700 mt-1">
                  Copy this key now — it will not be shown again.
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <code className="bg-white px-3 py-2 rounded border text-sm font-mono flex-1 break-all">
                    {showKey
                      ? (rotatedKeyResult?.key || newKeyResult?.key)
                      : '••••••••••••••••••••••••••••••••••••••••'}
                  </code>
                  <button
                    onClick={() => setShowKey(!showKey)}
                    className="p-2 text-gray-500 hover:text-gray-700"
                    title={showKey ? 'Hide key' : 'Show key'}
                  >
                    {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => copyToClipboard((rotatedKeyResult?.key || newKeyResult?.key)!)}
                    className="p-2 text-gray-500 hover:text-gray-700"
                    title="Copy to clipboard"
                  >
                    {copiedKey ? <CheckCircle className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <button
                  onClick={() => { setNewKeyResult(null); setRotatedKeyResult(null); setShowKey(false); }}
                  className="text-sm text-green-700 underline mt-3"
                >
                  I&apos;ve copied the key, dismiss this
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create form */}
      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Generate New API Key</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Key Name</label>
              <input
                type="text"
                value={keyName}
                onChange={(e) => setKeyName(e.target.value)}
                placeholder="e.g., Production Site, Mobile App"
                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Permissions */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Permissions</label>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {ALL_PERMISSIONS.map((perm) => (
                  <label
                    key={perm.value}
                    className={`flex items-start gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${
                      selectedPermissions.includes(perm.value)
                        ? 'bg-blue-50 border-blue-300'
                        : 'bg-white border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedPermissions.includes(perm.value)}
                      onChange={() => togglePermission(perm.value)}
                      className="mt-0.5"
                    />
                    <div>
                      <span className="text-sm font-medium">{perm.label}</span>
                      <p className="text-xs text-gray-500">{perm.description}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Rate limit */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Rate Limit (requests/minute)
              </label>
              <input
                type="number"
                value={rateLimit}
                onChange={(e) => setRateLimit(Math.max(10, Math.min(1000, Number(e.target.value))))}
                min={10}
                max={1000}
                className="w-32 px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Allowed Origins */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Allowed Origins <span className="text-gray-400">(one per line, leave empty for any origin)</span>
              </label>
              <textarea
                value={allowedOrigins}
                onChange={(e) => setAllowedOrigins(e.target.value)}
                placeholder={"https://myhotel.com\nhttp://localhost:3000"}
                rows={3}
                className="w-full px-3 py-2 border rounded-lg text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Expiry */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Expiry Date <span className="text-gray-400">(optional)</span>
              </label>
              <input
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-48 px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <Button
                onClick={handleCreateKey}
                disabled={!keyName.trim() || generating}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {generating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Key className="w-4 h-4 mr-2" />}
                Generate Key
              </Button>
              <Button
                onClick={() => setShowCreateForm(false)}
                variant="outline"
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick start guide */}
      <Card className="bg-gray-50 border-gray-200">
        <CardContent className="pt-6">
          <h3 className="font-semibold text-gray-900 mb-2">Quick Start</h3>
          <p className="text-sm text-gray-600 mb-3">
            Use your API key to access your hotel&apos;s data from custom frontends or mobile apps.
          </p>
          <pre className="bg-gray-900 text-green-400 p-4 rounded-lg text-sm overflow-x-auto">
{`# Fetch your hotel data
curl -H "x-api-key: bsk_your_key_here" \\
  -H "Content-Type: application/json" \\
  -d '{"query":"{ hotel(id: \\"${hotelId}\\") { name, description } }"}' \\
  ${typeof window !== 'undefined' ? window.location.origin : ''}/api/graphql`}
          </pre>
        </CardContent>
      </Card>

      {/* API Keys list */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
          <AlertCircle className="inline w-5 h-5 mr-2" />
          {error.message}
        </div>
      ) : apiKeys.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Key className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No API keys yet.</p>
            <p className="text-sm text-gray-400 mt-1">
              Create an API key to enable external integrations.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {apiKeys.map((apiKey) => (
            <Card key={apiKey.id} className={!apiKey.isActive ? 'opacity-60' : ''}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900">{apiKey.name}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        apiKey.isActive
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {apiKey.isActive ? 'Active' : 'Revoked'}
                      </span>
                      {apiKey.expiresAt && new Date(apiKey.expiresAt) < new Date() && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 font-medium">
                          Expired
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                      <span className="font-mono bg-gray-100 px-2 py-0.5 rounded text-xs">
                        {apiKey.keyPrefix}••••••••
                      </span>
                      <span className="flex items-center gap-1">
                        <Activity className="w-3 h-3" />
                        {apiKey.requestCount.toLocaleString()} requests
                      </span>
                      {apiKey.lastUsedAt && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Last used {new Date(apiKey.lastUsedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>

                    {/* Permissions */}
                    <div className="flex flex-wrap gap-1 mt-3">
                      {apiKey.permissions.map((perm) => (
                        <span
                          key={perm}
                          className="text-xs px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100"
                        >
                          {perm.replace(/_/g, ' ')}
                        </span>
                      ))}
                    </div>

                    {/* Allowed Origins */}
                    {apiKey.allowedOrigins.length > 0 && (
                      <div className="flex items-center gap-1 mt-2 text-xs text-gray-500">
                        <Globe className="w-3 h-3" />
                        {apiKey.allowedOrigins.join(', ')}
                      </div>
                    )}

                    {/* Rate limit & expiry */}
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                      <span>{apiKey.rateLimitPerMinute} req/min</span>
                      {apiKey.expiresAt && (
                        <span>Expires: {new Date(apiKey.expiresAt).toLocaleDateString()}</span>
                      )}
                      <span>Created: {new Date(apiKey.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  {apiKey.isActive && (
                    <div className="flex items-center gap-1 ml-4">
                      {canCreateOrRotateKey && (
                        <button
                          onClick={() => setConfirmRotate(apiKey.id)}
                          className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                          title="Rotate key"
                          disabled={rotating}
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleRevokeKey(apiKey.id)}
                        className="p-2 text-gray-400 hover:text-yellow-600 transition-colors"
                        title="Revoke key"
                        disabled={revoking}
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setConfirmDelete(apiKey.id)}
                        className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                        title="Delete key"
                        disabled={deleting}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                  {!apiKey.isActive && (
                    <button
                      onClick={() => setConfirmDelete(apiKey.id)}
                      className="p-2 text-gray-400 hover:text-red-600 transition-colors ml-4"
                      title="Delete key permanently"
                      disabled={deleting}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Confirm delete modal */}
                {confirmDelete === apiKey.id && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-800">
                      Are you sure you want to permanently delete this API key? Any applications using it will stop working.
                    </p>
                    <div className="flex gap-2 mt-2">
                      <Button
                        onClick={() => handleDeleteKey(apiKey.id)}
                        className="bg-red-600 hover:bg-red-700 text-white text-sm"
                        disabled={deleting}
                      >
                        {deleting ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                        Delete
                      </Button>
                      <Button
                        onClick={() => setConfirmDelete(null)}
                        variant="outline"
                        className="text-sm"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}

                {/* Confirm rotate modal */}
                {confirmRotate === apiKey.id && (
                  <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800">
                      This will deactivate the current key and generate a new one with the same settings. Update your applications with the new key.
                    </p>
                    <div className="flex gap-2 mt-2">
                      <Button
                        onClick={() => handleRotateKey(apiKey.id)}
                        className="bg-blue-600 hover:bg-blue-700 text-white text-sm"
                        disabled={rotating}
                      >
                        {rotating ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                        Rotate Key
                      </Button>
                      <Button
                        onClick={() => setConfirmRotate(null)}
                        variant="outline"
                        className="text-sm"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
