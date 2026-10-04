import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  TrendingUp, DollarSign, Brain, Smile, Frown, Meh, SmilePlus, Laugh, Flame, CheckCircle2, Sparkles,
  Swords, BookOpen, Plus, Wallet, Crown, Zap, Trophy, Shield, Target, Lightbulb, ArrowUp, ArrowDown, AlertTriangle,
  Skull, Dumbbell, Heart
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { CATEGORY_CONFIG, type TaskCategory, getStreakMultiplier, generateDailyChallenges } from "@/lib/gameData";
import { useTasks, useMoodEntries, useFinancialEntries, useProfile, useAchievements, useAchievementChecker, useStudySessions, useWorkouts } from "@/hooks/useGameData";
import { useHabits } from "@/hooks/useHabits";
import { toast } from "sonner";

const fadeInUp = { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 } };

export function StatsRow() {
  const { tasks } = useTasks();
  const { profile } = useProfile();

  const today = new Date().toISOString().split("T")[0];
  const completedToday = tasks.filter((t) => t.completed && t.completed_at?.startsWith(today)).length;
  const totalTasks = tasks.length;
  const xpToday = tasks.filter((t) => t.completed && t.completed_at?.startsWith(today)).reduce((sum, t) => sum + (t.xp_reward || 0), 0);
  const streak = profile?.streak || 0;
  const multiplier = getStreakMultiplier(streak);

  const stats = [
    { label: "Hoje", value: `${completedToday} feitas`, icon: CheckCircle2, color: "text-health", bg: "border-health/20", sub: `de ${totalTasks} missões` },
    { label: "XP Hoje", value: `+${xpToday}`, icon: Sparkles, color: "text-xp", bg: "border-xp/20", sub: multiplier > 1 ? `x${multiplier} bônus` : "experiência" },
    { label: "Streak", value: `${streak}`, icon: Flame, color: "text-destructive", bg: "border-destructive/20", sub: streak > 0 ? `${streak} dias seguidos` : "comece hoje!" },
    { label: "Nível", value: `${profile?.level || 1}`, icon: Crown, color: "text-primary", bg: "border-primary/20", sub: `${profile?.total_xp?.toLocaleString() || 0} XP total` },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {stats.map((stat, i) => (
        <motion.div key={stat.label} {...fadeInUp} transition={{ delay: i * 0.05 }} className={`rounded-xl border ${stat.bg} bg-card p-4 hover:border-opacity-50 transition-all hover:scale-[1.02]`}>
          <div className="flex items-center gap-2 mb-1">
            <stat.icon className={`h-4 w-4 ${stat.color}`} />
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{stat.label}</span>
          </div>
          <p className="text-2xl font-bold font-display text-foreground">{stat.value}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">{stat.sub}</p>
        </motion.div>
      ))}
    </div>
  );
}

export function DailyChallengesWidget() {
  const { tasks } = useTasks();
  const { profile } = useProfile();
  const { entries: moodEntries } = useMoodEntries();
  const { sessions: studySessions } = useStudySessions();
  const { checkAndUnlock } = useAchievementChecker();

  useEffect(() => {
    if (profile) checkAndUnlock();
  }, [profile?.total_xp]);

  const challenges = generateDailyChallenges({
    tasks,
    streak: profile?.streak || 0,
    moodEntries,
    studySessions,
  });

  const completed = challenges.filter(c => c.done).length;
  const totalBonus = challenges.filter(c => c.done).reduce((s, c) => s + c.xpBonus, 0);

  return (
    <motion.div {...fadeInUp} transition={{ delay: 0.15 }} className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 to-transparent p-5 relative overflow-hidden">
      <div className="absolute -right-8 -top-8 opacity-5">
        <Shield className="w-24 h-24" />
      </div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-xp" />
          <h3 className="font-display text-sm font-semibold text-foreground">Desafios Diários</h3>
        </div>
        <span className="text-[10px] font-bold text-primary px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20">
          {completed}/{challenges.length}
        </span>
      </div>
      <div className="space-y-2">
        {challenges.map((ch) => (
          <div key={ch.id} className={`flex items-center gap-3 rounded-lg px-3 py-2 border transition-all ${ch.done ? "border-health/20 bg-health/5" : "border-border bg-secondary/30 hover:border-primary/20"}`}>
            <span className="text-sm">{ch.done ? "✅" : ch.icon}</span>
            <div className="flex-1 min-w-0">
              <p className={`text-xs font-medium ${ch.done ? "text-health line-through" : "text-foreground"}`}>{ch.title}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <div className="flex-1 stat-bar h-1">
                  <div className={`stat-bar-fill ${ch.done ? "health-fill" : "xp-fill"}`} style={{ width: `${(ch.progress / ch.target) * 100}%` }} />
                </div>
                <span className="text-[9px] text-muted-foreground">{ch.progress}/{ch.target}</span>
              </div>
            </div>
            <span className="text-[10px] text-xp font-bold whitespace-nowrap">+{ch.xpBonus}</span>
          </div>
        ))}
      </div>
      {totalBonus > 0 && (
        <p className="text-[10px] text-health font-medium mt-2 text-center">✨ +{totalBonus} XP bônus ganho hoje!</p>
      )}
    </motion.div>
  );
}

