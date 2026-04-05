/**
 * GraphQL Queries & Mutations for API Key Management
 */

import { gql } from '@apollo/client';

export const GET_MY_API_KEYS = gql`
  query GetMyApiKeys($hotelId: ID!) {
    myApiKeys(hotelId: $hotelId) {
      id
      hotelId
      name
      keyPrefix
      permissions
      rateLimitPerMinute
      allowedOrigins
      lastUsedAt
      requestCount
      isActive
      expiresAt
      createdAt
      updatedAt
    }
  }
`;

export const GENERATE_API_KEY = gql`
  mutation GenerateApiKey($input: CreateApiKeyInput!) {
    generateApiKey(input: $input) {
      apiKey {
        id
        hotelId
        name
        keyPrefix
        permissions
        rateLimitPerMinute
        allowedOrigins
        isActive
        expiresAt
        createdAt
      }
      plainTextKey
    }
  }
`;

export const UPDATE_API_KEY = gql`
  mutation UpdateApiKey($input: UpdateApiKeyInput!) {
    updateApiKey(input: $input) {
      id
      name
      permissions
      rateLimitPerMinute
      allowedOrigins
      isActive
      expiresAt
      updatedAt
    }
  }
`;

export const REVOKE_API_KEY = gql`
  mutation RevokeApiKey($keyId: ID!) {
    revokeApiKey(keyId: $keyId) {
      success
      message
    }
  }
`;

export const DELETE_API_KEY = gql`
  mutation DeleteApiKey($keyId: ID!) {
    deleteApiKey(keyId: $keyId) {
      success
      message
    }
  }
`;

export const ROTATE_API_KEY = gql`
  mutation RotateApiKey($keyId: ID!) {
    rotateApiKey(keyId: $keyId) {
      apiKey {
        id
        hotelId
        name
        keyPrefix
        permissions
        rateLimitPerMinute
        allowedOrigins
        isActive
        createdAt
      }
      plainTextKey
    }
  }
`;
