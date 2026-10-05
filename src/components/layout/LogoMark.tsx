import { cn } from "@/lib/utils";

type Props = {
  className?: string;
};

export function LogoMark({ className }: Props) {
  return (
    <svg
      viewBox="0 0 80 72"
      fill="none"
      aria-hidden="true"
      className={cn("logo-mark shrink-0 text-ink", className)}
    >
      <path
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinejoin="round"
        d="M8 18.5h64v37.5a4 4 0 0 1-4 4H12a4 4 0 0 1-4-4V18.5z"
      />
      <path
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8 18.5 40 39.5 72 18.5"
      />
      <path
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        d="M12 56.5 27 46.5M68 56.5 53 46.5"
      />
      <circle
        className="logo-seal"
        cx="40"
        cy="42"
        r="14"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        opacity="0.35"
      />
      <path
        className="logo-heart"
        fill="var(--color-rose)"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
        d="M40 51.4c-.55 0-10.2-6.35-10.2-12.35 0-3.45 2.6-5.9 5.7-5.9 1.85 0 3.5.98 4.5 2.55 1-1.57 2.65-2.55 4.5-2.55 3.1 0 5.7 2.45 5.7 5.9 0 6-9.65 12.35-10.2 12.35z"
      />
    </svg>
  );
}