export function WeeklyInsightsWidget() {
  const { tasks } = useTasks();
  const { entries: moodEntries } = useMoodEntries();
  const { sessions: studySessions } = useStudySessions();
  const { entries: financialEntries } = useFinancialEntries();

  const today = new Date();
  const thisWeekDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    return d.toISOString().split("T")[0];
  });
  const lastWeekDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - 7 - i);
    return d.toISOString().split("T")[0];
  });

  const thisWeekTasks = tasks.filter(t => t.completed && thisWeekDates.some(d => t.completed_at?.startsWith(d))).length;
  const lastWeekTasks = tasks.filter(t => t.completed && lastWeekDates.some(d => t.completed_at?.startsWith(d))).length;
  const tasksTrend = lastWeekTasks > 0 ? ((thisWeekTasks - lastWeekTasks) / lastWeekTasks * 100) : thisWeekTasks > 0 ? 100 : 0;

  const thisWeekStudy = studySessions.filter(s => thisWeekDates.includes(s.date)).reduce((sum, s) => sum + Number(s.hours), 0);
  const lastWeekStudy = studySessions.filter(s => lastWeekDates.includes(s.date)).reduce((sum, s) => sum + Number(s.hours), 0);
  const studyTrend = lastWeekStudy > 0 ? ((thisWeekStudy - lastWeekStudy) / lastWeekStudy * 100) : thisWeekStudy > 0 ? 100 : 0;

  const thisWeekMoods = moodEntries.filter(e => thisWeekDates.includes(e.date));
  const avgMood = thisWeekMoods.length > 0 ? thisWeekMoods.reduce((s, e) => s + e.mood, 0) / thisWeekMoods.length : 0;

  const insights: { icon: React.ReactNode; text: string; type: "positive" | "warning" | "neutral" }[] = [];

  if (tasksTrend > 20) insights.push({ icon: <ArrowUp className="h-3 w-3 text-health" />, text: `Produtividade +${tasksTrend.toFixed(0)}% vs semana anterior`, type: "positive" });
  else if (tasksTrend < -20) insights.push({ icon: <ArrowDown className="h-3 w-3 text-destructive" />, text: `Produtividade ${tasksTrend.toFixed(0)}% vs semana anterior`, type: "warning" });

  if (thisWeekStudy > lastWeekStudy && thisWeekStudy > 0) insights.push({ icon: <BookOpen className="h-3 w-3 text-mana" />, text: `Estudo: ${thisWeekStudy.toFixed(1)}h esta semana (+${studyTrend.toFixed(0)}%)`, type: "positive" });
  else if (thisWeekStudy < lastWeekStudy && lastWeekStudy > 0) insights.push({ icon: <BookOpen className="h-3 w-3 text-destructive" />, text: `Horas de estudo caíram ${Math.abs(studyTrend).toFixed(0)}%`, type: "warning" });

  if (avgMood >= 4) insights.push({ icon: <Smile className="h-3 w-3 text-health" />, text: `Humor excelente esta semana (${avgMood.toFixed(1)}/5)`, type: "positive" });
  else if (avgMood > 0 && avgMood < 3) insights.push({ icon: <AlertTriangle className="h-3 w-3 text-destructive" />, text: `Humor abaixo da média (${avgMood.toFixed(1)}/5). Cuide-se!`, type: "warning" });

  const overdueTasks = tasks.filter(t => !t.completed && t.due_date && new Date(t.due_date + "T23:59:59") < new Date()).length;
  if (overdueTasks > 0) insights.push({ icon: <AlertTriangle className="h-3 w-3 text-destructive" />, text: `${overdueTasks} missão(ões) atrasada(s)`, type: "warning" });

  if (thisWeekMoods.length === 0) insights.push({ icon: <Brain className="h-3 w-3 text-muted-foreground" />, text: "Nenhum check-in mental esta semana", type: "neutral" });

  if (insights.length === 0) {
    insights.push({ icon: <Sparkles className="h-3 w-3 text-primary" />, text: "Continue assim! Sua jornada está em ritmo constante.", type: "positive" });
  }

  return (
    <motion.div {...fadeInUp} transition={{ delay: 0.2 }} className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-2 mb-3">
        <Lightbulb className="h-4 w-4 text-xp" />
        <h3 className="font-display text-sm font-semibold text-foreground">Insights da Semana</h3>
      </div>
      <div className="space-y-2">
        {insights.slice(0, 4).map((insight, i) => (
          <div key={i} className={`flex items-start gap-2 rounded-lg px-3 py-2 border transition-all ${
            insight.type === "positive" ? "border-health/20 bg-health/5" :
            insight.type === "warning" ? "border-destructive/20 bg-destructive/5" :
            "border-border bg-secondary/30"
          }`}>
            {insight.icon}
            <p className="text-[11px] text-foreground">{insight.text}</p>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

export function HabitsWidget() {
  const { habits, isCompletedToday } = useHabits();
  const navigate = useNavigate();

  const completedToday = habits.filter((h) => isCompletedToday(h.id)).length;
  const total = habits.length;

  if (total === 0) return null;

  return (
    <motion.div {...fadeInUp} transition={{ delay: 0.15 }} className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-health" />
          <h3 className="font-display text-sm font-semibold text-foreground">Hábitos Hoje</h3>
        </div>
        <Button size="sm" variant="ghost" className="h-6 text-[10px] text-primary" onClick={() => navigate("/app/habits")}>
          {completedToday}/{total} →
        </Button>
      </div>
      <div className="stat-bar h-2 mb-2">
        <motion.div className="stat-bar-fill health-fill" animate={{ width: `${total > 0 ? (completedToday / total) * 100 : 0}%` }} transition={{ duration: 0.5 }} />
      </div>
      <div className="space-y-1.5">
        {habits.slice(0, 4).map((habit) => {
          const done = isCompletedToday(habit.id);
          return (
            <div key={habit.id} className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs ${done ? "text-health" : "text-foreground"}`}>
              <span>{done ? "✅" : habit.icon}</span>
              <span className={done ? "line-through text-muted-foreground" : ""}>{habit.name}</span>
              {(habit.current_streak || 0) > 0 && (
                <span className="ml-auto flex items-center gap-0.5 text-[9px] text-destructive">
                  <Flame className="h-2.5 w-2.5" />{habit.current_streak}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

export function QuickActions() {
  const navigate = useNavigate();

  const actions = [
    { label: "Nova Missão", icon: Swords, path: "/tasks", color: "text-health" },
    { label: "Check-in Mental", icon: Brain, path: "/mental", color: "text-wisdom" },
    { label: "Registrar Estudo", icon: BookOpen, path: "/study", color: "text-mana" },
    { label: "Lançar Finança", icon: Wallet, path: "/finance", color: "text-xp" },
    { label: "Hábitos", icon: Target, path: "/habits", color: "text-health" },
  ];

  return (
    <motion.div {...fadeInUp} transition={{ delay: 0.1 }} className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
      {actions.map((action) => (
        <Button key={action.label} variant="outline" size="sm" className="gap-2 whitespace-nowrap border-border hover:border-primary/30 hover:bg-primary/5" onClick={() => navigate(action.path)}>
          <action.icon className={`h-3.5 w-3.5 ${action.color}`} />
          {action.label}
        </Button>
      ))}
    </motion.div>
  );
}

export function TodayTasks() {
  const { tasks } = useTasks();
  const navigate = useNavigate();
  const pending = tasks.filter(t => !t.completed).slice(0, 5);
  const completed = tasks.filter(t => t.completed).length;

  return (
    <motion.div {...fadeInUp} transition={{ delay: 0.25 }} className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display text-sm font-semibold text-foreground">Missões Pendentes</h3>
        <Button size="sm" variant="ghost" className="h-6 text-[10px] text-primary" onClick={() => navigate("/app/tasks")}>
          {completed}/{tasks.length} completas →
        </Button>
      </div>
      {pending.length === 0 ? (
        <div className="text-center py-6">
          <Trophy className="h-8 w-8 text-xp/30 mx-auto mb-2" />
          <p className="text-xs text-muted-foreground">{tasks.length > 0 ? "Todas as missões concluídas! 🎉" : "Nenhuma missão criada ainda."}</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {pending.map((task) => {
            const cat = CATEGORY_CONFIG[task.category as TaskCategory] || { icon: "📋", label: task.category };
            const isOverdue = task.due_date && new Date(task.due_date + "T23:59:59") < new Date();
            return (
              <div key={task.id} className={`flex items-center gap-3 rounded-lg px-3 py-2 border transition-all ${isOverdue ? "border-destructive/30 bg-destructive/5" : "border-border bg-secondary/30 hover:border-primary/20"}`}>
                <span className="text-xs">{cat.icon}</span>
                <span className="flex-1 text-xs text-foreground truncate">{task.title}</span>
                {isOverdue && <span className="text-[9px] text-destructive font-medium">Atrasada</span>}
                <span className="text-[10px] text-xp font-bold">+{task.xp_reward}</span>
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}

const moodIcons = [Frown, Meh, Smile, SmilePlus, Laugh];

export function MoodWidget() {
  const { entries } = useMoodEntries();
  const today = entries[0];
  const navigate = useNavigate();
  const last7 = entries.slice(0, 7);

  if (!today) {
    return (
      <motion.div {...fadeInUp} transition={{ delay: 0.3 }} className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Brain className="h-4 w-4 text-wisdom" />
          <h3 className="font-display text-sm font-semibold text-foreground">Estado Mental</h3>
        </div>
        <div className="text-center py-4">
          <Brain className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-xs text-muted-foreground mb-3">Nenhum check-in realizado hoje.</p>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => navigate("/app/mental")}>
            <Plus className="h-3.5 w-3.5" /> Fazer Check-in
          </Button>
        </div>
      </motion.div>
    );
  }

  const MoodIcon = moodIcons[Math.max(0, Math.min((today.mood || 3) - 1, 4))];
  const moodLabels = ['Péssimo', 'Ruim', 'Normal', 'Bom', 'Ótimo'];

  return (
    <motion.div {...fadeInUp} transition={{ delay: 0.3 }} className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <Brain className="h-4 w-4 text-wisdom" />
        <h3 className="font-display text-sm font-semibold text-foreground">Estado Mental</h3>
      </div>
      <div className="flex items-center gap-3 mb-4 p-3 rounded-lg bg-secondary/50 border border-border">
        <MoodIcon className="h-8 w-8 text-xp" />
        <div>
          <p className="text-sm font-medium text-foreground">{moodLabels[(today.mood || 3) - 1]}</p>
          {today.note && <p className="text-[10px] text-muted-foreground line-clamp-1">{today.note}</p>}
        </div>
      </div>
      <div className="flex items-end justify-between gap-1 h-12 mb-2">
        {Array.from({ length: 7 }).map((_, i) => {
          const entry = last7[6 - i];
          const value = entry ? entry.mood : 0;
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
              <div className="w-full rounded-sm bg-secondary/50 relative" style={{ height: '40px' }}>
                <div className="absolute bottom-0 left-0 right-0 rounded-sm transition-all" style={{ height: `${(value / 5) * 100}%`, background: value > 0 ? `hsl(var(--${value >= 4 ? 'health' : value >= 3 ? 'xp' : 'strength'}))` : 'transparent' }} />
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-[9px] text-muted-foreground text-center">Últimos 7 dias</p>
    </motion.div>
  );
}

export function FinanceWidget() {
  const { entries } = useFinancialEntries();
  const income = entries.filter((e) => e.type === "income").reduce((s, e) => s + Number(e.amount), 0);
  const expenses = entries.filter((e) => e.type === "expense").reduce((s, e) => s + Number(e.amount), 0);
  const balance = income - expenses;
  const savingsRate = income > 0 ? ((income - expenses) / income * 100) : 0;
  const navigate = useNavigate();

  return (
    <motion.div {...fadeInUp} transition={{ delay: 0.4 }} className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-health" />
          <h3 className="font-display text-sm font-semibold text-foreground">Finanças</h3>
        </div>
        <Button size="sm" variant="ghost" className="h-6 text-[10px] text-primary" onClick={() => navigate("/app/finance")}>Detalhes →</Button>
      </div>
      <div className="space-y-2 mb-3">
        <div className="flex items-center justify-between rounded-lg bg-secondary/50 border border-border px-3 py-2">
          <span className="text-xs text-muted-foreground">Receita</span>
          <span className="text-sm font-bold text-health">R$ {income.toLocaleString("pt-BR")}</span>
        </div>
        <div className="flex items-center justify-between rounded-lg bg-secondary/50 border border-border px-3 py-2">
          <span className="text-xs text-muted-foreground">Despesas</span>
          <span className="text-sm font-bold text-destructive">R$ {expenses.toLocaleString("pt-BR")}</span>
        </div>
      </div>
      <div className="rounded-lg bg-secondary/50 border border-border px-3 py-2 flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">Saldo</p>
          <p className={`text-lg font-bold ${balance >= 0 ? "text-xp" : "text-destructive"}`}>R$ {balance.toLocaleString("pt-BR")}</p>
        </div>
        {income > 0 && (
          <div className="text-right">
            <p className="text-[10px] text-muted-foreground">Taxa de Poupança</p>
            <p className={`text-sm font-bold ${savingsRate >= 20 ? "text-health" : savingsRate >= 0 ? "text-xp" : "text-destructive"}`}>{savingsRate.toFixed(0)}%</p>
          </div>
        )}
      </div>
      {entries.length === 0 && <p className="text-xs text-muted-foreground text-center mt-2">Nenhum lançamento registrado.</p>}
    </motion.div>
  );
}

export function CategoryProgress() {
  const { tasks } = useTasks();
  const categories = Object.entries(CATEGORY_CONFIG) as [TaskCategory, typeof CATEGORY_CONFIG[TaskCategory]][];

  return (
    <motion.div {...fadeInUp} transition={{ delay: 0.5 }} className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="h-4 w-4 text-primary" />
        <h3 className="font-display text-sm font-semibold text-foreground">Progresso por Área</h3>
      </div>
      <div className="space-y-3">
        {categories.map(([key, config]) => {
          const catTasks = tasks.filter((t) => t.category === key);
          const completedCount = catTasks.filter((t) => t.completed).length;
          const percent = catTasks.length ? (completedCount / catTasks.length) * 100 : 0;
          return (
            <div key={key} className="flex items-center gap-3">
              <span className="text-sm w-6 text-center">{config.icon}</span>
              <span className="text-[11px] text-secondary-foreground w-20">{config.label}</span>
              <div className="flex-1 stat-bar h-1.5">
                <div className="stat-bar-fill xp-fill" style={{ width: `${percent}%` }} />
              </div>
              <span className="text-[10px] text-muted-foreground w-16 text-right">{completedCount}/{catTasks.length}</span>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

export function AchievementsWidget() {
  const { unlockedKeys } = useAchievements();
  const navigate = useNavigate();
  const total = 28;

  return (
    <motion.div {...fadeInUp} transition={{ delay: 0.6 }} className="rounded-xl border border-border/50 bg-card/60 backdrop-blur-md shadow-sm p-5 hover:border-border transition-colors">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Trophy className="h-4 w-4 text-xp" />
          <h3 className="font-display text-sm font-semibold text-foreground">Conquistas</h3>
        </div>
        <Button size="sm" variant="ghost" className="h-6 text-[10px] text-primary" onClick={() => navigate("/app/achievements")}>Ver todas →</Button>
      </div>
      <div className="flex items-center gap-3 mb-2">
        <div className="text-center">
          <span className="text-2xl font-display font-bold text-xp">{unlockedKeys.length}</span>
          <span className="text-xs text-muted-foreground">/{total}</span>
        </div>
        <div className="flex-1">
          <div className="stat-bar h-2">
            <div className="stat-bar-fill xp-fill" style={{ width: `${(unlockedKeys.length / total) * 100}%` }} />
          </div>
          <p className="text-[9px] text-muted-foreground mt-0.5">{((unlockedKeys.length / total) * 100).toFixed(0)}% completado</p>
        </div>
      </div>
    </motion.div>
  );
}

const DAILY_BOSSES = [
  { id: "dragon_procrastination", name: "Dragão da Procrastinação", level: 15, maxHp: 120, icon: "🐉", weakness: "Hábitos Diários", desc: "Alimenta-se do seu tempo desperdiçado. Ataque-o completando hábitos e missões!" },
  { id: "inertia_giant", name: "Gigante da Inércia", level: 12, maxHp: 100, icon: "🗿", weakness: "Missões Ativas", desc: "Ele te impede de começar. Use o Golpe Crítico para derrubá-lo rapidamente!" },
  { id: "distraction_wraith", name: "Espectro das Distrações", level: 10, maxHp: 85, icon: "👻", weakness: "Estudos & Foco", desc: "Te puxa para redes sociais. Conclua horas de estudo e missões de foco para derrotá-lo!" },
  { id: "anxiety_chimera", name: "Quimera da Ansiedade", level: 14, maxHp: 110, icon: "🦁", weakness: "Check-in Mental", desc: "Espalha dúvidas pela mente. Ataque com check-ins de humor e meditação!" },
  { id: "discouragement_gorgon", name: "Górgona do Desânimo", level: 13, maxHp: 105, icon: "🐍", weakness: "Treinos Físicos", desc: "Tenta petrificar sua motivação. Complete treinos para desferir golpes pesados!" },
];

export function DailyBossBattleWidget() {
  const { tasks } = useTasks();
  const { profile, addXp } = useProfile();
  const { entries: moodEntries } = useMoodEntries();
  const { sessions: studySessions } = useStudySessions();
  const { workouts } = useWorkouts();
  const { habits, isCompletedToday } = useHabits();

  const todayStr = new Date().toISOString().split("T")[0];

  // Determine boss of the day based on day of month to cycle through
  const dayOfMonth = new Date().getDate();
  const bossIndex = dayOfMonth % DAILY_BOSSES.length;
  const boss = DAILY_BOSSES[bossIndex];

  // Load critical strike task selection from localStorage
  const critKey = `nexus_boss_crit_${todayStr}`;
  const [criticalTaskId, setCriticalTaskId] = useState<string | null>(() => localStorage.getItem(critKey));
  
  // Claim state
  const claimKey = `nexus_boss_claimed_${todayStr}`;
  const [rewardClaimed, setRewardClaimed] = useState<boolean>(() => localStorage.getItem(claimKey) === "true");

  // Calculate damage elements
  const completedTasksToday = tasks.filter(t => t.completed && t.completed_at?.startsWith(todayStr));
  const taskDamage = completedTasksToday.reduce((sum, t) => sum + (t.xp_reward || 15), 0);

  const completedHabitsCount = habits.filter(h => isCompletedToday(h.id)).length;
  const habitDamage = completedHabitsCount * 15;

  const studySessionsToday = studySessions.filter(s => s.date === todayStr);
  const studyHoursToday = studySessionsToday.reduce((sum, s) => sum + Number(s.hours), 0);
  const studyDamage = Math.round(studyHoursToday * 20);

  const hasMoodToday = moodEntries.some(e => e.date === todayStr);
  const moodDamage = hasMoodToday ? 25 : 0;

  const workoutsToday = workouts ? workouts.filter((w: any) => w.date === todayStr) : [];
  const workoutDamage = workoutsToday.length * 30;

  // Critical strike task completion
  const criticalTask = tasks.find(t => t.id === criticalTaskId);
  const isCriticalCompleted = criticalTask?.completed && criticalTask?.completed_at?.startsWith(todayStr);
  const criticalDamage = isCriticalCompleted ? 80 : 0;

  const totalDamage = taskDamage + habitDamage + studyDamage + moodDamage + workoutDamage + criticalDamage;
  const currentHp = Math.max(0, boss.maxHp - totalDamage);
  const hpPercent = (currentHp / boss.maxHp) * 100;
  const isDefeated = currentHp === 0;

  // Handle critical task choice
  const selectCriticalTask = (taskId: string) => {
    localStorage.setItem(critKey, taskId);
    setCriticalTaskId(taskId);
    toast.success("Golpe Crítico Definido! 🎯 Complete essa missão para desferir 80 de dano bônus ao Chefão.");
  };

  // Handle claiming reward
  const handleClaim = async () => {
    if (rewardClaimed || !isDefeated) return;
    localStorage.setItem(claimKey, "true");
    setRewardClaimed(true);
    await addXp(50);
    // Try play sound
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const notes = [261.63, 329.63, 392.00, 523.25]; // C4, E4, G4, C5
      notes.forEach((freq, i) => {
        setTimeout(() => {
          const osc = audioCtx.createOscillator();
          const gainNode = audioCtx.createGain();
          osc.connect(gainNode);
          gainNode.connect(audioCtx.destination);
          osc.frequency.value = freq;
          gainNode.gain.setValueAtTime(0.05, audioCtx.currentTime);
          osc.start();
          gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
          setTimeout(() => { osc.stop(); }, 150);
        }, i * 120);
      });
    } catch (e) {
      console.log("Audio play error", e);
    }
    toast.success("Baú de Tesouro Aberto! 💎 Você derrotou o Chefão e ganhou +50 XP!");
  };

  // Filter tasks that are pending for today to show as potential Critical Strike
  const pendingTasks = tasks.filter(t => !t.completed);

  return (
    <motion.div {...fadeInUp} transition={{ delay: 0.1 }} className="rounded-xl border border-border bg-card p-5 overflow-hidden relative shadow-lg group">
      {/* Background radial highlight */}
      <div className="absolute -right-16 -bottom-16 w-48 h-48 bg-destructive/10 rounded-full blur-3xl pointer-events-none group-hover:bg-destructive/15 transition-all duration-700" />
      
      {/* Widget Header */}
      <div className="flex items-center justify-between mb-4 relative z-10">
        <div className="flex items-center gap-2">
          <Skull className="h-5 w-5 text-destructive animate-pulse" />
          <h3 className="font-display text-sm font-bold text-foreground">Chefão Diário</h3>
        </div>
        <span className="text-[10px] uppercase font-semibold text-destructive px-2 py-0.5 rounded-full bg-destructive/10 border border-destructive/20 animate-pulse">
          {isDefeated ? "Derrotado!" : "Em Combate"}
        </span>
      </div>

      {/* Boss Display */}
      <div className="flex items-center gap-4 mb-4 relative z-10">
        <div className="relative">
          <div className={`h-16 w-16 rounded-2xl flex items-center justify-center text-3xl bg-secondary border border-border/80 shadow-inner select-none ${isDefeated ? 'grayscale opacity-50' : 'animate-bounce'}`}>
            {boss.icon}
          </div>
          <span className="absolute -bottom-1.5 -right-1.5 bg-destructive text-[10px] text-destructive-foreground font-bold px-1.5 py-0.5 rounded-md">
            Lvl {boss.level}
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <h4 className="font-display text-base font-bold text-foreground truncate">{boss.name}</h4>
          <p className="text-[10px] text-muted-foreground line-clamp-2 leading-tight mt-0.5">{boss.desc}</p>
          <p className="text-[9px] text-destructive font-medium mt-1">Fraqueza: <span className="underline">{boss.weakness}</span></p>
        </div>
      </div>

      {/* HP Bar */}
      <div className="mb-4 relative z-10">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-muted-foreground flex items-center gap-1">
            <Heart className="h-3 w-3 text-destructive" /> Vida do Chefão
          </span>
          <span className="font-semibold text-foreground">{currentHp} / {boss.maxHp} HP</span>
        </div>
        <div className="stat-bar h-3.5 rounded-lg overflow-hidden bg-secondary relative">
          <motion.div 
            className="stat-bar-fill rounded-lg bg-gradient-to-r from-red-600 to-orange-500" 
            initial={{ width: `${hpPercent}%` }} 
            animate={{ width: `${hpPercent}%` }} 
            transition={{ type: "spring", stiffness: 60, damping: 15 }} 
          />
        </div>
      </div>

      {/* Critical Strike Selection */}
      {!isDefeated && (
        <div className="mb-4 p-2.5 rounded-lg bg-secondary/50 border border-border relative z-10">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-[10px] font-bold text-foreground">🎯 Golpe Crítico (+80 Dano)</p>
              <p className="text-[9px] text-muted-foreground">Escolha uma missão para ser o alvo de dano duplo.</p>
            </div>
            {pendingTasks.length > 0 ? (
              <select 
                className="text-[10px] bg-card border border-border rounded px-1.5 py-1 text-foreground focus:outline-none focus:ring-1 focus:ring-primary max-w-[120px] truncate"
                value={criticalTaskId || ""}
                onChange={(e) => selectCriticalTask(e.target.value)}
              >
                <option value="">Selecione...</option>
                {pendingTasks.map(t => (
                  <option key={t.id} value={t.id}>{t.title}</option>
                ))}
              </select>
            ) : (
              <span className="text-[9px] text-muted-foreground">Sem missões ativas</span>
            )}
          </div>

          {criticalTask && (
            <div className="mt-2 pt-2 border-t border-border flex items-center gap-1.5 text-[9px]">
              <span className={isCriticalCompleted ? "text-health font-bold" : "text-muted-foreground"}>
                {isCriticalCompleted ? "✅ Alvo Concluído!" : "⚔️ Alvo:"}
              </span>
              <span className={`truncate flex-1 ${isCriticalCompleted ? "line-through text-health/70" : "text-foreground font-medium"}`}>
                {criticalTask.title}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Defeated / Reward Area */}
      {isDefeated && (
        <motion.div 
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="mb-4 p-3 rounded-lg bg-health/5 border border-health/20 flex flex-col items-center text-center relative z-10"
        >
          {!rewardClaimed ? (
            <>
              <motion.span 
                animate={{ rotate: [0, -10, 10, -10, 10, 0] }}
                transition={{ repeat: Infinity, duration: 1.5, repeatDelay: 1 }}
                className="text-4xl mb-2 cursor-pointer select-none"
                onClick={handleClaim}
              >
                🎁
              </motion.span>
              <p className="text-xs font-bold text-health">Chefão Derrotado! 🎉</p>
              <p className="text-[10px] text-muted-foreground mb-2">Seu esforço rendeu um baú de tesouro épico.</p>
              <Button size="sm" className="bg-health hover:bg-health-hover text-white text-[10px] h-7 px-4 gap-1 rounded-xl shadow-md shadow-health/15" onClick={handleClaim}>
                <Sparkles className="h-3 w-3" /> Resgatar Recompensa (+50 XP)
              </Button>
            </>
          ) : (
            <>
              <span className="text-4xl mb-2 select-none opacity-80">🔓</span>
              <p className="text-xs font-bold text-muted-foreground">Recompensa Coletada!</p>
              <p className="text-[10px] text-muted-foreground">Você superou este obstáculo hoje. Um novo Chefão surgirá amanhã!</p>
            </>
          )}
        </motion.div>
      )}

      {/* Combat Log */}
      <div className="p-2.5 rounded-lg bg-secondary/30 border border-border/60 relative z-10">
        <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Registro de Combate</p>
        <div className="space-y-1 text-[10px] font-mono leading-relaxed max-h-[80px] overflow-y-auto pr-1 text-muted-foreground text-left">
          {taskDamage > 0 && (
            <p className="text-foreground"><span className="text-primary">⚔️</span> Causou <span className="text-primary font-bold">{taskDamage}</span> de dano físico com {completedTasksToday.length} missão(ões).</p>
          )}
          {habitDamage > 0 && (
            <p className="text-foreground"><span className="text-health">🎯</span> Causou <span className="text-health font-bold">{habitDamage}</span> de dano constante com {completedHabitsCount} hábito(s).</p>
          )}
          {studyDamage > 0 && (
            <p className="text-foreground"><span className="text-mana">📚</span> Causou <span className="text-mana font-bold">{studyDamage}</span> de dano mental com {studyHoursToday.toFixed(1)}h de estudo.</p>
          )}
          {moodDamage > 0 && (
            <p className="text-foreground"><span className="text-wisdom">🧠</span> Causou <span className="text-wisdom font-bold">{moodDamage}</span> de dano espiritual com check-in mental.</p>
          )}
          {workoutDamage > 0 && (
            <p className="text-foreground"><span className="text-strength">💪</span> Causou <span className="text-strength font-bold">{workoutDamage}</span> de dano físico bruto com {workoutsToday.length} treino(s).</p>
          )}
          {criticalDamage > 0 && (
            <p className="text-health font-bold"><span className="text-destructive">🔥</span> GOLPE CRÍTICO! +{criticalDamage} de dano extra no ponto fraco.</p>
          )}
          {totalDamage === 0 && (
            <p className="italic text-muted-foreground/60 text-center py-1">Chefão está observando... Complete suas atividades do dia para atacá-lo!</p>
          )}
          {isDefeated && (
            <p className="text-health font-bold text-center mt-1 pt-1 border-t border-border/40 font-semibold">☠️ O monstro desabou! Vitória!</p>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export function ConsolidatedQuestBoard() {
  const { tasks, toggle } = useTasks();
  const { habits, toggleToday, isCompletedToday } = useHabits();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"tasks" | "habits">("tasks");

  const pendingTasks = tasks.filter(t => !t.completed).slice(0, 5);
  const completedTasks = tasks.filter(t => t.completed).length;

  const completedHabits = habits.filter((h) => isCompletedToday(h.id)).length;
  const totalHabits = habits.length;

  const handleToggleTask = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await toggle(id);
  };

  const handleToggleHabit = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await toggleToday(id);
  };

  return (
    <motion.div {...fadeInUp} transition={{ delay: 0.15 }} className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display text-sm font-semibold text-foreground flex items-center gap-1.5">
          <Target className="h-4 w-4 text-primary" /> Quadro de Atividades
        </h3>
        
        {/* Toggle buttons inside the header */}
        <div className="flex rounded-lg bg-secondary p-0.5 text-xs font-medium">
          <button 
            onClick={() => setActiveTab("tasks")} 
            className={`px-3 py-1 rounded-md transition-all ${activeTab === "tasks" ? "bg-card text-foreground shadow-sm font-semibold" : "text-muted-foreground hover:text-foreground"}`}
          >
            Missões ({pendingTasks.length})
          </button>
          <button 
            onClick={() => setActiveTab("habits")} 
            className={`px-3 py-1 rounded-md transition-all ${activeTab === "habits" ? "bg-card text-foreground shadow-sm font-semibold" : "text-muted-foreground hover:text-foreground"}`}
          >
            Hábitos ({completedHabits}/{totalHabits})
          </button>
        </div>
      </div>

      {activeTab === "tasks" ? (
        <div className="space-y-3">
          {pendingTasks.length === 0 ? (
            <div className="text-center py-6 bg-secondary/10 rounded-lg border border-dashed border-border">
              <Trophy className="h-7 w-7 text-xp/30 mx-auto mb-2 animate-bounce" />
              <p className="text-xs text-muted-foreground">Todas as missões concluídas! 🎉</p>
              <Button size="sm" variant="link" className="text-[10px] text-primary mt-1 h-auto p-0" onClick={() => navigate("/app/tasks")}>
                Criar nova missão →
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {pendingTasks.map((task) => {
                const cat = CATEGORY_CONFIG[task.category as TaskCategory] || { icon: "📋", label: task.category };
                const isOverdue = task.due_date && new Date(task.due_date + "T23:59:59") < new Date();
                return (
                  <div 
                    key={task.id} 
                    className={`flex items-center gap-3 rounded-lg px-3 py-2 border transition-all ${
                      isOverdue ? "border-destructive/30 bg-destructive/5" : "border-border bg-secondary/30 hover:border-primary/20 hover:bg-secondary/40"
                    }`}
                  >
                    {/* Interactive toggle button */}
                    <button 
                      onClick={(e) => handleToggleTask(task.id, e)}
                      className="h-4.5 w-4.5 rounded border border-muted-foreground/30 hover:border-primary/70 flex items-center justify-center text-[10px] bg-card hover:bg-secondary shrink-0 transition-colors cursor-pointer text-primary"
                      title="Concluir Missão"
                    >
                      {task.completed ? "✓" : ""}
                    </button>
                    
                    <span className="text-xs shrink-0">{cat.icon}</span>
                    <span className="flex-1 text-xs text-foreground truncate text-left">{task.title}</span>
                    {isOverdue && <span className="text-[9px] text-destructive font-medium shrink-0">Atrasada</span>}
                    <span className="text-[10px] text-xp font-bold shrink-0">+{task.xp_reward} XP</span>
                  </div>
                );
              })}
            </div>
          )}
          <div className="flex justify-between items-center pt-2 text-[10px] text-muted-foreground border-t border-border/40">
            <span>{completedTasks} concluídas no total</span>
            <Button size="sm" variant="ghost" className="h-auto p-0 text-[10px] text-primary font-medium hover:bg-transparent hover:underline" onClick={() => navigate("/app/tasks")}>
              Gerenciar Missões →
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {totalHabits === 0 ? (
            <div className="text-center py-6 bg-secondary/10 rounded-lg border border-dashed border-border">
              <Target className="h-7 w-7 text-health/30 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">Nenhum hábito cadastrado ainda.</p>
              <Button size="sm" variant="link" className="text-[10px] text-primary mt-1 h-auto p-0" onClick={() => navigate("/app/habits")}>
                Adicionar Hábito →
              </Button>
            </div>
          ) : (
            <>
              {/* Overall Progress Bar */}
              <div className="mb-2">
                <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                  <span>Conclusão diária</span>
                  <span>{completedHabits} de {totalHabits} ({Math.round(totalHabits > 0 ? (completedHabits / totalHabits) * 100 : 0)}%)</span>
                </div>
                <div className="stat-bar h-1.5 rounded-full bg-secondary">
                  <motion.div 
                    className="stat-bar-fill health-fill rounded-full" 
                    animate={{ width: `${totalHabits > 0 ? (completedHabits / totalHabits) * 100 : 0}%` }} 
                    transition={{ duration: 0.4 }} 
                  />
                </div>
              </div>

              <div className="space-y-2">
                {habits.slice(0, 5).map((habit) => {
                  const done = isCompletedToday(habit.id);
                  return (
                    <div 
                      key={habit.id} 
                      className={`flex items-center gap-3 rounded-lg px-3 py-2 border transition-all ${
                        done ? "border-health/20 bg-health/5 text-health" : "border-border bg-secondary/30 hover:border-primary/20 hover:bg-secondary/40"
                      }`}
                    >
                      {/* Interactive toggle button for habit */}
                      <button 
                        onClick={(e) => handleToggleHabit(habit.id, e)}
                        className={`h-4.5 w-4.5 rounded-md border flex items-center justify-center text-[10px] bg-card hover:bg-secondary shrink-0 transition-all cursor-pointer ${
                          done ? "border-health bg-health/20 text-health font-bold" : "border-muted-foreground/30 hover:border-health/70"
                        }`}
                        title={done ? "Desmarcar" : "Marcar como Feito"}
                      >
                        {done ? "✓" : ""}
                      </button>

                      <span className="text-xs shrink-0">{done ? "✅" : habit.icon}</span>
                      <span className={`flex-1 text-xs truncate text-left ${done ? "line-through text-muted-foreground" : "text-foreground"}`}>
                        {habit.name}
                      </span>
                      {(habit.current_streak || 0) > 0 && (
                        <span className="ml-auto flex items-center gap-0.5 text-[9px] text-destructive shrink-0">
                          <Flame className="h-3 w-3" />{habit.current_streak}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
          <div className="flex justify-between items-center pt-2 text-[10px] text-muted-foreground border-t border-border/40">
            <span>Hábitos diários automatizam conquistas</span>
            <Button size="sm" variant="ghost" className="h-auto p-0 text-[10px] text-primary font-medium hover:bg-transparent hover:underline" onClick={() => navigate("/app/habits")}>
              Gerenciar Hábitos →
            </Button>
          </div>
        </div>
      )}
    </motion.div>
  );
}

