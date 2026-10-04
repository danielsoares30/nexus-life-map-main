import { motion } from "framer-motion";
import { Trophy, Sparkles } from "lucide-react";
import { useAchievements, useTasks, useMoodEntries, useStudySessions, useProfile, useFinancialEntries } from "@/hooks/useGameData";
import { useHabits } from "@/hooks/useHabits";

const ALL_ACHIEVEMENTS = [
  // Bronze tier
  { key: "first_task", title: "Primeiro Passo", description: "Complete sua primeira missão", icon: "🏅", tier: "bronze", getProgress: (d: any) => ({ current: Math.min(d.completedTasks, 1), target: 1 }) },
  { key: "streak_3", title: "Centelha", description: "3 dias seguidos de streak", icon: "🕯️", tier: "bronze", getProgress: (d: any) => ({ current: Math.min(d.streak, 3), target: 3 }) },
  { key: "first_mood", title: "Autoconhecimento", description: "Faça seu primeiro check-in mental", icon: "🧠", tier: "bronze", getProgress: (d: any) => ({ current: Math.min(d.moodCount, 1), target: 1 }) },
  { key: "first_study", title: "Início da Jornada", description: "Registre sua primeira hora de estudo", icon: "📖", tier: "bronze", getProgress: (d: any) => ({ current: Math.min(Math.round(d.studyHours), 1), target: 1 }) },
  { key: "first_habit", title: "Construtor de Hábitos", description: "Crie seu primeiro hábito", icon: "🎯", tier: "bronze", getProgress: (d: any) => ({ current: Math.min(d.habitCount, 1), target: 1 }) },
  { key: "tasks_10", title: "Soldado", description: "Complete 10 missões", icon: "⚔️", tier: "bronze", getProgress: (d: any) => ({ current: Math.min(d.completedTasks, 10), target: 10 }) },

  // Silver tier
  { key: "streak_7", title: "Chama Acesa", description: "7 dias seguidos de streak", icon: "🔥", tier: "silver", getProgress: (d: any) => ({ current: Math.min(d.streak, 7), target: 7 }) },
  { key: "hard_10", title: "Guerreiro do Foco", description: "10 missões difíceis completas", icon: "💪", tier: "silver", getProgress: (d: any) => ({ current: Math.min(d.hardTasks, 10), target: 10 }) },
  { key: "mood_30", title: "Corpo e Mente", description: "30 check-ins de saúde mental", icon: "🧘", tier: "silver", getProgress: (d: any) => ({ current: Math.min(d.moodCount, 30), target: 30 }) },
  { key: "level_10", title: "Aventureiro Veterano", description: "Alcance o nível 10", icon: "⭐", tier: "silver", getProgress: (d: any) => ({ current: Math.min(d.level, 10), target: 10 }) },
  { key: "study_20h", title: "Estudioso", description: "20h de estudo acumuladas", icon: "📚", tier: "silver", getProgress: (d: any) => ({ current: Math.min(Math.round(d.studyHours), 20), target: 20 }) },
  { key: "tasks_50", title: "Capitão", description: "Complete 50 missões", icon: "🗡️", tier: "silver", getProgress: (d: any) => ({ current: Math.min(d.completedTasks, 50), target: 50 }) },
  { key: "networking", title: "Networking Pro", description: "Complete 50 missões de trabalho", icon: "🤝", tier: "silver", getProgress: (d: any) => ({ current: Math.min(d.workTasks, 50), target: 50 }) },
  { key: "saver", title: "Poupador", description: "Registre mais receitas que despesas", icon: "💰", tier: "silver", getProgress: (d: any) => ({ current: d.income > d.expenses ? 1 : 0, target: 1 }) },

  // Gold tier
  { key: "streak_30", title: "Inabalável", description: "30 dias de streak", icon: "💎", tier: "gold", getProgress: (d: any) => ({ current: Math.min(d.streak, 30), target: 30 }) },
  { key: "study_100h", title: "Scholar", description: "100h de estudo acumuladas", icon: "🎓", tier: "gold", getProgress: (d: any) => ({ current: Math.min(Math.round(d.studyHours), 100), target: 100 }) },
  { key: "master_time", title: "Mestre do Tempo", description: "Complete 100 missões", icon: "⏰", tier: "gold", getProgress: (d: any) => ({ current: Math.min(d.completedTasks, 100), target: 100 }) },
  { key: "investor", title: "Investidor", description: "Acumule 10.000 XP total", icon: "💎", tier: "gold", getProgress: (d: any) => ({ current: Math.min(d.totalXp, 10000), target: 10000 }) },
  { key: "zen_master", title: "Zen Master", description: "50 check-ins de meditação", icon: "🧘", tier: "gold", getProgress: (d: any) => ({ current: Math.min(d.moodCount, 50), target: 50 }) },
  { key: "level_25", title: "Veterano", description: "Alcance o nível 25", icon: "🏛️", tier: "gold", getProgress: (d: any) => ({ current: Math.min(d.level, 25), target: 25 }) },
  { key: "tasks_200", title: "General", description: "Complete 200 missões", icon: "🦅", tier: "gold", getProgress: (d: any) => ({ current: Math.min(d.completedTasks, 200), target: 200 }) },
  { key: "habit_streak_30", title: "Disciplinado", description: "30 dias de streak em um hábito", icon: "🔗", tier: "gold", getProgress: (d: any) => ({ current: Math.min(d.bestHabitStreak, 30), target: 30 }) },

  // Legendary tier
  { key: "streak_100", title: "Centurião", description: "100 dias de streak", icon: "🏛️", tier: "legendary", getProgress: (d: any) => ({ current: Math.min(d.streak, 100), target: 100 }) },
  { key: "streak_365", title: "Maratonista", description: "365 dias de streak", icon: "🏆", tier: "legendary", getProgress: (d: any) => ({ current: Math.min(d.streak, 365), target: 365 }) },
  { key: "polymath", title: "Polímata", description: "Nível 50 alcançado", icon: "🌟", tier: "legendary", getProgress: (d: any) => ({ current: Math.min(d.level, 50), target: 50 }) },
  { key: "transcendent", title: "Transcendente", description: "Nível 100 alcançado", icon: "🌌", tier: "legendary", getProgress: (d: any) => ({ current: Math.min(d.level, 100), target: 100 }) },
  { key: "tasks_500", title: "Lendário", description: "Complete 500 missões", icon: "👑", tier: "legendary", getProgress: (d: any) => ({ current: Math.min(d.completedTasks, 500), target: 500 }) },
  { key: "study_500h", title: "Erudito", description: "500h de estudo", icon: "📜", tier: "legendary", getProgress: (d: any) => ({ current: Math.min(Math.round(d.studyHours), 500), target: 500 }) },
];

