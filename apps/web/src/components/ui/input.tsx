import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Show error styling */
  error?: boolean;
  /** Icon to show on the left side */
  leftIcon?: React.ReactNode;
  /** Icon to show on the right side */
  rightIcon?: React.ReactNode;
}

/**
 * Input Component
 * 
 * A styled text input with support for icons and error states.
 * Mobile-optimized with large touch targets and clear focus states.
 * 
 * @example
 * // Basic input
 * <Input placeholder="Enter your email" />
 * 
 * // With left icon
 * <Input leftIcon={<MailIcon />} placeholder="Email" />
 * 
 * // Error state
 * <Input error placeholder="Invalid input" />
 */
const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, leftIcon, rightIcon, ...props }, ref) => {
    return (
      <div className="relative w-full">
        {/* Left icon */}
        {leftIcon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
            {leftIcon}
          </div>
        )}

        <input
          type={type}
          className={cn(
            // Base styles
            `flex h-11 w-full rounded-lg border bg-white px-4 py-2.5
            text-base text-gray-900 placeholder:text-gray-400
            transition-all duration-200
            file:border-0 file:bg-transparent file:text-sm file:font-medium
            focus:outline-none focus:ring-2 focus:ring-offset-0`,
            // Default border
            "border-gray-300 focus:border-brand-500 focus:ring-brand-500/20",
            // Error state
            error && "border-error-500 focus:border-error-500 focus:ring-error-500/20",
            // Disabled state
            "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-gray-50",
            // Padding adjustments for icons
            leftIcon && "pl-10",
            rightIcon && "pr-10",
            // Mobile optimization - larger text on mobile
            "text-base md:text-sm",
            className
          )}
          ref={ref}
          {...props}
        />

        {/* Right icon */}
        {rightIcon && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
            {rightIcon}
          </div>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";

export { Input };
