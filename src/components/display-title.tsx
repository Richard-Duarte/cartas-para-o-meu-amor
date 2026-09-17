import { cn } from "@/lib/utils";

type DisplayTitleProps = {
  as?: "h1" | "h2" | "h3" | "p" | "span";
  children: React.ReactNode;
  className?: string;
  /**
   * Studio Think serif is TIGHT by default (negative tracking).
   * Use "wide" only for rare Ocha-style kickers — not hero titles.
   */
  tracking?: "tight" | "normal" | "wide";
  weight?: "medium" | "semibold" | "bold";
  uppercase?: boolean;
};

const trackingMap = {
  tight: "tracking-[-0.02em]",
  normal: "tracking-[-0.01em]",
  wide: "tracking-[0.18em]",
} as const;

const weightMap = {
  medium: "font-medium",
  semibold: "font-semibold",
  bold: "font-bold",
} as const;

export function DisplayTitle({
  as: Tag = "h1",
  children,
  className,
  tracking = "tight",
  weight = "semibold",
  uppercase = false,
}: DisplayTitleProps) {
  return (
    <Tag
      className={cn(
        "font-display text-ink",
        trackingMap[tracking],
        weightMap[weight],
        uppercase && "uppercase",
        className
      )}
    >
      {children}
    </Tag>
  );
}
