// QuestLife - RPG Archetypes System

export interface Archetype {
  id: string;
  name: string;
  icon: string;
  title: string;
  description: string;
  lore: string;
  bonuses: {
    category: string;
    multiplier: number;
    label: string;
  }[];
  color: string;
}

export const ARCHETYPES: Archetype[] = [
  {
    id: "warrior",
    name: "Guerreiro",
    icon: "⚔️",
    title: "O Destemido",
    description: "Força bruta e disciplina. Domina tarefas físicas e desafios intensos.",
    lore: "Forjado nas chamas da batalha, o Guerreiro nunca recua. Sua vontade é sua armadura.",
    bonuses: [
      { category: "health", multiplier: 1.5, label: "+50% XP em Treinos" },
      { category: "work", multiplier: 1.2, label: "+20% XP em Trabalho" },
    ],
    color: "hsl(var(--strength))",
  },
  {
    id: "mage",
    name: "Mago",
    icon: "🧙",
    title: "O Sábio",
    description: "Intelecto afiado e sede de conhecimento. Mestre dos estudos.",
    lore: "O conhecimento é a verdadeira magia. O Mago transforma estudo em poder inimaginável.",
    bonuses: [
      { category: "study", multiplier: 1.5, label: "+50% XP em Estudos" },
      { category: "spiritual", multiplier: 1.2, label: "+20% XP em Espiritual" },
    ],
    color: "hsl(var(--wisdom))",
  },
  {
    id: "paladin",
    name: "Paladino",
    icon: "🛡️",
    title: "O Protetor",
    description: "Equilíbrio entre corpo e mente. Disciplina é seu escudo.",
    lore: "Jurou proteger os mais fracos e manter a ordem. Sua disciplina é inquebrantável.",
    bonuses: [
      { category: "personal", multiplier: 1.3, label: "+30% XP em Pessoal" },
      { category: "health", multiplier: 1.3, label: "+30% XP em Saúde" },
    ],
    color: "hsl(var(--xp))",
  },
  {
    id: "ranger",
    name: "Ranger",
    icon: "🏹",
    title: "O Explorador",
    description: "Versatilidade e foco. Adapta-se a qualquer situação.",
    lore: "Os caminhos inexplorados são seu lar. O Ranger prospera na adversidade.",
    bonuses: [
      { category: "work", multiplier: 1.3, label: "+30% XP em Trabalho" },
      { category: "projects", multiplier: 1.3, label: "+30% XP em Projetos" },
    ],
    color: "hsl(var(--health))",
  },
  {
    id: "monk",
    name: "Monge",
    icon: "🥋",
    title: "O Equilibrado",
    description: "Consistência e paz interior. Mestre dos hábitos.",
    lore: "Através da repetição, o Monge transcende. Cada dia é um passo na senda da perfeição.",
    bonuses: [
      { category: "health", multiplier: 1.4, label: "+40% XP em Treinos" },
      { category: "spiritual", multiplier: 1.3, label: "+30% XP em Espiritual" },
    ],
    color: "hsl(var(--charisma))",
  },
  {
    id: "alchemist",
    name: "Alquimista",
    icon: "⚗️",
    title: "O Transformador",
    description: "Transforma recursos em ouro. Mestre das finanças.",
    lore: "Onde outros veem escassez, o Alquimista encontra abundância. O dinheiro é seu elixir.",
    bonuses: [
      { category: "work", multiplier: 1.5, label: "+50% XP em Finanças" },
      { category: "projects", multiplier: 1.2, label: "+20% XP em Projetos" },
    ],
    color: "hsl(var(--xp))",
  },
  {
    id: "druid",
    name: "Druida",
    icon: "🌿",
    title: "O Natural",
    description: "Harmonia com o corpo e natureza. Cura e regeneração.",
    lore: "A natureza fala e o Druida ouve. Seu corpo é templo, sua mente é floresta.",
    bonuses: [
      { category: "health", multiplier: 1.5, label: "+50% XP em Saúde" },
      { category: "personal", multiplier: 1.2, label: "+20% XP em Pessoal" },
    ],
    color: "hsl(var(--health))",
  },
  {
    id: "bard",
    name: "Bardo",
    icon: "🎭",
    title: "O Inspirador",
    description: "Criatividade e carisma. Eleva todos ao seu redor.",
    lore: "Com uma canção, o Bardo muda o destino. Sua arte é sua arma mais poderosa.",
    bonuses: [
      { category: "personal", multiplier: 1.4, label: "+40% XP em Pessoal" },
      { category: "spiritual", multiplier: 1.3, label: "+30% XP em Espiritual" },
    ],
    color: "hsl(var(--mana))",
  },
  {
    id: "assassin",
    name: "Assassino",
    icon: "🗡️",
    title: "O Preciso",
    description: "Eficiência máxima. Foco cirúrgico em resultados.",
    lore: "Um golpe, uma missão cumprida. O Assassino não perde tempo com o desnecessário.",
    bonuses: [
      { category: "work", multiplier: 1.5, label: "+50% XP em Trabalho" },
      { category: "study", multiplier: 1.2, label: "+20% XP em Estudos" },
    ],
    color: "hsl(var(--strength))",
  },
  {
    id: "necromancer",
    name: "Necromante",
    icon: "💀",
    title: "O Renascido",
    description: "Das cinzas renasce. Mestre em superar fracassos e recomeçar.",
    lore: "A morte é apenas o começo. O Necromante transforma derrotas em vitórias sombrias.",
    bonuses: [
      { category: "study", multiplier: 1.3, label: "+30% XP em Estudos" },
      { category: "projects", multiplier: 1.4, label: "+40% XP em Projetos" },
    ],
    color: "hsl(var(--mana))",
  },
];

export function getArchetype(id: string): Archetype | undefined {
  return ARCHETYPES.find((a) => a.id === id);
}

export function getArchetypeXpMultiplier(archetypeId: string | null, category: string): number {
  if (!archetypeId) return 1;
  const arch = getArchetype(archetypeId);
  if (!arch) return 1;
  const bonus = arch.bonuses.find((b) => b.category === category);
  return bonus?.multiplier || 1;
}
