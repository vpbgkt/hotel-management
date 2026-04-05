import { ObjectType, Field, ID, registerEnumType, GraphQLISODateTime } from '@nestjs/graphql';

export enum PostStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
}

registerEnumType(PostStatus, {
  name: 'PostStatus',
  description: 'Status of a blog post',
});

@ObjectType({ description: 'Blog post author' })
export class BlogAuthor {
  @Field(() => ID)
  id: string;

  @Field()
  name: string;

  @Field({ nullable: true })
  avatarUrl?: string;
}

@ObjectType({ description: 'Blog post entity' })
export class BlogPost {
  @Field(() => ID)
  id: string;

  @Field({ nullable: true })
  hotelId?: string;

  @Field()
  title: string;

  @Field()
  slug: string;

  @Field({ nullable: true })
  excerpt?: string;

  @Field()
  content: string;

  @Field({ nullable: true })
  coverImage?: string;

  @Field()
  authorId: string;

  @Field({ nullable: true })
  category?: string;

  @Field(() => [String])
  tags: string[];

  @Field(() => PostStatus)
  status: PostStatus;

  @Field(() => GraphQLISODateTime, { nullable: true })
  publishedAt?: Date;

  @Field({ nullable: true })
  metaTitle?: string;

  @Field({ nullable: true })
  metaDescription?: string;

  @Field(() => GraphQLISODateTime)
  createdAt: Date;

  @Field(() => GraphQLISODateTime)
  updatedAt: Date;

  // Resolved
  @Field(() => BlogAuthor, { nullable: true })
  author?: BlogAuthor;
}

@ObjectType({ description: 'Paginated blog posts' })
export class PaginatedBlogPosts {
  @Field(() => [BlogPost])
  posts: BlogPost[];

  @Field()
  total: number;

  @Field()
  page: number;

  @Field()
  totalPages: number;
}
