import { ObjectType, Field, ID, registerEnumType } from '@nestjs/graphql';

export enum UserRole {
  GUEST = 'GUEST',
  HOTEL_ADMIN = 'HOTEL_ADMIN',
  HOTEL_STAFF = 'HOTEL_STAFF',
}

registerEnumType(UserRole, {
  name: 'UserRole',
  description: 'User role type',
});

@ObjectType({ description: 'Staff permission flags' })
export class StaffPermission {
  @Field(() => ID) id: string;
  @Field() canManageBookings: boolean;
  @Field() canManageRooms: boolean;
  @Field() canManagePricing: boolean;
  @Field() canManageReviews: boolean;
  @Field() canManageContent: boolean;
  @Field() canViewAnalytics: boolean;
  @Field() canManageStaff: boolean;
}

@ObjectType({ description: 'User entity' })
export class User {
  @Field(() => ID)
  id: string;

  @Field({ nullable: true })
  email?: string;

  @Field({ nullable: true })
  phone?: string;

  @Field()
  name: string;

  @Field({ nullable: true })
  avatarUrl?: string;

  @Field(() => UserRole)
  role: UserRole;

  @Field({ nullable: true })
  hotelId?: string;

  @Field()
  isActive: boolean;

  @Field()
  emailVerified: boolean;

  @Field()
  phoneVerified: boolean;

  @Field({ nullable: true })
  lastLoginAt?: Date;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;

  @Field(() => StaffPermission, { nullable: true })
  staffPermission?: StaffPermission;
}

@ObjectType({ description: 'Auth response with tokens' })
export class AuthResponse {
  @Field()
  success: boolean;

  @Field({ nullable: true })
  message?: string;

  @Field({ nullable: true })
  accessToken?: string;

  @Field({ nullable: true })
  refreshToken?: string;

  @Field(() => User, { nullable: true })
  user?: User;
}

@ObjectType({ description: 'OTP send response' })
export class OTPResponse {
  @Field()
  success: boolean;

  @Field()
  message: string;

  @Field({ nullable: true })
  expiresAt?: Date;
}
