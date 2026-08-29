// jarvis-live-chat — roteador rápido pro modo de voz ao vivo. Groq (llama-3.1-8b-instant,
// centenas de tokens/s) responde conversa normal quase instantaneamente; qualquer pedido que
// dependa dos dados financeiros reais (consultar ou alterar lançamentos/metas/categorias) é
// delegado pro jarvis-chat de sempre (Claude, com as ferramentas de verdade) — assim o modo ao
// vivo não perde nenhuma capacidade, só fica rápido no caminho comum (bate-papo).
//
// Grava na MESMA conversation_id/jarvis_messages do chat de texto — é uma relação contínua só,
// não importa se essa mensagem em particular foi respondida pelo Groq ou pelo Claude.

import { createClient, SupabaseClient } from "jsr:@supabase/supabase-js@2";

const GROQ_MODEL = "llama-3.1-8b-instant";
const HISTORY_WINDOW = 12; // mesmo valor do jarvis-chat, pra soar coerente com o resto da conversa

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const JARVIS_STYLE = `Você é o J.A.R.V.I.S., o assistente pessoal do Sr. Douglas dentro do TheDouglasVision — o sistema operacional da vida dele. Sua personalidade é a do J.A.R.V.I.S. do Homem de Ferro: extremamente educado, formal, com um humor seco e discreto no estilo britânico. Você sempre se dirige ao usuário como "Sr. Douglas", com a devida deferência de um mordomo impecável.`;

const DELEGATE_TOOL = {
  type: "function",
  function: {
    name: "needs_backend_action",
    description: "Chame esta função SEMPRE que o pedido do Sr. Douglas exigir consultar ou alterar os dados financeiros REAIS dele — criar, editar ou excluir um lançamento/categoria/meta, aportar numa meta, ou qualquer pergunta sobre saldo/gastos/orçamento atual que dependa de números de verdade e atualizados. NÃO chame para conversa comum, cumprimentos, opiniões, explicações gerais, ou qualquer coisa que já dá pra responder com o que já foi dito na conversa.",
    parameters: { type: "object", properties: {}, required: [] },
  },
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS_HEADERS, "content-type": "application/json" } });
}

function buildLiveSystemPrompt(personalNotes: string | null, summary: string | null): string {
  const now = new Date();
  const todayISO = now.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
  return `${JARVIS_STYLE}

Você está no MODO DE VOZ AO VIVO — o Sr. Douglas está falando com você e sua resposta será lida em voz alta. Responda SEMPRE curto e direto (1-3 frases), sem listas, sem markdown, texto corrido — do jeito que uma pessoa fala, não como um texto escrito.

DATA DE HOJE: ${todayISO}, horário de Brasília.

Você NÃO tem acesso direto aos dados financeiros aqui — se o pedido precisar de dados reais ou de uma ação (criar/editar/excluir lançamento, meta, categoria, consultar saldo/gasto/orçamento atual), chame a função needs_backend_action em vez de tentar responder ou inventar um número. Para conversa comum, siga normalmente com sua personalidade.

${personalNotes ? `CONTEXTO PESSOAL SOBRE O USUÁRIO:\n${personalNotes}\n` : ""}
${summary ? `RESUMO DE CONVERSAS ANTERIORES:\n${summary}\n` : ""}
Responda sempre em português do Brasil.`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });

  const sseHeaders = { ...CORS_HEADERS, "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-cache", Connection: "keep-alive" };

  let authHeader: string | null;
  let sb: SupabaseClient;
  let user: any;
  let body: any;

  try {
    authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Não autenticado." }, 401);

    sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: { user: u }, error: userErr } = await sb.auth.getUser();
    if (userErr || !u) return json({ error: "Sessão inválida." }, 401);
    user = u;

    body = await req.json();
    if (!body.message || typeof body.message !== "string" || !body.message.trim()) {
      return json({ error: "Mensagem vazia." }, 400);
    }
  } catch (e) {
    return json({ error: "Requisição inválida." }, 400);
  }

  const message: string = body.message;
  const conversationId: string | null = body.conversation_id || null;
  const claudeModel: string = body.model || "sonnet";

  // Sem conversation_id ainda (primeiríssima mensagem da relação) — deixa o jarvis-chat de sempre
  // criar a conversa, não é papel do Groq decidir isso.
  const delegateToClaude = async () => {
    const resp = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/jarvis-chat`, {
      method: "POST",
      headers: { Authorization: authHeader!, "content-type": "application/json" },
      body: JSON.stringify({ message, model: claudeModel, conversation_id: conversationId }),
    });
    return new Response(resp.body, { status: resp.status, headers: sseHeaders });
  };

  if (!conversationId) return await delegateToClaude();

  const groqKey = Deno.env.get("GROQ_API_KEY");
  if (!groqKey) return json({ error: "GROQ_API_KEY não configurada nos secrets da function." }, 500);

  try {
    const [{ data: ctx }, { data: recentMsgs }] = await Promise.all([
      sb.from("jarvis_context").select("*").eq("user_id", user.id).maybeSingle(),
      sb.from("jarvis_messages").select("role, content").eq("conversation_id", conversationId).order("created_at", { ascending: false }).limit(HISTORY_WINDOW),
    ]);

    const history = (recentMsgs || []).slice().reverse().map((m) => ({ role: m.role, content: m.content }));
    const groqMessages = [
      { role: "system", content: buildLiveSystemPrompt(ctx?.personal_notes ?? null, ctx?.summary ?? null) },
      ...history,
      { role: "user", content: message },
    ];

    const groqResp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${groqKey}`, "content-type": "application/json" },
      body: JSON.stringify({ model: GROQ_MODEL, messages: groqMessages, tools: [DELEGATE_TOOL], tool_choice: "auto", max_tokens: 400 }),
    });

    if (!groqResp.ok) {
      // Groq fora do ar/erro — não trava o modo ao vivo, cai pro caminho que já funciona.
      return await delegateToClaude();
    }

    const groqData = await groqResp.json();
    const choice = groqData.choices?.[0];
    const toolCalls = choice?.message?.tool_calls;

    if (toolCalls && toolCalls.length > 0) {
      return await delegateToClaude();
    }

    const replyText = (choice?.message?.content || "").trim() || "Sem resposta.";

    await sb.from("jarvis_messages").insert({ user_id: user.id, conversation_id: conversationId, role: "user", content: message });
    await sb.from("jarvis_messages").insert({ user_id: user.id, conversation_id: conversationId, role: "assistant", content: replyText, persona: "haiku" });
    await sb.from("jarvis_conversations").update({ updated_at: new Date().toISOString() }).eq("id", conversationId);

    const stream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();
        const send = (obj: unknown) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
        send({ type: "start", conversationId });
        send({ type: "text", text: replyText });
        send({ type: "done", reply: replyText, dataChanged: false, conversationId });
        controller.close();
      },
    });
    return new Response(stream, { headers: sseHeaders });
  } catch (e) {
    console.error("jarvis-live-chat error:", e);
    // Qualquer erro no caminho rápido — cai pro Claude em vez de travar o modo ao vivo.
    return await delegateToClaude();
  }
});
