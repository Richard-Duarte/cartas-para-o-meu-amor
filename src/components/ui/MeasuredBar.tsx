"use client";

import { useRef, type HTMLAttributes } from "react";
import { useBarSpace } from "@/lib/use-bar-space";

type Props = HTMLAttributes<HTMLDivElement> & {
  /** Variável CSS que recebe o espaço ocupado pela barra, ex.: "--app-bar-space". */
  spaceVar: string;
  mode?: "viewport" | "height";
};

/** Uma barra (div) que avisa ao CSS quanto espaço ocupa, para nada ficar escondido atrás dela. */
export function MeasuredBar({ spaceVar, mode = "viewport", ...rest }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  useBarSpace(ref, spaceVar, mode);
  return <div ref={ref} {...rest} />;
}
