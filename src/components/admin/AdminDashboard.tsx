"use client";

import { useEffect, useMemo, useState } from "react";
import { formatMoney } from "@/lib/cart";
import { CHANNEL_LABEL, PLATFORM_LABEL } from "@/lib/acquisition";
import { adminAnalytics } from "@/lib/server/admin-panel";
import { cn } from "@/lib/utils";

type Data = Awaited<ReturnType<typeof adminAnalytics>>;
type Preset = "hoje" | "7d" | "30d" | "90d" | "custom";
type Metric = "users" | "letters" | "paid" | "revenue";

const METRICS: { id: Metric; label: string }[] = [
  { id: "users", label: "Cadastros" },
  { id: "letters", label: "Cartas" },
  { id: "paid", label: "Pagas" },
  { id: "revenue", label: "Receita" },
];

/** Hoje em Brasília (UTC-3). */
function ymd(offsetDays = 0) {
  const t = Date.now() - 3 * 3600 * 1000 + offsetDays * 24 * 3600 * 1000;
  return new Date(t).toISOString().slice(0, 10);
}

function rangeOf(p: Preset): [string, string] {
  if (p === "hoje") return [ymd(), ymd()];
  if (p === "7d") return [ymd(-6), ymd()];
  if (p === "90d") return [ymd(-89), ymd()];
  return [ymd(-29), ymd()];
}

const pct = (v: number) => `${(v * 100).toFixed(1).replace(".", ",")}%`;

