// QuestLife - Game Data & Types

export interface UserStats {
  level: number;
  xp: number;
  xpToNext: number;
  totalXp: number;
  streak: number;
  multiplier: number;
}

export interface Attributes {
  discipline: number;
  focus: number;
  intelligence: number;
  consistency: number;
  health: number;
  mentalBalance: number;
}

export interface Task {
  id: string;
  title: string;
  category: TaskCategory;
  difficulty: 'easy' | 'medium' | 'hard' | 'epic';
  xpReward: number;
  completed: boolean;
  dueDate?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  recurring?: 'daily' | 'weekly' | 'monthly';
}

export type TaskCategory = 'work' | 'study' | 'health' | 'personal' | 'spiritual' | 'projects';

export interface MoodEntry {
  id: string;
  date: string;
  mood: number;
  energy: number;
  focus: number;
  stress: number;
  note?: string;
}

export interface FinancialSummary {
  income: number;
  expenses: number;
  savings: number;
  savingsGoal: number;
  emergencyFund: number;
  emergencyGoal: number;
}

export const CATEGORY_CONFIG: Record<TaskCategory, { label: string; icon: string; color: string }> = {
  work: { label: 'Trabalho', icon: '⚔️', color: 'text-strength' },
  study: { label: 'Estudos', icon: '📚', color: 'text-wisdom' },
  health: { label: 'Saúde', icon: '💚', color: 'text-health' },
  personal: { label: 'Pessoal', icon: '🏠', color: 'text-mana' },
  spiritual: { label: 'Espiritual', icon: '✨', color: 'text-xp' },
  projects: { label: 'Projetos', icon: '🛡️', color: 'text-charisma' },
};

export const DIFFICULTY_XP: Record<string, number> = {
  easy: 10,
  medium: 25,
  hard: 50,
  epic: 100,
};

export const DIFFICULTY_LABELS: Record<string, { label: string; color: string; rarity: string }> = {
  easy: { label: 'Fácil', color: 'text-muted-foreground', rarity: 'common' },
  medium: { label: 'Médio', color: 'text-health', rarity: 'uncommon' },
  hard: { label: 'Difícil', color: 'text-mana', rarity: 'rare' },
  epic: { label: 'Épico', color: 'text-wisdom', rarity: 'epic' },
};

export function getLevelTitle(level: number): string {
  if (level < 5) return 'Aprendiz';
  if (level < 10) return 'Aventureiro';
  if (level < 15) return 'Explorador';
  if (level < 20) return 'Guerreiro';
  if (level < 25) return 'Veterano';
  if (level < 30) return 'Cavaleiro';
  if (level < 35) return 'Elite';
  if (level < 40) return 'Mestre';
  if (level < 45) return 'Grão-Mestre';
  if (level < 50) return 'Campeão';
  if (level < 55) return 'Lenda';
  if (level < 60) return 'Imortal';
  if (level < 70) return 'Ascendente';
  if (level < 80) return 'Divino';
  if (level < 90) return 'Celestial';
  if (level < 100) return 'Transcendente';
  return 'Onisciente';
}

export function calculateXpForLevel(level: number): number {
  return Math.floor(100 * Math.pow(1.3, level - 1));
}

// Compute RPG class based on dominant attribute
export function detectClass(attrs: Attributes): { name: string; icon: string; description: string } {
  const entries = Object.entries(attrs) as [keyof Attributes, number][];
  entries.sort((a, b) => b[1] - a[1]);
  const dominant = entries[0][0];
  const secondary = entries[1][0];

  const classes: Record<string, { name: string; icon: string; description: string }> = {
    discipline: { name: 'Paladino', icon: '🛡️', description: 'Disciplina inabalável guia cada passo' },
    focus: { name: 'Arqueiro', icon: '🏹', description: 'Foco afiado como uma flecha certeira' },
    intelligence: { name: 'Mago', icon: '🧙', description: 'Sabedoria e conhecimento são seu poder' },
    consistency: { name: 'Monge', icon: '🥋', description: 'Consistência transforma hábitos em poder' },
    health: { name: 'Druida', icon: '🌿', description: 'Harmonia com corpo e natureza' },
    mentalBalance: { name: 'Sábio', icon: '📿', description: 'Equilíbrio mental forja decisões sábias' },
  };

  return classes[dominant] || classes.discipline;
}

