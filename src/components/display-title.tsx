import { cn } from "@/lib/utils";

type DisplayTitleProps = {
  as?: "h1" | "h2" | "h3" | "p" | "span";
  children: React.ReactNode;
  className?: string;
  /** Ocha-wide tracking: snug | display (default) | wide */
  tracking?: "snug" | "display" | "wide";
  weight?: "medium" | "semibold" | "bold";
};

const trackingMap = {
  snug: "tracking-[0.18em]",
  display: "tracking-[0.26em]",
  wide: "tracking-[0.34em]",
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
  tracking = "display",
  weight = "semibold",
}: DisplayTitleProps) {
  return (
    <Tag
      className={cn(
        "font-display text-ink uppercase",
        trackingMap[tracking],
        weightMap[weight],
        className
      )}
    >
      {children}
    </Tag>
  );
}
