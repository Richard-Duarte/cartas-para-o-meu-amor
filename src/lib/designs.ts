export type DesignId = string;

export type Design = {
  id: DesignId;
  name: string;
  tagline: string;
  src: string;
  tilt: number;
  paid: boolean;
  priceBrl: number;
  ink: "dark" | "light";
  fontFamily: string;
  /** Papel recém-chegado: ganha o selo "Novo" nas vitrines. */
  isNew?: boolean;
};

export const DESIGNS: Design[] = [
  {
    id: "classico",
    name: "Clássico",
    tagline: "Papel de carta, tinta de verdade.",
    src: "/designs/blank-classico.svg",
    tilt: -3.2,
    paid: false,
    priceBrl: 0,
    ink: "dark",
    fontFamily: "Fraunces, serif",
  },
  {
    id: "rosa",
    name: "Rosa",
    tagline: "Blush no envelope, peito apertado.",
    src: "/designs/blank-rosa.svg",
    tilt: 2.4,
    paid: false,
    priceBrl: 0,
    ink: "dark",
    fontFamily: "Cormorant Garamond, serif",
  },
  {
    id: "polaroid",
    name: "Polaroid",
    tagline: "Cabe no bolso. Cabe na memória.",
    src: "/designs/blank-polaroid.svg",
    tilt: -2.8,
    paid: false,
    priceBrl: 0,
    ink: "dark",
    fontFamily: "Caveat, cursive",
  },
  {
    id: "noite",
    name: "Noite",
    tagline: "Para o que só se diz no escuro.",
    src: "/designs/blank-noite.svg",
    tilt: -1.6,
    paid: true,
    priceBrl: 2.9,
    ink: "light",
    fontFamily: "Fraunces, serif",
  },
  {
    id: "jardim",
    name: "Jardim",
    tagline: "Folha, flor, recado entre as nervuras.",
    src: "/designs/blank-jardim.svg",
    tilt: 3.1,
    paid: true,
    priceBrl: 3.9,
    ink: "dark",
    fontFamily: "Cormorant Garamond, serif",
  },
  {
    id: "mapa",
    name: "Mapa",
    tagline: "A carta já nasce com um caminho.",
    src: "/designs/blank-mapa.svg",
    tilt: 1.8,
    paid: true,
    priceBrl: 3.9,
    ink: "dark",
    fontFamily: "Figtree, sans-serif",
  },
  {
    id: "coracoes",
    name: "Corações Pastel",
    tagline: "Corações de algodão-doce em volta das palavras.",
    src: "/designs/blank-coracoes.svg",
    tilt: 2.6,
    paid: false,
    priceBrl: 0,
    ink: "dark",
    fontFamily: "Quicksand, sans-serif",
    isNew: true,
  },
  {
    id: "nuvens",
    name: "Nuvens",
    tagline: "Arco-íris e nuvem fofa para dias leves.",
    src: "/designs/blank-nuvens.svg",
    tilt: -2.2,
    paid: false,
    priceBrl: 0,
    ink: "dark",
    fontFamily: "Nunito, sans-serif",
    isNew: true,
  },
  {
    id: "flores",
    name: "Flores",
    tagline: "Um buquê nas bordas, o recado no meio.",
    src: "/designs/blank-flores.svg",
    tilt: -2.4,
    paid: true,
    priceBrl: 1.9,
    ink: "dark",
    fontFamily: "Dancing Script, cursive",
    isNew: true,
  },
  {
    id: "piquenique",
    name: "Piquenique",
    tagline: "Toalha xadrez, morango e tarde de domingo.",
    src: "/designs/blank-piquenique.svg",
    tilt: 2.1,
    paid: true,
    priceBrl: 1.9,
    ink: "dark",
    fontFamily: "Satisfy, cursive",
    isNew: true,
  },
  {
    id: "retro",
    name: "Carta Retrô",
    tagline: "Par avion, selo e saudade carimbada.",
    src: "/designs/blank-retro.svg",
    tilt: -1.9,
    paid: true,
    priceBrl: 2.9,
    ink: "dark",
    fontFamily: "Libre Baskerville, serif",
    isNew: true,
  },
  {
    id: "ursinho",
    name: "Ursinho",
    tagline: "Um abraço de pelúcia em cada linha.",
    src: "/designs/blank-ursinho.svg",
    tilt: 1.9,
    paid: true,
    priceBrl: 2.9,
    ink: "dark",
    fontFamily: "Comfortaa, sans-serif",
    isNew: true,
  },
  {
    id: "estrelada",
    name: "Noite Estrelada",
    tagline: "Lua, céu inteiro e só nós dois acordados.",
    src: "/designs/blank-estrelada.svg",
    tilt: -1.6,
    paid: true,
    priceBrl: 2.9,
    ink: "light",
    fontFamily: "Cormorant Garamond, serif",
    isNew: true,
  },
  {
    id: "scrapbook",
    name: "Scrapbook",
    tagline: "Fita adesiva, polaroid e memória colada.",
    src: "/designs/blank-scrapbook.svg",
    tilt: 3,
    paid: true,
    priceBrl: 3.9,
    ink: "dark",
    fontFamily: "Indie Flower, cursive",
    isNew: true,
  },
];

/** Papéis que já vêm no app, mesmo que o catálogo do banco ainda não os liste. */
const BUILT_IN_DESIGNS: Design[] = DESIGNS.map((d) => ({ ...d }));

export function getDesign(id: string | undefined): Design {
  return DESIGNS.find((d) => d.id === id) ?? DESIGNS[0];
}

/**
 * O catálogo do banco manda (preço, nome, ordem). Papéis do app que ainda não
 * estão no banco entram no fim, para os modelos novos aparecerem sem migração.
 */
export function replaceDesigns(rows: Design[]) {
  if (!rows.length) return;
  const known = new Set(rows.map((r) => r.id));
  const builtIn = new Map(BUILT_IN_DESIGNS.map((d) => [d.id, d]));
  const merged = rows.map((r) => (builtIn.get(r.id)?.isNew ? { ...r, isNew: true } : r));
  const extras = BUILT_IN_DESIGNS.filter((d) => !known.has(d.id));
  DESIGNS.splice(0, DESIGNS.length, ...merged, ...extras);
}
