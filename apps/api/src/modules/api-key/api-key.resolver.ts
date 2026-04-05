import { Resolver, Query, Mutation, Args, ID, Context } from '@nestjs/graphql';
import { UseGuards, ForbiddenException } from '@nestjs/common';
import { ApiKeyService } from './api-key.service';
import { ApiKeyType, GeneratedApiKey, ApiKeyDeleteResult } from './entities/api-key.entity';
import { CreateApiKeyInput, UpdateApiKeyInput } from './dto/api-key.input';
import { GqlAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GqlCurrentUser } from '../auth/decorators/current-user.decorator';
import { RolesGuard, Roles } from '../../common/guards/roles.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';

@Resolver()
@UseGuards(GqlAuthGuard, RolesGuard, TenantGuard)
@Roles('HOTEL_ADMIN')
export class ApiKeyResolver {
  constructor(private readonly apiKeyService: ApiKeyService) {}

  @Mutation(() => GeneratedApiKey, {
    name: 'generateApiKey',
    description: 'Generate a new API key for a hotel. Returns the full key once — store it securely.',
  })
  async generateApiKey(
    @Args('input') input: CreateApiKeyInput,
    @GqlCurrentUser() user: any,
    @Context() context: any,
  ): Promise<GeneratedApiKey> {
    if (!user?.hotelId || input.hotelId !== user.hotelId) {
      throw new ForbiddenException('You can only generate API keys for your own hotel');
    }

    const req = context?.req;
    const origin = String(req?.headers?.origin || req?.headers?.referer || '').toLowerCase();
    if (
      origin.includes('://hotel.local') ||
      origin.includes('://www.hotel.local')
    ) {
      throw new ForbiddenException(
        'API key creation is disabled on Hotel Manager admin. Please contact Hotel Manager team for custom website access.',
      );
    }

    return this.apiKeyService.generateKey(input, user.id);
  }

  @Query(() => [ApiKeyType], {
    name: 'myApiKeys',
    description: 'List all API keys for the authenticated hotel',
  })
  async listApiKeys(
    @Args('hotelId', { type: () => ID }) hotelId: string,
    @GqlCurrentUser() user: any,
  ): Promise<ApiKeyType[]> {
    if (!user?.hotelId || hotelId !== user.hotelId) {
      throw new ForbiddenException('You can only view API keys for your own hotel');
    }
    return this.apiKeyService.listKeys(user.hotelId);
  }

  @Mutation(() => ApiKeyType, {
    name: 'updateApiKey',
    description: 'Update an API key\'s name, permissions, rate limit, or allowed origins',
  })
  async updateApiKey(
    @Args('input') input: UpdateApiKeyInput,
    @GqlCurrentUser() user: any,
  ): Promise<ApiKeyType> {
    if (!user?.hotelId) {
      throw new ForbiddenException('User is not associated with any hotel');
    }
    return this.apiKeyService.updateKey(input, user.hotelId);
  }

  @Mutation(() => ApiKeyDeleteResult, {
    name: 'revokeApiKey',
    description: 'Deactivate an API key (reversible)',
  })
  async revokeApiKey(
    @Args('keyId', { type: () => ID }) keyId: string,
    @GqlCurrentUser() user: any,
  ): Promise<ApiKeyDeleteResult> {
    if (!user?.hotelId) {
      throw new ForbiddenException('User is not associated with any hotel');
    }
    return this.apiKeyService.revokeKey(keyId, user.hotelId);
  }

  @Mutation(() => ApiKeyDeleteResult, {
    name: 'deleteApiKey',
    description: 'Permanently delete an API key',
  })
  async deleteApiKey(
    @Args('keyId', { type: () => ID }) keyId: string,
    @GqlCurrentUser() user: any,
  ): Promise<ApiKeyDeleteResult> {
    if (!user?.hotelId) {
      throw new ForbiddenException('User is not associated with any hotel');
    }
    return this.apiKeyService.deleteKey(keyId, user.hotelId);
  }

  @Mutation(() => GeneratedApiKey, {
    name: 'rotateApiKey',
    description: 'Revoke an existing key and generate a new one with the same settings',
  })
  async rotateApiKey(
    @Args('keyId', { type: () => ID }) keyId: string,
    @GqlCurrentUser() user: any,
    @Context() context: any,
  ): Promise<GeneratedApiKey> {
    if (!user?.hotelId) {
      throw new ForbiddenException('User is not associated with any hotel');
    }

    const req = context?.req;
    const origin = String(req?.headers?.origin || req?.headers?.referer || '').toLowerCase();
    if (
      origin.includes('://hotel.local') ||
      origin.includes('://www.hotel.local')
    ) {
      throw new ForbiddenException(
        'API key rotation is disabled on Hotel Manager admin. Please contact Hotel Manager team for custom website access.',
      );
    }

    return this.apiKeyService.rotateKey(keyId, user.hotelId);
  }
}
