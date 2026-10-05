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
    priceBrl: 8,
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
    priceBrl: 12,
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
    priceBrl: 14,
    ink: "dark",
    fontFamily: "Figtree, sans-serif",
  },
];

export function getDesign(id: string | undefined): Design {
  return DESIGNS.find((d) => d.id === id) ?? DESIGNS[0];
}

export function replaceDesigns(rows: Design[]) {
  if (!rows.length) return;
  DESIGNS.splice(0, DESIGNS.length, ...rows);
}
