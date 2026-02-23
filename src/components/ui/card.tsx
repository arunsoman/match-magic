import * as React from "react"
import { cn } from "@/lib/utils"
import { ShineBorder } from "./shine-border"

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { showShine?: boolean }
>(({ className, showShine = true, children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "group relative rounded-lg border bg-card text-card-foreground shadow-sm transition-all duration-300",
      className
    )}
    {...props}
  >
    {showShine && (
      <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-lg">
        <ShineBorder
          borderRadius={8}
          borderWidth={1}
          duration={8}
          color={["#A07CFE", "#FE8FB5", "#FFBE7B"]}
          className="absolute inset-0 size-full border-none bg-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        >
          <div className="invisible" />
        </ShineBorder>
      </div>
    )}
    {children}
  </div>
))
Card.displayName = "Card"

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "text-2xl font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
))
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
    {...props}
  />
))
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }
