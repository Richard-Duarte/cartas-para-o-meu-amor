export type NoticeKind = "view" | "reply" | "phone" | "platform" | "update";

export type NoticeItem = {
  id: string;
  kind: NoticeKind;
  title: string;
  body: string;
  letterId: string | null;
  readAt: string | null;
  createdAt: string;
};

const LABELS: Record<NoticeKind, string> = {
  view: "Visualização",
  reply: "Resposta",
  phone: "Aviso",
  platform: "Aviso",
  update: "Atualização",
};

export function noticeKindLabel(kind: string) {
  return LABELS[kind as NoticeKind] ?? "Aviso";
}

/** Visualização e resposta abrem a carta. Aviso e atualização só marcam como lido. */
export function noticeLetterTarget(kind: string, letterId: string | null) {
  if (kind !== "view" && kind !== "reply") return null;
  if (!letterId) return null;
  return letterId;
}
