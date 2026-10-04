import { motion } from "framer-motion";
import { Shield, Flame, Zap, Brain, Heart, Scale, Crown, Swords } from "lucide-react";
import { getLevelTitle, calculateXpForLevel, detectClass, computePowerScore, getPowerRank, getStreakMultiplier } from "@/lib/gameData";
import { useProfile, useTasks, useMoodEntries, useStudySessions, useCareerSkills, useWorkouts } from "@/hooks/useGameData";
import defaultAvatar from "@/assets/default-avatar.png";

const attributeConfig = [
  { key: 'discipline', label: 'Disciplina', icon: Shield, colorClass: 'text-xp', cssVar: 'xp' },
  { key: 'focus', label: 'Foco', icon: Zap, colorClass: 'text-mana', cssVar: 'mana' },
  { key: 'intelligence', label: 'Inteligência', icon: Brain, colorClass: 'text-wisdom', cssVar: 'wisdom' },
  { key: 'consistency', label: 'Consistência', icon: Flame, colorClass: 'text-strength', cssVar: 'strength' },
  { key: 'health', label: 'Saúde', icon: Heart, colorClass: 'text-health', cssVar: 'health' },
  { key: 'mentalBalance', label: 'Equilíbrio', icon: Scale, colorClass: 'text-charisma', cssVar: 'charisma' },
] as const;

export function computeAttributes(data: {
  tasks: any[];
  moodEntries: any[];
  studySessions: any[];
  careerSkills: any[];
  workouts?: any[];
  streak: number;
  level: number;
}) {
  const { tasks, moodEntries, studySessions, careerSkills, workouts = [], streak, level } = data;
  const completed = tasks.filter((t) => t.completed).length;
  const total = tasks.length;
  const completionRate = total > 0 ? completed / total : 0;

  const discipline = Math.min(Math.round((streak * 3) + (completionRate * 50) + level * 2), 100);

  const avgFocus = moodEntries.length > 0
    ? moodEntries.slice(0, 7).reduce((s: number, e: any) => s + (e.focus || 3), 0) / Math.min(moodEntries.length, 7)
    : 2.5;
  const focus = Math.min(Math.round(avgFocus * 15 + level * 2), 100);

  const totalStudyHours = studySessions.reduce((s: number, session: any) => s + Number(session.hours), 0);
  const avgSkillLevel = careerSkills.length > 0
    ? careerSkills.reduce((s: number, sk: any) => s + sk.level, 0) / careerSkills.length
    : 0;
  const intelligence = Math.min(Math.round(totalStudyHours * 1.5 + avgSkillLevel * 0.5 + level * 2), 100);

  // Consistency: tasks completion rate + streak + workouts in last 7 days (consistency bonus!)
  const last7dWorkouts = workouts.filter((w: any) => {
    const d = new Date(w.date);
    const diff = (Date.now() - d.getTime()) / (1000 * 60 * 60 * 24);
    return diff <= 7;
  }).length;
  const consistency = Math.min(Math.round(streak * 4 + completionRate * 20 + last7dWorkouts * 5 + level), 100);

  // Health: average energy from logs + workouts in last 14 days
  const last14dWorkouts = workouts.filter((w: any) => {
    const d = new Date(w.date);
    const diff = (Date.now() - d.getTime()) / (1000 * 60 * 60 * 24);
    return diff <= 14;
  }).length;
  const avgEnergy = moodEntries.length > 0
    ? moodEntries.slice(0, 7).reduce((s: number, e: any) => s + (e.energy || 3), 0) / Math.min(moodEntries.length, 7)
    : 2.5;
  const health = Math.min(Math.round(avgEnergy * 10 + last14dWorkouts * 8 + level * 2), 100);

  const avgMood = moodEntries.length > 0
    ? moodEntries.slice(0, 7).reduce((s: number, e: any) => s + (e.mood || 3), 0) / Math.min(moodEntries.length, 7)
    : 2.5;
  const avgStress = moodEntries.length > 0
    ? moodEntries.slice(0, 7).reduce((s: number, e: any) => s + (e.stress || 3), 0) / Math.min(moodEntries.length, 7)
    : 2.5;
  const mentalBalance = Math.min(Math.round((avgMood * 12) + ((5 - avgStress) * 8) + level * 2), 100);

  return { discipline, focus, intelligence, consistency, health, mentalBalance };
}

