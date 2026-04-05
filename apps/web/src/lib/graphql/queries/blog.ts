import { gql } from '@apollo/client';

// ============================================
// Public Blog Queries
// ============================================

export const BLOG_POSTS = gql`
  query BlogPosts($hotelId: ID, $category: String, $tag: String, $search: String, $page: Int, $limit: Int) {
    blogPosts(hotelId: $hotelId, category: $category, tag: $tag, search: $search, page: $page, limit: $limit) {
      posts {
        id
        hotelId
        title
        slug
        excerpt
        coverImage
        authorId
        category
        tags
        status
        publishedAt
        createdAt
      }
      total
      page
      totalPages
    }
  }
`;

export const BLOG_POST_BY_SLUG = gql`
  query BlogPostBySlug($slug: String!) {
    blogPostBySlug(slug: $slug) {
      id
      hotelId
      title
      slug
      excerpt
      content
      coverImage
      authorId
      category
      tags
      status
      publishedAt
      metaTitle
      metaDescription
      createdAt
      updatedAt
    }
  }
`;

export const BLOG_CATEGORIES = gql`
  query BlogCategories($hotelId: ID) {
    blogCategories(hotelId: $hotelId)
  }
`;

export const BLOG_TAGS = gql`
  query BlogTags($hotelId: ID) {
    blogTags(hotelId: $hotelId)
  }
`;

// ============================================
// Admin Blog Queries
// ============================================

export const ADMIN_BLOG_POSTS = gql`
  query AdminBlogPosts($hotelId: ID, $status: String, $page: Int, $limit: Int) {
    adminBlogPosts(hotelId: $hotelId, status: $status, page: $page, limit: $limit) {
      posts {
        id
        hotelId
        title
        slug
        excerpt
        coverImage
        category
        tags
        status
        publishedAt
        createdAt
        updatedAt
      }
      total
      page
      totalPages
    }
  }
`;

export const ADMIN_BLOG_POST = gql`
  query AdminBlogPost($id: ID!) {
    adminBlogPost(id: $id) {
      id
      hotelId
      title
      slug
      excerpt
      content
      coverImage
      authorId
      category
      tags
      status
      publishedAt
      metaTitle
      metaDescription
      createdAt
      updatedAt
    }
  }
`;
