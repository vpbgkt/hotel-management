import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthResponse, OTPResponse, User } from '../user/entities/user.entity';
import { 
  LoginInput, 
  RegisterInput, 
  RequestOTPInput, 
  VerifyOTPInput,
  RefreshTokenInput,
  ChangePasswordInput,
  RequestPasswordResetInput,
  ResetPasswordInput,
  VerifyEmailInput,
  ResendVerificationInput,
} from './dto/auth.input';
import { GqlAuthGuard } from './guards/jwt-auth.guard';
import { GqlCurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';
import { ObjectType, Field } from '@nestjs/graphql';

@ObjectType()
class LogoutResponse {
  @Field()
  success: boolean;

  @Field()
  message: string;
}

@Resolver()
export class AuthResolver {
  constructor(private readonly authService: AuthService) {}

  /**
   * Register a new user
   */
  @Public()
  @Mutation(() => AuthResponse, { 
    name: 'register', 
    description: 'Register a new user' 
  })
  async register(
    @Args('input') input: RegisterInput,
  ) {
    return this.authService.register(input);
  }

  /**
   * Login with email and password
   */
  @Public()
  @Mutation(() => AuthResponse, { 
    name: 'login', 
    description: 'Login with email and password' 
  })
  async login(
    @Args('input') input: LoginInput,
  ) {
    return this.authService.login(input);
  }

  /**
   * Request OTP for phone login
   */
  @Public()
  @Mutation(() => OTPResponse, { 
    name: 'requestOTP', 
    description: 'Request OTP for phone login' 
  })
  async requestOTP(
    @Args('input') input: RequestOTPInput,
  ) {
    return this.authService.requestOTP(input);
  }

  /**
   * Verify OTP and login
   */
  @Public()
  @Mutation(() => AuthResponse, { 
    name: 'verifyOTP', 
    description: 'Verify OTP and login/register' 
  })
  async verifyOTP(
    @Args('input') input: VerifyOTPInput,
  ) {
    return this.authService.verifyOTP(input);
  }

  /**
   * Google OAuth login
   */
  @Public()
  @Mutation(() => AuthResponse, {
    name: 'googleLogin',
    description: 'Login or register with Google ID token',
  })
  async googleLogin(
    @Args('idToken') idToken: string,
  ) {
    return this.authService.googleLogin(idToken);
  }

  /**
   * Refresh access token
   */
  @Public()
  @Mutation(() => AuthResponse, { 
    name: 'refreshToken', 
    description: 'Refresh access token using refresh token' 
  })
  async refreshToken(
    @Args('input') input: RefreshTokenInput,
  ) {
    return this.authService.refreshToken(input.refreshToken);
  }

  /**
   * Logout
   */
  @UseGuards(GqlAuthGuard)
  @Mutation(() => LogoutResponse, { 
    name: 'logout', 
    description: 'Logout and revoke refresh token' 
  })
  async logout(
    @GqlCurrentUser() user: User,
  ) {
    return this.authService.logout(user.id);
  }

  /**
   * Get current user
   */
  @UseGuards(GqlAuthGuard)
  @Query(() => User, { 
    name: 'me', 
    description: 'Get current logged in user' 
  })
  async me(
    @GqlCurrentUser() user: User,
  ) {
    return user;
  }

  /**
   * Change password
   */
  @UseGuards(GqlAuthGuard)
  @Mutation(() => LogoutResponse, { 
    name: 'changePassword', 
    description: 'Change password for logged in user' 
  })
  async changePassword(
    @GqlCurrentUser() user: User,
    @Args('input') input: ChangePasswordInput,
  ) {
    return this.authService.changePassword(user.id, input);
  }

  /**
   * Request password reset
   */
  @Public()
  @Mutation(() => LogoutResponse, {
    name: 'requestPasswordReset',
    description: 'Request a password reset link via email',
  })
  async requestPasswordReset(
    @Args('input') input: RequestPasswordResetInput,
  ) {
    return this.authService.requestPasswordReset(input);
  }

  /**
   * Reset password with token
   */
  @Public()
  @Mutation(() => LogoutResponse, {
    name: 'resetPassword',
    description: 'Reset password using reset token',
  })
  async resetPassword(
    @Args('input') input: ResetPasswordInput,
  ) {
    return this.authService.resetPassword(input);
  }

  /**
   * Verify email address
   */
  @Public()
  @Mutation(() => LogoutResponse, {
    name: 'verifyEmail',
    description: 'Verify email address using token',
  })
  async verifyEmail(
    @Args('input') input: VerifyEmailInput,
  ) {
    return this.authService.verifyEmail(input);
  }

  /**
   * Resend verification email
   */
  @Public()
  @Mutation(() => LogoutResponse, {
    name: 'resendVerificationEmail',
    description: 'Resend email verification link',
  })
  async resendVerificationEmail(
    @Args('input') input: ResendVerificationInput,
  ) {
    return this.authService.resendVerificationEmail(input);
  }
}
