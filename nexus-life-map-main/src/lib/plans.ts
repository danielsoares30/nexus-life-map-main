export interface PlanFeature {
  text: string;
  included: boolean;
}

export interface Plan {
  id: string;
  name: string;
  icon: string;
  rarity: string;
  price: string;
  priceLabel: string;
  description: string;
  features: PlanFeature[];
  cta: string;
  popular?: boolean;
}

export const PLANS: Plan[] = [
  {
    id: "free",
    name: "Aprendiz",
    icon: "🌱",
    rarity: "common",
    price: "Grátis",
    priceLabel: "para sempre",
    description: "Comece sua jornada de evolução pessoal com as ferramentas essenciais.",
    cta: "Começar Grátis",
    features: [
      { text: "Dashboard com visão geral", included: true },
      { text: "Gerenciamento de missões/tarefas", included: true },
      { text: "Controle de hábitos básico", included: true },
      { text: "Registro de humor diário", included: true },
      { text: "Diário pessoal", included: true },
      { text: "Sistema de XP e níveis", included: true },
      { text: "10 arquétipos de personagem", included: true },
      { text: "Catálogo de recompensas (100)", included: true },
      { text: "Análises e insights de IA", included: false },
      { text: "Planner semanal inteligente", included: false },
      { text: "Metas financeiras ilimitadas", included: false },
      { text: "Ranking e guilds", included: false },
    ],
  },
  {
    id: "pro",
    name: "Cavaleiro",
    icon: "⚔️",
    rarity: "epic",
    price: "R$29,90",
    priceLabel: "/mês",
    description: "Desbloqueie o verdadeiro potencial com ferramentas avançadas de produtividade.",
    cta: "Evoluir para Cavaleiro",
    popular: true,
    features: [
      { text: "Tudo do plano Aprendiz", included: true },
      { text: "Planner semanal inteligente com IA", included: true },
      { text: "Análises detalhadas e insights", included: true },
      { text: "Metas financeiras ilimitadas", included: true },
      { text: "Investimentos avançados", included: true },
      { text: "Desafios semanais exclusivos", included: true },
      { text: "Treinos com planos personalizados", included: true },
      { text: "Pomodoro com estatísticas", included: true },
      { text: "Conquistas exclusivas (50+)", included: true },
      { text: "Temas visuais premium", included: true },
      { text: "Coach IA pessoal", included: false },
      { text: "Ranking e guilds", included: false },
    ],
  },
  {
    id: "legend",
    name: "Lenda",
    icon: "👑",
    rarity: "legendary",
    price: "R$59,90",
    priceLabel: "/mês",
    description: "O poder absoluto. Acesso total a todas as funcionalidades presentes e futuras.",
    cta: "Tornar-se Lenda",
    features: [
      { text: "Tudo do plano Cavaleiro", included: true },
      { text: "Coach IA pessoal 24/7", included: true },
      { text: "Planejamento de vida com IA", included: true },
      { text: "Ranking global e guilds", included: true },
      { text: "Missões cooperativas", included: true },
      { text: "Avatares e molduras exclusivas", included: true },
      { text: "Relatórios mensais PDF", included: true },
      { text: "Prioridade no suporte", included: true },
      { text: "Acesso antecipado a features", included: true },
      { text: "Badge Lendário no perfil", included: true },
      { text: "Backup automático de dados", included: true },
      { text: "API e integrações externas", included: true },
    ],
  },
];
