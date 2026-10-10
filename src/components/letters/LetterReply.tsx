"use client";

import { useEffect, useState } from "react";
import { listLetterReplies, postLetterReply } from "@/lib/server/notifications";

type Reply = {
  id: string;
  body: string;
  photo: string | null;
  createdAt: string;
  mine: boolean;
};

async function fileToJpeg(file: File) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("foto"));
      el.src = url;
    });
    const max = 960;
    const scale = Math.min(1, max / Math.max(img.width, img.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(img.width * scale));
    canvas.height = Math.max(1, Math.round(img.height * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("foto");
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    let quality = 0.72;
    let data = canvas.toDataURL("image/jpeg", quality);
    if (data.length > 850_000) data = canvas.toDataURL("image/jpeg", 0.5);
    if (data.length > 900_000) throw new Error("grande");
    return data;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function LetterReply({
  letterId,
  canWrite,
}: {
  letterId: string;
  canWrite: boolean;
}) {
  const [replies, setReplies] = useState<Reply[]>([]);
  const [allowed, setAllowed] = useState(canWrite);
  const [body, setBody] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let stop = false;
    void listLetterReplies({ data: letterId })
      .then((res) => {
        if (stop) return;
        setReplies(res.replies);
        setAllowed(res.canReply);
      })
      .catch(() => undefined);
    return () => {
      stop = true;
    };
  }, [letterId]);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setError("");
    try {
      setPhoto(await fileToJpeg(file));
    } catch {
      setError("Essa foto é grande demais. Tente outra.");
    }
  }

  async function send() {
    setError("");
    setBusy(true);
    const result = await postLetterReply({
      data: { letterId, body, photo: photo ?? undefined },
    }).catch(() => ({ ok: false as const, error: "Não foi possível enviar." }));
    setBusy(false);
    if (!result.ok) {
      setError(result.error ?? "Não foi possível enviar.");
      return;
    }
    setReplies((current) => [
      ...current,
      {
        id: result.id,
        body: body.trim(),
        photo,
        createdAt: new Date().toISOString(),
        mine: true,
      },
    ]);
    setBody("");
    setPhoto(null);
    window.dispatchEvent(new Event("cartas:notices"));
  }

  const showForm = canWrite && allowed;
  if (!showForm && replies.length === 0) return null;

  return (
    <section className="letter-reply">
      {replies.length > 0 ? (
        <ul className="letter-reply-list">
          {replies.map((reply) => (
            <li key={reply.id}>
              <p className="cart-kicker">{reply.mine ? "Você" : "Resposta"}</p>
              {reply.body ? <p>{reply.body}</p> : null}
              {reply.photo ? <img src={reply.photo} alt="" /> : null}
            </li>
          ))}
        </ul>
      ) : null}
      {showForm ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void send();
          }}
        >
          <h2>Deixe um comentário</h2>
          <p className="text-sm text-muted">Quem enviou recebe o aviso aqui na plataforma.</p>
          <textarea
            value={body}
            maxLength={800}
            rows={4}
            placeholder="Escreva o que sentiu ao ler."
            onChange={(event) => setBody(event.target.value)}
          />
          {photo ? (
            <figure className="letter-reply-preview">
              <img src={photo} alt="" />
              <button type="button" onClick={() => setPhoto(null)}>
                Remover
              </button>
            </figure>
          ) : null}
          <div className="letter-reply-tools">
            <label>
              Anexar foto
              <input
                type="file"
                accept="image/*"
                hidden
                onChange={(event) => {
                  void onFile(event.target.files?.[0]);
                  event.target.value = "";
                }}
              />
            </label>
            <label>
              Tirar foto
              <input
                type="file"
                accept="image/*"
                capture="environment"
                hidden
                onChange={(event) => {
                  void onFile(event.target.files?.[0]);
                  event.target.value = "";
                }}
              />
            </label>
          </div>
          {error ? <p className="text-sm text-rose">{error}</p> : null}
          <button type="submit" className="pay-submit" disabled={busy}>
            {busy ? "Enviando…" : "Enviar comentário"}
          </button>
        </form>
      ) : null}
    </section>
  );
}
