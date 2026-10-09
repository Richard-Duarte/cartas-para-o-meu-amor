import { getSql } from "@/lib/db";
import {
  anonymousLinkCopy,
  arrivingCopy,
  cleanEmail,
  formatArrival,
  whatsAppNumber,
} from "@/lib/delivery";
import { addressLine, type Address } from "@/lib/address";
import { getMessenger } from "@/lib/messengers";
import { env } from "@/lib/env.server";

export type NoticeState = "instant" | "queued" | "sent" | "unconfigured";

type SendResult = { ok: boolean; reason?: "unconfigured" | "invalid" | "failed" };

export function safeOrigin(raw?: string) {
  const fallback = (env("BETTER_AUTH_URL") || "http://127.0.0.1:8080").replace(/\/$/, "");
  if (!raw) return fallback;
  try {
    const url = new URL(raw);
    if (url.protocol !== "http:" && url.protocol !== "https:") return fallback;
    return url.origin;
  } catch {
    return fallback;
  }
}

export async function sendWhatsApp(number: string, text: string): Promise<SendResult> {
  const base = env("EVOLUTION_API_URL");
  const key = env("EVOLUTION_API_KEY");
  const instance = env("EVOLUTION_INSTANCE");
  const phone = whatsAppNumber(number);
  if (!phone) return { ok: false, reason: "invalid" };
  if (!base || !key || !instance) return { ok: false, reason: "unconfigured" };
  try {
    const res = await fetch(`${base.replace(/\/$/, "")}/message/sendText/${encodeURIComponent(instance)}`, {
      method: "POST",
      headers: { "content-type": "application/json", apikey: key },
      body: JSON.stringify({ number: phone, text }),
      signal: AbortSignal.timeout(8000),
    });
    return res.ok ? { ok: true } : { ok: false, reason: "failed" };
  } catch {
    return { ok: false, reason: "failed" };
  }
}

export async function sendEmail(to: string, subject: string, text: string): Promise<SendResult> {
  const key = env("RESEND_API_KEY");
  const from = env("MAIL_FROM");
  const email = cleanEmail(to);
  if (!email) return { ok: false, reason: "invalid" };
  if (!key || !from) return { ok: false, reason: "unconfigured" };
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        authorization: `Bearer ${key}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ from, to: [email], subject, text }),
      signal: AbortSignal.timeout(8000),
    });
    return res.ok ? { ok: true } : { ok: false, reason: "failed" };
  } catch {
    return { ok: false, reason: "failed" };
  }
}

type NoticeRow = {
  id: string;
  from_name: string;
  to_name: string;
  messenger_id: string;
  to_address_json: string;
  anonymous: boolean;
  recipient_phone: string | null;
  recipient_email: string | null;
  sender_phone: string | null;
  sender_email: string | null;
  share_origin: string | null;
  arrive_at: string | null;
};

function placeOf(raw: string) {
  try {
    const address = JSON.parse(raw) as Address;
    return address.city ? addressLine(address) : "";
  } catch {
    return "";
  }
}

async function notifyArriving(row: NoticeRow): Promise<NoticeState> {
  const when = row.arrive_at ? formatArrival(new Date(row.arrive_at)) : "em breve";
  const origin = safeOrigin(row.share_origin ?? undefined);
  const url = `${origin}/acompanhar/${row.id}`;
  const messenger = getMessenger(row.messenger_id).name;
  const place = placeOf(row.to_address_json);
  const base = {
    fromName: row.from_name,
    toName: row.to_name,
    messenger,
    when,
    place,
    url,
    anonymous: row.anonymous,
  };
  const sender = arrivingCopy({ ...base, role: "sender" });
  const recipient = arrivingCopy({ ...base, role: "recipient" });
  const results = await Promise.all([
    row.sender_email ? sendEmail(row.sender_email, sender.subject, sender.text) : Promise.resolve(null),
    row.sender_phone ? sendWhatsApp(row.sender_phone, sender.text) : Promise.resolve(null),
    row.recipient_email
      ? sendEmail(row.recipient_email, recipient.subject, recipient.text)
      : Promise.resolve(null),
    row.recipient_phone ? sendWhatsApp(row.recipient_phone, recipient.text) : Promise.resolve(null),
  ]);
  const tried = results.filter((r): r is SendResult => r !== null);
  if (!tried.length || tried.every((r) => r.reason === "unconfigured" || r.reason === "invalid")) {
    return "unconfigured";
  }
  return tried.some((r) => r.ok) ? "sent" : "queued";
}

export async function sendAnonymousLink(opts: {
  id: string;
  toName: string;
  phone: string;
  origin: string;
  when: string;
  instant: boolean;
}) {
  const text = anonymousLinkCopy({
    toName: opts.toName,
    when: opts.when,
    url: `${opts.origin}/acompanhar/${opts.id}`,
    instant: opts.instant,
  });
  return sendWhatsApp(opts.phone, text);
}

export async function dispatchDueNotices() {
  const sql = await getSql();
  await sql`alter table letters add column if not exists notice_at timestamptz`;
  await sql`alter table letters add column if not exists notice_sent_at timestamptz`;
  await sql`alter table letters add column if not exists notice_error text`;
  const due = await sql<{ id: string }>`
    select id from letters
    where notice_at is not null and notice_sent_at is null and notice_at <= now()
    order by notice_at
    limit 3
  `;
  const states: NoticeState[] = [];
  for (const item of due) states.push(await dispatchLetterNotice(item.id));
  return states;
}

export async function dispatchLetterNotice(id: string): Promise<NoticeState> {
  const sql = await getSql();
  const rows = await sql<NoticeRow>`
    select id, from_name, to_name, messenger_id, to_address_json, anonymous,
      recipient_phone, recipient_email, sender_phone, sender_email, share_origin,
      arrive_at::text
    from letters where id = ${id} limit 1
  `;
  const row = rows[0];
  if (!row) return "queued";
  const state = await notifyArriving(row);
  if (state === "sent") {
    await sql`update letters set notice_sent_at = now(), notice_error = null where id = ${id}`;
  } else if (state === "queued") {
    await sql`
      update letters
      set notice_at = now() + interval '1 hour', notice_error = 'falhou'
      where id = ${id}
    `;
  }
  return state;
}
