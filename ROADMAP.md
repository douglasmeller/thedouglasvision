# Trilha de desenvolvimento — TheDouglasVision

Ideias e próximos passos discutidos, ainda não implementados.

## Jarvis / Friday
- **Voz**: sistema de voz pro Jarvis e pra Friday (text-to-speech na resposta, e possivelmente speech-to-text pro usuário falar em vez de digitar). Cogitado usar ElevenLabs.
- **Wake word "Jarvis"**: analisar viabilidade de ativar o app dizendo "Jarvis" em voz alta, inclusive com o celular bloqueado/desligado. Ponto de atenção: um PWA não tem acesso a wake-word em background com a tela desligada (isso exigiria um app nativo rodando serviço em segundo plano, ou depender de integrações do sistema como Siri Shortcuts/Google Assistant) — precisa de pesquisa de viabilidade antes de prometer a feature.

## Design / UI
- Passar um pente geral no frontend: identificar elementos "básicos" demais e dar mais personalidade visual ao app (já está bonito, mas dá pra melhorar).

## Lançamentos recorrentes com teto
- Hoje, recorrência é só "todo mês/toda semana", sem fim definido.
- Pedido: permitir configurar uma despesa/receita recorrente com **teto** — por valor total acumulado (ex: parcela do carro, recorrente todo dia 7, até somar R$25.000) ou por data final.
- Proposta do usuário: nova seção "Despesas" em Planejamento, no mesmo espírito das Metas — dá pra fazer aporte/pagamento e acompanhar progresso até o teto, e também salvar como recorrente automática.

## Exportação Excel
- Deixar o relatório mais bonito: filtros, valores de receita positivos e despesa negativos, cores, negrito, destaques visuais.

---
*Este arquivo é só uma lista de intenção — nada aqui foi implementado ainda.*
