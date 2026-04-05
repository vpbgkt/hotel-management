import { Injectable, Logger } from '@nestjs/common';

/**
 * Google Token Verifier
 * 
 * Verifies Google ID tokens received from the frontend Google Sign-In button.
 * Uses Google's token info endpoint to validate tokens server-side.
 * No passport redirect flow needed — works directly with GraphQL.
 */
@Injectable()
export class GoogleAuthService {
  private readonly logger = new Logger(GoogleAuthService.name);

  /**
   * Verify a Google ID token and extract user profile
   * 
   * @param idToken - The ID token from Google Sign-In on the frontend
   * @returns User profile { email, name, picture, googleId }
   */
  async verifyIdToken(idToken: string): Promise<{
    email: string;
    name: string;
    picture?: string;
    googleId: string;
  }> {
    try {
      // Verify token using Google's tokeninfo endpoint
      const response = await fetch(
        `https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`,
      );

      if (!response.ok) {
        throw new Error('Invalid Google ID token');
      }

      const payload = await response.json();

      // Validate the token audience (client ID)
      const clientId = process.env.GOOGLE_CLIENT_ID;
      if (clientId && payload.aud !== clientId) {
        throw new Error('Token was not issued for this application');
      }

      // Validate issuer
      if (!['accounts.google.com', 'https://accounts.google.com'].includes(payload.iss)) {
        throw new Error('Invalid token issuer');
      }

      // Check expiry
      const now = Math.floor(Date.now() / 1000);
      if (payload.exp && parseInt(payload.exp) < now) {
        throw new Error('Token has expired');
      }

      return {
        email: payload.email,
        name: payload.name || payload.email.split('@')[0],
        picture: payload.picture,
        googleId: payload.sub,
      };
    } catch (error: any) {
      this.logger.error(`Google token verification failed: ${error.message}`);
      throw new Error('Failed to verify Google credentials');
    }
  }
}