export default function CharacterPanel() {
  const { profile } = useProfile();
  const { tasks } = useTasks();
  const { entries: moodEntries } = useMoodEntries();
  const { sessions: studySessions } = useStudySessions();
  const { skills: careerSkills } = useCareerSkills();
  const { workouts } = useWorkouts();

  const level = profile?.level || 1;
  const xp = profile?.xp || 0;
  const streak = profile?.streak || 0;
  const displayName = profile?.display_name || "Aventureiro";
  const xpToNext = calculateXpForLevel(level);
  const multiplier = getStreakMultiplier(streak);

  const attrs = computeAttributes({
    tasks, moodEntries, studySessions, careerSkills, workouts, streak, level,
  });

  const rpgClass = detectClass(attrs);
  const powerScore = computePowerScore(attrs);
  const powerRank = getPowerRank(powerScore);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl glass-panel p-5 card-glow relative overflow-hidden group">
      <div className="absolute -right-20 -top-20 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none group-hover:bg-primary/20 transition-colors duration-700" />

      {/* Header: Avatar + Info */}
      <div className="flex items-center gap-4 mb-4 relative z-10">
        <div className="relative">
          <div className="h-16 w-16 rounded-full border-2 border-primary/40 overflow-hidden bg-secondary shadow-[0_0_15px_rgba(255,215,0,0.2)]">
            <img src={profile?.avatar_url || defaultAvatar} alt="Avatar" className="h-full w-full object-cover" />
          </div>
          <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold shadow-lg">{level}</div>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-display text-lg font-bold text-foreground truncate">{displayName}</h3>
          <p className="text-xs text-primary font-medium">{getLevelTitle(level)}</p>
          <div className="flex items-center gap-3 mt-1">
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Flame className="h-3 w-3 text-destructive" /> {streak}d
            </span>
            {multiplier > 1 && (
              <span className="text-[10px] font-bold text-xp px-1.5 py-0.5 rounded-full bg-xp/10 border border-xp/20">
                x{multiplier}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Class + Power Score */}
      <div className="flex gap-2 mb-4">
        <div className="flex-1 rounded-lg bg-secondary/50 border border-border p-2.5 text-center">
          <span className="text-lg">{rpgClass.icon}</span>
          <p className="text-[10px] font-bold text-foreground mt-0.5">{rpgClass.name}</p>
          <p className="text-[8px] text-muted-foreground">Classe</p>
        </div>
        <div className="flex-1 rounded-lg bg-secondary/50 border border-border p-2.5 text-center">
          <p className="text-lg font-display font-bold text-gradient-gold">{powerScore}</p>
          <p className="text-[10px] font-bold text-foreground">{powerRank.icon} {powerRank.rank}</p>
          <p className="text-[8px] text-muted-foreground">Poder</p>
        </div>
      </div>

      {/* XP Bar */}
      <div className="mb-4">
        <div className="flex justify-between text-xs mb-1.5">
          <span className="text-muted-foreground">Experiência</span>
          <span className="text-primary font-medium">{xp} / {xpToNext} XP</span>
        </div>
        <div className="stat-bar h-3 rounded-lg">
          <motion.div className="stat-bar-fill xp-fill rounded-lg" initial={{ width: 0 }} animate={{ width: `${Math.min((xp / xpToNext) * 100, 100)}%` }} transition={{ duration: 1, ease: "easeOut" }} />
        </div>
      </div>

      {/* Attributes */}
      <div className="space-y-2.5">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Atributos</h4>
        {attributeConfig.map(({ key, label, icon: Icon, colorClass, cssVar }) => {
          const value = attrs[key];
          return (
            <div key={key} className="flex items-center gap-2.5">
              <Icon className={`h-3.5 w-3.5 ${colorClass} shrink-0`} />
              <div className="flex-1 min-w-0">
                <div className="flex justify-between mb-0.5">
                  <span className="text-[11px] text-secondary-foreground">{label}</span>
                  <span className="text-[10px] text-muted-foreground font-medium">{value}</span>
                </div>
                <div className="stat-bar h-1.5">
                  <motion.div className="stat-bar-fill" initial={{ width: 0 }} animate={{ width: `${value}%` }} transition={{ duration: 1, delay: 0.2 }} style={{ background: `hsl(var(--${cssVar}))` }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
