import { formatDateTimeBr } from "@/lib/dates";
import type { Letter } from "@/lib/letters";

function when(ts: number) {
  return formatDateTimeBr(ts);
}

/**
 * Sinal "abriu pelo link" — mostrado SÓ para quem enviou. Quem enviou abrindo o próprio
 * link nunca conta (o servidor ignora; ver recordLinkView em lib/server/shop.ts).
 */
export function LinkViewBadge({ letter, compact = false }: { letter: Letter; compact?: boolean }) {
  const seen = letter.linkViewedAt;
  const who = letter.toName?.trim() || "Quem recebeu";
  if (compact) {
    return (
      <span className={seen ? "link-view-badge is-seen" : "link-view-badge"} data-testid="link-view-badge">
        {seen ? "👀 Visualizada pelo link" : "Ainda não abriram o link"}
      </span>
    );
  }
  return (
    <p className={seen ? "track-note link-view-badge is-seen" : "track-note link-view-badge"} role="status" data-testid="link-view-badge">
      {seen ? (
        <>
          👀 <strong>Sua carta foi vista pelo link</strong> em {when(seen)}
          {letter.linkViewCount && letter.linkViewCount > 1 ? ` · ${letter.linkViewCount} visitas` : ""}. Só você vê este aviso.
        </>
      ) : (
        <>Ainda ninguém abriu o link. Quando {who} abrir, você vê aqui (só você vê este aviso).</>
      )}
    </p>
  );
}
