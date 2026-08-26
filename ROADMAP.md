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

## Login só com senha
- Tirar o campo de e-mail da tela de login — digitar só a senha já basta pra entrar.
- Faz sentido porque o app é de uso pessoal (só o Douglas usa); o e-mail sempre vai ser o mesmo.
- Douglas vai usar uma senha mais forte já pensando nisso (já que ela sozinha passa a ser a única barreira).
- Caminho provável de implementação: manter o Supabase Auth por trás (e-mail/senha) como está, só esconder o campo de e-mail na UI e preencher ele automaticamente com o e-mail fixo do Douglas ao enviar o login — não precisa trocar o método de autenticação, só simplificar a tela.

---
*Este arquivo é só uma lista de intenção — nada aqui foi implementado ainda.*
