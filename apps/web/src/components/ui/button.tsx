import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Button component variants using class-variance-authority
 * Provides consistent styling across the application
 */
const buttonVariants = cva(
  // Base styles applied to all buttons
  `inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg 
   text-sm font-medium transition-all duration-200 
   focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 
   disabled:pointer-events-none disabled:opacity-50
   active:scale-[0.98]
   [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0`,
  {
    variants: {
      // Visual style variants
      variant: {
        // Primary blue - main CTAs
        default:
          "bg-primary text-white shadow-sm hover:bg-primary-700 focus-visible:ring-primary",
        // Destructive red - delete actions
        destructive:
          "bg-error-500 text-white shadow-sm hover:bg-error-600 focus-visible:ring-error-500",
        // Outlined - secondary actions
        outline:
          "border-2 border-gray-300 bg-white text-gray-700 hover:border-primary hover:text-primary hover:bg-primary/10",
        // Subtle background - tertiary actions
        secondary:
          "bg-gray-100 text-gray-900 hover:bg-gray-200 focus-visible:ring-gray-500",
        // No background - minimal actions
        ghost:
          "text-gray-600 hover:bg-gray-100 hover:text-gray-900",
        // Text only - inline links
        link:
          "text-brand-600 underline-offset-4 hover:underline",
        // Accent orange - high-emphasis CTAs
        accent:
          "bg-accent-500 text-white shadow-sm hover:bg-accent-600 focus-visible:ring-accent-500",
      },
      // Size variants
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-12 rounded-lg px-6 text-base",
        xl: "h-14 rounded-xl px-8 text-lg",
        icon: "h-10 w-10",
        "icon-sm": "h-8 w-8",
        "icon-lg": "h-12 w-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /**
   * If true, the button will render as a Radix Slot,
   * allowing you to pass a custom element (like a Link)
   */
  asChild?: boolean;
  /**
   * Loading state - shows spinner and disables button
   */
  isLoading?: boolean;
}

/**
 * Button Component
 * 
 * A flexible button component with multiple variants and sizes.
 * Supports loading state, icons, and can render as any element using asChild.
 * 
 * @example
 * // Primary button (default)
 * <Button>Book Now</Button>
 * 
 * // Outlined secondary button
 * <Button variant="outline" size="lg">View Details</Button>
 * 
 * // Loading state
 * <Button isLoading>Processing...</Button>
 * 
 * // As a link
 * <Button asChild>
 *   <Link href="/rooms">See All Rooms</Link>
 * </Button>
 */
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant, size, asChild = false, isLoading, children, disabled, ...props },
    ref
  ) => {
    // When asChild is true, we must pass only the child element to Slot
    // The Slot component expects exactly ONE child
    if (asChild) {
      return (
        <Slot
          className={cn(buttonVariants({ variant, size, className }))}
          ref={ref}
          {...props}
        >
          {children}
        </Slot>
      );
    }

    // Regular button rendering with loading state support
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && (
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
