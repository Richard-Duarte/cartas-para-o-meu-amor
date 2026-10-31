/**
 * Datas para quem usa o site: sempre dd/mm/aaaa (e hora HH:MM), no horário de Brasília.
 * Os valores internos continuam ISO ("aaaa-mm-dd"); só a exibição/digitação é brasileira.
 */
const TZ = "America/Sao_Paulo";

function parts(date: Date) {
  const p = new Intl.DateTimeFormat("pt-BR", {
    timeZone: TZ, day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(date);
  const get = (t: string) => p.find((x) => x.type === t)?.value ?? "";
  return { d: get("day"), m: get("month"), y: get("year"), h: get("hour"), min: get("minute") };
}

/** "31/10/2026" */
export function formatDateBr(date: Date | number | string) {
  const dt = new Date(date);
  if (Number.isNaN(dt.getTime())) return "";
  const { d, m, y } = parts(dt);
  return `${d}/${m}/${y}`;
}

/** "31/10/2026 às 18:00" */
export function formatDateTimeBr(date: Date | number | string, sep = " às ") {
  const dt = new Date(date);
  if (Number.isNaN(dt.getTime())) return "";
  const { d, m, y, h, min } = parts(dt);
  return `${d}/${m}/${y}${sep}${h}:${min}`;
}

/** "2026-10-31" → "31/10/2026" (vazio se inválido). */
export function isoDayToBr(iso: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || "");
  return m ? `${m[3]}/${m[2]}/${m[1]}` : "";
}

/** "31/10/2026" → "2026-10-31" (null se incompleto/inválido). */
export function brToIsoDay(br: string) {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec((br || "").trim());
  if (!m) return null;
  const [d, mo, y] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const dt = new Date(Date.UTC(y, mo - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return null;
  return `${m[3]}-${m[2]}-${m[1]}`;
}

/** Máscara enquanto digita: só números, vira "dd/mm/aaaa". */
export function maskDateBr(raw: string) {
  const v = raw.replace(/\D/g, "").slice(0, 8);
  if (v.length <= 2) return v;
  if (v.length <= 4) return `${v.slice(0, 2)}/${v.slice(2)}`;
  return `${v.slice(0, 2)}/${v.slice(2, 4)}/${v.slice(4)}`;
}
