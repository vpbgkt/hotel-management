import { Resolver, Query, Mutation, Args, ID, Int } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { BlogService } from './blog.service';
import { BlogPost, PaginatedBlogPosts, PostStatus } from './entities/blog.entity';
import { CreateBlogPostInput, UpdateBlogPostInput } from './dto/blog.input';
import { GqlAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GqlCurrentUser } from '../auth/decorators/current-user.decorator';

@Resolver(() => BlogPost)
export class BlogResolver {
  constructor(private readonly blogService: BlogService) {}

  // ========== Public Queries ==========

  @Query(() => PaginatedBlogPosts, {
    name: 'blogPosts',
    description: 'Get published blog posts with pagination',
  })
  async getPublishedPosts(
    @Args('hotelId', { type: () => ID, nullable: true }) hotelId?: string,
    @Args('category', { nullable: true }) category?: string,
    @Args('tag', { nullable: true }) tag?: string,
    @Args('search', { nullable: true }) search?: string,
    @Args('page', { type: () => Int, nullable: true, defaultValue: 1 }) page?: number,
    @Args('limit', { type: () => Int, nullable: true, defaultValue: 10 }) limit?: number,
  ) {
    return this.blogService.getPublishedPosts({
      hotelId,
      category,
      tag,
      search,
      page,
      limit,
    });
  }

  @Query(() => BlogPost, {
    name: 'blogPostBySlug',
    description: 'Get a published blog post by slug',
  })
  async getPostBySlug(
    @Args('slug') slug: string,
  ) {
    return this.blogService.getPostBySlug(slug);
  }

  @Query(() => [String], {
    name: 'blogCategories',
    description: 'Get blog categories',
  })
  async getCategories(
    @Args('hotelId', { type: () => ID, nullable: true }) hotelId?: string,
  ) {
    const categories = await this.blogService.getCategories(hotelId);
    return categories.map(c => c.name);
  }

  @Query(() => [String], {
    name: 'blogTags',
    description: 'Get all blog tags',
  })
  async getTags(
    @Args('hotelId', { type: () => ID, nullable: true }) hotelId?: string,
  ) {
    return this.blogService.getTags(hotelId);
  }

  // ========== Admin Queries ==========

  @Query(() => PaginatedBlogPosts, {
    name: 'adminBlogPosts',
    description: 'Get all blog posts for admin (including drafts)',
  })
  @UseGuards(GqlAuthGuard)
  async getAdminPosts(
    @Args('hotelId', { type: () => ID, nullable: true }) hotelId?: string,
    @Args('status', { nullable: true }) status?: string,
    @Args('page', { type: () => Int, nullable: true, defaultValue: 1 }) page?: number,
    @Args('limit', { type: () => Int, nullable: true, defaultValue: 20 }) limit?: number,
  ) {
    return this.blogService.getAdminPosts({ hotelId, status, page, limit });
  }

  @Query(() => BlogPost, {
    name: 'adminBlogPost',
    description: 'Get a blog post by ID for admin',
  })
  @UseGuards(GqlAuthGuard)
  async getAdminPost(
    @Args('id', { type: () => ID }) id: string,
  ) {
    return this.blogService.getPostById(id);
  }

  // ========== Admin Mutations ==========

  @Mutation(() => BlogPost, {
    name: 'createBlogPost',
    description: 'Create a new blog post',
  })
  @UseGuards(GqlAuthGuard)
  async createPost(
    @Args('input') input: CreateBlogPostInput,
    @GqlCurrentUser() user: any,
  ) {
    return this.blogService.createPost(input, user.id);
  }

  @Mutation(() => BlogPost, {
    name: 'updateBlogPost',
    description: 'Update a blog post',
  })
  @UseGuards(GqlAuthGuard)
  async updatePost(
    @Args('input') input: UpdateBlogPostInput,
    @GqlCurrentUser() user: any,
  ) {
    return this.blogService.updatePost(input, user.id);
  }

  @Mutation(() => BlogPost, {
    name: 'publishBlogPost',
    description: 'Publish a blog post',
  })
  @UseGuards(GqlAuthGuard)
  async publishPost(
    @Args('id', { type: () => ID }) id: string,
  ) {
    return this.blogService.publishPost(id);
  }

  @Mutation(() => BlogPost, {
    name: 'archiveBlogPost',
    description: 'Archive a blog post',
  })
  @UseGuards(GqlAuthGuard)
  async archivePost(
    @Args('id', { type: () => ID }) id: string,
  ) {
    return this.blogService.archivePost(id);
  }

  @Mutation(() => Boolean, {
    name: 'deleteBlogPost',
    description: 'Delete a blog post permanently',
  })
  @UseGuards(GqlAuthGuard)
  async deletePost(
    @Args('id', { type: () => ID }) id: string,
  ) {
    return this.blogService.deletePost(id);
  }
}
