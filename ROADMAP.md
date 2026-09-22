# Trilha de desenvolvimento — TheDouglasVision

Ideias e próximos passos discutidos, ainda não implementados.

## Fila atual (pedidos de 22/09)
Feita depois do Sr. Douglas pedir explicitamente pra NÃO fazer tudo de uma vez ("se fizer vai ficar
meia boca, eu quero tudo com excelência"). Por isso está quebrada em 6 fases pequenas, cada uma
fechando um assunto inteiro, com deploy e teste próprios. A ordem segue: primeiro o que está
quebrado, depois o que é base pras outras, por último o que é novo.

**Fase 1 — Bug do Mark XLIII (Sonnet) travando o chat.** ✅ Feita em 22/09.
**Fase 2 — Editor de anotações: leitura e escrita.** ✅ Feita em 22/09.
**Fase 3 — Jarvis sabe onde o Sr. Douglas está** (contexto de tela/nota aberta).
**Fase 4 — Jarvis formata anotação de verdade.** ✅ Feita em 22/09.
**Fase 5 — Tabela com mais linhas e colunas.**
**Fase 6 — Tarefas recorrentes.**
**Fase 7 — Agenda: visão por semana e por dia, tudo numa tela só** (pedido de 22/09).

Depois disso continuam na fila, esperando decisão do Sr. Douglas:
- **Cofre de Senhas** — falta escolher a forma de recuperação (ver "Novos setores → Cofre de senhas").
- **Transcritor de reuniões** — falta escolher o serviço de transcrição e o custo.

---

### Fase 1 — Bug do Mark XLIII (Sonnet): chat morre no meio — FEITA (22/09)
**Sintoma:** em 22/09, às 17:11 e 17:12, o Sr. Douglas pediu pro Jarvis organizar uma anotação e a
resposta não veio; ele perguntou duas vezes "o que deu errado?". A resposta que ficou gravada saiu
toda emendada ("...preciso primeiro ler o conteúdo dela:Perfeito. Agora vou reorganizar..."), sem
os trechos do meio.

**Causa (confirmada nos logs da Edge Function):**
```
Anthropic API error 400: messages: text content blocks must be non-empty
   at streamAnthropicTurn (jarvis-chat/index.ts)
```
No laço de ferramentas, `messages.push({ role: "assistant", content: result.content })` devolve pra
API exatamente os blocos que vieram do modelo. Quando o modelo abre um bloco de texto e não escreve
nada antes de chamar a ferramenta (o Sonnet faz isso com frequência), esse bloco volta como
`{type:"text", text:""}` — e a API recusa a requisição inteira com 400. O erro acontece **só depois
da primeira chamada de ferramenta**, por isso não aparece numa conversa simples.

**Correção:** filtrar blocos de texto vazios antes de devolver o histórico à API (e aparar espaços).
Vale pros três modelos, não só o Sonnet.

**Teste:** no simulador do jarvis-chat (`jarvis_test.mjs`), uma rodada em que o modelo devolve
`[{text:""},{tool_use}]` e confirmar que o que sai pra API não tem bloco vazio. Sem esse caso, o teste
passa hoje justamente porque nunca simulou um bloco de texto vazio.

**Feito:** bloco de texto vazio (ou só com espaço) deixa de voltar pra API, e o histórico vindo do
banco também é filtrado (uma linha vazia lá derrubaria a conversa do mesmo jeito). O erro do
servidor passou a chegar no chat com a causa curta — `shortError()` tira o "message" do JSON da
Anthropic — em vez do "algo deu errado" genérico que obrigava a abrir o log.

**Conferido:** o teste novo roda o `streamAnthropicTurn` de verdade com um bloco de texto vazio
antes da ferramenta. Contra a versão anterior ele devolve 1 bloco vazio (o que a API recusa com
400); contra a nova, nenhum. 27 testes do jarvis-chat passando. Publicado e conferido byte a byte
contra o arquivo testado.

---

### Fase 2 — Editor de anotações: leitura e escrita — FEITA (22/09)
Tudo dentro do editor, sem tocar em Jarvis. Um deploy só.

1. **Cabeçalho fixo ao rolar** — hoje, rolando pra baixo dentro de uma nota, o título e a barra de
   formatação somem. Devem ficar grudados no topo (o corpo é que rola). Atenção: o container do
   editor usa flex com `overflow-y: auto` no corpo — a barra precisa sair do fluxo de rolagem, e o
   posicionamento do menu "/" e da barra de seleção (que é medida em `componentDidUpdate`) tem que
   ser conferido de novo depois da mudança.
2. **Fonte com a cara do TDV** — o corpo da nota usa Inter (`.reading-font`). Trocar por uma fonte
   que converse com o resto do app sem virar monoespaçada pura (o texto longo em Share Tech Mono
   fica cansativo — foi por isso que a `.reading-font` existe). Caminho: uma fonte técnica de
   leitura pro corpo + Orbitron/Share Tech Mono só nos títulos de bloco.
3. **Espaçamento das letras e margem esquerda maiores** — aumentar `letter-spacing` do corpo e a
   margem esquerda do bloco (hoje `padding: 18px 20px`).
4. **Itálico** — não existe botão. Adicionar na barra, junto de negrito.
5. **Negrito não aparece** (nem no app, nem no PDF exportado) — o botão chama
   `document.execCommand('bold')`. A investigação de 22/09 descartou faltar sanitizador e regra de
   CSS matando o negrito; falta reproduzir no navegador pra saber se o `<b>` chega a ser criado.
   Suspeita principal: a fonte carregada não tem peso alto disponível no trecho, ou o
   `execCommand` não pega a seleção depois do `focus()`. Se for o caso, trocar por envolver a
   seleção num `<strong>` na mão — mesmo caminho já usado pra cor e tamanho, que foram reescritos em
   03/09 justamente por causa do `execCommand`. Conferir também no exportador de PDF.
6. **Ícone de grifar sem a letra "A"** — o marca-texto vira só o quadradinho colorido; os botões de
   cor da letra continuam com o "A" colorido como estão hoje.
7. **Escolher a fonte na exportação** — ao exportar PDF (e Markdown/TXT, onde fizer sentido), poder
   escolher a fonte do documento, já que vai pra outra pessoa. Um seletor simples no diálogo de
   exportar, com 3 ou 4 opções (ex.: Inter, Georgia, Times, Arial), aplicado no HTML de impressão.

**Teste:** editor aberto no navegador com CSS real — rolar e conferir que o cabeçalho fica; aplicar
negrito/itálico e conferir o HTML gravado; exportar PDF com cada fonte e conferir a página gerada.

**Feito em 22/09:**
- **Cabeçalho fixo:** o corpo da nota passou a rolar por dentro (altura presa à janela na cadeia
  toda: tela → wrapper → painel → corpo, com `min-height: 0`), então título e barra ficam parados.
  A classe `.fade-in` saiu da tela do editor: a animação deixa um `translateY(10px)` grudado, que
  empurrava tudo e sobrava rolagem na área do app. Conferido no desktop e no celular.
- **Fonte:** corpo em **Chakra Petch** (técnica, combina com o TDV, legível em texto longo) com
  itálico DE VERDADE — a Inter carregada aqui só tem os pesos retos. Espaçamento entre letras
  0.035em e margem esquerda de 30px (era 20px).
- **Negrito e itálico:** o botão de itálico não existia. E o negrito falhava **no toque**: tocar no
  botão apaga a seleção antes do clique chegar (o `preventDefault` do mousedown só segura o mouse),
  e sem seleção o `execCommand` não formata nada. Agora a seleção é guardada no `pointerdown` e
  devolvida antes do comando — conferido simulando o toque do iPhone.
- **Grifar sem a letra "A":** marca-texto virou só o quadradinho colorido; cor da letra continua com
  o "A".
- **Fonte na exportação:** o menu Exportar ganhou um seletor (Inter, Chakra Petch, Georgia, Times,
  Arial, Courier). O HTML de impressão também ganhou regras próprias de negrito, itálico, títulos,
  parágrafos e listas — sem isso o reset do app deixava tudo espremido no PDF.

**Emendado em 22/09 (pedido na hora):** F5 dentro de uma nota (ou dentro de uma pasta) jogava o
Sr. Douglas de volta pra lista da raiz — a URL só sabia dizer "estou em Anotações". Agora o lugar
exato vive no endereço: `/notas/nota/<id>` e `/notas/pasta/<id>`. F5 reabre a nota (já dentro da
pasta dela), nota ou pasta apagada cai na raiz sem tela vazia, e o Voltar do navegador passou a
andar entre pastas também. 12 testes novos, e os 8 caminhos antigos do botão Voltar seguem
passando.

---

### Fase 3 — Jarvis sabe em qual tela o Sr. Douglas está
**Pedido:** "se eu estiver em uma anotação aberta e disser 'Jarvis, ajeite essa anotação aqui', ele
tem que saber qual anotação é".

**Como:** o app já manda a mensagem pro `jarvis-chat`; passa a mandar junto um pequeno contexto de
tela — aba atual e, quando houver, o que está aberto nela (id e título da nota, dia aberto na
Agenda, tarefa em edição, mês do Dashboard). Na Edge Function, isso entra no prompt do sistema como
dado estruturado ("TELA ATUAL: ..."), nunca como texto livre do usuário — mesma regra que já vale
pro snapshot financeiro, pra não abrir porta de injeção de instrução.

**Cuidados:** "essa anotação" só pode valer pra nota realmente aberta; se não houver nada aberto, o
Jarvis pergunta em vez de chutar. O contexto vai em toda mensagem, então precisa ser curto.

**Teste:** simulador do jarvis-chat conferindo que o bloco "TELA ATUAL" aparece no prompt com a nota
certa, e some quando não há nota aberta.

---

### Fase 4 — Jarvis formatando anotação com os blocos do TDV — FEITA (22/09)
**Sintoma:** em 22/09 o Jarvis "organizou" a nota de Alinhamento financeiro e ela ficou espremida,
sem espaçamento vertical.

**Causa (confirmada):** ele gravou HTML genérico — `<h2>`, `<h3>`, `<p>`, `<ul>` — mas o editor do
TDV tem blocos próprios (`.tdv-h1/.tdv-h2/.tdv-h3`, `.tdv-quote`, `.tdv-callout`, `.tdv-code`,
`.tdv-check-row`, `.tdv-toggle`). Pior: a folha de estilo do app começa com
`*, *::before, *::after { margin: 0; padding: 0; }`, que zera as margens de `<h2>`/`<p>`/`<ul>` e o
recuo das listas. Ou seja: o Jarvis escreveu um HTML que, dentro deste app, não tem respiro nenhum.

**Correção, em duas frentes:**
- **Ensinar o Jarvis**: a descrição da tool `update_note`/`create_note` passa a trazer o formato de
  bloco do TDV, com exemplo curto de cada um, e a instrução de nunca usar `<h2>`/`<p>` soltos.
- **Rede de proteção no app**: regras de CSS próprias dentro do editor pra `h1..h6`, `p`, `ul/ol`,
  `blockquote` etc., convertendo o HTML genérico num visual decente mesmo se vier de fora (colar de
  outro lugar cai no mesmo problema hoje). Melhor ainda: normalizar na entrada, convertendo `<h2>`
  em `.tdv-h2` ao carregar/salvar, pra que exportação, busca e conversor de Markdown enxerguem tudo
  igual (o conversor já aceita `H2` além de `.tdv-h2`, mas o resto do editor não).

**Jarvis mexendo na nota, ao vivo (pedido de 22/09):** hoje, quando o Jarvis altera a nota aberta,
só dá pra ver o resultado com F5. A nota aberta deve entrar em modo "o Jarvis está trabalhando":
conteúdo desfocado, efeito de código/binário correndo por cima, barra de carregamento estilo filme
de hacker, tudo nas cores do Jarvis e do sistema — e, ao terminar, o texto novo aparece sozinho.
Dá pra fazer sem inventar canal novo: o chat já recebe um evento `tool` com o nome da ferramenta e
um `done` com `dataChanged`; basta ligar esses eventos ao editor aberto e recarregar a nota do banco
no fim.

**Botão "J" na barra de formatação:** letra "J" azul na fonte do Jarvis, do lado dos botões de cor
e negrito. Um clique = "dá uma ajeitada básica nesta nota" (títulos, listas, espaçamento, sem
inventar conteúdo). Fluxo previsto: manda a nota pro Jarvis com um pedido fixo, mostra "arrumando…"
e aplica o resultado. Pedido mais específico continua sendo no chat.
**A decidir antes de codar:** se a ajeitada entra direto (a trilha de auditoria já é a rede de
segurança, como em todo o resto) ou se mostra um "desfazer" por alguns segundos — sabendo que hoje
não existe histórico de versões de nota.

**Teste:** simulador com uma nota bagunçada, conferindo que o HTML gravado usa os blocos do TDV; e
conferência visual no navegador (é sobre respiro visual, tem que ser visto).

**Feito em 22/09:**
- **Jarvis aprendeu o formato:** `create_note`/`update_note` trazem os blocos do TDV com exemplo de
  cada um e a proibição explícita de `<h1>..<h6>`/`<p>` soltos, markdown e linhas de `=====` — foi
  assim que ele estragou uma nota de verdade nesse dia. Também: não usar emoji sem o Sr. Douglas
  pedir, e nunca resumir ao reorganizar.
- **Rede de proteção no app:** CSS próprio dentro do editor pra h1..h6/p/ul/ol/blockquote/tabela
  (o reset global zerava margem e recuo), mais um normalizador que converte o que chega de fora:
  texto corrido com `=====`/`-----`/markdown vira título, `- item` vira lista, `<h2>` vira
  `.tdv-h2`, `<p>` vira bloco, lista ganha recuo. Vale também pra texto colado de outro lugar.
- **Versão anterior guardada:** tabela `note_versions` (RLS por dono, 20 versões por nota, aparadas
  por trigger). A Edge Function grava a versão atual — com formatação — antes de qualquer escrita
  do Jarvis. Nasceu de um caso real: a auditoria só guardava o texto puro, e as cores do Sr.
  Douglas se perderam.
- **Efeito ao vivo + sem F5:** o chat já mandava o evento `tool`; agora, com a nota aberta, isso
  liga o modo "J.A.R.V.I.S. reescrevendo" (corpo desfocado, chuva de 0 e 1 num canvas, varredura e
  barra estilo filme de hacker, nas cores do sistema), trava o autosave (senão o texto velho
  voltava por cima) e, no fim, recarrega a nota do banco sozinho. O efeito dura no mínimo 1,2s pra
  não piscar.
- **Desfazer:** barra embaixo do editor por 45s depois que ele mexe, que devolve a versão de antes.
- **Botão "J"** na barra de formatação (Orbitron, azul): pede a ajeitada básica pelo chat, com id e
  título da nota na mensagem — assim fica na trilha de auditoria como qualquer outro pedido.
- 23 testes novos no app + 5 na Edge Function.

---

### Fase 5 — Tabela: mais linhas e colunas
Hoje `noteInsertTable` cria uma tabela fixa e não há como crescer. Adicionar controles pra inserir e
remover linha/coluna com a tabela selecionada (botões que aparecem ao clicar dentro dela), mantendo
o que o exportador de Markdown/PDF já sabe ler.
**Cuidado:** o motor de template não reconhece `drop`, e a tabela vive dentro do `contenteditable` —
os controles têm que ser manipulação de DOM na mão, como o checklist e o arrastar da Agenda.

---

### Fase 6 — Tarefas recorrentes
Tarefa que se repete (toda semana, todo mês, dias úteis…), como já existe na Agenda. O melhor
caminho é reaproveitar a mesma regra de repetição da Agenda (`recurrence`, `recurrence_days`,
`recurrence_until`, `recurrence_count`, `exdates`), que já está pronta, testada e igual nos dois
lados (app e Edge Function).
**A decidir antes de codar:** o que acontece ao concluir uma ocorrência — a tarefa "renasce" no
próximo prazo (modelo do Todoist) ou cada ocorrência vira uma tarefa própria no banco? A primeira é
mais simples e não enche a tabela; a segunda deixa o histórico do que foi feito em cada data.
Precisa também aparecer na grade da Agenda e nas tools do Jarvis (create_task/update_task).


---

### Fase 7 — Agenda: visão por semana e por dia, tudo numa tela só
**Pedido (22/09):** além do mês, ter **semana** e **dia** ("grandão"), e a agenda caber **numa tela
só, sem rolar pra cima e pra baixo** pra ver tudo — do jeito que o Google Agenda faz.

**O que isso significa na prática:**
- Alternador com **Dia · Semana · Mês · Mapa** (o Mapa já existe, de 22/09).
- **Semana:** 7 colunas, faixa de horas na lateral, evento desenhado na altura do horário dele
  (usando início e fim, que passaram a existir em 22/09); evento de dia inteiro e de vários dias
  numa faixa fixa no topo, como no Google.
- **Dia:** uma coluna só, hora a hora, com espaço pra ler o título e o local sem cortar.
- **Tela cheia:** a área da agenda passa a ocupar a altura da janela e rolar por dentro (só as
  horas, quando o dia não couber), em vez de esticar a página. É o mesmo problema que a fase 2
  resolve no editor de anotações — vale reaproveitar a solução.
- Arrastar continua funcionando nas novas visões (mouse e toque), e na semana/dia passa a poder
  mudar também o HORÁRIO, não só o dia.

**A decidir antes de codar:** faixa de horas fixa (0h–23h) ou ajustada ao que existe no dia; e se o
"hoje" abre em Dia ou em Semana no celular (no celular, Semana com 7 colunas fica apertado — o
Google usa 3 dias).

## Fila anterior (pedidos de 17/09) — concluída em 22/09, menos os 2 últimos
Ordem sugerida — bug antes de feature, e o que é função central antes do que é novo:
1. **Jarvis — voz ao vivo e resposta travada** — corrigido em 18/09 e verificado em simulação com o código real; falta o Douglas testar com áudio de verdade.
2. **Inspeção total com o Opus 5** — feita em 18/09, ver seção própria. Sobrou um pedido pro Douglas (desligar o cadastro de contas no Supabase).
3. **Shift+Enter no chat do Jarvis** — feito em 20/09, ver "Jarvis — pequenos ajustes".
4. **Agenda — refinamento grande** — feito em 22/09 (tarefas ligadas, toque, duração, repetição, local e mapa). Ver "Novos setores → Agenda".
5. **Anotações mais completas** — feito em 18/09 (busca, fixar, lixeira, ordenação, exportar, links entre notas).
6. **Cofre de Senhas** — ver "Novos setores → Cofre de senhas". Precisa de conversa de arquitetura antes de código.
7. **Transcritor de áudio para reuniões** — ver "Novos setores → Transcritor de reuniões". Precisa de decisão de serviço/custo antes de código.

## Jarvis
- **Voz — entrada (feito)**: botão de microfone no chat usa a Web Speech API do navegador pra transcrever fala em texto no campo de mensagem (sem custo, sem chave nova). Envio continua manual de propósito — evita que um erro de reconhecimento vire uma ação executada sem querer.
- **Voz — saída (pendente)**: Jarvis e Friday responderem falando (text-to-speech), com voz de verdade parecida com a dos personagens do filme. Plano: Douglas vai tentar achar/baixar uma amostra de áudio da voz real do Jarvis; com isso em mãos, o caminho mais realista é clonar a voz via ElevenLabs (pago) — uma voz mais grave/britânica pro Jarvis, outra pra Friday. Avisar quando tiver o áudio pra integrar.
- **Wake word "Jarvis"**: analisar viabilidade de ativar o app dizendo "Jarvis" em voz alta, inclusive com o celular bloqueado/desligado. Ponto de atenção: um PWA não tem acesso a wake-word em background com a tela desligada (isso exigiria um app nativo rodando serviço em segundo plano, ou depender de integrações do sistema como Siri Shortcuts/Google Assistant) — precisa de pesquisa de viabilidade antes de prometer a feature.

## Design / UI
- **Densidade e hover tecnológico (feito, 17/09)**: o app estava com muito espaço vazio nas laterais — os containers de todas as telas foram alargados (820/960/1040 → 1100/1280/1320, Configurações de 540 → 820). No celular a margem lateral caiu de 20px pra 12px e ficou garantido que nada passa da largura da tela (conferido: zero elementos estourando, sem rolagem horizontal). Botões ganharam hover em dois níveis, de propósito: os de ação (gradiente azul, `.hud-btn-*`, `.hud-icon-btn`) recebem uma linha neon que dá uma volta rápida no contorno (conic-gradient girando, recortado só na faixa da borda por máscara — precisa de `@property` pro ângulo animar de verdade); todo o resto recebe só a piscada de brilho. Se todos tivessem a volta neon viraria árvore de natal.
- Passar um pente geral no frontend: identificar elementos "básicos" demais e dar mais personalidade visual ao app (já está bonito, mas dá pra melhorar).

## Lançamentos recorrentes com teto (feito)
- Nova aba "Despesas" em Planejamento — cria uma despesa recorrente com teto por valor total (ex: parcela do carro até somar R$25.000) e/ou por data final.
- "Pagar parcela" cria um lançamento de despesa real; progresso é sempre calculado a partir dos lançamentos, nunca duplicado.
- Geração automática mensal da parcela, parando sozinha quando o teto é atingido.

## Exportação Excel
- Deixar o relatório mais bonito: filtros, valores de receita positivos e despesa negativos, cores, negrito, destaques visuais.

## Login só com senha (feito)
- Campo de e-mail sumiu da tela — só a senha, com visual de terminal (ENTER PASSWORD, fonte monoespaçada, brilho azul).
- E-mail continua fixo internamente (Supabase Auth por trás não mudou), só não aparece mais pro usuário digitar.

## Traduzir o TDV pra inglês
- Douglas quer, no futuro, mudar quase todo o texto do app pra inglês (não é urgente — "depois").
- Primeiro passo já deu: o prompt de senha ficou em inglês (ENTER PASSWORD) como um gostinho da direção.
- Quando for pra valer, decidir se é o app inteiro de uma vez ou por partes, e se o Jarvis também passa a responder em inglês por padrão ou continua em português.

## TDV como "sistema operacional da vida" — reestruturação grande (feito)
- Visão: o TDV deixa de ser só finanças e vira o sistema pessoal do Douglas como um todo, pra sempre.
- O que existia (Dashboard financeiro, Lançamentos, Planejamento, Categorias) virou o setor **Finance**; Tarefas, Agenda, Notas, Notícias, Jarvis e Configurações são setores próprios, no mesmo nível.
- Configurações ganhou a opção de escolher em qual setor o app abre por padrão, por dispositivo.
- **Home rica (feito)**: greeting, barra de ações rápidas (+ Lançamento/Tarefa/Evento/Nota), resumo de Finance, mini chat do Jarvis embutido (substitui a bolha flutuante só na Home), Ações (watchlist B3 com cotação quase-ao-vivo via Edge Function `stock-quotes` + brapi.dev), próximos vencimentos de Tarefas, Agenda de hoje/amanhã, e a última notícia de cada portal.
  - **Pendente**: pra Ações funcionar de verdade, falta o Douglas criar uma conta grátis em brapi.dev, gerar um token, e configurar o secret `BRAPI_TOKEN` nas Edge Function secrets do Supabase (Dashboard → Edge Functions → Secrets) — sem isso a busca de cotação retorna erro.

## IronHand como setor do sistema
- **Botão "Abrir IronHand" em Configurações (feito)**: dispara o IronHand local via protocolo customizado do Windows (`ironhand://`) — precisa de um `.reg` importado uma vez por computador (`IronHand/ironhand_protocol.reg`).
- **Gestos e estabilidade (feito)**: clique por polegar dobrado (em vez de pinça, que atrapalhava a mira do cursor), disparo único pra Alt+Tab/Shift+Alt+Tab/mostrar área de trabalho/visão de tarefas, correção do handedness invertido, correção do crash no FAILSAFE, gestos novos (jogar janela pro lado, Win+Tab com as duas mãos abertas, pausar/retomar com os dois punhos fechados), resolução da câmera reduzida (960x540 → 640x360) pra tirar o "pulinho" do cursor.
- **Ainda pendente**: isso hoje é só um "abre e fecha" — a visão de **sempre ativo** (rodar em segundo plano, TDV enxergar se está ligado, iniciar sozinho com o Windows) ainda não foi desenhada nem implementada. Como o TDV é um PWA e o IronHand precisa de webcam/mouse/teclado do SO, ele não pode rodar "dentro" do navegador — continua sendo processo local, e o TDV vira no máximo uma janela de controle/status por cima dele via algum canal local (webhook já existente, ou uma portinha HTTP local).
- Ainda não decidido: como o TDV "enxerga" que o IronHand está ligado quando ele roda numa máquina fora do ar do domínio (thedouglasvision.com é hospedado, o IronHand roda local).
- **Iniciar com o Windows**: mencionado como próximo passo fácil (atalho na pasta Inicializar ou Agendador de Tarefas) — ainda não implementado.

## Bolha do Jarvis flutuante (feito)
- Botão "flutuar" no popover do Jarvis abre uma mini janela sempre-por-cima (Document Picture-in-Picture), começando recolhida como só a bolinha com os anéis HUD girando — clica e expande pro chat completo, com um botão pra recolher de volta.
- Chat de verdade dentro da janela flutuante (não é mockup): reaproveita o mesmo `sendJarvisMessage` da tela principal.
- Limitação conhecida: não dá pra abrir a bolha do zero com um atalho de teclado global (isso precisaria de um processo nativo tipo o IronHand) — só fica flutuando depois de aberta uma vez a partir do TDV.

## Novos setores
- **Agenda (feito)**: calendário em grade de mês, CRUD de eventos.
  - **Grade maior, quadrados padronizados, tarefas no calendário e drag-and-drop (feito, 17/09)**: container mais largo (820px → 1040px, mesmo padrão do Dashboard), células viram quadrados de verdade (`aspect-ratio: 1`, antes só tinham altura mínima e ficavam desiguais entre si), tamanho de fonte/quantidade de itens visíveis por dia se ajusta sozinho no mobile (`isMobile`). Tarefas com prazo agora aparecem na mesma grade dos eventos, em âmbar (eventos continuam azuis), com legenda de cor no topo. Arrastar um evento pra outro dia com o mouse: implementado na mão com mousedown/mousemove/mouseup (o motor de template deste app não reconhece o evento nativo "drop", só start/end/enter/leave/over — HTML5 drag-and-drop nunca chegaria a soltar em lugar nenhum aqui).
  - **Pendente — refinamento grande (pedido de novo em 17/09)**:
    - **Integração com prazo das tarefas (feito, 22/09)**: arrastar a tarefa na grade muda o prazo dela; o modal do dia ganhou a seção "Tarefas com prazo neste dia" com quadradinho pra concluir (concluída fica riscada, dá pra desfazer) e lápis que abre a tarefa.
    - **Eventos recorrentes (feito, 22/09)**: todo dia, dias úteis, toda semana, dias da semana específicos, todo mês, todo ano; termina nunca, numa data ou depois de N vezes. Editar ou excluir uma ocorrência pergunta "só esta / esta e as próximas / todas". Arrastar uma ocorrência move só ela. Mês sem o dia (31, 29/02) é pulado, igual ao Google. As ocorrências são calculadas na hora a partir da regra (uma linha por série no banco + lista de exceções `exdates`), não gravadas uma a uma.
    - **Duração do evento (feito, 22/09)**: hora de início e fim, "dia inteiro", e evento de vários dias (aparece como barra em todos os dias dele e arrasta inteiro).
    - **Arrastar no celular (feito, 22/09)**: segurar ~0,35s na pílula pega ela (vibra), arrastar o dedo antes disso continua sendo rolagem normal da página. Vale pra evento e tarefa.
    - **Local e mapa (feito, 22/09, sem chave e sem custo)**: campo "Local" com sugestões de endereço enquanto digita (Photon/OpenStreetMap, grátis); escolher uma sugestão guarda as coordenadas e mostra o mapa do Google dentro do evento (embed sem chave); "Como chegar" abre a rota no Google Maps de verdade. Aba **Mapa** na Agenda: todos os eventos do mês com local, num mapa escuro (Leaflet + OpenStreetMap escurecido por CSS — o escuro pronto da CARTO passou a exigir chave), repetição no mesmo lugar vira um marcador só. O Jarvis também aceita `location` e acha as coordenadas sozinho. Autocomplete oficial do Google (Places) ficou de fora de propósito: exigiria chave e cartão.
    - **Jarvis entende a Agenda nova (feito, 22/09)**: create_event/update_event aceitam hora de fim, dia inteiro, vários dias e repetição; list_events devolve as ocorrências já calculadas (mesma regra do app); delete_event com occurrence_date apaga só aquele dia; o contexto "hoje e amanhã" inclui repetições e evento de vários dias em andamento.
    - Refinamento da Agenda concluído em 22/09 (fase 1 + local/mapa).
- **Anotações (feito)**: bloco de notas estilo dontpad — formatação rica, autosave.
  - **Editor corrigido (feito, 03/09)**: tamanho de fonte, cor de texto e marca-texto dependiam do `document.execCommand`, API antiga inconsistente entre navegadores — reescritos pra envolver a seleção manualmente num `<span style="...">`, com valores de tamanho em px de verdade. Checklist reescrito do zero (o antigo aninhava divs de forma imprevisível a cada Enter — confirmado na estrutura real de uma nota do Douglas); agora cada item é uma linha própria, Enter cria a próxima linha ou sai da lista se estiver vazia, Backspace numa linha vazia remove ela. Notas antigas com o checklist quebrado são migradas sozinhas ao abrir. Adicionado alinhamento (esquerda/centro/direita), que não existia.
  - **Estilo Notion (feito, 03/09)**: pesquisado o essencial do editor do Notion (blocos, slash command, atalhos de markdown, hierarquia de página) e adaptado pro TDV. Botão de cor virou uma letra "A" colorida num quadrado arredondado (era um círculo sólido, igual o Notion faz de verdade). Digitar `/` no início de uma linha abre um menu (mesma mecânica do command palette Ctrl+K, só que perto do cursor) com os blocos: Título 1/2/3, Lista, Lista numerada, Checklist, Citação, Callout, Toggle (`<details>` nativo, abre/fecha de graça), Divisor, Código, Tabela. Atalhos de markdown também funcionam (`# `, `## `, `> `, `--- `, `- `, `1. `, `[] `). **Pastas aninhadas** (pastas dentro de pastas, sem limite) — navegação estilo explorador de arquivos: entra na pasta, breadcrumb no topo volta. Apagar uma pasta não apaga o conteúdo (notas e subpastas sobem um nível). Ação "mover para" em nota e pasta. Jarvis ganhou `folder_name` em create_note/update_note/list_notes — acha ou cria a pasta na raiz sozinho.
  - **Repaginada visual + pastas melhores + menu no lugar certo (feito, 17/09)**: cartões de pasta (âmbar) e de nota (ciano) com mira nos cantos que abre no hover, varredura passando por dentro e brilho na cor do tipo; ações do cartão só aparecem no hover (em tela sem mouse ficam sempre visíveis). Trilha virou barra de diretório estilo terminal com leitura de conteúdo ("2 PASTAS · 3 NOTAS"), e contagem por pasta agora separa notas de subpastas. Editor virou UM painel só (título + barra + corpo), em vez de três caixas soltas — a barra rola na horizontal em vez de quebrar em duas linhas. **Arrastar nota pra dentro de pasta** com o mouse (e soltar na trilha pra subir de nível), reaproveitando a mecânica manual do arrastar da Agenda; o modal "mover para" continua existindo (é o caminho no celular, que não tem mouse).
    - **Bug do dropdown corrigido**: o menu do "/" e a barra de seleção apareciam colados na esquerda. Causa: `.fade-in` roda com `animation-fill-mode: both`, então o `transform` do último keyframe fica grudado no elemento pra sempre — e qualquer transform != none faz o elemento virar o bloco de contenção dos `position: fixed` de dentro dele. Medido: pedindo `left: 600` o elemento ia parar em `left: 840` num container que começava em 240. Trocado por `position: absolute` ancorado num wrapper próprio, o que torna o transform irrelevante, com trava pra nunca vazar da largura do container. Confirmado por medição: o menu passa a cair exatamente no cursor (desvio 0px na horizontal).
    - **Descoberta que vale lembrar**: o motor de template **descarta `id`/`title`/`data-*` do elemento que é filho RAIZ de um bloco `sc-if`** (ele é tratado como host — só `class` e `style` sobrevivem). Em elemento aninhado passa tudo normal. Foi por isso que o wrapper do editor precisou de um nível a mais de div pra carregar o id.
  - **Mais completa (feito, 18/09)** — o Douglas escolheu: busca, fixar, lixeira, ordenação, exportar e links entre notas.
    - **Busca**: em todas as pastas de uma vez, pelo título e pelo texto, sem ligar pra acento nem maiúscula ("reuniao" acha "Reunião"); cada resultado mostra a pasta onde está, e a prévia mostra o trecho em volta do termo. Pastas cujo nome bate também aparecem.
    - **Ordenação**: editadas recentemente / criadas recentemente / nome (A–Z), lembrada por dispositivo. Fixadas vêm sempre primeiro.
    - **Fixar**: alfinete no cartão e no topo do editor (coluna `notes.pinned`).
    - **Lixeira**: excluir não apaga mais de vez — a nota vai pra `notes_trash` e fica 30 dias, com restaurar e apagar de vez (limpeza automática na abertura do app). Tabela separada de propósito: o Jarvis lê `notes` direto, então nota na lixeira some pra ele sem precisar republicar a jarvis-chat. Mover e restaurar são funções do banco (`trash_note`/`restore_note`), atômicas, com RLS. Restaurar numa pasta que foi apagada devolve a nota pra raiz. Obs.: o `delete_note` do Jarvis continua apagando de vez.
    - **Exportar**: Markdown (.md), texto (.txt) e PDF (janela de impressão em tema claro). Conversor feito sob medida pros blocos do editor (títulos, checklist marcado/desmarcado, citação, callout, toggle, código, listas, tabela, links).
    - **Links entre notas**: digitar `[[` abre o mesmo menu do `/`, listando as notas pelo título; escolher insere um link que guarda o ID (renomear a nota de destino não quebra) e abre ela no clique.
    - **Bug achado no caminho — nota saía da pasta ao ser editada**: o autosave montava a nota sem a pasta e a gravação mandava `folder_id = null` — toda edição de uma nota que estava numa pasta jogava ela de volta pra raiz. Explica as 4 pastas vazias do Douglas no banco. Corrigido.
    - **Bug achado no caminho — `componentDidUpdate` quebrava em TODA atualização desde 03/09**: o framework chama `componentDidUpdate(prevProps)`, sem o estado anterior; a função usava `prevState.screen` na primeira linha, estourava, o erro era engolido (console) e nada depois rodava. Estavam desligados em silêncio: a URL sincronizada com a aba, fechar/salvar a nota ao trocar de aba, a rolagem do Jarvis na Home (a correção `dbe479f` nunca funcionou) e a medição da barra de seleção. Agora a tela anterior é guardada na própria função. Conferido: a versão publicada gera o erro numa aba limpa, a nova não gera nenhum.
    - **Botão Voltar dentro de uma nota (corrigido, 18/09)**: abrir uma nota empilha uma entrada no histórico do navegador (pra o Voltar fechar a nota em vez de sair da seção), mas fechar por outro caminho (setinha, excluir, abrir outra nota por link) deixava a entrada sobrando — cada nota aberta e fechada empilhava uma "entrada fantasma", o Voltar parecia não fazer nada e na terceira caía na Home. Agora quem fecha a nota consome a entrada, abrir por link só substitui, e cair numa entrada sobrando (ex.: F5 com nota aberta) pula sozinho. Testado num histórico de navegador simulado com o código real: a versão anterior falhava em 5 de 8 caminhos, a nova passa em todos.
    - Fora desta rodada (não escolhidos): imagens na nota, histórico de versões, arrastar no celular.
- **Notícias (feito)**: resumo diário por IA dos 4 sites de interesse (Flow Games, Meu Timão, Reforma Tributária, Ei Nerd), gerado via Edge Function + cron diário ou botão "Atualizar agora". Resumo dividido por fonte, 6 manchetes por site (era 5).
  - **Atualização automática — bug corrigido (feito, 03/09)**: a checagem de "resumo recente" comparava por janela de horas (20h) em vez de por dia — um clique manual em "Atualizar agora" à noite cancelava o cron da manhã seguinte (a janela de 20h ainda não tinha passado às 07:00). Trocado pra comparar a data (fuso de Brasília): gera no máximo uma vez por dia, mas sempre gera se o dia mudou, não importa quando foi o último clique manual.
- **Ações (feito, ver "Home rica" acima)**: watchlist de tickers B3 com cotação quase-ao-vivo, dentro do widget da Home — não é um setor de nav própria, mora na Home.
- **Mensagens**: Douglas ainda quer discutir como isso funcionaria antes de desenhar (o quê exatamente — mensageria interna? Integração com apps externos? Ainda em aberto).
- **Cofre de Senhas** (reforçado em 17/09): novo setor pra guardar todas as senhas, organizável por pastas "e tudo mais". Exigências explícitas do Douglas: tem que ser **BEM seguro**; é **obrigatório digitar a senha do app de novo** pra entrar nessa sessão (segunda barreira — não basta já estar logado no TDV). Nome da página: **"Cofre de Senhas"**.
  - **Decidido com o Douglas (17/09)**: a senha do cofre é a **mesma do app** (sem senha-mestra separada), e **tem que existir recuperação** se a senha for esquecida (ele discordou de "irrecuperável").
  - Arquitetura que atende as duas coisas (cifragem em envelope): uma chave aleatória própria do cofre (AES-GCM, gerada no navegador) cifra todas as entradas; essa chave fica guardada "embrulhada" por uma chave derivada da senha do app (PBKDF2/Argon2). O banco só guarda texto cifrado + a chave embrulhada. Trocar a senha do app sabendo a antiga = só re-embrulhar a chave, nada é re-cifrado nem perdido.
  - **Em aberto — como recuperar quando a senha é resetada por e-mail** (a senha antiga some, então a chave precisa estar embrulhada também de um segundo jeito): (1) chave de recuperação mostrada uma vez pra guardar fora do TDV (recomendado — ninguém além dele abre o cofre); (2) cópia da chave guardada no servidor e liberada pelo reset de e-mail (cômodo, mas o cofre fica tão seguro quanto o e-mail, e o servidor passa a poder ler); (3) as duas. Aguardando a escolha do Douglas.
  - Ainda a decidir junto: tempo até o cofre trancar sozinho por inatividade; se o Jarvis pode ou não ter acesso ao cofre (recomendação: não).
  - Funções esperadas: pastas, gerador de senha forte, copiar com um clique (limpando da área de transferência depois de alguns segundos), mostrar/ocultar, campos de site/usuário/observação, busca.
- **Transcritor de reuniões** (pedido de 17/09): gravar o áudio de uma reunião e transformar em texto. Natural casar com o que já existe: salvar a transcrição como nota em Anotações (numa pasta "Reuniões"), e pedir pro Jarvis resumir, listar decisões e virar os próximos passos em Tarefas.
  - Decisão a tomar antes de código: **qual serviço transcreve**. A Web Speech API do navegador (a mesma do microfone do Jarvis) é grátis, mas é feita pra frase curta — em reunião longa ela corta sozinha, erra muito com várias pessoas e não separa quem falou. Pra reunião de verdade o caminho é um serviço dedicado de transcrição (ex: Whisper via API, Deepgram, AssemblyAI) — tem custo por minuto e alguns separam falantes. Precisa do Douglas escolher e criar a chave.
  - Outros pontos: gravar reunião online (Meet/Teams) pelo navegador exige capturar o áudio da aba, não só o microfone; limite de duração; e aviso/consentimento de gravação das outras pessoas.

## Navegação
- **URL sincronizada com a aba ativa (feito, 03/09)**: cada aba tem seu próprio caminho (`/agenda`, `/tarefas`, `/noticias`, etc, e `/` pra Home) via `history.pushState`, sem framework de rotas — `componentDidUpdate` mantém a URL em sincronia com `screen` a cada render, só empurrando uma entrada nova quando realmente mudou. Botão voltar/avançar do navegador funciona (via `popstate`). A URL manda na carga inicial — só cai no default configurado por dispositivo quando abre pela raiz "/". `vercel.json` ganhou rewrite catch-all pra `/index.html`, senão abrir/atualizar direto numa dessas URLs dava 404 no servidor.

## Jarvis — bugs reportados

### REABERTO (17/09) — voz ao vivo e resposta travada
A correção de 03/09 (abaixo) não resolveu — o Douglas relata os mesmos sintomas e mais alguns:
- **Modo ao vivo**: ele fala um pouco, a voz sai **muito baixa**, depois **some**; aí ele não responde e não ouve direito.
- **Mensagem digitada**: a bolinha de "processando" fica pra sempre e a resposta não aparece — **só depois de F5** (ou seja, a resposta é gerada e salva no servidor, o problema é ela chegar na tela).
- **Corrigido (17/09), aguardando o Douglas testar:**
  - **Bolinha eterna (causa confirmada)**: o contador de geração `_liveGen` nunca era inicializado. Ao enviar, a mensagem virava `this._liveGen || 0` = 0; ao mostrar a resposta, as checagens comparavam com `this._liveGen` cru = undefined, e `0 !== undefined` — o app descartava TODA resposta digitada como "velha" antes de aparecer, e o carregando nunca desligava. Só funcionava depois de usar o modo de voz uma vez na sessão (é ele que transforma o contador em número). No F5 aparecia porque vem do banco, sem passar por essa trava. O bug foi introduzido pela própria correção de 03/09. Os logs do Supabase confirmam que o servidor sempre respondeu certo (ex.: 16/09 18:13 — resposta gerada e salva em 2,5s, stream fechado normalmente).
  - **Modo ao vivo (causa provável, não dá pra confirmar sem testar com áudio de verdade)**: enquanto o Jarvis falava, o app abria o microfone em paralelo pra detectar interrupção por voz. Isso explica os três sintomas: com o microfone aberto o Windows/celular entra em "modo chamada" e abaixa o volume dos outros sons (voz baixinha); sem fone, o microfone ouvia a própria voz do Jarvis e ele se interrompia sozinho (voz sumindo); e o liga-desliga do reconhecimento a cada trecho brigava com a escuta seguinte (não ouvia). O microfone agora fica fechado enquanto ele fala, e interromper passou a ser por um botão "Tocar para interromper" na tela da ligação. Troca consciente: não dá mais pra cortar ele falando por cima.

### 20/09 — bolinha eterna de novo, causa nova (corrigido)
- Sintoma: o Douglas fala/digita, a bolinha fica pra sempre, a resposta só aparece no F5. **Os logs do Supabase mostraram ZERO pedidos ao jarvis-chat** (última conversa gravada: 16/09) — a mensagem nunca saía do navegador. Não era a chave da Anthropic (que também tinha expirado, trocada no mesmo dia e testada).
- Causa: o envio começava esperando `supabase.auth.getSession()`, que espera um lock interno do navegador; se o lock fica preso (outra aba, renovação de token), a promessa nunca resolve, sem erro e sem tempo limite. Reproduzido em simulação com o código real: versão anterior = carregando pra sempre e 0 pedidos ao servidor; nova = manda e responde.
- Correção: `_getAccessToken` espera até 4s e, se travar, lê o token direto do armazenamento local; tempo limite de 60s pra o servidor responder e 60s sem receber dados durante a resposta — em vez de ficar mudo, aparece um aviso dizendo em qual etapa parou. Vale pro chat, pra voz e pra sessão. Não foi aplicado (ainda) a Notícias/Ações, que usam o mesmo padrão.

### 20/09 — voz muda no iPhone (corrigido, aguardando teste)
- Os logs mostraram o aparelho: **iPhone, Safari iOS**. Na tentativa das 18:45 o chat respondeu (200) e a voz gerou DOIS MP3 válidos (20 KB + 48 KB, audio/mpeg) — ou seja, servidor, chave da Fish Audio e saldo estão bons. O que falha é **tocar** o som no iOS.
- Duas regras do iPhone que não existem no PC: (1) a chavinha lateral de silencioso silencia áudio de página web; (2) enquanto o microfone está ativo, o sistema entra em "modo chamada" e manda o som pro fone de ouvido do telefone, baixinho — é a "voz baixinha que some" relatada desde o começo.
- Correção: `navigator.audioSession` (Safari 17+) passa a ser avisado do que o app está fazendo — `playback` ao falar (alto-falante, ignora o silencioso) e `play-and-record` ao escutar, alternando a cada rodada, e `auto` ao encerrar. Onde a API não existe (PC), não faz nada. Conferido em simulação de ligação de 3 rodadas: playback > play-and-record > ... > auto.
- **Se ainda ficar mudo**: conferir a chavinha de silencioso do iPhone e o volume com a ligação ATIVA (no iOS o volume de mídia e o de toque são separados).

### Correção anterior (03/09 — não resolveu por completo)
- **Resposta só aparece depois de dar F5 / modo ao vivo só responde a primeira fala**: os dois sintomas tinham a MESMA causa raiz. Quando o modo ao vivo era interrompido no meio de uma resposta (barge-in — o Sr. Douglas começando a falar, inclusive o próprio eco do Jarvis voltando pelo microfone sem fone), a resposta em andamento era invalidada, mas nada zerava `jarvisLoading` de volta — ele ficava travado em `true` pra sempre, e isso bloqueava TODA mensagem seguinte, de voz ou digitada (o envio se recusa a rodar com `jarvisLoading` true). Corrigido zerando esse estado sempre que uma interrupção acontece (`_liveInterrupt`) ou a ligação é encerrada (`stopJarvisLiveMode`). Também corrigido, no caminho: vazamento de blob de áudio na interrupção, e `rec.start()` do reconhecimento de voz sem proteção contra erro.
- **Auditoria geral (03/09)**: pedido do Douglas de revisar TODO o app atrás de bugs. 5 varreduras paralelas (Finance, Tarefas/Agenda, Notícias/Ações/Home, Jarvis modo ao vivo, HUD/Nav/Configurações/Anotações) encontraram e já foram corrigidos: "hoje" calculado em UTC em vez do fuso de Brasília em ~10 pontos (Agenda, Lançamentos, Tarefas, Home, criação de lançamento) — virava amanhã aos olhos do app das 21h à meia-noite; lançamento recorrente mensal duplicando (e dobrando a cada mês) por contar cada instância passada como uma série própria; duplicar lançamento de cartão não recalculava a fatura; aporte em meta acima do necessário sumia sem aviso; erro de escrita no banco ignorado quando só a SEGUNDA de duas escritas em paralelo falhava (pagamento de despesa fixa e de fatura); comparativo "vs. mês anterior" no dashboard comparando com o mês anterior a HOJE em vez de ao mês sendo visto ao navegar pra trás; troca rápida de ação/período no gráfico da B3 podia mostrar a série de preços errada (sem trava de requisição); notícia mostrada por fonte na Home sem garantia de ser a mais recente; botão Voltar do navegador saía da seção de Anotações inteira em vez de só fechar a nota aberta; Ctrl+K por cima do menu de barra (/) deixava ele "órfão" na tela; trocar de aba com uma nota aberta não esquecia ela (voltar caía direto na mesma nota); pasta apagada em outro dispositivo enquanto aberta aqui fazia o conteúdo "sumir" (na verdade só subiu de nível).
  - O lançamento "Faculdade" duplicado em 01/09 pelo bug de recorrência já foi apagado (com autorização do Douglas).

## Inspeção total com o Opus 5 (feita, 18/09)
Verificação com o código REAL do componente rodando fora do navegador (Node) com rede, áudio, microfone e banco simulados — comparando a versão anterior com a corrigida — mais logs do Supabase, avisos de segurança do banco e testes nas funções publicadas.
- **Voz do Jarvis**: servidor de voz (jarvis-speak) confirmado funcionando pelos logs (13/09: dois áudios MP3 reais gerados em ~1,2s). Simulação de ligação: versão anterior respondia 1 rodada e travava ouvindo (idêntico aos logs de produção de 13/09 — uma rodada e mais nenhuma chamada); versão atual fecha 3 de 3 rodadas, microfone nunca aberto durante a fala, mensagem digitada aparece e o carregando desliga.
- **Corrigido — perda de texto nas Anotações** (introduzido por mim em 03/09): trocar de aba ou apertar Voltar com uma nota aberta até 1,2s depois de digitar descartava o que foi digitado (o autosave atrasado via a nota já fechada e desistia). Toda saída agora salva antes de fechar, e também ao mandar o app pro fundo.
- **Corrigido — 23 gravações sem conferência**: a tela mostrava a mudança (às vezes com "salvo!") mas o erro do banco era engolido; a mudança sumia sozinha no próximo F5. Os casos de usuário (lançamento rápido, aporte em meta, duplicar/confirmar lançamento, concluir tarefa, pastas, mover, excluir pasta, remover ação, perfil, contexto do Jarvis, excluir lançamento) agora avisam e, nos de dinheiro, desfazem.
- **Corrigido — recorrentes do mês podiam nunca ser gerados**: o gerador marcava o mês como feito antes de gravar; e o de despesas fixas gravava parcela e marca em paralelo. Se a gravação falhasse, o mês ficava marcado sem nada criado.
- **Corrigido — data de amanhã depois das 21h** no cartão de nota ("editada em") e no "Atualizado em" das Notícias (mesma classe do bug de fuso de 03/09, que tinha escapado).
- **Segurança — cadastro de contas ABERTO no Supabase** (achado sério): qualquer pessoa pode criar conta com a chave pública do site e usar as funções pagas (Anthropic, Fish Audio, brapi). Os dados do Douglas continuam protegidos (RLS ok em todas as tabelas — nenhum aviso de tabela sem política). `jarvis-speak`, `stock-quotes` e `news-digest` agora recusam qualquer conta que não seja a do dono (publicadas e testadas). `jarvis-chat` e `jarvis-live-chat` NÃO receberam a trava: republicar a jarvis-chat exigiria transcrever 1.400 linhas à mão, risco de quebrar o Jarvis sem ninguém ver — a correção certa pra elas é desligar o cadastro.
  - **Pendente do Douglas**: desligar o cadastro em Supabase → Authentication → Sign In / Providers → "Allow new users to sign up" (10 segundos, fecha a porta pra tudo). Decidir se apago a conta de teste `claude-test…` criada em 20/08 (nunca foi removida) e a função `jarvis-live-chat`, que o app não usa mais mas continua no ar.
- **Cotações — gráfico falhou na única vez que foi aberto** (a Home funciona: 81/82 ok). Não deu pra reproduzir (a brapi exige a chave pra esse ticker). A função agora repassa o motivo real que a brapi der, pra saber da próxima vez se é o ticker, o período ou o plano grátis.
- **Avisos menores do banco** (não mexidos): extensão `pg_net` no schema public; função `handle_new_user` executável direto pela API (é gatilho de cadastro — some de importância com o cadastro desligado); proteção contra senha vazada desligada (opção do painel de Auth).
- **Sem problema**: nenhum erro no banco nas últimas 24h; os 5 timers do app têm caminho pra parar; nenhum "hoje" em UTC sobrando.
- **Conhecidos, não corrigidos (decisão de produto)**: apagar uma categoria deixa os lançamentos dela sem categoria, sem aviso; clicar numa tarefa no calendário abre o dia, não a tarefa (entra no refinamento da Agenda).

## Jarvis — pequenos ajustes
- **Shift+Enter no chat (feito, 20/09)**: o campo do Jarvis era um `<input type="text">`, que por definição não aceita quebra de linha — Shift+Enter não fazia nada em lugar nenhum. Os quatro campos (Home, tela do Jarvis, bolinha e janela flutuante) viraram `<textarea rows="1">` que cresce sozinho conforme o texto, até um teto de 150px (~9 linhas), quando passa a rolar por dentro. Enter sozinho continua enviando; Shift+Enter desce a linha, a caixa cresce e o chat acompanha o cursor. Depois de enviar, a caixa volta pra uma linha. As mensagens já eram renderizadas quebrando por `
` (`_parseJarvisContent`), então a mensagem multilinha chega e aparece certa.

---
*Itens marcados "(feito)" já foram implementados. O resto ainda é intenção — nada além disso foi construído.*