// Compute power score (0-1000 based on all attributes)
export function computePowerScore(attrs: Attributes): number {
  const values = Object.values(attrs);
  const avg = values.reduce((s, v) => s + v, 0) / values.length;
  return Math.round(avg * 10);
}

// Streak multiplier
export function getStreakMultiplier(streak: number): number {
  if (streak >= 30) return 2.5;
  if (streak >= 14) return 2.0;
  if (streak >= 7) return 1.5;
  if (streak >= 3) return 1.2;
  return 1.0;
}

// Rank tiers based on power score
export function getPowerRank(score: number): { rank: string; color: string; next: number; icon: string } {
  if (score >= 900) return { rank: 'Lendário', color: 'text-xp', next: 1000, icon: '👑' };
  if (score >= 700) return { rank: 'Diamante', color: 'text-wisdom', next: 900, icon: '💎' };
  if (score >= 500) return { rank: 'Platina', color: 'text-mana', next: 700, icon: '⚜️' };
  if (score >= 300) return { rank: 'Ouro', color: 'text-xp', next: 500, icon: '🏅' };
  if (score >= 150) return { rank: 'Prata', color: 'text-muted-foreground', next: 300, icon: '🥈' };
  return { rank: 'Bronze', color: 'text-strength', next: 150, icon: '🥉' };
}

// Daily challenges based on user data
export function generateDailyChallenges(data: {
  tasks: any[];
  streak: number;
  moodEntries: any[];
  studySessions: any[];
}) {
  const today = new Date().toISOString().split('T')[0];
  const completedToday = data.tasks.filter(t => t.completed && t.completed_at?.startsWith(today)).length;
  const hasMoodToday = data.moodEntries.some(e => e.date === today);
  const hasStudyToday = data.studySessions.some(s => s.date === today);

  const challenges = [];

  if (completedToday < 3) {
    challenges.push({
      id: 'complete_3',
      title: 'Concluir 3 Missões',
      description: 'Complete 3 missões hoje',
      progress: completedToday,
      target: 3,
      xpBonus: 30,
      icon: '⚔️',
      done: false,
    });
  } else {
    challenges.push({
      id: 'complete_3',
      title: 'Concluir 3 Missões',
      description: 'Complete 3 missões hoje',
      progress: 3,
      target: 3,
      xpBonus: 30,
      icon: '⚔️',
      done: true,
    });
  }

  challenges.push({
    id: 'mood_checkin',
    title: 'Check-in Mental',
    description: 'Registre como você está hoje',
    progress: hasMoodToday ? 1 : 0,
    target: 1,
    xpBonus: 15,
    icon: '🧠',
    done: hasMoodToday,
  });

  challenges.push({
    id: 'study_session',
    title: 'Sessão de Estudo',
    description: 'Registre pelo menos 1h de estudo',
    progress: hasStudyToday ? 1 : 0,
    target: 1,
    xpBonus: 20,
    icon: '📖',
    done: hasStudyToday,
  });

  if (data.streak >= 3) {
    challenges.push({
      id: 'streak_keep',
      title: 'Manter Streak',
      description: `Mantenha sua ofensiva de ${data.streak} dias`,
      progress: completedToday > 0 ? 1 : 0,
      target: 1,
      xpBonus: 25,
      icon: '🔥',
      done: completedToday > 0,
    });
  }

  return challenges;
}

export const MOCK_STATS: UserStats = {
  level: 12,
  xp: 780,
  xpToNext: 1200,
  totalXp: 15780,
  streak: 7,
  multiplier: 1.5,
};

export const MOCK_ATTRIBUTES: Attributes = {
  discipline: 68,
  focus: 55,
  intelligence: 72,
  consistency: 60,
  health: 45,
  mentalBalance: 58,
};

export const MOCK_TASKS: Task[] = [];
export const MOCK_MOOD: MoodEntry = { id: '1', date: '2026-02-22', mood: 4, energy: 3, focus: 4, stress: 2 };
export const MOCK_FINANCIAL: FinancialSummary = { income: 8500, expenses: 5200, savings: 2800, savingsGoal: 5000, emergencyFund: 12000, emergencyGoal: 25000 };
export const MOCK_ACHIEVEMENTS = [];
