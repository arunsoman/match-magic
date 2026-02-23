import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"
import { ShineBorder } from "./shine-border"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary-light shadow-soft transition-all duration-300",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-soft",
        outline:
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground shadow-soft",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 shadow-soft",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        hero: "bg-gradient-to-r from-primary to-primary-light text-primary-foreground hover:shadow-medium transform hover:scale-105 transition-all duration-300 font-semibold",
        success: "bg-success text-success-foreground hover:bg-success-light shadow-soft transition-all duration-300",
        warning: "bg-warning text-warning-foreground hover:bg-warning-light shadow-soft transition-all duration-300",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
  VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    const isSpecialVariant = variant === "hero" || variant === "default" || variant === "success"

    return (
      <div className="relative group overflow-hidden rounded-md">
        {isSpecialVariant && (
          <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500">
            <ShineBorder
              borderRadius={6}
              borderWidth={1}
              duration={6}
              color={["#ffffff", "#cbd5e1"]}
              className="absolute inset-0 size-full border-none bg-transparent"
            >
              <div className="invisible" />
            </ShineBorder>
          </div>
        )}
        <Comp
          className={cn(buttonVariants({ variant, size, className }))}
          ref={ref}
          {...props}
        />
      </div>
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
