import { Module } from '@nestjs/common';
import { BlogService } from './blog.service';
import { BlogResolver } from './blog.resolver';

@Module({
  providers: [BlogService, BlogResolver],
  exports: [BlogService],
})
export class BlogModule {}
