'use client';

/**
 * Admin SEO Settings - Hotel Manager
 * Manage meta tags, OG images, JSON-LD per page
 */

import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { gql } from '@apollo/client';
import { useAuth } from '@/lib/auth/auth-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Plus,
  Save,
  Trash2,
  Loader2,
  AlertCircle,
  CheckCircle,
  Search,
  Globe,
  Code,
  X,
  Eye,
} from 'lucide-react';

const GET_SEO_META = gql`
  query GetSeoMeta($hotelId: ID!) {
    adminSeoMeta(hotelId: $hotelId) {
      id
      pageSlug
      metaTitle
      metaDescription
      ogImageUrl
      canonicalUrl
      customJsonLd
      createdAt
      updatedAt
    }
  }
`;

const UPSERT_SEO_META = gql`
  mutation UpsertSeoMeta($input: UpsertSeoMetaInput!) {
    upsertSeoMeta(input: $input) {
      id
      pageSlug
      metaTitle
      metaDescription
      ogImageUrl
      canonicalUrl
      customJsonLd
    }
  }
`;

const DELETE_SEO_META = gql`
  mutation DeleteSeoMeta($id: ID!) {
    deleteSeoMeta(id: $id) {
      success
      message
    }
  }
`;

interface SeoEntry {
  id: string;
  pageSlug: string;
  metaTitle?: string;
  metaDescription?: string;
  ogImageUrl?: string;
  canonicalUrl?: string;
  customJsonLd?: any;
  createdAt: string;
  updatedAt: string;
}

const commonPages = [
  { slug: 'homepage', label: 'Homepage' },
  { slug: 'rooms', label: 'Rooms Page' },
  { slug: 'contact', label: 'Contact Page' },
  { slug: 'about', label: 'About Page' },
  { slug: 'booking', label: 'Booking Page' },
  { slug: 'gallery', label: 'Gallery Page' },
];

