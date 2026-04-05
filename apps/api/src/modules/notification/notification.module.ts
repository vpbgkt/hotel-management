import { Module, Global } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { PushNotificationService } from './push.service';
import { SmsService } from './sms.service';
import { InboxService } from './inbox.service';
import { InboxResolver } from './inbox.resolver';
import { PushController } from './push.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Global()
@Module({
  imports: [PrismaModule],
  controllers: [PushController],
  providers: [NotificationService, PushNotificationService, SmsService, InboxService, InboxResolver],
  exports: [NotificationService, PushNotificationService, SmsService, InboxService],
})
export class NotificationModule {}
