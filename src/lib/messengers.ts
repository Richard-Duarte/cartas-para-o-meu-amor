export type MessengerId =
  | "pombo"
  | "cavalo"
  | "tartaruga"
  | "cegonha"
  | "ganso"
  | "aviao";

export type Messenger = {
  id: MessengerId;
  name: string;
  note: string;
  personality: string;
  time: string;
  price: string;
  accent: string;
  accentSoft: string;
  image: string;
};

export const MESSENGERS: Messenger[] = [
  {
    id: "pombo",
    name: "Pombo",
    note: "asas clássicas",
    personality:
      "O mensageiro eterno. Leva sua carta com elegância e um laço rosa no envelope.",
    time: "2–3 dias",
    price: "R$ 12",
    accent: "#E8A0B0",
    accentSoft: "rgba(232, 160, 176, 0.25)",
    image: "/messengers/pombo.jpg",
  },
  {
    id: "cavalo",
    name: "Cavalo",
    note: "galope nobre",
    personality:
      "Rápido e ousado. Cruza distâncias com a bolsa a tiracolo e um ar de aventura.",
    time: "1 dia",
    price: "R$ 24",
    accent: "#A8C4D4",
    accentSoft: "rgba(168, 196, 212, 0.28)",
    image: "/messengers/cavalo.jpg",
  },
  {
    id: "tartaruga",
    name: "Tartaruga",
    note: "devagar e firme",
    personality:
      "Sem pressa — porque a espera também é romance. Leva um coração de ouro no casco.",
    time: "5–7 dias",
    price: "R$ 8",
    accent: "#8A9A6E",
    accentSoft: "rgba(138, 154, 110, 0.28)",
    image: "/messengers/tartaruga.jpg",
  },
  {
    id: "cegonha",
    name: "Cegonha",
    note: "entrega especial",
    personality:
      "Traz novidades e carinho embrulhado. Ideal para cartas que anunciam algo lindo.",
    time: "2–4 dias",
    price: "R$ 18",
    accent: "#E8A090",
    accentSoft: "rgba(232, 160, 144, 0.28)",
    image: "/messengers/cegonha.jpg",
  },
  {
    id: "ganso",
    name: "Ganso",
    note: "voo divertido",
    personality:
      "Leve, espirituoso e um pouco travesso. A carta flutua junto — quase dançando.",
    time: "3–4 dias",
    price: "R$ 14",
    accent: "#A8C4D4",
    accentSoft: "rgba(168, 196, 212, 0.22)",
    image: "/messengers/ganso.jpg",
  },
  {
    id: "aviao",
    name: "Avião",
    note: "na hora",
    personality:
      "Entrega instantânea com brilho de ouro e rosa. Para quando o coração não espera.",
    time: "Na hora",
    price: "R$ 36",
    accent: "#C4A35A",
    accentSoft: "rgba(196, 163, 90, 0.25)",
    image: "/messengers/aviao.jpg",
  },
];
