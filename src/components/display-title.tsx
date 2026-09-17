import { cn } from "@/lib/utils";

type DisplayTitleProps = {
  as?: "h1" | "h2" | "h3" | "p" | "span";
  children: React.ReactNode;
  className?: string;
};

export function DisplayTitle({
  as: Tag = "h1",
  children,
  className,
}: DisplayTitleProps) {
  return (
    <Tag
      className={cn(
        "font-display font-medium tracking-[0.18em] text-ink uppercase",
        className
      )}
    >
      {children}
    </Tag>
  );
}
