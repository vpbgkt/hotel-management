'use client';

/**
 * Blog Post Detail Page
 * 
 * Renders a single blog post with full content, SEO metadata, and related navigation.
 */

import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useQuery } from '@apollo/client/react';
import { Calendar, Clock, Tag, ArrowLeft, Share2, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BLOG_POST_BY_SLUG } from '@/lib/graphql/queries/blog';
import { useTenant } from '@/lib/tenant/tenant-context';

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function getReadingTime(content: string) {
  const words = content.split(/\s+/).length;
  return `${Math.max(1, Math.ceil(words / 200))} min read`;
}

export default function BlogPostPage() {
  const params = useParams();
  const slug = params.slug as string;
  const { hotel: tenant } = useTenant();

  const { data, loading, error } = useQuery<any>(BLOG_POST_BY_SLUG, {
    variables: { slug },
    skip: !slug,
  });

  const post = data?.blogPostBySlug;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 py-12">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-3/4" />
            <div className="h-4 bg-gray-200 rounded w-1/3" />
            <div className="h-80 bg-gray-200 rounded-xl" />
            <div className="space-y-3">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="h-4 bg-gray-200 rounded w-full" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <BookOpen className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Post Not Found</h2>
          <p className="text-gray-500 mb-6">The article you&apos;re looking for doesn&apos;t exist or has been removed.</p>
          <Link href="/blog">
            <Button>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Blog
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({
        title: post.title,
        text: post.excerpt || '',
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <Link href="/blog" className="inline-flex items-center text-blue-600 hover:text-blue-700 text-sm font-medium">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Blog
          </Link>
        </div>
      </div>

      <article className="max-w-4xl mx-auto px-4 py-8">
        {/* Category & Meta */}
        <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500 mb-4">
          {post.category && (
            <Link
              href={`/blog?category=${post.category}`}
              className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full font-medium hover:bg-blue-200 transition-colors"
            >
              {post.category.replace(/-/g, ' ')}
            </Link>
          )}
          <span className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            {formatDate(post.publishedAt || post.createdAt)}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            {getReadingTime(post.content)}
          </span>
        </div>

        {/* Title */}
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4 leading-tight">
          {post.title}
        </h1>

        {/* Excerpt */}
        {post.excerpt && (
          <p className="text-xl text-gray-600 mb-8 leading-relaxed">
            {post.excerpt}
          </p>
        )}

        {/* Cover Image */}
        {post.coverImage && (
          <div className="relative w-full h-64 md:h-96 rounded-xl overflow-hidden mb-8">
            <Image
              src={post.coverImage}
              alt={post.title}
              fill
              className="object-cover"
              priority
            />
          </div>
        )}

        {/* Content */}
        <div
          className="prose prose-lg max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-a:text-blue-600 prose-img:rounded-xl"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />

        {/* Tags */}
        {post.tags?.length > 0 && (
          <div className="mt-10 pt-6 border-t">
            <h3 className="text-sm font-medium text-gray-500 mb-3">Tags</h3>
            <div className="flex flex-wrap gap-2">
              {post.tags.map((tag: string) => (
                <Link
                  key={tag}
                  href={`/blog?tag=${tag}`}
                  className="inline-flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm px-3 py-1.5 rounded-lg transition-colors"
                >
                  <Tag className="w-3.5 h-3.5" />
                  {tag}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Share & CTA */}
        <div className="mt-10 pt-6 border-t flex flex-col sm:flex-row items-center justify-between gap-4">
          <button
            onClick={handleShare}
            className="inline-flex items-center gap-2 text-gray-600 hover:text-blue-600 transition-colors"
          >
            <Share2 className="w-5 h-5" />
            Share this article
          </button>

          <Link href="/hotel/rooms">
            <Button size="lg">
              Book Your Stay at {tenant?.name || 'Our Hotel'}
            </Button>
          </Link>
        </div>
      </article>
    </div>
  );
}