export function AdminDashboard() {
  const [preset, setPreset] = useState<Preset>("30d");
  const [from, setFrom] = useState(rangeOf("30d")[0]);
  const [to, setTo] = useState(rangeOf("30d")[1]);
  const [channel, setChannel] = useState("");
  const [platform, setPlatform] = useState("");
  const [metric, setMetric] = useState<Metric>("users");
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (preset === "custom") return;
    const [f, t] = rangeOf(preset);
    setFrom(f);
    setTo(t);
  }, [preset]);

  useEffect(() => {
    if (!from || !to || from > to) return;
    let live = true;
    setLoading(true);
    setError("");
    void adminAnalytics({ data: { from, to, channel, platform } })
      .then((d) => live && setData(d))
      .catch(() => live && setError("Não foi possível ler os indicadores."))
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [from, to, channel, platform]);

  return (
    <div className="dash">
      <h2>Painel</h2>
      <div className="dash-filters" role="group" aria-label="Filtros">
        <div className="dash-chips">
          {(["hoje", "7d", "30d", "90d", "custom"] as Preset[]).map((p) => (
            <button key={p} type="button" className={cn(preset === p && "is-on")} onClick={() => setPreset(p)}>
              {p === "hoje" ? "Hoje" : p === "custom" ? "Período" : p.replace("d", " dias")}
            </button>
          ))}
        </div>
        {preset === "custom" ? (
          <div className="dash-dates">
            <label>
              De
              <input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} />
            </label>
            <label>
              Até
              <input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} />
            </label>
          </div>
        ) : null}
        <div className="dash-selects">
          <label>
            Origem
            <select value={channel} onChange={(e) => setChannel(e.target.value)}>
              <option value="">Todas</option>
              {Object.entries(CHANNEL_LABEL).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          <label>
            Plataforma
            <select value={platform} onChange={(e) => setPlatform(e.target.value)}>
              <option value="">Todas</option>
              <option value="ios">iPhone / iPad</option>
              <option value="android">Android</option>
              <option value="desktop">Computador</option>
              <option value="pwa">App instalado</option>
              <option value="desconhecido">Desconhecido</option>
            </select>
          </label>
        </div>
      </div>

      {error ? <p className="text-sm text-rose">{error}</p> : null}
      {!data ? (
        <p className="text-muted">Lendo o dia…</p>
      ) : (
        <div className={cn("dash-body", loading && "is-loading")} data-testid="dash">
          <div className="admin-kpis">
            <Kpi label="Novos usuários" value={String(data.kpis.newUsers)} />
            <Kpi label="Cartas criadas" value={String(data.kpis.letters)} />
            <Kpi label="Cartas pagas" value={String(data.kpis.paid)} />
            <Kpi label="Receita" value={formatMoney(data.kpis.revenue)} />
            <Kpi
              label="Cadastro → compra"
              value={pct(data.kpis.conversion)}
              hint={`${data.kpis.converted} de ${data.kpis.newUsers}`}
            />
            <Kpi label="Acessos" value={String(data.kpis.visits)} hint="todas as origens" />
            <Kpi label="Contas no total" value={String(data.kpis.totalUsers)} />
            <Kpi label="A pagar afiliados" value={formatMoney(data.kpis.affiliateDue)} />
          </div>

          <section className="dash-card">
            <header>
              <h3>Por dia</h3>
              <div className="dash-chips is-small">
                {METRICS.map((m) => (
                  <button key={m.id} type="button" className={cn(metric === m.id && "is-on")} onClick={() => setMetric(m.id)}>
                    {m.label}
                  </button>
                ))}
              </div>
            </header>
            <SeriesChart series={data.series} metric={metric} />
          </section>

          <div className="dash-grid">
            <Breakdown title="De onde vieram" rows={data.byChannel} label={(k) => CHANNEL_LABEL[k] ?? k} />
            <Breakdown title="Plataforma" rows={data.byPlatform} label={(k) => PLATFORM_LABEL[k] ?? k} />
            <Breakdown
              title="App instalado × navegador"
              rows={data.byMode}
              label={(k) => (k === "pwa" ? "App instalado" : k === "navegador" ? "Navegador" : "Desconhecido")}
            />
            <Breakdown title="Sistema" rows={data.byOs} label={(k) => k} />
            <Breakdown title="Navegador" rows={data.byBrowser} label={(k) => k} />
          </div>

          <section className="dash-card">
            <h3>Campanhas (1º toque do cadastro)</h3>
            {data.campaigns.length ? (
              <div className="dash-table-wrap">
                <table className="dash-table">
                  <thead>
                    <tr>
                      <th>Origem · campanha</th>
                      <th>Cadastros</th>
                      <th>Cartas</th>
                      <th>Pagas</th>
                      <th>Receita</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.campaigns.map((c) => (
                      <tr key={c.key}>
                        <td>{c.key}</td>
                        <td>{c.users}</td>
                        <td>{c.letters}</td>
                        <td>{c.paid}</td>
                        <td>{formatMoney(c.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-muted">Nenhuma campanha com UTM no período.</p>
            )}
            {data.lastTouch.length ? (
              <>
                <h4 className="mt-5 text-sm font-semibold">Cartas por campanha da compra (último toque)</h4>
                <ul className="dash-list">
                  {data.lastTouch.map((c) => (
                    <li key={c.campaign}>
                      <span>
                        {c.source || "?"} · {c.campaign}
                      </span>
                      <b>{c.n}</b>
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
          </section>
          <p className="text-xs text-muted">
            Contas criadas antes desta versão aparecem como "Desconhecido". Origem e plataforma vêm do primeiro acesso de
            cada conta. Datas no horário de Brasília.
          </p>
        </div>
      )}
    </div>
  );
}

function Kpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <article className="admin-kpi">
      <p>{label}</p>
      <b>{value}</b>
      {hint ? <small className="text-xs text-muted">{hint}</small> : null}
    </article>
  );
}

function SeriesChart({ series, metric }: { series: Data["series"]; metric: Metric }) {
  const values = series.map((s) => s[metric]);
  const max = Math.max(1, ...values);
  const w = 640;
  const h = 180;
  const pad = 6;
  const step = series.length > 1 ? (w - pad * 2) / (series.length - 1) : 0;
  const pts = useMemo(
    () => values.map((v, i) => [pad + i * step, h - pad - (v / max) * (h - pad * 2)] as const),
    [values, step, max],
  );
  const total = values.reduce((a, b) => a + b, 0);
  if (!series.length) return null;
  const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${line} L${pts[pts.length - 1][0].toFixed(1)},${h - pad} L${pts[0][0].toFixed(1)},${h - pad} Z`;
  const fmt = (v: number) => (metric === "revenue" ? formatMoney(v) : String(v));
  const first = series[0].day.split("-").reverse().slice(0, 2).join("/");
  const last = series[series.length - 1].day.split("-").reverse().slice(0, 2).join("/");
  return (
    <figure className="dash-chart">
      <figcaption>
        Total no período: <b>{fmt(total)}</b> · pico: <b>{fmt(Math.max(...values))}</b>
      </figcaption>
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" role="img" aria-label="Gráfico por dia">
        <line x1={pad} x2={w - pad} y1={h - pad} y2={h - pad} stroke="currentColor" strokeOpacity="0.15" />
        {series.length === 1 ? (
          <rect x={w / 2 - 20} width={40} y={pts[0][1]} height={h - pad - pts[0][1]} rx={6} fill="var(--color-rose)" />
        ) : (
          <>
            <path d={area} fill="var(--color-rose)" fillOpacity="0.12" />
            <path d={line} fill="none" stroke="var(--color-rose)" strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
          </>
        )}
        {pts.map(([x, y], i) => (
          <circle key={series[i].day} cx={x} cy={y} r={series.length > 40 ? 0 : 3} fill="var(--color-rose)">
            <title>{`${series[i].day.split("-").reverse().join("/")}: ${fmt(values[i])}`}</title>
          </circle>
        ))}
      </svg>
      <div className="dash-chart-axis">
        <span>{first}</span>
        <span>{last}</span>
      </div>
    </figure>
  );
}

function Breakdown({
  title,
  rows,
  label,
}: {
  title: string;
  rows: Data["byChannel"];
  label: (k: string) => string;
}) {
  const max = Math.max(1, ...rows.map((r) => r.users));
  return (
    <section className="dash-card">
      <h3>{title}</h3>
      {rows.length ? (
        <ul className="dash-bars">
          {rows.map((r) => (
            <li key={r.key}>
              <div className="dash-bar-head">
                <span>{label(r.key)}</span>
                <b>{r.users}</b>
              </div>
              <div className="dash-bar">
                <i style={{ width: `${Math.round((r.users / max) * 100)}%` }} />
              </div>
              <small>
                {r.letters} cartas · {r.paid} pagas · {formatMoney(r.revenue)}
              </small>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted">Sem dados no período.</p>
      )}
    </section>
  );
}
