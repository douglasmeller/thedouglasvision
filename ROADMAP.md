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

## TDV como "sistema operacional da vida" — reestruturação grande
- Visão: o TDV deixa de ser só finanças e vira o sistema pessoal do Douglas como um todo, pra sempre.
- O que existe hoje (Dashboard financeiro, Lançamentos, Planejamento, Categorias) vira uma aba/setor específico: **Finance**.
- Tarefas, Jarvis e Configurações saem de dentro do Finance e passam a ser setores próprios, no mesmo nível.
- Nova aba **Home** — uma tela inicial do sistema como um todo (ainda não desenhada; provavelmente um resumo cross-setor: finanças + tarefas + o que mais entrar depois, tipo Calendário/Notas do plano já existente).
- Configurações ganha uma opção pra escolher em qual setor o app deve abrir por padrão, por dispositivo — ex: no iPhone, sempre abrir direto em Finance (praticidade pra lançar gasto na hora), enquanto no desktop pode abrir em Home.
- Isso é maior que os módulos já em andamento (Tarefas, Calendário, Notas) — é a estrutura de navegação inteira do app mudando. Vale desenhar/alinhar a arquitetura de rotas antes de sair implementando.

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

---
*Itens marcados "(feito)" já foram implementados. O resto ainda é intenção — nada além disso foi construído.*
