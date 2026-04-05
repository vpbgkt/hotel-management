import * as React from "react";
import { Star, StarHalf } from "lucide-react";
import { cn } from "@/lib/utils";

export interface StarRatingProps {
  /** Rating value (0-5) */
  rating: number;
  /** Maximum stars */
  max?: number;
  /** Size of stars */
  size?: "sm" | "md" | "lg";
  /** Show numeric rating alongside stars */
  showValue?: boolean;
  /** Number of reviews (displayed in parentheses) */
  reviewCount?: number;
  /** Additional class names */
  className?: string;
}

/**
 * StarRating Component
 * 
 * Displays a star rating with support for half stars.
 * Used for hotel and room ratings.
 * 
 * @example
 * <StarRating rating={4.5} />
 * <StarRating rating={4.5} showValue reviewCount={243} />
 */
export function StarRating({
  rating,
  max = 5,
  size = "md",
  showValue = false,
  reviewCount,
  className,
}: StarRatingProps) {
  // Size configurations
  const sizes = {
    sm: { star: 14, text: "text-xs" },
    md: { star: 18, text: "text-sm" },
    lg: { star: 24, text: "text-base" },
  };

  const { star: starSize, text: textSize } = sizes[size];

  // Generate star array
  const stars = React.useMemo(() => {
    const result: ("full" | "half" | "empty")[] = [];
    for (let i = 1; i <= max; i++) {
      if (rating >= i) {
        result.push("full");
      } else if (rating >= i - 0.5) {
        result.push("half");
      } else {
        result.push("empty");
      }
    }
    return result;
  }, [rating, max]);

  return (
    <div className={cn("inline-flex items-center gap-1", className)}>
      {/* Stars */}
      <div className="flex items-center">
        {stars.map((type, index) => (
          <span key={index} className="relative">
            {type === "full" && (
              <Star
                size={starSize}
                className="fill-amber-400 text-amber-400"
              />
            )}
            {type === "half" && (
              <span className="relative">
                <Star
                  size={starSize}
                  className="text-gray-300"
                />
                <StarHalf
                  size={starSize}
                  className="absolute inset-0 fill-amber-400 text-amber-400"
                />
              </span>
            )}
            {type === "empty" && (
              <Star
                size={starSize}
                className="text-gray-300"
              />
            )}
          </span>
        ))}
      </div>

      {/* Numeric rating */}
      {showValue && (
        <span className={cn("font-semibold text-gray-900 ml-1", textSize)}>
          {rating.toFixed(1)}
        </span>
      )}

      {/* Review count */}
      {reviewCount !== undefined && (
        <span className={cn("text-gray-500 ml-0.5", textSize)}>
          ({reviewCount.toLocaleString()})
        </span>
      )}
    </div>
  );
}
