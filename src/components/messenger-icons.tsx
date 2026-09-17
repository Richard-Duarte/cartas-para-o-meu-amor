import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

export function PomboIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 64 64" fill="none" aria-hidden {...props}>
      <path
        d="M12 36c4-10 14-16 24-14 6 1 11 4 14 8 2 3 4 8 2 12-3 6-10 8-16 7-3 6-9 10-16 9-2-8 0-14 3-18"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="44" cy="24" r="2.2" fill="currentColor" />
      <path
        d="M46 28c4 1 8 4 10 8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M20 40c6 2 14 2 20-1"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function CavaloIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 64 64" fill="none" aria-hidden {...props}>
      <path
        d="M18 50V34c0-8 4-14 12-18 3-2 7-3 10-2 4 1 7 4 8 8l4 12c1 4-1 8-5 9h-8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M28 18c2-6 7-10 14-10 3 0 6 1 8 3l2 6-6 2c-3 1-5 3-6 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M34 50v8M44 50v8M22 50v6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="46" cy="16" r="1.8" fill="currentColor" />
    </svg>
  );
}

export function JegueIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 64 64" fill="none" aria-hidden {...props}>
      <path
        d="M16 48V32c0-7 5-13 12-15 4-1 9 0 12 3 4 3 6 8 6 13v15"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M28 20c0-6 3-10 8-12 2 4 2 8 0 12"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M40 20c1-5 4-9 9-11 1 5 0 9-2 12"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M24 48v8M40 48v8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="42" cy="28" r="1.8" fill="currentColor" />
      <path
        d="M46 34c3 1 6 4 7 7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function InstantaneoIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 64 64" fill="none" aria-hidden {...props}>
      <path
        d="M34 8 18 34h12L26 56l22-30H36L34 8Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M44 14 48 10M50 22l6-2M14 24l-4-4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
