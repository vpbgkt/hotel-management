import { ObjectType, Field, ID, Int, GraphQLISODateTime } from '@nestjs/graphql';

@ObjectType()
export class ReviewGuest {
  @Field()
  name: string;

  @Field({ nullable: true })
  avatarUrl?: string;
}

@ObjectType()
export class ReviewStats {
  @Field()
  averageRating: number;

  @Field(() => Int)
  totalReviews: number;

  @Field(() => [Int])
  ratingDistribution: number[]; // [1-star count, 2-star count, ...]
}

@ObjectType({ description: 'Guest review entity' })
export class Review {
  @Field(() => ID)
  id: string;

  @Field()
  hotelId: string;

  @Field()
  bookingId: string;

  @Field()
  guestId: string;

  @Field(() => Int)
  rating: number;

  @Field({ nullable: true })
  title?: string;

  @Field({ nullable: true })
  comment?: string;

  @Field(() => [String])
  photos: string[];

  @Field({ nullable: true })
  hotelReply?: string;

  @Field()
  isVerified: boolean;

  @Field()
  isPublished: boolean;

  @Field(() => GraphQLISODateTime)
  createdAt: Date;

  @Field(() => GraphQLISODateTime)
  updatedAt: Date;

  // Resolved relations
  @Field(() => ReviewGuest, { nullable: true })
  guest?: ReviewGuest;
}
