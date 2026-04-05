/**
 * Authentication GraphQL Mutations
 */

import { gql } from '@apollo/client';

export const LOGIN_MUTATION = gql`
  mutation Login($email: String!, $password: String!) {
    login(input: { email: $email, password: $password }) {
      success
      message
      accessToken
      refreshToken
      user {
        id
        email
        name
        role
        avatarUrl
      }
    }
  }
`;

export const REGISTER_MUTATION = gql`
  mutation Register($input: RegisterInput!) {
    register(input: $input) {
      success
      message
      accessToken
      refreshToken
      user {
        id
        email
        name
        role
      }
    }
  }
`;

export const LOGOUT_MUTATION = gql`
  mutation Logout {
    logout {
      success
      message
    }
  }
`;

export const GOOGLE_LOGIN_MUTATION = gql`
  mutation GoogleLogin($idToken: String!) {
    googleLogin(idToken: $idToken) {
      success
      message
      accessToken
      refreshToken
      user {
        id
        email
        name
        role
        avatarUrl
      }
    }
  }
`;

export const REFRESH_TOKEN_MUTATION = gql`
  mutation RefreshToken($refreshToken: String!) {
    refreshToken(refreshToken: $refreshToken) {
      success
      accessToken
      refreshToken
    }
  }
`;

export const REQUEST_PASSWORD_RESET_MUTATION = gql`
  mutation RequestPasswordReset($email: String!) {
    requestPasswordReset(email: $email) {
      success
      message
    }
  }
`;

export const RESET_PASSWORD_MUTATION = gql`
  mutation ResetPassword($token: String!, $password: String!) {
    resetPassword(token: $token, password: $password) {
      success
      message
    }
  }
`;
