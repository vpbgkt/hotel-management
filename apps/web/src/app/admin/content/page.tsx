'use client';

/**
 * Admin Content Management - Hotel Manager
 * Edit hotel description, hero image, logo, and theme settings
 */

import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { gql } from '@apollo/client';
import { useAuth } from '@/lib/auth/auth-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Save,
  Loader2,
  AlertCircle,
  CheckCircle,
  Image as ImageIcon,
  Palette,
  Type,
  FileText,
} from 'lucide-react';

const GET_HOTEL_CONTENT = gql`
  query GetHotelContent($hotelId: ID!) {
    adminHotelContent(hotelId: $hotelId) {
      id
      name
      description
      heroImageUrl
      logoUrl
      themeConfig
    }
  }
`;

const UPDATE_HOTEL_CONTENT = gql`
  mutation UpdateHotelContent($input: UpdateHotelContentInput!) {
    updateHotelContent(input: $input) {
      id
      description
      heroImageUrl
      logoUrl
      themeConfig
    }
  }
`;

interface ThemeConfig {
  primaryColor?: string;
  secondaryColor?: string;
  fontFamily?: string;
  headerStyle?: string;
  customCss?: string;
}

const defaultTheme: ThemeConfig = {
  primaryColor: '#2563eb',
  secondaryColor: '#f59e0b',
  fontFamily: 'Inter',
  headerStyle: 'default',
  customCss: '',
};

const fontOptions = [
  'Inter',
  'Poppins',
  'Roboto',
  'Open Sans',
  'Lato',
  'Playfair Display',
  'Montserrat',
  'Raleway',
];

const headerStyles = [
  { value: 'default', label: 'Default' },
  { value: 'centered', label: 'Centered Logo' },
  { value: 'minimal', label: 'Minimal' },
  { value: 'full-width', label: 'Full Width Hero' },
];

