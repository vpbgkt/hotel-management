import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Card Component
 * 
 * A versatile card container with optional hover effects.
 * Used for room cards, hotel cards, and content sections.
 */
const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    /** Enable hover animation */
    hover?: boolean;
  }
>(({ className, hover = false, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden",
      hover && "transition-all duration-300 hover:shadow-lg hover:-translate-y-1",
      className
    )}
    {...props}
  />
));
Card.displayName = "Card";

/**
 * Card Header - Top section of card
 */
const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
));
CardHeader.displayName = "CardHeader";

/**
 * Card Title - Main heading in card header
 */
const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "text-xl font-semibold leading-none tracking-tight text-gray-900",
      className
    )}
    {...props}
  />
));
CardTitle.displayName = "CardTitle";

/**
 * Card Description - Subtitle/description in card header
 */
const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-gray-500", className)}
    {...props}
  />
));
CardDescription.displayName = "CardDescription";

/**
 * Card Content - Main body of the card
 */
const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
));
CardContent.displayName = "CardContent";

/**
 * Card Footer - Bottom section with actions
 */
const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
    {...props}
  />
));
CardFooter.displayName = "CardFooter";

/**
 * Card Image - Full-width image section
 * Used for room/hotel thumbnails
 */
const CardImage = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    /** Aspect ratio class */
    aspect?: "video" | "square" | "hotel" | "room";
  }
>(({ className, aspect = "hotel", ...props }, ref) => {
  const aspectClasses = {
    video: "aspect-video",
    square: "aspect-square",
    hotel: "aspect-[16/10]",
    room: "aspect-[4/3]",
  };

  return (
    <div
      ref={ref}
      className={cn(
        "relative overflow-hidden bg-gray-100",
        aspectClasses[aspect],
        className
      )}
      {...props}
    />
  );
});
CardImage.displayName = "CardImage";

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
  CardImage,
};
