"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { MapPin, Wifi, Car, Coffee, Star, Heart, Clock } from "lucide-react";
import { Card, CardImage } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StarRating } from "@/components/ui/star-rating";
import { Button } from "@/components/ui/button";
import { cn, formatCurrency } from "@/lib/utils";

export interface HotelCardProps {
  /** Hotel ID for linking */
  id: string;
  /** Hotel slug for URL */
  slug: string;
  /** Hotel name */
  name: string;
  /** Location (city, area) */
  location: string;
  /** Main image URL */
  image: string;
  /** Star rating (1-5) */
  rating: number;
  /** Number of reviews */
  reviewCount: number;
  /** Starting price per night/hour */
  price: number;
  /** Original price (for discounts) */
  originalPrice?: number;
  /** Whether hourly booking is available */
  hasHourlyBooking?: boolean;
  /** Hourly price if available */
  hourlyPrice?: number;
  /** Array of amenity icons to show */
  amenities?: string[];
  /** Featured/promoted hotel */
  isFeatured?: boolean;
  /** Limited availability warning */
  isLimitedAvailability?: boolean;
}

/**
 * HotelCard Component
 * 
 * Displays a hotel in a card format for search results and listings.
 * Features:
 * - Optimized image loading with blur placeholder
 * - Rating and review summary
 * - Price display with discount support
 * - Amenity icons
 * - Hover animations
 * - Wishlist button
 */
export function HotelCard({
  id,
  slug,
  name,
  location,
  image,
  rating,
  reviewCount,
  price,
  originalPrice,
  hasHourlyBooking,
  hourlyPrice,
  amenities = [],
  isFeatured,
  isLimitedAvailability,
}: HotelCardProps) {
  const [isWishlisted, setIsWishlisted] = React.useState(false);

  // Calculate discount percentage
  const discountPercent = originalPrice
    ? Math.round(((originalPrice - price) / originalPrice) * 100)
    : 0;

  // Amenity icon mapping
  const amenityIcons: Record<string, React.ReactNode> = {
    wifi: <Wifi size={14} />,
    parking: <Car size={14} />,
    breakfast: <Coffee size={14} />,
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4 }}
    >
      <Link href={`/hotels/${slug}`}>
        <Card hover className="group">
          {/* Image Section */}
          <CardImage aspect="hotel" className="relative">
            <Image
              src={image}
              alt={name}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />

            {/* Gradient overlay for text readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

            {/* Badges */}
            <div className="absolute top-3 left-3 flex flex-wrap gap-2">
              {isFeatured && (
                <Badge variant="premium" className="shadow-lg">
                  Featured
                </Badge>
              )}
              {discountPercent > 0 && (
                <Badge variant="destructive" className="shadow-lg">
                  {discountPercent}% OFF
                </Badge>
              )}
              {isLimitedAvailability && (
                <Badge variant="warning" className="shadow-lg">
                  Few Rooms Left
                </Badge>
              )}
            </div>

            {/* Wishlist Button */}
            <button
              onClick={(e) => {
                e.preventDefault();
                setIsWishlisted(!isWishlisted);
              }}
              className={cn(
                "absolute top-3 right-3 w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200",
                isWishlisted
                  ? "bg-white text-red-500"
                  : "bg-black/30 text-white hover:bg-white hover:text-gray-900"
              )}
              aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
            >
              <Heart
                size={18}
                className={cn(isWishlisted && "fill-current")}
              />
            </button>

            {/* Hourly Badge */}
            {hasHourlyBooking && (
              <div className="absolute bottom-3 left-3">
                <Badge className="bg-white/90 text-gray-900 backdrop-blur-sm">
                  <Clock size={12} className="mr-1" />
                  Hourly Available
                </Badge>
              </div>
            )}
          </CardImage>

          {/* Content Section */}
          <div className="p-4">
            {/* Location */}
            <div className="flex items-center gap-1 text-sm text-gray-500 mb-1">
              <MapPin size={14} />
              <span>{location}</span>
            </div>

            {/* Hotel Name */}
            <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-brand-600 transition-colors line-clamp-1">
              {name}
            </h3>

            {/* Rating */}
            <div className="flex items-center gap-2 mb-3">
              <StarRating rating={rating} size="sm" showValue />
              <span className="text-sm text-gray-500">
                ({reviewCount} reviews)
              </span>
            </div>

            {/* Amenities */}
            {amenities.length > 0 && (
              <div className="flex items-center gap-3 mb-4">
                {amenities.slice(0, 4).map((amenity) => (
                  <div
                    key={amenity}
                    className="flex items-center gap-1 text-gray-500 text-xs"
                    title={amenity}
                  >
                    {amenityIcons[amenity] || <span>•</span>}
                    <span className="capitalize">{amenity}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Price Section */}
            <div className="flex items-end justify-between pt-3 border-t border-gray-100">
              <div>
                <div className="flex items-baseline gap-2">
                  {originalPrice && (
                    <span className="text-sm text-gray-400 line-through">
                      {formatCurrency(originalPrice)}
                    </span>
                  )}
                  <span className="text-xl font-bold text-gray-900">
                    {formatCurrency(price)}
                  </span>
                </div>
                <span className="text-xs text-gray-500">per night</span>
                {hasHourlyBooking && hourlyPrice && (
                  <div className="text-xs text-brand-600 mt-0.5">
                    or {formatCurrency(hourlyPrice)}/hour
                  </div>
                )}
              </div>

              <Button
                size="sm"
                className="opacity-0 group-hover:opacity-100 transition-opacity"
              >
                View
              </Button>
            </div>
          </div>
        </Card>
      </Link>
    </motion.div>
  );
}

/**
 * HotelCardSkeleton - Loading placeholder
 */
export function HotelCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <CardImage aspect="hotel" className="skeleton" />
      <div className="p-4 space-y-3">
        <div className="skeleton h-4 w-24 rounded" />
        <div className="skeleton h-5 w-full rounded" />
        <div className="skeleton h-4 w-32 rounded" />
        <div className="flex gap-2">
          <div className="skeleton h-4 w-16 rounded" />
          <div className="skeleton h-4 w-16 rounded" />
        </div>
        <div className="pt-3 border-t border-gray-100 flex justify-between">
          <div className="skeleton h-6 w-20 rounded" />
          <div className="skeleton h-8 w-16 rounded" />
        </div>
      </div>
    </Card>
  );
}
