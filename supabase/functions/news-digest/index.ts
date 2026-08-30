// news-digest — resumo diário (por IA) das novidades dos sites de interesse do
// Douglas. Roda sozinha via pg_cron (uma vez por dia) ou pode ser forçada na
// hora pelo botão "Atualizar agora" no TDV (aí sim autenticado, JWT do usuário).

import { createClient, SupabaseClient } from "jsr:@supabase/supabase-js@2";

const ANTHROPIC_VERSION = "2023-06-01";
const MODEL = "claude-sonnet-5";
// TDV é de usuário único — mesmo espírito do OWNER_EMAIL fixo no login do
// frontend. Sem isso não teria como o cron (sem sessão de ninguém) saber de
// quem é o resumo que está gravando.
const OWNER_USER_ID = "c1f1f1f8-ba26-4e66-8c86-c645dc9cbb1d";
const STALE_HOURS = 20; // não gera de novo se já tem um resumo mais recente que isso

const FEEDS = [
  { name: "Flow Games", url: "https://flowgames.gg/feed" },
  { name: "Meu Timão", url: "https://www.meutimao.com.br/feed" },
  { name: "Reforma Tributária", url: "https://www.reformatributaria.com/feed" },
  { name: "Ei Nerd", url: "https://www.einerd.com/feed" },
];

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS_HEADERS, "content-type": "application/json" } });
}

function decodeEntities(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)))
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"')
    .trim();
}

// Alguma imagem de dentro do content:encoded vem com caminho relativo
// (ex: "/wp-content/uploads/...") — sem resolver contra o domínio da fonte,
// isso quebraria (tentaria carregar do próprio thedouglasvision.com).
function resolveImageUrl(raw: string, feedUrl: string): string | null {
  try {
    return new URL(raw, feedUrl).href;
  } catch (_e) {
    return null;
  }
}

// RSS é bem regular — regex simples em vez de puxar uma biblioteca de XML só
// pra isso. Cada site aqui já foi testado e é WordPress padrão.
function parseFeed(xml: string, sourceName: string, feedUrl: string) {
  const items: { title: string; url: string; source: string; image_url: string | null; published_at: string | null }[] = [];
  const blocks = xml.split(/<item[ >]/i).slice(1);
  for (const raw of blocks) {
    const body = raw.split(/<\/item>/i)[0];
    const titleMatch = body.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i);
    const linkMatch = body.match(/<link>([\s\S]*?)<\/link>/i);
    const dateMatch = body.match(/<pubDate>([\s\S]*?)<\/pubDate>/i);
    const title = titleMatch ? decodeEntities(titleMatch[1]) : null;
    const url = linkMatch ? decodeEntities(linkMatch[1]) : null;
    if (!title || !url) continue;
    const thumb = body.match(/<media:thumbnail[^>]*url="([^"]+)"/i)
      || body.match(/<enclosure[^>]*url="([^"]+)"[^>]*type="image/i)
      || body.match(/<img[^>]+src="([^"]+)"/i);
    const publishedAt = dateMatch ? (() => {
      const d = new Date(dateMatch[1].trim());
      return isNaN(d.getTime()) ? null : d.toISOString();
    })() : null;
    items.push({ title, url, source: sourceName, image_url: thumb ? resolveImageUrl(thumb[1], feedUrl) : null, published_at: publishedAt });
  }
  return items;
}

// Nem todo feed RSS traz imagem (o do e-nerd, por exemplo, não tem enclosure
// nem thumbnail nem <img> na descrição) — a imagem existe na página do
// artigo, só não no feed. Busca a página e pega a tag og:image, que quase
// todo WordPress com plugin de SEO já expõe.
async function fetchOgImage(articleUrl: string): Promise<string | null> {
  try {
    const resp = await fetch(articleUrl, { headers: { "User-Agent": "Mozilla/5.0 (TheDouglasVision news-digest)" } });
    if (!resp.ok) return null;
    const html = await resp.text();
    const match = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
      || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
    return match ? resolveImageUrl(match[1], articleUrl) : null;
  } catch (_e) {
    return null;
  }
}

