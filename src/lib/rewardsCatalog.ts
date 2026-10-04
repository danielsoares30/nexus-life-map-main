// 100 reward templates for QuestLife
export interface RewardTemplate {
  title: string;
  description: string;
  xp_cost: number;
  category: string;
}

export const REWARDS_CATALOG: RewardTemplate[] = [
  // 🎬 Entretenimento (20)
  { title: "Assistir um filme", description: "Escolha seu filme favorito e relaxe", xp_cost: 30, category: "entretenimento" },
  { title: "Maratonar 3 episódios de série", description: "Sessão de binge-watching merecida", xp_cost: 50, category: "entretenimento" },
  { title: "Assistir um filme no cinema", description: "Experiência completa com pipoca", xp_cost: 80, category: "entretenimento" },
  { title: "Jogar videogame por 2 horas", description: "Sessão de jogos sem culpa", xp_cost: 40, category: "entretenimento" },
  { title: "Jogar videogame o dia todo", description: "Dia inteiro de gameplay épico", xp_cost: 150, category: "entretenimento" },
  { title: "Assistir um show/apresentação", description: "Entretenimento ao vivo", xp_cost: 120, category: "entretenimento" },
  { title: "Maratona de anime", description: "Sessão completa do seu anime favorito", xp_cost: 45, category: "entretenimento" },
  { title: "Ir ao teatro", description: "Uma noite cultural sofisticada", xp_cost: 100, category: "entretenimento" },
  { title: "Karaokê com amigos", description: "Soltar a voz sem julgamentos", xp_cost: 60, category: "entretenimento" },
  { title: "Noite de jogos de tabuleiro", description: "Diversão analógica com companhia", xp_cost: 35, category: "entretenimento" },
  { title: "Assistir a um jogo ao vivo", description: "Torcer no estádio/arena", xp_cost: 130, category: "entretenimento" },
  { title: "Sessão de podcast favorito", description: "2 horas do podcast que você ama", xp_cost: 20, category: "entretenimento" },
  { title: "Maratona de documentários", description: "Aprender se divertindo", xp_cost: 35, category: "entretenimento" },
  { title: "Assistir um stand-up", description: "Rir é o melhor remédio", xp_cost: 70, category: "entretenimento" },
  { title: "Noite de quiz/trivia", description: "Testar seus conhecimentos", xp_cost: 40, category: "entretenimento" },
  { title: "Ir ao museu/exposição", description: "Alimentar a mente com arte", xp_cost: 55, category: "entretenimento" },
  { title: "Sessão de realidade virtual", description: "Explorar mundos virtuais", xp_cost: 90, category: "entretenimento" },
  { title: "Escape room", description: "Desafio de fuga em equipe", xp_cost: 100, category: "entretenimento" },
  { title: "Parque de diversões", description: "Um dia inteiro de adrenalina", xp_cost: 140, category: "entretenimento" },
  { title: "Comprar um jogo novo", description: "Aquele game que você queria", xp_cost: 120, category: "entretenimento" },

  // 🍔 Comida (15)
  { title: "Pedir delivery especial", description: "Aquele restaurante que você ama", xp_cost: 50, category: "comida" },
  { title: "Jantar fora em restaurante", description: "Uma refeição especial fora de casa", xp_cost: 80, category: "comida" },
  { title: "Sobremesa premium", description: "O doce mais gostoso da confeitaria", xp_cost: 30, category: "comida" },
  { title: "Café especial na cafeteria", description: "Um latte art ou especialidade", xp_cost: 25, category: "comida" },
  { title: "Rodízio de pizza", description: "Pizza até não aguentar mais", xp_cost: 60, category: "comida" },
  { title: "Rodízio de sushi", description: "Sushi ilimitado merecido", xp_cost: 70, category: "comida" },
  { title: "Churrasco com amigos", description: "Carne de qualidade e boa companhia", xp_cost: 90, category: "comida" },
  { title: "Experimentar culinária nova", description: "Comida tailandesa, indiana, peruana...", xp_cost: 65, category: "comida" },
  { title: "Comprar ingredientes premium", description: "Cozinhar algo especial em casa", xp_cost: 45, category: "comida" },
  { title: "Sorvete artesanal", description: "2 bolas do melhor sorvete", xp_cost: 20, category: "comida" },
  { title: "Brunch especial", description: "Café da manhã caprichado", xp_cost: 55, category: "comida" },
  { title: "Chocolate importado", description: "Uma barra do chocolate premium", xp_cost: 35, category: "comida" },
  { title: "Açaí completo", description: "Taça de açaí com todos os extras", xp_cost: 25, category: "comida" },
  { title: "Food truck festival", description: "Explorar comidas de rua gourmet", xp_cost: 50, category: "comida" },
  { title: "Degustação de vinhos/cervejas", description: "Experiência gastronômica sofisticada", xp_cost: 85, category: "comida" },

  // 🛍️ Compras (15)
  { title: "Comprar uma roupa nova", description: "Aquela peça que você está de olho", xp_cost: 100, category: "compras" },
  { title: "Acessório novo", description: "Relógio, óculos ou bijuteria", xp_cost: 80, category: "compras" },
  { title: "Livro novo", description: "Aquele livro da sua wishlist", xp_cost: 40, category: "compras" },
  { title: "Gadget/Eletrônico pequeno", description: "Fone, cabo, acessório tech", xp_cost: 90, category: "compras" },
  { title: "Item de decoração", description: "Algo novo para o quarto/escritório", xp_cost: 60, category: "compras" },
  { title: "Produto de skincare", description: "Cuidar da pele é autocuidado", xp_cost: 45, category: "compras" },
  { title: "Perfume novo", description: "Fragrância que você ama", xp_cost: 110, category: "compras" },
  { title: "Tênis novo", description: "Um par que combine com seu estilo", xp_cost: 130, category: "compras" },
  { title: "Assinatura de streaming", description: "1 mês do serviço que você quer", xp_cost: 35, category: "compras" },
  { title: "Planta nova", description: "Verde para o ambiente", xp_cost: 25, category: "compras" },
  { title: "Caneca/Garrafa personalizada", description: "Item de uso diário especial", xp_cost: 30, category: "compras" },
  { title: "Material de arte/hobby", description: "Investir no seu passatempo", xp_cost: 55, category: "compras" },
  { title: "Suplemento especial", description: "Whey, creatina, vitaminas premium", xp_cost: 70, category: "compras" },
  { title: "Capa de celular estilosa", description: "Proteção com personalidade", xp_cost: 30, category: "compras" },
  { title: "Mochila/Bolsa nova", description: "Upgrade no seu carregamento diário", xp_cost: 95, category: "compras" },

  // 🧘 Autocuidado (15)
  { title: "Dia de spa em casa", description: "Banho relaxante, máscara e cuidados", xp_cost: 35, category: "autocuidado" },
  { title: "Massagem profissional", description: "Relaxar corpo e mente", xp_cost: 100, category: "autocuidado" },
  { title: "Dormir até tarde", description: "Sem alarme, sem compromissos", xp_cost: 25, category: "autocuidado" },
  { title: "Banho de banheira", description: "Com sais, velas e música", xp_cost: 30, category: "autocuidado" },
  { title: "Tarde de leitura", description: "Horas dedicadas ao livro favorito", xp_cost: 20, category: "autocuidado" },
  { title: "Sessão de meditação longa", description: "1 hora de paz interior", xp_cost: 25, category: "autocuidado" },
  { title: "Caminhada na natureza", description: "Trilha, parque ou praia", xp_cost: 15, category: "autocuidado" },
  { title: "Corte de cabelo/barba", description: "Visual renovado e confiante", xp_cost: 45, category: "autocuidado" },
  { title: "Dia sem telas", description: "Desintoxicação digital total", xp_cost: 60, category: "autocuidado" },
  { title: "Yoga ou pilates", description: "Sessão de flexibilidade e equilíbrio", xp_cost: 20, category: "autocuidado" },
  { title: "Aromaterapia", description: "Óleos essenciais e relaxamento", xp_cost: 25, category: "autocuidado" },
  { title: "Journaling criativo", description: "Escrever sem filtro por 1 hora", xp_cost: 15, category: "autocuidado" },
  { title: "Sessão de skincare completa", description: "Limpeza, tônico, sérum, hidratante", xp_cost: 20, category: "autocuidado" },
  { title: "Manhã sem pressa", description: "Café da manhã calmo e sereno", xp_cost: 15, category: "autocuidado" },
  { title: "Descanso mental completo", description: "Não fazer absolutamente nada e curtir", xp_cost: 40, category: "autocuidado" },

  // 🌍 Experiências (15)
  { title: "Passeio em parque/jardim", description: "Contato com a natureza", xp_cost: 20, category: "experiencias" },
  { title: "Visita a cidade próxima", description: "Mini viagem bate-e-volta", xp_cost: 100, category: "experiencias" },
  { title: "Aula experimental", description: "Dança, culinária, cerâmica...", xp_cost: 60, category: "experiencias" },
  { title: "Piquenique no parque", description: "Ao ar livre com comida boa", xp_cost: 35, category: "experiencias" },
  { title: "Passeio de bicicleta", description: "Explorar a cidade pedalando", xp_cost: 20, category: "experiencias" },
  { title: "Sessão de fotos", description: "Registrar momentos e lugares", xp_cost: 25, category: "experiencias" },
  { title: "Cozinhar receita nova", description: "Experimentar algo nunca feito", xp_cost: 30, category: "experiencias" },
  { title: "Feira de artesanato", description: "Descobrir peças únicas e artesanais", xp_cost: 30, category: "experiencias" },
  { title: "Observar o pôr do sol", description: "Momento contemplativo especial", xp_cost: 10, category: "experiencias" },
  { title: "Acampamento de 1 dia", description: "Aventura ao ar livre", xp_cost: 80, category: "experiencias" },
  { title: "Visitar uma livraria", description: "Explorar prateleiras por horas", xp_cost: 15, category: "experiencias" },
  { title: "Andar de skate/patins", description: "Adrenalina sobre rodas", xp_cost: 25, category: "experiencias" },
  { title: "Workshop criativo", description: "Aprender algo totalmente novo", xp_cost: 70, category: "experiencias" },
  { title: "Jantar temático em casa", description: "Decoração, comida e clima especial", xp_cost: 50, category: "experiencias" },
  { title: "Nascer do sol", description: "Acordar cedo e ver o amanhecer", xp_cost: 15, category: "experiencias" },

  // 🎯 Social (10)
  { title: "Encontro com amigos", description: "Sair com as pessoas que você gosta", xp_cost: 40, category: "social" },
  { title: "Ligar para alguém especial", description: "Reconectar com quem importa", xp_cost: 10, category: "social" },
  { title: "Organizar um encontro", description: "Reunir o grupo para algo divertido", xp_cost: 50, category: "social" },
  { title: "Happy hour", description: "Drinks e conversa descontraída", xp_cost: 55, category: "social" },
  { title: "Noite de filmes com amigos", description: "Sessão de cinema caseira coletiva", xp_cost: 30, category: "social" },
  { title: "Presente para alguém", description: "Surpreender quem você ama", xp_cost: 60, category: "social" },
  { title: "Cozinhar para alguém", description: "Preparar uma refeição especial", xp_cost: 35, category: "social" },
  { title: "Dia com a família", description: "Tempo de qualidade familiar", xp_cost: 25, category: "social" },
  { title: "Escrever carta/mensagem", description: "Gratidão em forma escrita", xp_cost: 15, category: "social" },
  { title: "Voluntariado", description: "Ajudar o próximo e se sentir bem", xp_cost: 20, category: "social" },

  // 🏆 Premium (10)
  { title: "Day off completo", description: "Dia inteiro livre de obrigações", xp_cost: 200, category: "premium" },
  { title: "Viagem de fim de semana", description: "Escapada de 2 dias para relaxar", xp_cost: 300, category: "premium" },
  { title: "Compra grande planejada", description: "Aquele item especial que você merece", xp_cost: 250, category: "premium" },
  { title: "Experiência gastronômica", description: "Jantar em restaurante sofisticado", xp_cost: 180, category: "premium" },
  { title: "Curso ou workshop premium", description: "Investir em conhecimento especial", xp_cost: 200, category: "premium" },
  { title: "Eletrônico novo", description: "Upgrade tecnológico desejado", xp_cost: 350, category: "premium" },
  { title: "Experiência radical", description: "Paraquedismo, bungee jump, etc.", xp_cost: 280, category: "premium" },
  { title: "Ingresso VIP", description: "Show, evento ou experiência premium", xp_cost: 220, category: "premium" },
  { title: "Spa day completo", description: "Dia inteiro de tratamentos relaxantes", xp_cost: 200, category: "premium" },
  { title: "Renovar o guarda-roupa", description: "Shopping spree merecida", xp_cost: 300, category: "premium" },
];

export const REWARD_CATEGORIES = [
  { value: "entretenimento", label: "🎬 Entretenimento", count: 20 },
  { value: "comida", label: "🍔 Comida", count: 15 },
  { value: "compras", label: "🛍️ Compras", count: 15 },
  { value: "autocuidado", label: "🧘 Autocuidado", count: 15 },
  { value: "experiencias", label: "🌍 Experiências", count: 15 },
  { value: "social", label: "🎯 Social", count: 10 },
  { value: "premium", label: "🏆 Premium", count: 10 },
];
