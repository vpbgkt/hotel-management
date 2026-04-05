'use client';

/**
 * Admin Blog Management Page
 * 
 * CRUD for blog posts - create, edit, publish, archive, and delete posts.
 */

import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import {
  Plus,
  Edit3,
  Trash2,
  Eye,
  Archive,
  Send,
  FileText,
  Search,
  MoreVertical,
  Calendar,
  Tag,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ADMIN_BLOG_POSTS } from '@/lib/graphql/queries/blog';
import {
  CREATE_BLOG_POST,
  UPDATE_BLOG_POST,
  PUBLISH_BLOG_POST,
  ARCHIVE_BLOG_POST,
  DELETE_BLOG_POST,
} from '@/lib/graphql/mutations/blog';

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-yellow-100 text-yellow-800',
  PUBLISHED: 'bg-green-100 text-green-800',
  ARCHIVED: 'bg-gray-100 text-gray-600',
};

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function AdminBlogPage() {
  const [filterStatus, setFilterStatus] = useState('');
  const [showEditor, setShowEditor] = useState(false);
  const [editingPost, setEditingPost] = useState<any>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  // Form state
  const [formTitle, setFormTitle] = useState('');
  const [formSlug, setFormSlug] = useState('');
  const [formExcerpt, setFormExcerpt] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formTags, setFormTags] = useState('');
  const [formCoverImage, setFormCoverImage] = useState('');
  const [formMetaTitle, setFormMetaTitle] = useState('');
  const [formMetaDescription, setFormMetaDescription] = useState('');

  const { data, loading, refetch } = useQuery<any>(ADMIN_BLOG_POSTS, {
    variables: {
      status: filterStatus || undefined,
      page: 1,
      limit: 50,
    },
  });

  const [createPost, { loading: creating }] = useMutation<any>(CREATE_BLOG_POST);
  const [updatePost, { loading: updating }] = useMutation<any>(UPDATE_BLOG_POST);
  const [publishPost] = useMutation<any>(PUBLISH_BLOG_POST);
  const [archivePost] = useMutation<any>(ARCHIVE_BLOG_POST);
  const [deletePost] = useMutation<any>(DELETE_BLOG_POST);

  const posts = data?.adminBlogPosts?.posts || [];

  const resetForm = () => {
    setFormTitle('');
    setFormSlug('');
    setFormExcerpt('');
    setFormContent('');
    setFormCategory('');
    setFormTags('');
    setFormCoverImage('');
    setFormMetaTitle('');
    setFormMetaDescription('');
    setEditingPost(null);
  };

  const openNewEditor = () => {
    resetForm();
    setShowEditor(true);
  };

  const openEditEditor = (post: any) => {
    setEditingPost(post);
    setFormTitle(post.title);
    setFormSlug(post.slug);
    setFormExcerpt(post.excerpt || '');
    setFormContent(post.content || '');
    setFormCategory(post.category || '');
    setFormTags(post.tags?.join(', ') || '');
    setFormCoverImage(post.coverImage || '');
    setFormMetaTitle(post.metaTitle || '');
    setFormMetaDescription(post.metaDescription || '');
    setShowEditor(true);
    setMenuOpenId(null);
  };

  const handleSave = async () => {
    try {
      const tags = formTags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      if (editingPost) {
        await updatePost({
          variables: {
            input: {
              id: editingPost.id,
              title: formTitle,
              slug: formSlug,
              excerpt: formExcerpt,
              content: formContent,
              category: formCategory || null,
              tags,
              coverImage: formCoverImage || null,
              metaTitle: formMetaTitle || null,
              metaDescription: formMetaDescription || null,
            },
          },
        });
      } else {
        await createPost({
          variables: {
            input: {
              title: formTitle,
              slug: formSlug || undefined,
              excerpt: formExcerpt,
              content: formContent,
              category: formCategory || undefined,
              tags,
              coverImage: formCoverImage || undefined,
              metaTitle: formMetaTitle || undefined,
              metaDescription: formMetaDescription || undefined,
            },
          },
        });
      }

      setShowEditor(false);
      resetForm();
      refetch();
    } catch (err: any) {
      alert(err.message || 'Failed to save post');
    }
  };

  const handlePublish = async (id: string) => {
    try {
      await publishPost({ variables: { id } });
      refetch();
      setMenuOpenId(null);
    } catch (err: any) {
      alert(err.message || 'Failed to publish');
    }
  };

  const handleArchive = async (id: string) => {
    try {
      await archivePost({ variables: { id } });
      refetch();
      setMenuOpenId(null);
    } catch (err: any) {
      alert(err.message || 'Failed to archive');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to permanently delete this post?')) return;
    try {
      await deletePost({ variables: { id } });
      refetch();
      setMenuOpenId(null);
    } catch (err: any) {
      alert(err.message || 'Failed to delete');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Blog Posts</h1>
          <p className="text-gray-500 mt-1">Manage blog content for SEO and marketing</p>
        </div>
        <Button onClick={openNewEditor}>
          <Plus className="w-4 h-4 mr-2" />
          New Post
        </Button>
      </div>

      {/* Status Filters */}
      <div className="flex gap-2">
        {['', 'DRAFT', 'PUBLISHED', 'ARCHIVED'].map((status) => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filterStatus === status
                ? 'bg-blue-600 text-white'
                : 'bg-white border text-gray-600 hover:bg-gray-50'
            }`}
          >
            {status || 'All'}
          </button>
        ))}
      </div>

      {/* Editor Modal */}
      {showEditor && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center overflow-y-auto py-8">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl mx-4">
            <div className="p-6 border-b flex items-center justify-between">
              <h2 className="text-xl font-bold">
                {editingPost ? 'Edit Post' : 'New Blog Post'}
              </h2>
              <button
                onClick={() => { setShowEditor(false); resetForm(); }}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter post title"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                />
              </div>

              {/* Slug */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Slug <span className="text-gray-400">(auto-generated if empty)</span>
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="url-friendly-slug"
                  value={formSlug}
                  onChange={(e) => setFormSlug(e.target.value)}
                />
              </div>

              {/* Excerpt */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Excerpt</label>
                <textarea
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={2}
                  placeholder="Brief summary for listing pages"
                  value={formExcerpt}
                  onChange={(e) => setFormExcerpt(e.target.value)}
                />
              </div>

              {/* Content */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Content * (HTML/Markdown)</label>
                <textarea
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                  rows={12}
                  placeholder="Write your post content here..."
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                />
              </div>

              {/* Cover Image */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cover Image URL</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="https://..."
                  value={formCoverImage}
                  onChange={(e) => setFormCoverImage(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Category */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                  >
                    <option value="">Select category</option>
                    <option value="travel-tips">Travel Tips</option>
                    <option value="city-guides">City Guides</option>
                    <option value="hotel-news">Hotel News</option>
                    <option value="food-dining">Food & Dining</option>
                    <option value="events">Events</option>
                    <option value="local-attractions">Local Attractions</option>
                  </select>
                </div>

                {/* Tags */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tags (comma-separated)</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="udaipur, rajasthan, luxury"
                    value={formTags}
                    onChange={(e) => setFormTags(e.target.value)}
                  />
                </div>
              </div>

              {/* SEO */}
              <details className="border rounded-lg p-4">
                <summary className="text-sm font-medium text-gray-700 cursor-pointer">SEO Settings</summary>
                <div className="mt-3 space-y-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Meta Title</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Custom page title"
                      value={formMetaTitle}
                      onChange={(e) => setFormMetaTitle(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Meta Description</label>
                    <textarea
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows={2}
                      placeholder="Search engine description"
                      value={formMetaDescription}
                      onChange={(e) => setFormMetaDescription(e.target.value)}
                    />
                  </div>
                </div>
              </details>
            </div>

            <div className="p-6 border-t flex justify-end gap-3">
              <Button variant="outline" onClick={() => { setShowEditor(false); resetForm(); }}>
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={!formTitle || !formContent || creating || updating}
              >
                {creating || updating ? 'Saving...' : editingPost ? 'Update Post' : 'Save Draft'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Posts Table */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400">Loading posts...</div>
        ) : posts.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <h3 className="text-lg font-semibold text-gray-600 mb-1">No blog posts yet</h3>
            <p className="text-gray-400 mb-4">Create your first blog post to improve SEO</p>
            <Button onClick={openNewEditor}>
              <Plus className="w-4 h-4 mr-2" /> Create Post
            </Button>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Title</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Category</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {posts.map((post: any) => (
                <tr key={post.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900 truncate max-w-xs">{post.title}</div>
                    <div className="text-xs text-gray-400 mt-0.5">/{post.slug}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {post.category ? (
                      <span className="inline-flex items-center gap-1">
                        <Tag className="w-3 h-3" />
                        {post.category.replace(/-/g, ' ')}
                      </span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[post.status] || 'bg-gray-100'}`}>
                      {post.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {formatDate(post.publishedAt || post.createdAt)}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="relative inline-block">
                      <button
                        onClick={() => setMenuOpenId(menuOpenId === post.id ? null : post.id)}
                        className="p-2 hover:bg-gray-100 rounded-lg"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                      {menuOpenId === post.id && (
                        <div className="absolute right-0 mt-1 w-48 bg-white border rounded-lg shadow-lg z-20 py-1">
                          <button
                            onClick={() => openEditEditor(post)}
                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                          >
                            <Edit3 className="w-4 h-4" /> Edit
                          </button>
                          {post.status === 'PUBLISHED' && (
                            <a
                              href={`/blog/${post.slug}`}
                              target="_blank"
                              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                            >
                              <Eye className="w-4 h-4" /> View
                            </a>
                          )}
                          {post.status === 'DRAFT' && (
                            <button
                              onClick={() => handlePublish(post.id)}
                              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-green-700 hover:bg-green-50"
                            >
                              <Send className="w-4 h-4" /> Publish
                            </button>
                          )}
                          {post.status === 'PUBLISHED' && (
                            <button
                              onClick={() => handleArchive(post.id)}
                              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-yellow-700 hover:bg-yellow-50"
                            >
                              <Archive className="w-4 h-4" /> Archive
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(post.id)}
                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" /> Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
