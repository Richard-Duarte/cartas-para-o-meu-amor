"use client";

import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const aiButtonVariants = cva(
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer rounded-full font-medium border border-transparent transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 disabled:cursor-default [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground hover:bg-primary-hover shadow-[var(--shadow-soft)]",
        destructive:
          "border-destructive/40 bg-transparent text-destructive hover:bg-destructive hover:text-destructive-foreground",
        outline:
          "border-foreground/15 bg-transparent text-foreground hover:border-foreground/30 hover:bg-foreground/5",
        "outline-white":
          "border-white/60 bg-transparent text-white hover:bg-white hover:text-foreground",
        ghost: "bg-accent/40 hover:bg-accent/70",
        transparent: "bg-transparent hover:bg-foreground/5",
      },
      size: {
        default: "h-10 px-5 text-sm",
        sm: "h-auto px-4 py-2 text-[13px]",
        lg: "min-h-[48px] px-7 py-3 text-sm",
        icon: "w-10 h-10 p-0",
        "icon-sm": "w-[30px] h-[30px] p-0",
        "icon-lg": "w-12 h-12 p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function AiButton({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof aiButtonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="ai-button"
      className={cn(aiButtonVariants({ variant, size, className }))}
      style={{ transitionTimingFunction: "var(--ease-romantic)" }}
      {...props}
    />
  );
}

export default AiButton;
export { AiButton, aiButtonVariants };