const tierStyles: Record<string, string> = {
  bronze: "from-amber-900/20 to-amber-700/10 border-amber-700/30",
  silver: "from-slate-400/20 to-slate-300/10 border-slate-400/30",
  gold: "from-yellow-500/20 to-yellow-400/10 border-yellow-500/30",
  legendary: "from-purple-500/20 to-pink-500/10 border-purple-500/30",
};

const tierLabels: Record<string, string> = {
  bronze: "Bronze",
  silver: "Prata",
  gold: "Ouro",
  legendary: "Lendário",
};

const tierXp: Record<string, number> = {
  bronze: 25,
  silver: 75,
  gold: 200,
  legendary: 500,
};

export default function Achievements() {
  const { unlockedKeys, loading } = useAchievements();
  const { tasks } = useTasks();
  const { entries: moodEntries } = useMoodEntries();
  const { sessions: studySessions } = useStudySessions();
  const { entries: financialEntries } = useFinancialEntries();
  const { profile } = useProfile();
  const { habits } = useHabits();

  const unlocked = ALL_ACHIEVEMENTS.filter((a) => unlockedKeys.includes(a.key)).length;
  const percent = ALL_ACHIEVEMENTS.length > 0 ? (unlocked / ALL_ACHIEVEMENTS.length) * 100 : 0;

  const completedTasks = tasks.filter(t => t.completed).length;
  const hardTasks = tasks.filter(t => t.completed && (t.difficulty === "hard" || t.difficulty === "epic")).length;
  const workTasks = tasks.filter(t => t.completed && t.category === "work").length;
  const studyHours = studySessions.reduce((s, session) => s + Number(session.hours), 0);
  const income = financialEntries.filter(e => e.type === "income").reduce((s, e) => s + Number(e.amount), 0);
  const expenses = financialEntries.filter(e => e.type === "expense").reduce((s, e) => s + Number(e.amount), 0);
  const bestHabitStreak = habits.length > 0 ? Math.max(...habits.map(h => h.best_streak || 0)) : 0;

  const progressData = {
    completedTasks,
    hardTasks,
    workTasks,
    moodCount: moodEntries.length,
    studyHours,
    streak: profile?.streak || 0,
    level: profile?.level || 1,
    totalXp: profile?.total_xp || 0,
    habitCount: habits.length,
    bestHabitStreak,
    income,
    expenses,
  };

  // Group by tier
  const tiers = ["bronze", "silver", "gold", "legendary"];

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto flex items-center justify-center py-20">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <h2 className="font-display text-2xl md:text-3xl font-bold text-gradient-gold">Conquistas</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {unlocked}/{ALL_ACHIEVEMENTS.length} desbloqueadas — Continue sua jornada épica!
        </p>
      </motion.div>

      {/* Progress bar */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-primary/20 bg-primary/5 p-5">
        <div className="flex items-center gap-3 mb-3">
          <Trophy className="h-5 w-5 text-primary" />
          <h3 className="font-display text-base font-semibold text-foreground">Progresso Geral</h3>
          <span className="ml-auto text-sm font-bold text-primary">{percent.toFixed(0)}%</span>
        </div>
        <div className="stat-bar h-3 rounded-lg">
          <motion.div className="stat-bar-fill xp-fill rounded-lg" initial={{ width: 0 }} animate={{ width: `${percent}%` }} transition={{ duration: 1.2 }} />
        </div>
        <div className="flex justify-between mt-2">
          <span className="text-[10px] text-muted-foreground">{unlocked} conquistadas</span>
          <span className="text-[10px] text-muted-foreground">{ALL_ACHIEVEMENTS.length - unlocked} restantes</span>
        </div>

        {/* Tier summary */}
        <div className="grid grid-cols-4 gap-2 mt-4">
          {tiers.map((tier) => {
            const tierAchs = ALL_ACHIEVEMENTS.filter(a => a.tier === tier);
            const tierUnlocked = tierAchs.filter(a => unlockedKeys.includes(a.key)).length;
            return (
              <div key={tier} className="text-center rounded-lg bg-background/60 border border-border p-2">
                <p className="text-[10px] text-muted-foreground">{tierLabels[tier]}</p>
                <p className="text-sm font-bold text-foreground">{tierUnlocked}/{tierAchs.length}</p>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Achievements by tier */}
      {tiers.map((tier) => {
        const tierAchs = ALL_ACHIEVEMENTS.filter(a => a.tier === tier);
        return (
          <div key={tier}>
            <h3 className="font-display text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <span className="text-base">{tier === "bronze" ? "🥉" : tier === "silver" ? "🥈" : tier === "gold" ? "🥇" : "👑"}</span>
              {tierLabels[tier]} ({tierAchs.filter(a => unlockedKeys.includes(a.key)).length}/{tierAchs.length})
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
              {tierAchs.map((ach, i) => {
                const isUnlocked = unlockedKeys.includes(ach.key);
                const progress = ach.getProgress(progressData);
                const progressPercent = Math.min((progress.current / progress.target) * 100, 100);

                return (
                  <motion.div
                    key={ach.key}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className={`rounded-xl border p-4 transition-all relative overflow-hidden ${
                      isUnlocked
                        ? `bg-gradient-to-br ${tierStyles[ach.tier]} card-glow`
                        : "border-border bg-card"
                    }`}
                  >
                    {isUnlocked && (
                      <div className="absolute top-2 right-2">
                        <Sparkles className="h-3.5 w-3.5 text-xp animate-pulse-glow" />
                      </div>
                    )}
                    <div className="flex items-start gap-3">
                      <span className={`text-2xl ${isUnlocked ? "" : "grayscale opacity-50"}`}>{ach.icon}</span>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-display font-semibold text-foreground">{ach.title}</h4>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{ach.description}</p>

                        <div className="mt-2">
                          <div className="stat-bar h-1.5 rounded-full">
                            <motion.div
                              className={`stat-bar-fill ${isUnlocked ? "xp-fill" : ""} rounded-full`}
                              initial={{ width: 0 }}
                              animate={{ width: `${progressPercent}%` }}
                              transition={{ duration: 1, delay: 0.2 + i * 0.03 }}
                              style={!isUnlocked ? { background: 'hsl(var(--muted-foreground) / 0.3)' } : undefined}
                            />
                          </div>
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-[8px] text-muted-foreground">{progress.current}/{progress.target}</span>
                            <span className={`text-[8px] font-medium px-1.5 py-0.5 rounded-full ${
                              isUnlocked ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                            }`}>
                              {isUnlocked ? `✓ +${tierXp[ach.tier]} XP` : `${progressPercent.toFixed(0)}%`}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
