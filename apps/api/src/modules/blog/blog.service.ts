import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBlogPostInput, UpdateBlogPostInput } from './dto/blog.input';

@Injectable()
export class BlogService {
  private readonly logger = new Logger(BlogService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generate a URL-friendly slug from title
   */
  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 100)
      + '-' + Date.now().toString(36);
  }

  /**
   * Create a new blog post (admin only)
   */
  async createPost(input: CreateBlogPostInput, authorId: string) {
    const slug = input.slug || this.generateSlug(input.title);

    // Verify slug is unique
    const existing = await this.prisma.blogPost.findUnique({ where: { slug } });
    if (existing) {
      throw new BadRequestException('A post with this slug already exists');
    }

    const post = await this.prisma.blogPost.create({
      data: {
        title: input.title,
        slug,
        excerpt: input.excerpt,
        content: input.content,
        coverImage: input.coverImage,
        hotelId: input.hotelId || null,
        authorId,
        category: input.category,
        tags: input.tags || [],
        status: 'DRAFT',
        metaTitle: input.metaTitle || input.title,
        metaDescription: input.metaDescription || input.excerpt,
      },
    });

    this.logger.log(`Blog post created: ${post.id} - ${post.title}`);
    return post;
  }

  /**
   * Update a blog post
   */
  async updatePost(input: UpdateBlogPostInput, userId: string) {
    const post = await this.prisma.blogPost.findUnique({
      where: { id: input.id },
    });

    if (!post) {
      throw new NotFoundException('Blog post not found');
    }

    // If slug is changing, verify uniqueness
    if (input.slug && input.slug !== post.slug) {
      const existing = await this.prisma.blogPost.findUnique({
        where: { slug: input.slug },
      });
      if (existing) {
        throw new BadRequestException('A post with this slug already exists');
      }
    }

    const updated = await this.prisma.blogPost.update({
      where: { id: input.id },
      data: {
        ...(input.title !== undefined && { title: input.title }),
        ...(input.slug !== undefined && { slug: input.slug }),
        ...(input.excerpt !== undefined && { excerpt: input.excerpt }),
        ...(input.content !== undefined && { content: input.content }),
        ...(input.coverImage !== undefined && { coverImage: input.coverImage }),
        ...(input.category !== undefined && { category: input.category }),
        ...(input.tags !== undefined && { tags: input.tags }),
        ...(input.metaTitle !== undefined && { metaTitle: input.metaTitle }),
        ...(input.metaDescription !== undefined && { metaDescription: input.metaDescription }),
      },
    });

    this.logger.log(`Blog post updated: ${updated.id}`);
    return updated;
  }

  /**
   * Publish a blog post
   */
  async publishPost(id: string) {
    const post = await this.prisma.blogPost.findUnique({ where: { id } });
    if (!post) throw new NotFoundException('Blog post not found');

    return this.prisma.blogPost.update({
      where: { id },
      data: {
        status: 'PUBLISHED',
        publishedAt: new Date(),
      },
    });
  }

  /**
   * Archive a blog post
   */
  async archivePost(id: string) {
    const post = await this.prisma.blogPost.findUnique({ where: { id } });
    if (!post) throw new NotFoundException('Blog post not found');

    return this.prisma.blogPost.update({
      where: { id },
      data: { status: 'ARCHIVED' },
    });
  }

  /**
   * Delete a blog post
   */
  async deletePost(id: string) {
    const post = await this.prisma.blogPost.findUnique({ where: { id } });
    if (!post) throw new NotFoundException('Blog post not found');

    await this.prisma.blogPost.delete({ where: { id } });
    return true;
  }

  /**
   * Get published posts (public)
   */
  async getPublishedPosts(options: {
    hotelId?: string;
    category?: string;
    tag?: string;
    page?: number;
    limit?: number;
    search?: string;
  }) {
    const { hotelId, category, tag, page = 1, limit = 10, search } = options;

    const where: any = {
      status: 'PUBLISHED',
    };

    if (hotelId) where.hotelId = hotelId;
    if (category) where.category = category;
    if (tag) where.tags = { has: tag };
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { excerpt: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [posts, total] = await Promise.all([
      this.prisma.blogPost.findMany({
        where,
        orderBy: { publishedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.blogPost.count({ where }),
    ]);

    return {
      posts,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get post by slug (public)
   */
  async getPostBySlug(slug: string) {
    const post = await this.prisma.blogPost.findUnique({
      where: { slug },
    });

    if (!post || post.status !== 'PUBLISHED') {
      throw new NotFoundException('Blog post not found');
    }

    return post;
  }

  /**
   * Get all posts for admin (including drafts)
   */
  async getAdminPosts(options: {
    hotelId?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const { hotelId, status, page = 1, limit = 20 } = options;

    const where: any = {};
    if (hotelId) where.hotelId = hotelId;
    if (status) where.status = status;

    const [posts, total] = await Promise.all([
      this.prisma.blogPost.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.blogPost.count({ where }),
    ]);

    return {
      posts,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get post by ID (admin)
   */
  async getPostById(id: string) {
    const post = await this.prisma.blogPost.findUnique({ where: { id } });
    if (!post) throw new NotFoundException('Blog post not found');
    return post;
  }

  /**
   * Get all categories with counts
   */
  async getCategories(hotelId?: string) {
    const where: any = { status: 'PUBLISHED' };
    if (hotelId) where.hotelId = hotelId;

    const posts = await this.prisma.blogPost.findMany({
      where,
      select: { category: true },
    });

    const categoryCounts: Record<string, number> = {};
    for (const post of posts) {
      if (post.category) {
        categoryCounts[post.category] = (categoryCounts[post.category] || 0) + 1;
      }
    }

    return Object.entries(categoryCounts).map(([name, count]) => ({
      name,
      count,
    }));
  }

  /**
   * Get all unique tags
   */
  async getTags(hotelId?: string) {
    const where: any = { status: 'PUBLISHED' };
    if (hotelId) where.hotelId = hotelId;

    const posts = await this.prisma.blogPost.findMany({
      where,
      select: { tags: true },
    });

    const tagSet = new Set<string>();
    for (const post of posts) {
      post.tags.forEach(tag => tagSet.add(tag));
    }

    return Array.from(tagSet).sort();
  }
}
