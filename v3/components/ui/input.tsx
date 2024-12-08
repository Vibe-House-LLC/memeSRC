import * as React from "react"

import { cn } from "@/lib/utils"

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  customSize?: 'small' | 'large';
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, customSize = 'small', ...props }, ref) => {
    const sizeClasses = customSize === 'large' 
      ? "h-12 px-4 py-3 text-lg"
      : "h-10 px-3 py-2 text-base"

    return (
      <input
        type={type}
        className={cn(
          `flex w-full rounded-md border border-input bg-background ring-offset-background placeholder:text-muted-foreground focus:outline-none transition-all duration-200 ease-in-out ${sizeClasses}`,
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