async function fetchFeedItems(feed: { name: string; url: string }) {
  try {
    const resp = await fetch(feed.url, { headers: { "User-Agent": "Mozilla/5.0 (TheDouglasVision news-digest)" } });
    if (!resp.ok) return [];
    const xml = await resp.text();
    const items = parseFeed(xml, feed.name, feed.url);
    const cutoff = Date.now() - 24 * 3600 * 1000;
    const recent = items.filter((it) => it.published_at && new Date(it.published_at).getTime() >= cutoff);
    return (recent.length > 0 ? recent : items.slice(0, 2)).slice(0, 5);
  } catch (_e) {
    return [];
  }
}

// Um resumo por fonte (não mais um texto único misturando tudo) — o
// frontend exibe cada fonte com o resumo dela em cima dos próprios itens.
async function summarizeOne(apiKey: string, source: string, items: { title: string }[]): Promise<string> {
  const list = items.map((it) => `- ${it.title}`).join("\n");
  const system = "Você resume as novidades de hoje de UM site de interesse de um usuário, em português do Brasil, de forma direta em 1-3 frases corridas. Sem introdução nem conclusão, sem citar o nome do site (o nome já aparece separado na tela) — só o resumo do conteúdo em si. IMPORTANTE: texto puro, sem markdown nenhum (nada de **negrito**, #, -, *, listas numeradas) — a tela que exibe isso não interpreta markdown.";
  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": apiKey, "anthropic-version": ANTHROPIC_VERSION, "content-type": "application/json" },
    body: JSON.stringify({
      model: MODEL, max_tokens: 400, system,
      messages: [{ role: "user", content: `Resuma essas novidades de hoje do site "${source}":\n\n${list}` }],
    }),
  });
  if (!resp.ok) throw new Error(`Anthropic API error ${resp.status}: ${(await resp.text()).slice(0, 300)}`);
  const data = await resp.json();
  return data.content?.find((b: any) => b.type === "text")?.text || "";
}

async function summarizeBySource(apiKey: string, allItems: { title: string; source: string }[]): Promise<{ source: string; summary: string }[]> {
  const bySource = new Map<string, { title: string }[]>();
  for (const it of allItems) {
    if (!bySource.has(it.source)) bySource.set(it.source, []);
    bySource.get(it.source)!.push({ title: it.title });
  }
  // Preserva a ordem de FEEDS (não a ordem de chegada do Promise.all).
  const sources = FEEDS.map((f) => f.name).filter((name) => bySource.has(name));
  const summaries = await Promise.all(sources.map((source) => summarizeOne(apiKey, source, bySource.get(source)!)));
  return sources.map((source, i) => ({ source, summary: summaries[i] }));
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });

  try {
    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) return json({ error: "ANTHROPIC_API_KEY não configurada nos secrets da function." }, 500);

    const authHeader = req.headers.get("Authorization");
    let sb: SupabaseClient;
    let forced = false;

    if (authHeader) {
      // Botão "Atualizar agora" no TDV — usuário de verdade, RLS normal via o próprio JWT dele.
      sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: authHeader } },
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { data: { user }, error: userErr } = await sb.auth.getUser();
      if (userErr || !user) return json({ error: "Sessão inválida." }, 401);
      forced = true;
    } else {
      // Chamada do pg_cron — não existe sessão de usuário nenhuma nesse contexto,
      // então essa é a única situação em que essa function usa a service role
      // (só pra gravar em news_digests, nunca toca em mais nada).
      sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    }

    if (!forced) {
      const { data: last } = await sb.from("news_digests").select("created_at")
        .eq("user_id", OWNER_USER_ID).order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (last && Date.now() - new Date(last.created_at).getTime() < STALE_HOURS * 3600 * 1000) {
        return json({ skipped: true, reason: "já existe um resumo recente" });
      }
    }

    const perFeed = await Promise.all(FEEDS.map(fetchFeedItems));
    const allItems = perFeed.flat();

    await Promise.all(allItems.map(async (it) => {
      if (!it.image_url) it.image_url = await fetchOgImage(it.url);
    }));
    if (allItems.length === 0) return json({ error: "Nenhum feed retornou itens." }, 502);

    const bySource = await summarizeBySource(apiKey, allItems);

    const { data: digest, error: insertErr } = await sb.from("news_digests").insert({
      id: "nd" + Date.now(), user_id: OWNER_USER_ID, summary: JSON.stringify(bySource), items: allItems,
    }).select().single();

    if (insertErr) return json({ error: insertErr.message }, 500);
    return json({ ok: true, digest });
  } catch (e) {
    console.error("news-digest error:", e);
    return json({ error: "Algo deu errado gerando o resumo." }, 500);
  }
});