export default function AdminSeoPage() {
  const { user } = useAuth();
  const hotelId = user?.hotelId;
  const [editingEntry, setEditingEntry] = useState<SeoEntry | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Form state
  const [pageSlug, setPageSlug] = useState('');
  const [metaTitle, setMetaTitle] = useState('');
  const [metaDescription, setMetaDescription] = useState('');
  const [ogImageUrl, setOgImageUrl] = useState('');
  const [canonicalUrl, setCanonicalUrl] = useState('');
  const [jsonLdText, setJsonLdText] = useState('');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, loading, error, refetch } = useQuery<any>(GET_SEO_META, {
    variables: { hotelId },
    skip: !hotelId,
  });

  const [upsertSeo, { loading: saving }] = useMutation(UPSERT_SEO_META, {
    onCompleted: () => {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      setShowForm(false);
      setEditingEntry(null);
      refetch();
    },
  });

  const [deleteSeo, { loading: deleting }] = useMutation(DELETE_SEO_META, {
    onCompleted: () => refetch(),
  });

  const entries: SeoEntry[] = data?.adminSeoMeta || [];

  const openEditForm = (entry: SeoEntry) => {
    setEditingEntry(entry);
    setPageSlug(entry.pageSlug);
    setMetaTitle(entry.metaTitle || '');
    setMetaDescription(entry.metaDescription || '');
    setOgImageUrl(entry.ogImageUrl || '');
    setCanonicalUrl(entry.canonicalUrl || '');
    setJsonLdText(entry.customJsonLd ? JSON.stringify(entry.customJsonLd, null, 2) : '');
    setShowForm(true);
  };

  const openNewForm = (slug: string = '') => {
    setEditingEntry(null);
    setPageSlug(slug);
    setMetaTitle('');
    setMetaDescription('');
    setOgImageUrl('');
    setCanonicalUrl('');
    setJsonLdText('');
    setShowForm(true);
  };

  const handleSave = () => {
    if (!hotelId || !pageSlug.trim()) return;

    let customJsonLd = undefined;
    if (jsonLdText.trim()) {
      try {
        customJsonLd = JSON.parse(jsonLdText);
      } catch {
        alert('Invalid JSON-LD. Please check the syntax.');
        return;
      }
    }

    upsertSeo({
      variables: {
        input: {
          hotelId,
          pageSlug: pageSlug.trim(),
          metaTitle: metaTitle || undefined,
          metaDescription: metaDescription || undefined,
          ogImageUrl: ogImageUrl || undefined,
          canonicalUrl: canonicalUrl || undefined,
          customJsonLd,
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">SEO Settings</h1>
          <p className="text-sm text-gray-500 mt-1">
            Customize meta tags and structured data for each page
          </p>
        </div>
        <Button type="button" onClick={() => openNewForm()}>
          <Plus size={16} className="mr-1.5" />
          Add Page SEO
        </Button>
      </div>

      {saved && (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
          <CheckCircle size={16} />
          SEO settings saved successfully!
        </div>
      )}

      {/* Quick add common pages */}
      {entries.length < commonPages.length && (
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500 mb-3">Quick add SEO for common pages:</p>
            <div className="flex flex-wrap gap-2">
              {commonPages
                .filter((cp) => !entries.find((e) => e.pageSlug === cp.slug))
                .map((cp) => (
                  <Button
                    key={cp.slug}
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => openNewForm(cp.slug)}
                  >
                    <Plus size={12} className="mr-1" />
                    {cp.label}
                  </Button>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit Form Modal */}
      {showForm && (
        <Card className="border-brand-200">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                {editingEntry ? `Edit SEO: ${editingEntry.pageSlug}` : 'New Page SEO'}
              </CardTitle>
              <button
                onClick={() => {
                  setShowForm(false);
                  setEditingEntry(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Page slug */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Page Slug <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={pageSlug}
                onChange={(e) => setPageSlug(e.target.value)}
                disabled={!!editingEntry}
                placeholder="e.g., homepage, rooms, contact"
                className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm text-gray-900 disabled:bg-gray-50"
              />
            </div>

            {/* Meta Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Meta Title
              </label>
              <input
                type="text"
                value={metaTitle}
                onChange={(e) => setMetaTitle(e.target.value)}
                placeholder="Your Hotel - Best Stay in City"
                maxLength={70}
                className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm text-gray-900"
              />
              <p className="text-xs text-gray-400 mt-1">
                {metaTitle.length}/70 characters (50-60 recommended)
              </p>
            </div>

            {/* Meta Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Meta Description
              </label>
              <textarea
                value={metaDescription}
                onChange={(e) => setMetaDescription(e.target.value)}
                placeholder="A compelling description of this page for search results..."
                maxLength={160}
                rows={3}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-900 resize-none"
              />
              <p className="text-xs text-gray-400 mt-1">
                {metaDescription.length}/160 characters (120-155 recommended)
              </p>
            </div>

            {/* OG Image */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                OG Image URL
              </label>
              <input
                type="url"
                value={ogImageUrl}
                onChange={(e) => setOgImageUrl(e.target.value)}
                placeholder="https://example.com/og-image.jpg"
                className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm text-gray-900"
              />
              <p className="text-xs text-gray-400 mt-1">
                Recommended: 1200x630px. Shows when shared on social media.
              </p>
            </div>

            {/* Canonical URL */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Canonical URL
              </label>
              <input
                type="url"
                value={canonicalUrl}
                onChange={(e) => setCanonicalUrl(e.target.value)}
                placeholder="https://yourhotel.com/page"
                className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm text-gray-900"
              />
            </div>

            {/* JSON-LD */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1.5">
                <Code size={14} /> Custom JSON-LD (Structured Data)
              </label>
              <textarea
                value={jsonLdText}
                onChange={(e) => setJsonLdText(e.target.value)}
                rows={8}
                placeholder={`{\n  "@context": "https://schema.org",\n  "@type": "Hotel",\n  "name": "Your Hotel Name"\n}`}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-900 font-mono resize-y"
              />
              <p className="text-xs text-gray-400 mt-1">
                Must be valid JSON. Will be injected as application/ld+json script tag.
              </p>
            </div>

            {/* Google Preview */}
            {(metaTitle || metaDescription) && (
              <div>
                <button
                  type="button"
                  onClick={() => setShowPreview(!showPreview)}
                  className="flex items-center gap-1.5 text-sm text-brand-600 hover:underline mb-2"
                >
                  <Eye size={14} />
                  {showPreview ? 'Hide' : 'Show'} Google Preview
                </button>
                {showPreview && (
                  <div className="p-4 rounded-lg bg-white border border-gray-200 max-w-lg">
                    <div className="text-xs text-green-700 mb-0.5">
                      yourhotel.com › {pageSlug || 'page'}
                    </div>
                    <div className="text-lg text-blue-800 hover:underline cursor-pointer leading-tight">
                      {metaTitle || 'Page Title'}
                    </div>
                    <div className="text-sm text-gray-600 mt-1 line-clamp-2">
                      {metaDescription || 'No description set.'}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-3 pt-2">
              <Button type="button" onClick={handleSave} disabled={saving || !pageSlug.trim()}>
                {saving ? (
                  <Loader2 size={14} className="mr-1.5 animate-spin" />
                ) : (
                  <Save size={14} className="mr-1.5" />
                )}
                Save SEO
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowForm(false);
                  setEditingEntry(null);
                }}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Entries list */}
      <div className="space-y-3">
        {entries.map((entry) => (
          <Card
            key={entry.id}
            className="hover:border-gray-300 transition-colors cursor-pointer"
            onClick={() => openEditForm(entry)}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Globe size={14} className="text-gray-400 flex-shrink-0" />
                    <span className="font-medium text-gray-900 text-sm">/{entry.pageSlug}</span>
                    {commonPages.find((cp) => cp.slug === entry.pageSlug) && (
                      <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
                        {commonPages.find((cp) => cp.slug === entry.pageSlug)?.label}
                      </span>
                    )}
                  </div>
                  {entry.metaTitle && (
                    <div className="text-sm text-blue-700 truncate">{entry.metaTitle}</div>
                  )}
                  {entry.metaDescription && (
                    <div className="text-xs text-gray-500 truncate mt-0.5">
                      {entry.metaDescription}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2 mt-2">
                    {entry.ogImageUrl && (
                      <span className="text-[10px] bg-green-50 text-green-700 px-1.5 py-0.5 rounded">
                        OG Image
                      </span>
                    )}
                    {entry.canonicalUrl && (
                      <span className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">
                        Canonical
                      </span>
                    )}
                    {entry.customJsonLd && (
                      <span className="text-[10px] bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded">
                        JSON-LD
                      </span>
                    )}
                  </div>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="text-red-500 border-red-200 hover:bg-red-50 flex-shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm('Delete this SEO entry?')) {
                      deleteSeo({ variables: { id: entry.id } });
                    }
                  }}
                  disabled={deleting}
                >
                  <Trash2 size={14} />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {entries.length === 0 && !showForm && (
        <div className="text-center py-16">
          <Search className="w-16 h-16 text-gray-200 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">No SEO Settings</h3>
          <p className="text-gray-500 text-sm mt-1 mb-4">
            Add meta tags and structured data for better search engine visibility.
          </p>
          <Button type="button" onClick={() => openNewForm('homepage')}>
            <Plus size={16} className="mr-1.5" />
            Start with Homepage
          </Button>
        </div>
      )}
    </div>
  );
}
