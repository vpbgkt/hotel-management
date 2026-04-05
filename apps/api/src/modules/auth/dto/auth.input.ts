import { InputType, Field } from '@nestjs/graphql';
import { 
  IsString, 
  IsOptional, 
  IsEmail, 
  MinLength, 
  MaxLength,
  Matches,
} from 'class-validator';

@InputType({ description: 'Login with email and password' })
export class LoginInput {
  @Field()
  @IsEmail()
  email: string;

  @Field()
  @IsString()
  @MinLength(8)
  password: string;
}

@InputType({ description: 'Register new user' })
export class RegisterInput {
  @Field()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @Field()
  @IsEmail()
  email: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @Matches(/^[+]?[0-9]{10,15}$/, {
    message: 'Phone number must be valid',
  })
  phone?: string;

  @Field()
  @IsString()
  @MinLength(8)
  @MaxLength(100)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number',
  })
  password: string;
}

@InputType({ description: 'Request OTP for phone login' })
export class RequestOTPInput {
  @Field()
  @IsString()
  @Matches(/^[+]?[0-9]{10,15}$/, {
    message: 'Phone number must be valid',
  })
  phone: string;
}

@InputType({ description: 'Verify OTP' })
export class VerifyOTPInput {
  @Field()
  @IsString()
  @Matches(/^[+]?[0-9]{10,15}$/, {
    message: 'Phone number must be valid',
  })
  phone: string;

  @Field()
  @IsString()
  @Matches(/^[0-9]{6}$/, {
    message: 'OTP must be 6 digits',
  })
  otp: string;
}

@InputType({ description: 'Refresh token input' })
export class RefreshTokenInput {
  @Field()
  @IsString()
  refreshToken: string;
}

@InputType({ description: 'Reset password request' })
export class RequestPasswordResetInput {
  @Field()
  @IsEmail()
  email: string;
}

@InputType({ description: 'Reset password with token' })
export class ResetPasswordInput {
  @Field()
  @IsString()
  token: string;

  @Field()
  @IsString()
  @MinLength(8)
  @MaxLength(100)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number',
  })
  newPassword: string;
}

@InputType({ description: 'Verify email address' })
export class VerifyEmailInput {
  @Field()
  @IsString()
  token: string;
}

@InputType({ description: 'Resend verification email' })
export class ResendVerificationInput {
  @Field()
  @IsEmail()
  email: string;
}

@InputType({ description: 'Change password for logged in user' })
export class ChangePasswordInput {
  @Field()
  @IsString()
  currentPassword: string;

  @Field()
  @IsString()
  @MinLength(8)
  @MaxLength(100)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number',
  })
  newPassword: string;
}
