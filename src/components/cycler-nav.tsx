import { cn } from "@/lib/utils";

const PauseIcon = () => (
  <svg width="8" height="12" className="pause" viewBox="0 0 8 12" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M0.895149 12C0.594679 12 0.369327 11.9157 0.219092 11.7471C0.0730308 11.5785 0 11.3255 0 10.9883V1.00468C0 0.672131 0.0751174 0.421546 0.225352 0.252927C0.375587 0.0843091 0.598852 0 0.895149 0H2.3662C2.65832 0 2.8795 0.0819672 3.02973 0.245902C3.18414 0.409836 3.26135 0.662763 3.26135 1.00468V10.9883C3.26135 11.3255 3.18414 11.5785 3.02973 11.7471C2.8795 11.9157 2.65832 12 2.3662 12H0.895149ZM5.64006 12C5.33959 12 5.11424 11.9157 4.96401 11.7471C4.81377 11.5785 4.73865 11.3255 4.73865 10.9883V1.00468C4.73865 0.672131 4.81377 0.421546 4.96401 0.252927C5.11424 0.0843091 5.33959 0 5.64006 0H7.09859C7.39906 0 7.62441 0.0819672 7.77465 0.245902C7.92488 0.409836 8 0.662763 8 1.00468V10.9883C8 11.3255 7.92488 11.5785 7.77465 11.7471C7.62441 11.9157 7.39906 12 7.09859 12H5.64006Z" fill="currentColor" />
  </svg>
);

const PlayIcon = () => (
  <svg width="10" height="11" className="play" viewBox="0 0 10 11" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M0 9.96835V1.03165C0 0.681435 0.0904393 0.421941 0.271318 0.253165C0.452196 0.0843882 0.667528 0 0.917313 0C1.14126 0 1.3652 0.0611814 1.58915 0.183544L9.21835 4.55063C9.49397 4.70675 9.69208 4.85443 9.81266 4.99367C9.93755 5.13291 10 5.30169 10 5.5C10 5.69409 9.93755 5.86287 9.81266 6.00633C9.69208 6.14557 9.49397 6.29325 9.21835 6.44937L1.58915 10.8165C1.3652 10.9388 1.14126 11 0.917313 11C0.667528 11 0.452196 10.9135 0.271318 10.7405C0.0904393 10.5717 0 10.3143 0 9.96835Z" fill="currentColor" />
  </svg>
);

export type CyclerItem = { id: string; label: React.ReactNode };

interface CyclerNavProps {
  items: CyclerItem[];
  active: number;
  progress: number;
  paused: boolean;
  onSelect: (idx: number) => void;
  onTogglePause: () => void;
  variant?: "dark" | "light";
}

export const CyclerNav = ({
  items,
  active,
  progress,
  paused,
  onSelect,
  onTogglePause,
  variant = "dark",
}: CyclerNavProps) => (
  <div className={cn("cycler-tabs-nav", variant === "light" && "light")}>
    {items.map((item, idx) => {
      const isActive = idx === active;
      return (
        <button
          key={item.id}
          type="button"
          className={isActive ? "active" : ""}
          onClick={() => onSelect(idx)}
          aria-current={isActive ? "true" : undefined}
        >
          <span>{item.label}</span>
          <div
            className="timer"
            style={{ width: isActive ? `${progress * 100}%` : "0%" }}
          />
        </button>
      );
    })}
    <button
      type="button"
      className={cn("toggle-autoplay", !paused && "playing")}
      onClick={onTogglePause}
      aria-label={paused ? "Play autoplay" : "Pause autoplay"}
    >
      <PauseIcon />
      <PlayIcon />
    </button>
  </div>
);
