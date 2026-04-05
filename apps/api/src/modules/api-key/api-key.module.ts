import { Module } from '@nestjs/common';
import { ApiKeyService } from './api-key.service';
import { ApiKeyResolver } from './api-key.resolver';
import { PrismaModule } from '../prisma/prisma.module';
import { TenantGuard } from '../../common/guards/tenant.guard';

@Module({
  imports: [PrismaModule],
  providers: [TenantGuard, ApiKeyService, ApiKeyResolver],
  exports: [ApiKeyService],
})
export class ApiKeyModule {}
