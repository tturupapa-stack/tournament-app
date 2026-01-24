import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center justify-center border-2 px-3 py-1 text-[10px] font-sans uppercase tracking-wider w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none transition-all overflow-hidden shadow-[2px_2px_0px_rgba(0,0,0,0.5)]",
  {
    variants: {
      variant: {
        default:
          "border-primary bg-primary text-primary-foreground [a&]:hover:shadow-[3px_3px_0px_rgba(0,0,0,0.6)]",
        secondary:
          "border-secondary bg-secondary text-secondary-foreground [a&]:hover:shadow-[3px_3px_0px_rgba(0,0,0,0.6)]",
        destructive:
          "border-destructive bg-destructive text-destructive-foreground [a&]:hover:shadow-[3px_3px_0px_rgba(0,0,0,0.6)]",
        outline:
          "text-foreground border-foreground bg-transparent [a&]:hover:bg-foreground/10",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span"

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
