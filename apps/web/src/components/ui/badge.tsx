import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Badge variants for different states and categories
 */
const badgeVariants = cva(
  // Base styles
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        // Default - brand blue
        default: "bg-brand-100 text-brand-700",
        // Secondary - gray
        secondary: "bg-gray-100 text-gray-700",
        // Success - green (confirmed bookings, available)
        success: "bg-green-100 text-green-700",
        // Warning - amber (pending, limited availability)
        warning: "bg-amber-100 text-amber-700",
        // Destructive - red (cancelled, sold out)
        destructive: "bg-red-100 text-red-700",
        // Outline - bordered
        outline: "border border-gray-300 text-gray-700 bg-white",
        // Premium - gradient for special offers
        premium: "bg-gradient-to-r from-amber-100 to-yellow-100 text-amber-800",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

/**
 * Badge Component
 * 
 * Used for status indicators, tags, and labels.
 * 
 * @example
 * <Badge>New</Badge>
 * <Badge variant="success">Confirmed</Badge>
 * <Badge variant="warning">Few Rooms Left</Badge>
 */
function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
