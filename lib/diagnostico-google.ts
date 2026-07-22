export type ItemDiagnostico = {
  t: string;  // título do item
  h: string;  // pergunta curta (modo edição)
  p: string;  // explicação do problema (relatório)
  f: string;  // correção sugerida (relatório)
};

export type BlocoDiagnostico = { name: string; items: ItemDiagnostico[] };

export const BLOCOS: BlocoDiagnostico[] = [
  { name:"Identidade", items:[
    { t:"Categoria principal correta", h:"É a categoria certa para o negócio?",
      p:"A categoria principal é o que decide em quais buscas a ficha entra. Errada ou genérica, o negócio simplesmente não aparece para quem procura pelo serviço que ele presta.",
      f:"Definir a categoria exata e revisar as secundárias." },
    { t:"Categorias secundárias preenchidas", h:"Há categorias extras além da principal?",
      p:"Sem categorias secundárias, a ficha cobre uma fatia pequena das buscas. Cada serviço adicional é uma porta de entrada que está fechada.",
      f:"Adicionar de 3 a 5 categorias secundárias ligadas aos serviços reais." },
    { t:"Nome sem excesso de palavra-chave", h:"O nome é o nome real do negócio?",
      p:"Nome recheado de palavra-chave é motivo de suspensão da ficha pelo Google, e concorrentes podem denunciar a qualquer momento.",
      f:"Deixar o nome igual ao da fachada e mover as palavras-chave para a descrição." },
    { t:"Descrição preenchida", h:"Tem texto de apresentação?",
      p:"A descrição é o único espaço onde o negócio fala com as próprias palavras. Vazia, quem chega na ficha não entende o diferencial e vai ver o concorrente.",
      f:"Escrever 750 caracteres cobrindo serviços, bairros atendidos e diferenciais." }
  ]},
  { name:"Contato", items:[
    { t:"Telefone cadastrado", h:"Aparece número de contato?",
      p:"Sem telefone, o botão de ligar não existe. A parcela de clientes que decide na hora e liga direto do Maps é perdida inteira.",
      f:"Cadastrar o telefone principal e um secundário." },
    { t:"Site ou link cadastrado", h:"Tem site, Instagram ou WhatsApp no campo?",
      p:"O campo de site vazio corta o caminho entre a busca e a venda. Mesmo sem site, o link pode levar direto para o WhatsApp.",
      f:"Apontar o campo para o WhatsApp ou Instagram enquanto não houver site." },
    { t:"Endereço e pin corretos", h:"O pin cai no lugar certo no mapa?",
      p:"Pin fora do lugar manda o cliente para o endereço errado e derruba a posição da ficha nas buscas por proximidade.",
      f:"Reposicionar o pin manualmente e conferir o endereço completo." }
  ]},
  { name:"Horário", items:[
    { t:"Horário completo dos 7 dias", h:"Todos os dias estão configurados?",
      p:"Ficha sem horário perde espaço nas buscas por 'aberto agora', que é justamente quem quer comprar naquele momento.",
      f:"Preencher os sete dias, inclusive os de fechamento." },
    { t:"Feriados configurados", h:"Há horário especial cadastrado?",
      p:"Em feriado, o Google mostra um aviso de horário não confirmado. O cliente na dúvida escolhe o concorrente que confirmou.",
      f:"Cadastrar os feriados do semestre de uma vez." }
  ]},
  { name:"Fotos", items:[
    { t:"Logo e capa definidas", h:"As duas imagens principais estão lá?",
      p:"Logo e capa são o primeiro contato visual. Sem elas, a ficha aparece com imagem genérica e passa impressão de negócio abandonado.",
      f:"Subir logo quadrada e capa horizontal em boa resolução." },
    { t:"Dez fotos ou mais", h:"O acervo tem volume?",
      p:"Fichas com acervo de fotos recebem mais cliques e mais pedidos de rota que fichas com duas ou três imagens.",
      f:"Montar um acervo inicial de 15 a 20 fotos." },
    { t:"Foto publicada nos últimos 30 dias", h:"Tem movimento recente?",
      p:"Acervo parado sinaliza ficha inativa. Atividade recente é um dos sinais que o Google usa para ordenar resultados locais.",
      f:"Programar publicação de fotos toda semana." },
    { t:"Fotos internas e de produto", h:"Mostra o ambiente e o que se vende?",
      p:"Só fachada não vende. O cliente quer ver o ambiente e o produto antes de decidir se vale a viagem.",
      f:"Fotografar ambiente, equipe e os itens mais vendidos." }
  ]},
  { name:"Reputação", items:[
    { t:"Volume de avaliações saudável", h:"Tem 20 avaliações ou mais?",
      p:"Poucas avaliações fazem a nota oscilar demais e transmitem pouca confiança na comparação com o concorrente ao lado.",
      f:"Implantar rotina de pedido de avaliação por QR Code e WhatsApp." },
    { t:"Nota 4,0 ou acima", h:"A média está saudável?",
      p:"Abaixo de 4,0, boa parte dos clientes descarta o negócio sem nem abrir a ficha. É o filtro mental mais comum na escolha.",
      f:"Tratar as críticas recorrentes e puxar avaliações positivas dos clientes fiéis." },
    { t:"Avaliações respondidas", h:"As respostas estão em dia?",
      p:"Avaliação sem resposta, principalmente negativa, fica como versão única da história para todo mundo que chega depois.",
      f:"Responder o passivo e manter resposta em até 48 horas." },
    { t:"Post publicado nos últimos 30 dias", h:"A aba de novidades tem movimento?",
      p:"A ficha tem um espaço de publicações que quase ninguém usa. Ocupá-lo é presença gratuita onde o concorrente está ausente.",
      f:"Publicar uma novidade ou oferta por semana." }
  ]}
];

export const TOTAL_ITENS = BLOCOS.reduce((acc, b) => acc + b.items.length, 0);

export type Faixa = 'ok' | 'warn' | 'danger';

export function faixaDaNota(nota: number): Faixa {
  if (nota >= 75) return 'ok';
  if (nota >= 45) return 'warn';
  return 'danger';
}

export const VEREDITO_TEXTO: Record<Faixa, string> = {
  ok:     'Ficha bem cuidada, com pontos de ajuste.',
  warn:   'Ficha pela metade.',
  danger: 'Ficha desatualizada.',
};

export function calcularNota(marcados: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((marcados / total) * 100);
}