export default function AdminContentPage() {
  const { user } = useAuth();
  const hotelId = user?.hotelId;
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<'content' | 'theme'>('content');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, loading, error } = useQuery<any>(GET_HOTEL_CONTENT, {
    variables: { hotelId },
    skip: !hotelId,
  });

  const [updateContent, { loading: saving }] = useMutation(UPDATE_HOTEL_CONTENT, {
    onCompleted: () => {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
  });

  const [description, setDescription] = useState('');
  const [heroImageUrl, setHeroImageUrl] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [theme, setTheme] = useState<ThemeConfig>(defaultTheme);

  useEffect(() => {
    if (data?.adminHotelContent) {
      const h = data.adminHotelContent;
      setDescription(h.description || '');
      setHeroImageUrl(h.heroImageUrl || '');
      setLogoUrl(h.logoUrl || '');
      setTheme({ ...defaultTheme, ...(h.themeConfig || {}) });
    }
  }, [data]);

  const handleSave = () => {
    if (!hotelId) return;
    updateContent({
      variables: {
        input: {
          hotelId,
          description: description || undefined,
          heroImageUrl: heroImageUrl || undefined,
          logoUrl: logoUrl || undefined,
          themeConfig: theme,
        },
      },
    });
  };

  if (!hotelId) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold">No Hotel Assigned</h2>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <p className="text-gray-500">{error.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Content Management</h1>
          <p className="text-sm text-gray-500 mt-1">
            Customize your hotel's website content and appearance
          </p>
        </div>
        <div className="flex items-center gap-3">
          {saved && (
            <span className="flex items-center gap-1 text-green-600 text-sm">
              <CheckCircle size={16} /> Saved!
            </span>
          )}
          <Button type="button" onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 size={16} className="mr-2 animate-spin" />
            ) : (
              <Save size={16} className="mr-2" />
            )}
            Save Changes
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('content')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'content'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <FileText size={16} className="inline mr-1.5" />
          Content
        </button>
        <button
          onClick={() => setActiveTab('theme')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'theme'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Palette size={16} className="inline mr-1.5" />
          Theme & Branding
        </button>
      </div>

      {activeTab === 'content' && (
        <div className="space-y-6">
          {/* Description */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText size={18} /> Hotel Description
              </CardTitle>
            </CardHeader>
            <CardContent>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={8}
                placeholder="Write a compelling description of your hotel..."
                className="w-full px-4 py-3 rounded-lg border border-gray-200 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-y"
              />
              <p className="text-xs text-gray-400 mt-2">
                This description appears on your hotel homepage and in search results.
                Supports plain text.
              </p>
            </CardContent>
          </Card>

          {/* Images */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <ImageIcon size={18} /> Images
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Hero Image URL
                </label>
                <input
                  type="url"
                  value={heroImageUrl}
                  onChange={(e) => setHeroImageUrl(e.target.value)}
                  placeholder="https://example.com/hero.jpg"
                  className="w-full h-10 px-4 rounded-lg border border-gray-200 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                {heroImageUrl && (
                  <div className="mt-2 rounded-lg overflow-hidden border border-gray-100">
                    <img
                      src={heroImageUrl}
                      alt="Hero preview"
                      className="w-full h-48 object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Logo URL
                </label>
                <input
                  type="url"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  placeholder="https://example.com/logo.png"
                  className="w-full h-10 px-4 rounded-lg border border-gray-200 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                {logoUrl && (
                  <div className="mt-2 flex items-center gap-3">
                    <div className="w-16 h-16 rounded-lg border border-gray-100 overflow-hidden">
                      <img
                        src={logoUrl}
                        alt="Logo preview"
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    </div>
                    <span className="text-xs text-gray-400">Logo preview</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'theme' && (
        <div className="space-y-6">
          {/* Colors */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Palette size={18} /> Colors
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Primary Color
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={theme.primaryColor || '#2563eb'}
                      onChange={(e) =>
                        setTheme((t) => ({ ...t, primaryColor: e.target.value }))
                      }
                      className="w-10 h-10 rounded border border-gray-200 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={theme.primaryColor || ''}
                      onChange={(e) =>
                        setTheme((t) => ({ ...t, primaryColor: e.target.value }))
                      }
                      placeholder="#2563eb"
                      className="flex-1 h-10 px-3 rounded-lg border border-gray-200 text-sm text-gray-900"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Secondary Color
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={theme.secondaryColor || '#f59e0b'}
                      onChange={(e) =>
                        setTheme((t) => ({ ...t, secondaryColor: e.target.value }))
                      }
                      className="w-10 h-10 rounded border border-gray-200 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={theme.secondaryColor || ''}
                      onChange={(e) =>
                        setTheme((t) => ({ ...t, secondaryColor: e.target.value }))
                      }
                      placeholder="#f59e0b"
                      className="flex-1 h-10 px-3 rounded-lg border border-gray-200 text-sm text-gray-900"
                    />
                  </div>
                </div>
              </div>

              {/* Color preview */}
              <div className="mt-4 p-4 rounded-lg border border-gray-100 bg-gray-50">
                <p className="text-xs text-gray-500 mb-2">Preview</p>
                <div className="flex items-center gap-3">
                  <div
                    className="w-24 h-8 rounded text-white text-xs flex items-center justify-center font-medium"
                    style={{ backgroundColor: theme.primaryColor || '#2563eb' }}
                  >
                    Primary
                  </div>
                  <div
                    className="w-24 h-8 rounded text-white text-xs flex items-center justify-center font-medium"
                    style={{ backgroundColor: theme.secondaryColor || '#f59e0b' }}
                  >
                    Secondary
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Typography */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Type size={18} /> Typography
              </CardTitle>
            </CardHeader>
            <CardContent>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Font Family
              </label>
              <select
                value={theme.fontFamily || 'Inter'}
                onChange={(e) =>
                  setTheme((t) => ({ ...t, fontFamily: e.target.value }))
                }
                className="w-full max-w-xs h-10 px-3 rounded-lg border border-gray-200 text-sm text-gray-900"
              >
                {fontOptions.map((font) => (
                  <option key={font} value={font}>
                    {font}
                  </option>
                ))}
              </select>
              <p
                className="mt-3 text-lg text-gray-700"
                style={{ fontFamily: theme.fontFamily || 'Inter' }}
              >
                The quick brown fox jumps over the lazy dog
              </p>
            </CardContent>
          </Card>

          {/* Header Style */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Header Layout</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {headerStyles.map((style) => (
                  <button
                    key={style.value}
                    onClick={() =>
                      setTheme((t) => ({ ...t, headerStyle: style.value }))
                    }
                    className={`p-3 rounded-lg border text-sm text-center transition-colors ${
                      theme.headerStyle === style.value
                        ? 'border-brand-600 bg-brand-50 text-brand-700'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    {style.label}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Custom CSS */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Custom CSS (Advanced)</CardTitle>
            </CardHeader>
            <CardContent>
              <textarea
                value={theme.customCss || ''}
                onChange={(e) =>
                  setTheme((t) => ({ ...t, customCss: e.target.value }))
                }
                rows={6}
                placeholder={`/* Custom CSS overrides */\n.hotel-header {\n  /* your styles */\n}`}
                className="w-full px-4 py-3 rounded-lg border border-gray-200 text-gray-900 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-500 resize-y"
              />
              <p className="text-xs text-gray-400 mt-2">
                Advanced: Add custom CSS to override default styles. Use with caution.
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
