// stock-quotes — cotação "quase ao vivo" das ações que o Douglas escolheu
// acompanhar (widget de Ações na Home). Sempre chamada autenticada pelo
// usuário (poll enquanto a Home está aberta) — sem caso de cron aqui, então
// verify_jwt fica ligado (padrão) em vez do dual-auth do news-digest.
//
// Dois modos, pelo mesmo endpoint:
// - body {} (ou sem ticker): cotação atual de toda a watchlist do usuário (poll da Home).
// - body { ticker, range, interval }: histórico de UM ticker, pro gráfico com
//   filtros de período (dia/semana/mês/ano) no modal de detalhe.

import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const VALID_RANGES = ["1d", "2d", "5d", "7d", "1mo", "3mo", "6mo", "1y", "2y", "5y", "10y", "ytd", "max"];
const VALID_INTERVALS = ["1m", "2m", "5m", "15m", "30m", "60m", "90m", "1h", "1d", "5d", "1wk", "1mo", "3mo"];

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS_HEADERS, "content-type": "application/json" } });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });

  try {
    const brapiToken = Deno.env.get("BRAPI_TOKEN");
    if (!brapiToken) return json({ error: "BRAPI_TOKEN não configurada nos secrets da function." }, 500);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Sessão inválida." }, 401);

    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: { user }, error: userErr } = await sb.auth.getUser();
    if (userErr || !user) return json({ error: "Sessão inválida." }, 401);

    const body = await req.json().catch(() => ({}));

    // Modo histórico — gráfico de um ticker específico.
    if (body?.ticker) {
      const ticker = String(body.ticker).toUpperCase();
      const range = VALID_RANGES.includes(body.range) ? body.range : "1mo";
      const interval = VALID_INTERVALS.includes(body.interval) ? body.interval : "1d";
      const resp = await fetch(
        `https://brapi.dev/api/quote/${encodeURIComponent(ticker)}?range=${range}&interval=${interval}`,
        { headers: { Authorization: `Bearer ${brapiToken}` } },
      );
      if (!resp.ok) return json({ error: `brapi.dev respondeu ${resp.status}` }, 502);
      const data = await resp.json();
      const result = (data.results || [])[0];
      if (!result) return json({ error: "Ticker não encontrado." }, 404);
      const points = (result.historicalDataPrice || []).map((p: any) => ({ t: p.date, close: p.close }));
      return json({
        ticker: result.symbol, currency: result.currency || "BRL", points,
        price: result.regularMarketPrice, changePercent: result.regularMarketChangePercent,
      });
    }

    // Modo padrão — cotação atual de toda a watchlist (poll da Home).
    const { data: watchlist, error: wErr } = await sb.from("stock_watchlist").select("ticker").eq("user_id", user.id);
    if (wErr) return json({ error: wErr.message }, 500);
    if (!watchlist || watchlist.length === 0) return json({ quotes: [] });

    const tickers = watchlist.map((w) => w.ticker).join(",");
    const resp = await fetch(`https://brapi.dev/api/quote/${encodeURIComponent(tickers)}`, {
      headers: { Authorization: `Bearer ${brapiToken}` },
    });
    if (!resp.ok) return json({ error: `brapi.dev respondeu ${resp.status}` }, 502);
    const data = await resp.json();

    const quotes = (data.results || []).map((r: any) => ({
      symbol: r.symbol, price: r.regularMarketPrice, changePercent: r.regularMarketChangePercent,
      currency: r.currency || "BRL", name: r.shortName || r.longName || r.symbol,
    }));

    return json({ quotes });
  } catch (e) {
    console.error("stock-quotes error:", e);
    return json({ error: "Algo deu errado buscando as cotações." }, 500);
  }
});
