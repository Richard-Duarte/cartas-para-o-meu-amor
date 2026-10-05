"use client";

import { Link } from "@tanstack/react-router";
import { useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type Props = {
  to: "/escrever" | "/acompanhar" | "/acompanhar/$letterId";
  letterId?: string;
  children: ReactNode;
  className?: string;
  variant?: "rose" | "paper" | "ink";
};

export function MagneticButton({ to, letterId, children, className, variant = "rose" }: Props) {
  const ref = useRef<HTMLAnchorElement>(null);

  function onMove(e: React.MouseEvent<HTMLAnchorElement>) {
    const el = ref.current;
    if (!el || window.matchMedia("(pointer: coarse)").matches) return;
    const r = el.getBoundingClientRect();
    const x = e.clientX - (r.left + r.width / 2);
    const y = e.clientY - (r.top + r.height / 2);
    el.style.transform = `translate(${x * 0.22}px, ${y * 0.28}px)`;
  }

  function onLeave() {
    const el = ref.current;
    if (!el) return;
    el.style.transform = "translate(0, 0)";
  }

  const look =
    variant === "paper"
      ? "bg-paper text-ink"
      : variant === "ink"
        ? "bg-ink text-paper"
        : "bg-rose text-paper";

  const params = to === "/acompanhar/$letterId" ? { letterId: letterId ?? "demo" } : undefined;

  return (
    <Link
      ref={ref}
      to={to}
      params={params}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className={cn(
        "magnetic-btn inline-flex min-h-12 items-center justify-center rounded-full px-7 text-sm font-medium tracking-wide transition-transform duration-150 ease-out active:scale-[0.96]",
        look,
        className,
      )}
    >
      {children}
    </Link>
  );
}
