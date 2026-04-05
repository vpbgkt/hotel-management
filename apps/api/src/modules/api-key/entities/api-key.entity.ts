import { ObjectType, Field, ID, Int, registerEnumType } from '@nestjs/graphql';
import { ApiKeyPermission } from '@prisma/client';

export { ApiKeyPermission };

registerEnumType(ApiKeyPermission, {
  name: 'ApiKeyPermission',
  description: 'Permissions that can be assigned to an API key',
});

@ObjectType()
export class ApiKeyType {
  @Field(() => ID)
  id: string;

  @Field()
  hotelId: string;

  @Field()
  name: string;

  @Field()
  keyPrefix: string;

  @Field(() => [ApiKeyPermission])
  permissions: ApiKeyPermission[];

  @Field(() => Int)
  rateLimitPerMinute: number;

  @Field(() => [String])
  allowedOrigins: string[];

  @Field(() => Date, { nullable: true })
  lastUsedAt: Date | null;

  @Field(() => Int)
  requestCount: number;

  @Field()
  isActive: boolean;

  @Field(() => Date, { nullable: true })
  expiresAt: Date | null;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}

/**
 * Returned only once when a new key is generated.
 * The full key is never stored or retrievable again.
 */
@ObjectType()
export class GeneratedApiKey {
  @Field(() => ApiKeyType)
  apiKey: ApiKeyType;

  @Field({ description: 'The full API key — shown only once, store it securely' })
  plainTextKey: string;
}

@ObjectType()
export class ApiKeyDeleteResult {
  @Field()
  success: boolean;

  @Field()
  message: string;
}
