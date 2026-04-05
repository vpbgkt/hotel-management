import { 
  Injectable, 
  UnauthorizedException, 
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { 
  LoginInput, 
  RegisterInput, 
  RequestOTPInput, 
  VerifyOTPInput,
  ChangePasswordInput,
  RequestPasswordResetInput,
  ResetPasswordInput,
  VerifyEmailInput,
  ResendVerificationInput,
} from './dto/auth.input';
import { NotificationService } from '../notification/notification.service';
import { SmsService } from '../notification/sms.service';
import { UserRole } from '../user/entities/user.entity';
import { GoogleAuthService } from './strategies/google.service';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';

interface JwtPayload {
  sub: string;
  email?: string;
  phone?: string;
  role: UserRole;
  hotelId?: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly SALT_ROUNDS = 12;
  private readonly OTP_EXPIRY = 300; // 5 minutes
  private readonly REFRESH_TOKEN_EXPIRY = 7 * 24 * 60 * 60; // 7 days
  private readonly PASSWORD_RESET_EXPIRY = 3600; // 1 hour
  private readonly EMAIL_VERIFY_EXPIRY = 86400; // 24 hours
  private readonly MAX_LOGIN_ATTEMPTS = 5;
  private readonly LOCKOUT_DURATION = 900; // 15 minutes

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly jwtService: JwtService,
    private readonly googleAuth: GoogleAuthService,
    private readonly notifications: NotificationService,
    private readonly smsService: SmsService,
  ) {}

  /**
   * Register a new user
   */
  async register(input: RegisterInput) {
    const { name, email, phone, password } = input;

    // Check if email already exists
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: email.toLowerCase() },
          ...(phone ? [{ phone }] : []),
        ],
      },
    });

    if (existingUser) {
      if (existingUser.email === email.toLowerCase()) {
        throw new ConflictException('Email already registered');
      }
      if (phone && existingUser.phone === phone) {
        throw new ConflictException('Phone number already registered');
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, this.SALT_ROUNDS);

    // Create user
    const user = await this.prisma.user.create({
      data: {
        name,
        email: email.toLowerCase(),
        phone,
        password: hashedPassword,
        role: UserRole.GUEST,
        isActive: true,
        emailVerified: false,
        phoneVerified: false,
      },
    });

    // Generate tokens
    const tokens = await this.generateTokens(user);

    this.logger.log(`New user registered: ${user.email}`);

    // Send verification email (fire and forget)
    this.sendVerificationEmail(user.id).catch(() => {});

    return {
      success: true,
      message: 'Registration successful',
      ...tokens,
      user: this.sanitizeUser(user),
    };
  }

  /**
   * Login with email and password
   */
  async login(input: LoginInput) {
    const { email, password } = input;
    const lockKey = `login-lockout:${email.toLowerCase()}`;
    const attemptsKey = `login-attempts:${email.toLowerCase()}`;

    // Check lockout
    const locked = await this.redis.get(lockKey);
    if (locked) {
      throw new UnauthorizedException('Account is temporarily locked due to too many failed attempts. Try again in 15 minutes.');
    }

    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user || !user.password) {
      await this.incrementLoginAttempts(attemptsKey, lockKey);
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      await this.incrementLoginAttempts(attemptsKey, lockKey);
      throw new UnauthorizedException('Invalid email or password');
    }

    // Reset attempts on successful login
    await this.redis.del(attemptsKey);

    // Update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Generate tokens
    const tokens = await this.generateTokens(user);

    this.logger.log(`User logged in: ${user.email}`);

    return {
      success: true,
      message: 'Login successful',
      ...tokens,
      user: this.sanitizeUser(user),
    };
  }

  /**
   * Request OTP for phone login
   */
  async requestOTP(input: RequestOTPInput) {
    const { phone } = input;

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Store OTP in Redis with expiry
    const otpKey = `otp:${phone}`;
    await this.redis.set(otpKey, otp, this.OTP_EXPIRY);

    // Send OTP via SMS (MSG91). Falls back to logging when MSG91 is not configured.
    const sent = await this.smsService.sendOTP(phone, otp);
    if (!sent) {
      this.logger.warn(`OTP delivery failed for ${phone}, OTP stored in Redis for dev usage`);
    }

    return {
      success: true,
      message: 'OTP sent successfully',
      expiresAt: new Date(Date.now() + this.OTP_EXPIRY * 1000),
    };
  }

  /**
   * Verify OTP and login/register
   */
  async verifyOTP(input: VerifyOTPInput) {
    const { phone, otp } = input;

    // Get stored OTP
    const otpKey = `otp:${phone}`;
    const storedOTP = await this.redis.get(otpKey);

    if (!storedOTP) {
      throw new BadRequestException('OTP expired or not found');
    }

    if (storedOTP !== otp) {
      throw new BadRequestException('Invalid OTP');
    }

    // Delete OTP after successful verification
    await this.redis.del(otpKey);

    // Find or create user
    let user = await this.prisma.user.findUnique({
      where: { phone },
    });

    if (!user) {
      // Create new user with phone
      user = await this.prisma.user.create({
        data: {
          phone,
          name: 'Guest User', // Will be updated later
          role: UserRole.GUEST,
          isActive: true,
          phoneVerified: true,
        },
      });
      
      this.logger.log(`New user created via OTP: ${phone}`);
    } else {
      // Update phone verification status
      if (!user.phoneVerified) {
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: { 
            phoneVerified: true,
            lastLoginAt: new Date(),
          },
        });
      } else {
        await this.prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });
      }
    }

    // Generate tokens
    const tokens = await this.generateTokens(user);

    return {
      success: true,
      message: 'OTP verified successfully',
      ...tokens,
      user: this.sanitizeUser(user),
    };
  }

  /**
   * Google OAuth login/register
   * Accepts a Google ID token from the frontend, verifies it,
   * and either logs in the existing user or creates a new account.
   */
  async googleLogin(idToken: string) {
    // Verify Google ID token
    const googleProfile = await this.googleAuth.verifyIdToken(idToken);

    // Find user by email
    let user = await this.prisma.user.findUnique({
      where: { email: googleProfile.email.toLowerCase() },
    });

    if (user) {
      // Existing user — update Google metadata if needed
      if (!user.isActive) {
        throw new UnauthorizedException('Account is deactivated');
      }

      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          lastLoginAt: new Date(),
          emailVerified: true,
          avatarUrl: user.avatarUrl || googleProfile.picture || null,
        },
      });
    } else {
      // New user — create account
      user = await this.prisma.user.create({
        data: {
          name: googleProfile.name,
          email: googleProfile.email.toLowerCase(),
          role: UserRole.GUEST,
          isActive: true,
          emailVerified: true,
          avatarUrl: googleProfile.picture || null,
        },
      });

      this.logger.log(`New user created via Google: ${user.email}`);
    }

    // Generate tokens
    const tokens = await this.generateTokens(user);

    return {
      success: true,
      message: 'Google login successful',
      ...tokens,
      user: this.sanitizeUser(user),
    };
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string) {
    try {
      // Verify refresh token
      const payload = this.jwtService.verify(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET || 'refresh-secret',
      });

      // Check if refresh token is in Redis (not revoked)
      const storedToken = await this.redis.get(`refresh:${payload.sub}`);
      
      if (!storedToken || storedToken !== refreshToken) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Get user
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user || !user.isActive) {
        throw new UnauthorizedException('User not found or inactive');
      }

      // Generate new tokens
      const tokens = await this.generateTokens(user);

      return {
        success: true,
        ...tokens,
        user: this.sanitizeUser(user),
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  /**
   * Logout - revoke refresh token
   */
  async logout(userId: string) {
    await this.redis.del(`refresh:${userId}`);
    
    return {
      success: true,
      message: 'Logged out successfully',
    };
  }

  /**
   * Change password for logged in user
   */
  async changePassword(userId: string, input: ChangePasswordInput) {
    const { currentPassword, newPassword } = input;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.password) {
      throw new BadRequestException('Cannot change password for this account');
    }

    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);

    if (!isPasswordValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    const hashedPassword = await bcrypt.hash(newPassword, this.SALT_ROUNDS);

    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    // Revoke all refresh tokens
    await this.redis.del(`refresh:${userId}`);

    return {
      success: true,
      message: 'Password changed successfully. Please login again.',
    };
  }

  /**
   * Request password reset - sends token via email
   */
  async requestPasswordReset(input: RequestPasswordResetInput) {
    const user = await this.prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
    });

    // Always return success to prevent email enumeration
    if (!user || !user.isActive) {
      return { success: true, message: 'If this email is registered, a reset link has been sent.' };
    }

    const token = randomBytes(32).toString('hex');
    await this.redis.set(`pwd-reset:${token}`, user.id, this.PASSWORD_RESET_EXPIRY);

    await this.notifications.sendPasswordResetEmail(user.email!, user.name, token);

    return { success: true, message: 'If this email is registered, a reset link has been sent.' };
  }

  /**
   * Reset password using token
   */
  async resetPassword(input: ResetPasswordInput) {
    const userId = await this.redis.get(`pwd-reset:${input.token}`);
    if (!userId) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const hashedPassword = await bcrypt.hash(input.newPassword, this.SALT_ROUNDS);

    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    // Invalidate the token and all refresh tokens
    await this.redis.del(`pwd-reset:${input.token}`);
    await this.redis.del(`refresh:${userId}`);

    return { success: true, message: 'Password reset successfully. Please login with your new password.' };
  }

  /**
   * Send email verification link after registration
   */
  async sendVerificationEmail(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.email || user.emailVerified) return;

    const token = randomBytes(32).toString('hex');
    await this.redis.set(`email-verify:${token}`, user.id, this.EMAIL_VERIFY_EXPIRY);

    await this.notifications.sendEmailVerification(user.email, user.name, token);
  }

  /**
   * Verify email using token
   */
  async verifyEmail(input: VerifyEmailInput) {
    const userId = await this.redis.get(`email-verify:${input.token}`);
    if (!userId) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { emailVerified: true },
    });

    await this.redis.del(`email-verify:${input.token}`);

    return { success: true, message: 'Email verified successfully.' };
  }

  /**
   * Resend email verification
   */
  async resendVerificationEmail(input: ResendVerificationInput) {
    const user = await this.prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
    });

    if (!user || user.emailVerified) {
      return { success: true, message: 'If this email is registered and unverified, a verification link has been sent.' };
    }

    const token = randomBytes(32).toString('hex');
    await this.redis.set(`email-verify:${token}`, user.id, this.EMAIL_VERIFY_EXPIRY);

    await this.notifications.sendEmailVerification(user.email!, user.name, token);

    return { success: true, message: 'If this email is registered and unverified, a verification link has been sent.' };
  }

  /**
   * Validate user from JWT payload
   */
  async validateUser(payload: JwtPayload) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user || !user.isActive) {
      return null;
    }

    return this.sanitizeUser(user);
  }

  // ============================================
  // Private helper methods
  // ============================================

  private async incrementLoginAttempts(attemptsKey: string, lockKey: string) {
    const attempts = await this.redis.incr(attemptsKey);
    if (attempts === 1) {
      await this.redis.expire(attemptsKey, this.LOCKOUT_DURATION);
    }
    if (attempts >= this.MAX_LOGIN_ATTEMPTS) {
      await this.redis.set(lockKey, '1', this.LOCKOUT_DURATION);
      await this.redis.del(attemptsKey);
    }
  }

  private async generateTokens(user: any) {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      phone: user.phone,
      role: user.role,
      hotelId: user.hotelId,
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_SECRET || 'secret',
      expiresIn: '15m',
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_REFRESH_SECRET || 'refresh-secret',
      expiresIn: '7d',
    });

    // Store refresh token in Redis
    await this.redis.set(
      `refresh:${user.id}`,
      refreshToken,
      this.REFRESH_TOKEN_EXPIRY
    );

    return { accessToken, refreshToken };
  }

  private sanitizeUser(user: any) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...sanitized } = user;
    return sanitized;
  }
}
