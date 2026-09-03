# Trilha de desenvolvimento — TheDouglasVision

Ideias e próximos passos discutidos, ainda não implementados.

## Jarvis
- **Voz — entrada (feito)**: botão de microfone no chat usa a Web Speech API do navegador pra transcrever fala em texto no campo de mensagem (sem custo, sem chave nova). Envio continua manual de propósito — evita que um erro de reconhecimento vire uma ação executada sem querer.
- **Voz — saída (pendente)**: Jarvis e Friday responderem falando (text-to-speech), com voz de verdade parecida com a dos personagens do filme. Plano: Douglas vai tentar achar/baixar uma amostra de áudio da voz real do Jarvis; com isso em mãos, o caminho mais realista é clonar a voz via ElevenLabs (pago) — uma voz mais grave/britânica pro Jarvis, outra pra Friday. Avisar quando tiver o áudio pra integrar.
- **Wake word "Jarvis"**: analisar viabilidade de ativar o app dizendo "Jarvis" em voz alta, inclusive com o celular bloqueado/desligado. Ponto de atenção: um PWA não tem acesso a wake-word em background com a tela desligada (isso exigiria um app nativo rodando serviço em segundo plano, ou depender de integrações do sistema como Siri Shortcuts/Google Assistant) — precisa de pesquisa de viabilidade antes de prometer a feature.

## Design / UI
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
  - **Pendente — refinamento grande**: integrar com prazo de conclusão das tarefas (evento auto-gerado ou vinculado). Eventos recorrentes (tipo de recorrência, duração do evento). Arrastar um evento de um dia pra outro. Integração com Google Maps — sugestões de endereço ao criar o evento e link pra abrir no Maps; se der, uma sessão de mapa dentro do próprio TDV. Escopo grande, dá pra quebrar em fases (recorrência + duração primeiro, drag-and-drop depois, Maps por último — é a parte que depende de API externa/chave nova).
- **Anotações (feito)**: bloco de notas estilo dontpad — formatação rica, autosave.
  - **Editor corrigido (feito, 03/09)**: tamanho de fonte, cor de texto e marca-texto dependiam do `document.execCommand`, API antiga inconsistente entre navegadores — reescritos pra envolver a seleção manualmente num `<span style="...">`, com valores de tamanho em px de verdade. Checklist reescrito do zero (o antigo aninhava divs de forma imprevisível a cada Enter — confirmado na estrutura real de uma nota do Douglas); agora cada item é uma linha própria, Enter cria a próxima linha ou sai da lista se estiver vazia, Backspace numa linha vazia remove ela. Notas antigas com o checklist quebrado são migradas sozinhas ao abrir. Adicionado alinhamento (esquerda/centro/direita), que não existia.
  - **Estilo Notion (feito, 03/09)**: pesquisado o essencial do editor do Notion (blocos, slash command, atalhos de markdown, hierarquia de página) e adaptado pro TDV. Botão de cor virou uma letra "A" colorida num quadrado arredondado (era um círculo sólido, igual o Notion faz de verdade). Digitar `/` no início de uma linha abre um menu (mesma mecânica do command palette Ctrl+K, só que perto do cursor) com os blocos: Título 1/2/3, Lista, Lista numerada, Checklist, Citação, Callout, Toggle (`<details>` nativo, abre/fecha de graça), Divisor, Código, Tabela. Atalhos de markdown também funcionam (`# `, `## `, `> `, `--- `, `- `, `1. `, `[] `). **Pastas aninhadas** (pastas dentro de pastas, sem limite) — navegação estilo explorador de arquivos: entra na pasta, breadcrumb no topo volta. Apagar uma pasta não apaga o conteúdo (notas e subpastas sobem um nível). Ação "mover para" em nota e pasta. Jarvis ganhou `folder_name` em create_note/update_note/list_notes — acha ou cria a pasta na raiz sozinho.
  - **Ainda em aberto**: busca por conteúdo, anexar imagem, histórico de versões — não pedidos ainda, ficam pra quando o Douglas quiser.
- **Notícias (feito)**: resumo diário por IA dos 4 sites de interesse (Flow Games, Meu Timão, Reforma Tributária, Ei Nerd), gerado via Edge Function + cron diário ou botão "Atualizar agora". Resumo dividido por fonte, 6 manchetes por site (era 5).
  - **Atualização automática — bug corrigido (feito, 03/09)**: a checagem de "resumo recente" comparava por janela de horas (20h) em vez de por dia — um clique manual em "Atualizar agora" à noite cancelava o cron da manhã seguinte (a janela de 20h ainda não tinha passado às 07:00). Trocado pra comparar a data (fuso de Brasília): gera no máximo uma vez por dia, mas sempre gera se o dia mudou, não importa quando foi o último clique manual.
- **Ações (feito, ver "Home rica" acima)**: watchlist de tickers B3 com cotação quase-ao-vivo, dentro do widget da Home — não é um setor de nav própria, mora na Home.
- **Mensagens**: Douglas ainda quer discutir como isso funcionaria antes de desenhar (o quê exatamente — mensageria interna? Integração com apps externos? Ainda em aberto).
- **Cofre de senhas**: novo setor pra guardar todas as senhas, organizável por pastas. Exigência de segurança explícita do Douglas: precisa digitar a senha do app de novo pra entrar nessa sessão específica (uma segunda barreira, não basta já estar logado no TDV). Nome da página: "Cofre de Senhas". Não desenhar a arquitetura de criptografia sem alinhar antes — dado sensível de verdade, merece uma conversa própria sobre onde/como fica cifrado (client-side antes de subir pro Supabase, provavelmente) antes de qualquer linha de código.

## Navegação
- **URL sincronizada com a aba ativa (feito, 03/09)**: cada aba tem seu próprio caminho (`/agenda`, `/tarefas`, `/noticias`, etc, e `/` pra Home) via `history.pushState`, sem framework de rotas — `componentDidUpdate` mantém a URL em sincronia com `screen` a cada render, só empurrando uma entrada nova quando realmente mudou. Botão voltar/avançar do navegador funciona (via `popstate`). A URL manda na carga inicial — só cai no default configurado por dispositivo quando abre pela raiz "/". `vercel.json` ganhou rewrite catch-all pra `/index.html`, senão abrir/atualizar direto numa dessas URLs dava 404 no servidor.

## Jarvis — bugs reportados (precisam de mais detalhe pra reproduzir)
- **Resposta só aparece depois de dar F5**: ao mandar mensagem, a resposta do Jarvis não aparece na hora — só depois de recarregar a página manualmente. Cheira a um problema no fluxo de streaming (SSE) do `jarvis-chat` ou em como o estado da conversa é atualizado no cliente depois do `done`. Preciso que o Douglas descreva o passo a passo (acontece sempre? só em conversa longa? no celular, no PC, nos dois?) antes de sair mexendo — é um bug sério (funcionalidade central) e merece diagnóstico, não um chute.
- **Modo de conversa ao vivo "bugado"**: sem mais detalhe do que isso na anotação. Preciso saber o sintoma exato (não liga, corta a fala, não entende o que foi dito, trava o microfone) pra investigar o ponto certo.

## Jarvis — pequenos ajustes
- **Shift+Enter no chat deve rolar a tela pra baixo**: ao quebrar linha com Shift+Enter numa mensagem longa, o campo cresce mas a view não acompanha o cursor.

---
*Itens marcados "(feito)" já foram implementados. O resto ainda é intenção — nada além disso foi construído.*
