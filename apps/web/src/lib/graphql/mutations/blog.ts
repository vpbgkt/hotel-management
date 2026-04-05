import { gql } from '@apollo/client';

export const CREATE_BLOG_POST = gql`
  mutation CreateBlogPost($input: CreateBlogPostInput!) {
    createBlogPost(input: $input) {
      id
      title
      slug
      status
      createdAt
    }
  }
`;

export const UPDATE_BLOG_POST = gql`
  mutation UpdateBlogPost($input: UpdateBlogPostInput!) {
    updateBlogPost(input: $input) {
      id
      title
      slug
      status
      updatedAt
    }
  }
`;

export const PUBLISH_BLOG_POST = gql`
  mutation PublishBlogPost($id: ID!) {
    publishBlogPost(id: $id) {
      id
      status
      publishedAt
    }
  }
`;

export const ARCHIVE_BLOG_POST = gql`
  mutation ArchiveBlogPost($id: ID!) {
    archiveBlogPost(id: $id) {
      id
      status
    }
  }
`;

export const DELETE_BLOG_POST = gql`
  mutation DeleteBlogPost($id: ID!) {
    deleteBlogPost(id: $id)
  }
`;
