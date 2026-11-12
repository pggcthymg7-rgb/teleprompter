export interface ScriptTemplate {
  id: string;
  title: string;
  content: string;
}

export const TEMPLATES: ScriptTemplate[] = [
  {
    id: 'imovel',
    title: '🏡 Apresentação de Imóvel',
    content: `Olá pessoal, sejam muito bem-vindos a este imóvel incrível!

Hoje eu quero apresentar com exclusividade essa residência que redefine o conceito de conforto, sofisticação e localização privilegiada.

Com ambientes amplos, integração total entre sala de estar, jantar e área gourmet, este imóvel foi planejado em cada detalhe para quem não abre mão de qualidade de vida.

Reparem no acabamento impecável, na iluminação natural e na vista espetacular que temos aqui da varanda.

Se você busca segurança, elegância e um lar pronto para morar com a sua família, este é o momento.

Entre em contato agora mesmo pelo link da bio e agende a sua visita exclusiva comigo. Te espero lá!`,
  },
  {
    id: 'pitch',
    title: '⚡ Pitch Rápido de 60s',
    content: `Você já perdeu um cliente importante simplesmente porque demorou para responder no WhatsApp?

No mercado imobiliário moderno, velocidade e personalização são tudo.

Apresentamos a nossa solução inteligente: atendimento automatizado 24 horas por dia, com inteligência artificial treinada especificamente para qualificar clientes e agendar visitas no piloto automático.

Enquanto você foca no fechamento dos negócios, o robô garante que nenhum lead fique sem resposta.

Quer transformar seu volume de vendas e multiplicar seus agendamentos?

Clique no botão abaixo e teste grátis agora mesmo!`,
  },
  {
    id: 'tutorial',
    title: '🎓 Vídeo Didático / Aula',
    content: `Olá a todos! No vídeo de hoje nós vamos aprender passo a passo como otimizar o fluxo de gravação e nunca mais travar diante da câmera.

Muitas pessoas acham que falar bem em vídeo é um dom nato, mas na verdade é 100% técnica e preparação.

O primeiro segredo é estruturar o raciocínio em três pilares: Introdução chamativa, conteúdo central objetivo e chamada para ação clara.

O segundo segredo é utilizar um teleprompter ajustado na velocidade da sua respiração natural.

Prontos para começar? Então deixe seu like, inscreva-se no canal e vamos direto ao conteúdo!`,
  },
];
