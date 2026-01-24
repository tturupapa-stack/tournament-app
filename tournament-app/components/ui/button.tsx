import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-xs font-sans uppercase tracking-wider transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none border-2 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground border-primary shadow-[4px_4px_0px_rgba(0,0,0,0.5)] hover:shadow-[6px_6px_0px_rgba(0,0,0,0.6)] hover:translate-x-[-1px] hover:translate-y-[-1px]",
        destructive:
          "bg-destructive text-destructive-foreground border-destructive shadow-[4px_4px_0px_rgba(0,0,0,0.5)] hover:shadow-[6px_6px_0px_rgba(0,0,0,0.6)] hover:translate-x-[-1px] hover:translate-y-[-1px]",
        outline:
          "border-primary bg-transparent text-primary shadow-[4px_4px_0px_rgba(0,255,0,0.3)] hover:bg-primary/10 hover:shadow-[6px_6px_0px_rgba(0,255,0,0.4)] hover:translate-x-[-1px] hover:translate-y-[-1px]",
        secondary:
          "bg-secondary text-secondary-foreground border-secondary shadow-[4px_4px_0px_rgba(0,0,0,0.5)] hover:shadow-[6px_6px_0px_rgba(0,0,0,0.6)] hover:translate-x-[-1px] hover:translate-y-[-1px]",
        ghost:
          "border-transparent hover:bg-accent hover:text-accent-foreground shadow-none",
        link: "text-primary underline-offset-4 hover:underline border-transparent shadow-none",
      },
      size: {
        default: "h-10 px-6 py-2 has-[>svg]:px-4",
        sm: "h-8 px-4 has-[>svg]:px-3",
        lg: "h-12 px-8 has-[>svg]:px-6",
        icon: "size-10",
        "icon-sm": "size-8",
        "icon-lg": "size-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
