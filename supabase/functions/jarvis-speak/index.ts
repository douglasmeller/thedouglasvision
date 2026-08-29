// jarvis-speak — converte a resposta de texto do Jarvis em áudio (voz "Jarvis
// (UCM)" em PT-BR, via Fish Audio) pra tocar sozinho no chat depois de cada
// resposta. Sempre autenticado (verify_jwt) — sem caso de cron, é sempre
// chamado pelo navegador do Douglas logo que o texto termina de chegar.

import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Voz "Jarvis (UCM) - Português Brasileiro" escolhida no playground da Fish
// Audio — reference_id é específico dessa voz clonada, não muda por request.
const JARVIS_VOICE_REFERENCE_ID = "a5b93aeddcc948c19ea04f0afe9d178c";
const FISH_MODEL = "s2-pro";
const MAX_TEXT_LENGTH = 2000;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS_HEADERS, "content-type": "application/json" } });
}

// O texto do Jarvis chega com o markdown-lite que o chat usa pra render (**destaque**,
// "- item") — sem isso, a voz literalmente falaria "asterisco asterisco" e "traço".
function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/^\s*[-*]\s+/gm, "")
    .replace(/[#_`]/g, "")
    .trim();
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });

  try {
    const fishKey = Deno.env.get("FISH_AUDIO_API_KEY");
    if (!fishKey) return json({ error: "FISH_AUDIO_API_KEY não configurada nos secrets da function." }, 500);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Sessão inválida." }, 401);

    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: { user }, error: userErr } = await sb.auth.getUser();
    if (userErr || !user) return json({ error: "Sessão inválida." }, 401);

    const body = await req.json().catch(() => ({}));
    const text = stripMarkdown(String(body?.text || "").slice(0, MAX_TEXT_LENGTH));
    if (!text) return json({ error: "Texto vazio." }, 400);

    const resp = await fetch("https://api.fish.audio/v1/tts", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${fishKey}`,
        "Content-Type": "application/json",
        "model": FISH_MODEL,
      },
      body: JSON.stringify({ text, reference_id: JARVIS_VOICE_REFERENCE_ID, format: "mp3" }),
    });

    if (!resp.ok) {
      const errText = await resp.text().catch(() => "");
      return json({ error: `Fish Audio respondeu ${resp.status}: ${errText.slice(0, 200)}` }, 502);
    }

    const audioBuf = await resp.arrayBuffer();
    return new Response(audioBuf, { status: 200, headers: { ...CORS_HEADERS, "content-type": "audio/mpeg" } });
  } catch (e) {
    console.error("jarvis-speak error:", e);
    return json({ error: "Algo deu errado gerando o áudio." }, 500);
  }
});
