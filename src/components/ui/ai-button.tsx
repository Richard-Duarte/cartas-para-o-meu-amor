"use client";

import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const branded = "rounded-full text-sm font-bold uppercase";

const aiButtonVariants = cva(
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer rounded-full font-bold border border-transparent transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 disabled:cursor-default [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: `${branded} border-2 border-foreground bg-primary text-foreground hover:bg-primary-hover`,
        destructive: `${branded} border-2 border-destructive bg-transparent text-destructive hover:bg-destructive hover:text-destructive-foreground`,
        outline: `${branded} border-2 border-foreground bg-transparent text-foreground hover:bg-foreground hover:text-background`,
        "outline-white": `${branded} border-2 border-white bg-transparent text-white hover:bg-white hover:text-foreground`,
        ghost: "bg-accent/20 hover:bg-accent/30",
        transparent: "bg-transparent hover:bg-accent/10",
      },
      size: {
        default: "h-9 px-4 text-sm",
        sm: "h-auto px-3 py-1.5 text-[13px]",
        lg: "min-h-[44px] px-6 py-3 text-sm",
        icon: "w-9 h-9 p-0",
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
      {...props}
    />
  );
}

export default AiButton;
export { AiButton, aiButtonVariants };
