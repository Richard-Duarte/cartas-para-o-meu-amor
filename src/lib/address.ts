export type Address = {
  cep: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
};

export const emptyAddress = (): Address => ({
  cep: "",
  street: "",
  number: "",
  complement: "",
  neighborhood: "",
  city: "",
  state: "",
});

export function formatCep(value: string) {
  const d = value.replace(/\D/g, "").slice(0, 8);
  if (d.length <= 5) return d;
  return `${d.slice(0, 5)}-${d.slice(5)}`;
}

export function digitsCep(value: string) {
  return value.replace(/\D/g, "").slice(0, 8);
}

export async function lookupCep(cep: string): Promise<Partial<Address> | { error: string }> {
  const d = digitsCep(cep);
  if (d.length !== 8) return { error: "CEP incompleto" };
  const res = await fetch(`https://viacep.com.br/ws/${d}/json/`);
  if (!res.ok) return { error: "Não foi possível buscar o CEP" };
  const data = (await res.json()) as {
    erro?: boolean;
    logradouro?: string;
    complemento?: string;
    bairro?: string;
    localidade?: string;
    uf?: string;
  };
  if (data.erro) return { error: "CEP não encontrado" };
  return {
    cep: formatCep(d),
    street: data.logradouro ?? "",
    complement: data.complemento ?? "",
    neighborhood: data.bairro ?? "",
    city: data.localidade ?? "",
    state: data.uf ?? "",
  };
}

type NominatimHit = {
  display_name?: string;
  address?: {
    road?: string;
    pedestrian?: string;
    neighbourhood?: string;
    suburb?: string;
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    state?: string;
    postcode?: string;
  };
};

const UF: Record<string, string> = {
  acre: "AC",
  alagoas: "AL",
  amapá: "AP",
  amapa: "AP",
  amazonas: "AM",
  bahia: "BA",
  ceará: "CE",
  ceara: "CE",
  "distrito federal": "DF",
  "espírito santo": "ES",
  "espirito santo": "ES",
  goiás: "GO",
  goias: "GO",
  maranhão: "MA",
  maranhao: "MA",
  "mato grosso": "MT",
  "mato grosso do sul": "MS",
  "minas gerais": "MG",
  pará: "PA",
  para: "PA",
  paraíba: "PB",
  paraiba: "PB",
  paraná: "PR",
  parana: "PR",
  pernambuco: "PE",
  piauí: "PI",
  piaui: "PI",
  "rio de janeiro": "RJ",
  "rio grande do norte": "RN",
  "rio grande do sul": "RS",
  rondônia: "RO",
  rondonia: "RO",
  roraima: "RR",
  "santa catarina": "SC",
  "são paulo": "SP",
  "sao paulo": "SP",
  sergipe: "SE",
  tocantins: "TO",
};

function stateToUf(state?: string) {
  if (!state) return "";
  const t = state.trim();
  if (t.length === 2) return t.toUpperCase();
  return UF[t.toLowerCase()] ?? t.slice(0, 2).toUpperCase();
}

function hitToAddress(hit: NominatimHit): Partial<Address> | null {
  const a = hit.address;
  if (!a) return null;
  const street = a.road || a.pedestrian || "";
  const city = a.city || a.town || a.village || a.municipality || "";
  if (!street && !city) return null;
  const cep = a.postcode ? formatCep(a.postcode) : "";
  return {
    street,
    neighborhood: a.suburb || a.neighbourhood || "",
    city,
    state: stateToUf(a.state),
    cep,
  };
}

export async function lookupStreet(
  query: string,
  hint?: { city?: string; state?: string },
): Promise<Partial<Address>[]> {
  const q = query.trim();
  if (q.length < 5) return [];
  const out: Partial<Address>[] = [];
  const uf = hint?.state?.trim().toUpperCase();
  const city = hint?.city?.trim();
  if (uf?.length === 2 && city && city.length > 2) {
    try {
      const url = `https://viacep.com.br/ws/${encodeURIComponent(uf)}/${encodeURIComponent(city)}/${encodeURIComponent(q)}/json/`;
      const res = await fetch(url);
      if (res.ok) {
        const data = (await res.json()) as Array<{
          cep?: string;
          logradouro?: string;
          bairro?: string;
          localidade?: string;
          uf?: string;
          complemento?: string;
        }>;
        if (Array.isArray(data)) {
          for (const row of data.slice(0, 5)) {
            out.push({
              cep: formatCep(row.cep ?? ""),
              street: row.logradouro ?? q,
              complement: row.complemento ?? "",
              neighborhood: row.bairro ?? "",
              city: row.localidade ?? city,
              state: row.uf ?? uf,
            });
          }
        }
      }
    } catch {
      /* nominatim below */
    }
  }
  if (out.length) return out;
  const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=5&countrycodes=br&q=${encodeURIComponent(`${q} Brasil`)}`;
  const res = await fetch(url, { headers: { "User-Agent": "carta-para-o-meu-amor/1.0" } });
  if (!res.ok) return [];
  const data = (await res.json()) as NominatimHit[];
  const seen = new Set<string>();
  for (const hit of data) {
    const addr = hitToAddress(hit);
    if (!addr?.street) continue;
    const key = `${addr.street}|${addr.city}|${addr.cep}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(addr);
  }
  return out;
}

export function addressLine(a: Address) {
  const bits = [
    [a.street, a.number].filter(Boolean).join(", "),
    a.complement,
    a.neighborhood,
    [a.city, a.state].filter(Boolean).join(" — "),
    a.cep,
  ].filter(Boolean);
  return bits.join(" · ");
}
