import { MESSENGERS } from "@/lib/messengers";

export function MessengerMarquee() {
  const row = [...MESSENGERS, ...MESSENGERS, ...MESSENGERS];
  return (
    <div className="marquee" aria-hidden="true">
      <div className="marquee-track">
        {row.map((m, i) => (
          <span key={`${m.id}-${i}`} className="marquee-item">
            {m.name}
            <i />
          </span>
        ))}
      </div>
    </div>
  );
}
