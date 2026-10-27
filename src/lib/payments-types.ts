/** Tipos do pagamento compartilhados entre navegador e servidor (sem nada de servidor). */
export type PaidResult = {
  status: "approved";
  letterId: string;
  paymentId: string;
  amountBrl: number;
  method: string;
  linkSent: boolean;
  notice: "instant" | "queued" | "sent" | "unconfigured";
  toName: string;
  departAt: number;
  arriveAt: number;
};

export type StartResult =
  | PaidResult
  | { status: "pending"; intentId: string; qrCode?: string; qrCodeBase64?: string; ticketUrl?: string; expiresAt?: string }
  | { status: "rejected"; intentId: string; detail?: string };
