import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen, Clock, Flame, Plus, Trash2, Play, Pause, RotateCcw, Timer,
  Brain, ChevronDown, ChevronUp, Check, X, Lightbulb, BarChart2,
  Target, Zap, Award, Eye, Calendar, TrendingUp, Sparkles,
  ChevronRight, RefreshCw, CheckCircle2, AlertCircle, Crown
} from "lucide-react";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useStudySessions, useProfile, useCareerSkills } from "@/hooks/useGameData";
import { toast } from "@/hooks/use-toast";

// ─── Types ─────────────────────────────────────────────────────────────────────
type Flashcard = {
  id: string;
  subject: string;
  question: string;
  answer: string;
  createdAt: string;
  nextReview: string;   // ISO date YYYY-MM-DD
  interval: number;     // days to next review
  streak: number;       // consecutive correct answers
  totalReviews: number;
  correctReviews: number;
};

type FeynmanConcept = {
  id: string;
  subject: string;
  concept: string;
  explanation: string;
  confidence: number;   // 1-5 stars
  updatedAt: string;
};

type FlowSession = {
  id: string;
  subject: string;
  objective: string;
  durationMin: number;
  flowRating: number;   // 1-5
  completedAt: string;
};

// ─── Constants ─────────────────────────────────────────────────────────────────
const SRS_INTERVALS = [1, 3, 7, 14, 30]; // Ebbinghaus spaced repetition intervals

const MASTERY_LEVELS = [
  { min: 0,   label: "Novato",        icon: "🌱", color: "text-slate-400",    bg: "bg-slate-500/10" },
  { min: 5,   label: "Iniciante",     icon: "📖", color: "text-blue-400",     bg: "bg-blue-500/10"  },
  { min: 15,  label: "Intermediário", icon: "⚡", color: "text-yellow-400",   bg: "bg-yellow-500/10"},
  { min: 30,  label: "Avançado",      icon: "🚀", color: "text-purple-400",   bg: "bg-purple-500/10"},
  { min: 60,  label: "Expert",        icon: "🔥", color: "text-orange-400",   bg: "bg-orange-500/10"},
  { min: 100, label: "Mestre",        icon: "👑", color: "text-amber-400",    bg: "bg-amber-500/10" },
];

const TIMER_PRESETS = [
  { label: "Pomodoro", min: 25, icon: "🍅", desc: "Ciclo clássico" },
  { label: "Padrão",   min: 45, icon: "📚", desc: "Foco moderado"  },
  { label: "Flow",     min: 90, icon: "⚡", desc: "Ultradiano (ideal cognitivo)" },
];

// ─── Helpers ───────────────────────────────────────────────────────────────────
const todayStr = () => new Date().toISOString().slice(0, 10);

function addDays(date: string, n: number): string {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function getMastery(hours: number) {
  return [...MASTERY_LEVELS].reverse().find(l => hours >= l.min) || MASTERY_LEVELS[0];
}

function playStudyChime(type: "complete" | "correct" | "wrong" | "tick") {
  try {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return;
    const seqs: Record<string, { f: number; d: number }[]> = {
      complete: [{ f: 523, d: 0.1 }, { f: 659, d: 0.1 }, { f: 784, d: 0.1 }, { f: 1047, d: 0.4 }],
      correct:  [{ f: 659, d: 0.08 }, { f: 880, d: 0.18 }],
      wrong:    [{ f: 350, d: 0.15 }, { f: 280, d: 0.25 }],
      tick:     [{ f: 800, d: 0.04 }],
    };
    let offset = 0;
    seqs[type].forEach(({ f, d }) => {
      setTimeout(() => {
        try {
          const c = new Ctx();
          const o = c.createOscillator(); const g = c.createGain();
          o.connect(g); g.connect(c.destination);
          o.type = "sine"; o.frequency.value = f;
          g.gain.setValueAtTime(0.06, c.currentTime);
          o.start();
          g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + d);
          o.stop(c.currentTime + d);
        } catch {}
      }, offset);
      offset += d * 1000;
    });
  } catch {}
}

function useLocalStorage<T>(key: string, init: T): [T, (v: T | ((prev: T) => T)) => void] {
  const [val, setVal] = useState<T>(() => {
    try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : init; } catch { return init; }
  });
  const set = useCallback((v: T | ((prev: T) => T)) => {
    setVal(prev => {
      const next = typeof v === "function" ? (v as (p: T) => T)(prev) : v;
      localStorage.setItem(key, JSON.stringify(next));
      return next;
    });
  }, [key]);
  return [val, set];
}

// ─── Main Component ─────────────────────────────────────────────────────────────
export default function Study() {
  const { sessions, loading, create, remove } = useStudySessions();
  const { addXp } = useProfile();
  const { skills } = useCareerSkills();

  // Flashcards (localStorage)
  const [flashcards, setFlashcards] = useLocalStorage<Flashcard[]>("nexus_flashcards", []);
  // Feynman concepts (localStorage)
  const [feynmanConcepts, setFeynmanConcepts] = useLocalStorage<FeynmanConcept[]>("nexus_feynman", []);
  // Flow session history (localStorage)
  const [flowHistory, setFlowHistory] = useLocalStorage<FlowSession[]>("nexus_flow_history", []);
  // Weekly goal (hours)
  const [weeklyGoal, setWeeklyGoal] = useLocalStorage<number>("nexus_study_goal", 10);

  const [logDialog, setLogDialog] = useState(false);
  const [logForm, setLogForm] = useState({ subject: "", hours: "", note: "" });

  // ── Derived stats ──────────────────────────────────────────────────────────
  const subjectMap: Record<string, { hours: number; count: number }> = {};
  sessions.forEach(s => {
    if (!subjectMap[s.subject]) subjectMap[s.subject] = { hours: 0, count: 0 };
    subjectMap[s.subject].hours += Number(s.hours);
    subjectMap[s.subject].count += 1;
  });
  const subjects = Object.entries(subjectMap).map(([name, data]) => ({ name, ...data }));
  const totalHours = subjects.reduce((s, sub) => s + sub.hours, 0);

  const last7 = Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - (6 - i)); return d.toISOString().slice(0, 10); });
  const weeklyHours = last7.map(date => sessions.filter(s => s.date === date).reduce((sum, s) => sum + Number(s.hours), 0));
  const weeklyTotal = weeklyHours.reduce((a, b) => a + b, 0);

  // Study streak (consecutive days with ≥1h)
  const streak = useMemo(() => {
    let s = 0;
    const sorted = [...sessions].sort((a, b) => b.date.localeCompare(a.date));
    const seen = new Set<string>();
    for (const sess of sorted) { seen.add(sess.date); }
    const today = new Date();
    for (let i = 0; i < 60; i++) {
      const d = new Date(today); d.setDate(today.getDate() - i);
      const dStr = d.toISOString().slice(0, 10);
      const dayHours = sessions.filter(s => s.date === dStr).reduce((sum, s) => sum + Number(s.hours), 0);
      if (dayHours >= 1) s++; else break;
    }
    return s;
  }, [sessions]);

  // Heatmap (30 days)
  const heatmapDays = useMemo(() => {
    return Array.from({ length: 30 }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - (29 - i));
      const dStr = d.toISOString().slice(0, 10);
      const h = sessions.filter(s => s.date === dStr).reduce((sum, s) => sum + Number(s.hours), 0);
      return { date: dStr, hours: h, label: d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) };
    });
  }, [sessions]);

  // Flashcard stats
  const dueToday = flashcards.filter(fc => fc.nextReview <= todayStr()).length;
  const totalFcCorrect = flashcards.reduce((s, fc) => s + fc.correctReviews, 0);
  const totalFcReviews = flashcards.reduce((s, fc) => s + fc.totalReviews, 0);
  const overallAccuracy = totalFcReviews > 0 ? (totalFcCorrect / totalFcReviews * 100) : 0;

  // Feynman avg confidence by subject
  const feynmanBySubject: Record<string, number[]> = {};
  feynmanConcepts.forEach(fc => {
    if (!feynmanBySubject[fc.subject]) feynmanBySubject[fc.subject] = [];
    feynmanBySubject[fc.subject].push(fc.confidence);
  });

  const openLog = () => {
    setLogForm({ subject: skills.length > 0 ? skills[0].name : "", hours: "", note: "" });
    setLogDialog(true);
  };
  const saveLog = async () => {
    if (!logForm.subject || !logForm.hours) return;
    await create({ subject: logForm.subject, hours: Number(logForm.hours), note: logForm.note || null, date: todayStr() });
    const xp = Math.round(Number(logForm.hours) * 15);
    await addXp(xp);
    toast({ title: `+${xp} XP!`, description: `${logForm.hours}h de ${logForm.subject} registradas.` });
    setLogDialog(false);
  };

  if (loading) return (
    <div className="max-w-5xl mx-auto flex items-center justify-center py-20">
      <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-xl border border-border bg-gradient-to-br from-card via-secondary/30 to-card p-6">
        <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(circle_at_60%_20%,hsl(220_80%_60%/.8),transparent_60%)]" />
        <div className="relative flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground">
              Laboratório de <span className="text-primary drop-shadow-[0_0_8px_hsl(var(--primary)/.4)]">Aprendizado</span>
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Active Recall · Repetição Espaçada · Feynman · Flow</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={openLog} size="sm" variant="outline" className="gap-1.5"><Plus className="h-4 w-4" /> Registrar Sessão</Button>
          </div>
        </div>
      </motion.div>

      {/* Top KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Horas Totais", value: `${totalHours.toFixed(1)}h`, icon: Clock, color: "text-primary", sub: `${sessions.length} sessões` },
          { label: "Streak", value: `${streak} dias`, icon: Flame, color: streak >= 7 ? "text-amber-400" : streak >= 3 ? "text-orange-400" : "text-destructive", sub: streak >= 7 ? "🔥 Incrível!" : "Mantenha!" },
          { label: "Cards Ativos", value: `${flashcards.length}`, icon: Brain, color: "text-purple-400", sub: dueToday > 0 ? `${dueToday} para revisar hoje!` : "Em dia ✓" },
          { label: "Precisão AR", value: totalFcReviews > 0 ? `${overallAccuracy.toFixed(0)}%` : "—", icon: Target, color: overallAccuracy >= 80 ? "text-emerald-400" : overallAccuracy >= 60 ? "text-amber-400" : "text-destructive", sub: "active recall" },
        ].map((kpi, i) => (
          <motion.div key={kpi.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
            className="rounded-xl border border-border bg-card p-4 hover:border-primary/20 transition-all">
            <div className="flex items-center gap-2 mb-2">
              <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{kpi.label}</span>
            </div>
            <p className={`text-xl font-bold font-display ${kpi.color}`}>{kpi.value}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{kpi.sub}</p>
          </motion.div>
        ))}
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="overview" className="text-xs gap-1"><BarChart2 className="h-3.5 w-3.5" />Visão Geral</TabsTrigger>
          <TabsTrigger value="flashcards" className="text-xs gap-1 relative">
            <Brain className="h-3.5 w-3.5" />Flashcards
            {dueToday > 0 && <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-[9px] text-white flex items-center justify-center font-bold">{dueToday}</span>}
          </TabsTrigger>
          <TabsTrigger value="feynman" className="text-xs gap-1"><Lightbulb className="h-3.5 w-3.5" />Feynman</TabsTrigger>
          <TabsTrigger value="focus" className="text-xs gap-1"><Zap className="h-3.5 w-3.5" />Foco</TabsTrigger>
        </TabsList>

        {/* ── OVERVIEW ── */}
        <TabsContent value="overview" className="mt-4 space-y-4">
          {/* Weekly goal + heatmap */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-display text-sm font-semibold flex items-center gap-2">
                  <Target className="h-4 w-4 text-primary" /> Meta Semanal
                </h3>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Meta:</span>
                  <input type="number" value={weeklyGoal} onChange={e => setWeeklyGoal(Number(e.target.value))}
                    className="w-12 h-6 text-xs rounded border border-border bg-background px-1.5 text-center" min={1} max={80} />
                  <span className="text-xs text-muted-foreground">h</span>
                </div>
              </div>
              <div className="flex items-end gap-1.5 h-24 mb-3">
                {weeklyHours.map((h, i) => {
                  const maxH = Math.max(...weeklyHours, 1);
                  const date = new Date(last7[i]);
                  const days = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
                  const isToday = last7[i] === todayStr();
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                      {h > 0 && <span className="text-[8px] text-primary font-bold">{h.toFixed(1)}h</span>}
                      <div className={`w-full rounded-t-md transition-all ${isToday ? "bg-primary" : "bg-primary/40"}`}
                        style={{ height: `${(h / maxH) * 80}px`, minHeight: h > 0 ? "4px" : "0" }} />
                      <span className={`text-[9px] ${isToday ? "text-primary font-bold" : "text-muted-foreground"}`}>{days[date.getDay()]}</span>
                    </div>
                  );
                })}
              </div>
              <div className="h-2 bg-secondary rounded-full overflow-hidden">
                <motion.div className="h-full bg-primary rounded-full" initial={{ width: 0 }}
                  animate={{ width: `${Math.min((weeklyTotal / weeklyGoal) * 100, 100)}%` }} transition={{ duration: 0.8 }} />
              </div>
              <div className="flex justify-between text-[10px] mt-1 text-muted-foreground">
                <span>{weeklyTotal.toFixed(1)}h estudadas</span>
                <span className={weeklyTotal >= weeklyGoal ? "text-emerald-400 font-bold" : "text-primary"}>{Math.min((weeklyTotal / weeklyGoal) * 100, 100).toFixed(0)}%{weeklyTotal >= weeklyGoal ? " ✓ Meta!" : ""}</span>
              </div>
            </div>

            {/* Heatmap 30 days */}
            <div className="rounded-xl border border-border bg-card p-5">
              <h3 className="font-display text-sm font-semibold mb-3 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" /> Consistência — 30 dias
              </h3>
              <div className="grid grid-cols-10 gap-1">
                {heatmapDays.map(d => {
                  const intensity = d.hours === 0 ? 0 : d.hours < 1 ? 1 : d.hours < 2 ? 2 : d.hours < 4 ? 3 : 4;
                  const colors = ["bg-secondary/40", "bg-primary/20", "bg-primary/45", "bg-primary/70", "bg-primary"];
                  return (
                    <div key={d.date} title={`${d.label}: ${d.hours.toFixed(1)}h`}
                      className={`aspect-square rounded-sm ${colors[intensity]} transition-all hover:scale-110 cursor-default`} />
                  );
                })}
              </div>
              <div className="flex items-center gap-2 mt-3 text-[9px] text-muted-foreground">
                <span>Menos</span>
                {["bg-secondary/40", "bg-primary/20", "bg-primary/45", "bg-primary/70", "bg-primary"].map((c, i) => (
                  <div key={i} className={`h-3 w-3 rounded-sm ${c}`} />
                ))}
                <span>Mais</span>
              </div>
            </div>
          </div>

          {/* Subject Mastery Cards */}
          {subjects.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-5">
              <h3 className="font-display text-sm font-semibold mb-4 flex items-center gap-2">
                <Crown className="h-4 w-4 text-amber-400" /> Maestria por Matéria
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {subjects.sort((a, b) => b.hours - a.hours).map(sub => {
                  const mastery = getMastery(sub.hours);
                  const nextLevel = MASTERY_LEVELS.find(l => l.min > sub.hours);
                  const hoursToNext = nextLevel ? nextLevel.min - sub.hours : 0;
                  const fcSub = flashcards.filter(f => f.subject === sub.name);
                  const fcAcc = fcSub.length > 0 && fcSub.reduce((s, f) => s + f.totalReviews, 0) > 0
                    ? (fcSub.reduce((s, f) => s + f.correctReviews, 0) / fcSub.reduce((s, f) => s + f.totalReviews, 0) * 100) : null;
                  const feynSub = feynmanConcepts.filter(f => f.subject === sub.name);
                  const feynAvg = feynSub.length > 0 ? feynSub.reduce((s, f) => s + f.confidence, 0) / feynSub.length : null;

                  return (
                    <div key={sub.name} className={`rounded-lg border p-3.5 ${mastery.bg} border-current/20 transition-all`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{mastery.icon}</span>
                          <div>
                            <p className="text-sm font-bold text-foreground">{sub.name}</p>
                            <p className={`text-[10px] font-bold ${mastery.color}`}>{mastery.label}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`text-sm font-bold ${mastery.color}`}>{sub.hours.toFixed(1)}h</p>
                          <p className="text-[9px] text-muted-foreground">{sub.count} sessões</p>
                        </div>
                      </div>
                      {nextLevel && (
                        <>
                          <div className="h-1.5 bg-secondary/60 rounded-full overflow-hidden mb-1">
                            <div className="h-full rounded-full bg-current opacity-60 transition-all"
                              style={{ width: `${Math.min((sub.hours / nextLevel.min) * 100, 100)}%` }} />
                          </div>
                          <p className="text-[9px] text-muted-foreground">{hoursToNext.toFixed(1)}h para {nextLevel.label}</p>
                        </>
                      )}
                      {(fcAcc !== null || feynAvg !== null) && (
                        <div className="flex gap-3 mt-2">
                          {fcAcc !== null && <span className="text-[9px] text-muted-foreground">AR: <b className={fcAcc >= 80 ? "text-emerald-400" : "text-amber-400"}>{fcAcc.toFixed(0)}%</b></span>}
                          {feynAvg !== null && <span className="text-[9px] text-muted-foreground">Feynman: <b className="text-primary">{feynAvg.toFixed(1)}/5⭐</b></span>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Recent Sessions */}
          {sessions.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-5">
              <h3 className="font-display text-sm font-semibold mb-3">Últimas Sessões</h3>
              <div className="space-y-1.5">
                {sessions.slice(0, 8).map(s => (
                  <div key={s.id} className="flex items-center gap-3 group rounded-lg px-3 py-2 hover:bg-secondary/30 transition-colors">
                    <BookOpen className="h-4 w-4 text-primary shrink-0" />
                    <span className="text-sm text-foreground flex-1 truncate">{s.subject}</span>
                    {s.note && <span className="text-[10px] text-muted-foreground max-w-[140px] truncate hidden sm:block">{s.note}</span>}
                    <span className="text-[10px] text-muted-foreground">{s.date}</span>
                    <span className="text-xs text-primary font-semibold">{Number(s.hours).toFixed(1)}h</span>
                    <button onClick={() => remove(s.id)} className="p-0.5 rounded hover:bg-destructive/20 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        {/* ── FLASHCARDS (Active Recall + Spaced Repetition) ── */}
        <TabsContent value="flashcards" className="mt-4">
          <FlashcardPanel
            flashcards={flashcards}
            setFlashcards={setFlashcards}
            subjects={subjects.map(s => s.name)}
            skills={skills}
            dueToday={dueToday}
          />
        </TabsContent>

        {/* ── FEYNMAN ── */}
        <TabsContent value="feynman" className="mt-4">
          <FeynmanPanel
            concepts={feynmanConcepts}
            setConcepts={setFeynmanConcepts}
            subjects={subjects.map(s => s.name)}
            skills={skills}
          />
        </TabsContent>

        {/* ── FOCUS TIMER ── */}
        <TabsContent value="focus" className="mt-4">
          <FocusTimerPanel
            flowHistory={flowHistory}
            setFlowHistory={setFlowHistory}
            skills={skills}
            onCreate={create}
            addXp={addXp}
          />
        </TabsContent>
      </Tabs>

      {/* Log Dialog */}
      <Dialog open={logDialog} onOpenChange={setLogDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" /> Registrar Sessão de Estudo
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Matéria</label>
              {skills.length > 0 ? (
                <select value={logForm.subject} onChange={e => setLogForm({ ...logForm, subject: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  {skills.map(sk => <option key={sk.id} value={sk.name}>{sk.name}</option>)}
                  <option value="">Outro...</option>
                </select>
              ) : (
                <Input value={logForm.subject} onChange={e => setLogForm({ ...logForm, subject: e.target.value })} placeholder="Ex: Matemática" />
              )}
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Horas estudadas</label>
              <Input type="number" step="0.5" value={logForm.hours} onChange={e => setLogForm({ ...logForm, hours: e.target.value })} placeholder="Ex: 1.5" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Nota (opcional)</label>
              <Input value={logForm.note} onChange={e => setLogForm({ ...logForm, note: e.target.value })} placeholder="O que você estudou?" />
            </div>
            <Button onClick={saveLog} className="w-full gap-2"><BookOpen className="h-4 w-4" /> Registrar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Flashcard Panel ─────────────────────────────────────────────────────────
function FlashcardPanel({ flashcards, setFlashcards, subjects, skills, dueToday }: {
  flashcards: Flashcard[];
  setFlashcards: (v: Flashcard[] | ((p: Flashcard[]) => Flashcard[])) => void;
  subjects: string[];
  skills: any[];
  dueToday: number;
}) {
  const [mode, setMode] = useState<"list" | "review" | "create">("list");
  const [reviewQueue, setReviewQueue] = useState<Flashcard[]>([]);
  const [reviewIdx, setReviewIdx] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [filterSubject, setFilterSubject] = useState("all");
  const [createForm, setCreateForm] = useState({ subject: subjects[0] || "", question: "", answer: "" });

  const allSubjects = [...new Set([...subjects, ...flashcards.map(f => f.subject)])];

  const dueCards = flashcards.filter(fc => fc.nextReview <= todayStr());
  const filtered = filterSubject === "all" ? flashcards : flashcards.filter(f => f.subject === filterSubject);

  const startReview = () => {
    const queue = [...dueCards].sort(() => Math.random() - 0.5);
    setReviewQueue(queue);
    setReviewIdx(0);
    setShowAnswer(false);
    setMode("review");
  };

  const rateCard = (correct: boolean) => {
    playStudyChime(correct ? "correct" : "wrong");
    const card = reviewQueue[reviewIdx];
    setFlashcards(prev => prev.map(fc => {
      if (fc.id !== card.id) return fc;
      const newStreak = correct ? fc.streak + 1 : 0;
      const interval = correct ? SRS_INTERVALS[Math.min(newStreak, SRS_INTERVALS.length - 1)] : 1;
      return {
        ...fc,
        streak: newStreak,
        interval,
        nextReview: addDays(todayStr(), interval),
        totalReviews: fc.totalReviews + 1,
        correctReviews: fc.correctReviews + (correct ? 1 : 0),
      };
    }));
    if (reviewIdx + 1 >= reviewQueue.length) {
      playStudyChime("complete");
      toast({ title: "🎉 Revisão concluída!", description: `${reviewQueue.length} cards revisados.` });
      setMode("list");
    } else {
      setReviewIdx(i => i + 1);
      setShowAnswer(false);
    }
  };

  const addCard = () => {
    if (!createForm.question.trim() || !createForm.answer.trim() || !createForm.subject) return;
    const newCard: Flashcard = {
      id: Date.now().toString(),
      subject: createForm.subject,
      question: createForm.question.trim(),
      answer: createForm.answer.trim(),
      createdAt: todayStr(),
      nextReview: todayStr(),
      interval: 1,
      streak: 0,
      totalReviews: 0,
      correctReviews: 0,
    };
    setFlashcards(prev => [...prev, newCard]);
    toast({ title: "Flashcard criado! 🃏" });
    setCreateForm(f => ({ ...f, question: "", answer: "" }));
  };

  const deleteCard = (id: string) => setFlashcards(prev => prev.filter(f => f.id !== id));

  // Review mode
  if (mode === "review") {
    const card = reviewQueue[reviewIdx];
    if (!card) return null;
    const progress = ((reviewIdx) / reviewQueue.length) * 100;
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-base font-semibold">Revisão Ativa ({reviewIdx + 1}/{reviewQueue.length})</h3>
          <Button size="sm" variant="ghost" onClick={() => setMode("list")}><X className="h-4 w-4" /></Button>
        </div>
        <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
          <motion.div className="h-full bg-primary rounded-full" animate={{ width: `${progress}%` }} transition={{ duration: 0.4 }} />
        </div>
        <motion.div key={card.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
          className="rounded-xl border border-primary/20 bg-primary/5 p-6 text-center min-h-48 flex flex-col items-center justify-center">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider mb-3">{card.subject}</span>
          <p className="text-lg font-semibold text-foreground mb-4 leading-relaxed">{card.question}</p>
          {showAnswer ? (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="w-full border-t border-border pt-4 mt-2">
              <p className="text-base text-primary font-medium">{card.answer}</p>
            </motion.div>
          ) : (
            <Button onClick={() => setShowAnswer(true)} variant="outline" className="gap-2">
              <Eye className="h-4 w-4" /> Revelar Resposta
            </Button>
          )}
        </motion.div>
        {showAnswer && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-2 gap-3">
            <Button onClick={() => rateCard(false)} variant="outline" className="border-destructive/40 text-destructive hover:bg-destructive/10 gap-2 h-12">
              <X className="h-5 w-5" /> Não sabia <span className="text-[10px]">(revisar amanhã)</span>
            </Button>
            <Button onClick={() => rateCard(true)} className="bg-emerald-600 hover:bg-emerald-700 gap-2 h-12">
              <Check className="h-5 w-5" /> Sabia! <span className="text-[10px]">(próx. em {SRS_INTERVALS[Math.min(reviewQueue[reviewIdx]?.streak + 1, SRS_INTERVALS.length - 1)]}d)</span>
            </Button>
          </motion.div>
        )}
        <p className="text-[10px] text-muted-foreground text-center">Streak do card: {card.streak} acertos consecutivos</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Due today banner */}
      {dueToday > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-amber-400" />
            <div>
              <p className="text-sm font-bold text-foreground">{dueToday} card{dueToday > 1 ? "s" : ""} para revisar hoje!</p>
              <p className="text-[10px] text-muted-foreground">Baseado na Curva de Ebbinghaus — revise agora para fixar</p>
            </div>
          </div>
          <Button onClick={startReview} className="gap-2 bg-amber-500 hover:bg-amber-600 text-black">
            <Play className="h-4 w-4" /> Revisar Agora
          </Button>
        </motion.div>
      )}

      {/* Create Card */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="font-display text-sm font-semibold mb-4 flex items-center gap-2">
          <Plus className="h-4 w-4 text-primary" /> Criar Novo Flashcard
        </h3>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Matéria</label>
            {skills.length > 0 ? (
              <select value={createForm.subject} onChange={e => setCreateForm(f => ({ ...f, subject: e.target.value }))}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                {skills.map(sk => <option key={sk.id} value={sk.name}>{sk.name}</option>)}
              </select>
            ) : (
              <Input value={createForm.subject} onChange={e => setCreateForm(f => ({ ...f, subject: e.target.value }))} placeholder="Matéria..." />
            )}
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">❓ Pergunta</label>
            <textarea value={createForm.question} onChange={e => setCreateForm(f => ({ ...f, question: e.target.value }))}
              placeholder="O que você quer se testar sobre isso?" rows={2}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">✅ Resposta</label>
            <textarea value={createForm.answer} onChange={e => setCreateForm(f => ({ ...f, answer: e.target.value }))}
              placeholder="A resposta que você precisa saber de cabeça" rows={2}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none" />
          </div>
          <Button onClick={addCard} className="w-full gap-2" disabled={!createForm.question || !createForm.answer}>
            <Plus className="h-4 w-4" /> Adicionar Flashcard
          </Button>
        </div>
      </div>

      {/* Filter + List */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-sm font-semibold">{filtered.length} Flashcards</h3>
          <div className="flex items-center gap-2">
            <select value={filterSubject} onChange={e => setFilterSubject(e.target.value)}
              className="h-7 rounded border border-border bg-background px-2 text-xs">
              <option value="all">Todas matérias</option>
              {allSubjects.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            {flashcards.length > 0 && (
              <Button size="sm" variant="outline" onClick={startReview} className="h-7 text-xs gap-1">
                <Play className="h-3 w-3" /> Revisar Todas
              </Button>
            )}
          </div>
        </div>
        {filtered.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Brain className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Nenhum flashcard ainda. Crie o primeiro acima!</p>
            <p className="text-xs mt-1 text-muted-foreground/70">Dica: prefira perguntas curtas e específicas.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(fc => {
              const overdue = fc.nextReview < todayStr();
              const dueNow = fc.nextReview <= todayStr();
              const accuracy = fc.totalReviews > 0 ? (fc.correctReviews / fc.totalReviews * 100) : null;
              return (
                <div key={fc.id} className={`rounded-lg border p-3 flex items-start gap-3 group ${dueNow ? "border-amber-500/30 bg-amber-500/5" : "border-border bg-secondary/20"}`}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] text-muted-foreground">{fc.subject}</span>
                      {dueNow && <span className="text-[9px] px-1.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">{overdue ? "Atrasado!" : "Revisar hoje"}</span>}
                      {accuracy !== null && <span className="text-[9px] text-muted-foreground ml-auto">AR: {accuracy.toFixed(0)}%</span>}
                    </div>
                    <p className="text-sm font-medium text-foreground truncate">{fc.question}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Streak: {fc.streak} · Próxima revisão: {fc.nextReview} ({fc.interval}d)
                    </p>
                  </div>
                  <button onClick={() => deleteCard(fc.id)} className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/20 transition-opacity shrink-0">
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Feynman Panel ───────────────────────────────────────────────────────────
function FeynmanPanel({ concepts, setConcepts, subjects, skills }: {
  concepts: FeynmanConcept[];
  setConcepts: (v: FeynmanConcept[] | ((p: FeynmanConcept[]) => FeynmanConcept[])) => void;
  subjects: string[];
  skills: any[];
}) {
  const [form, setForm] = useState({ subject: subjects[0] || "", concept: "", explanation: "", confidence: 3 });
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const allSubjects = [...new Set([...subjects, ...concepts.map(c => c.subject)])];
  const gaps = concepts.filter(c => c.confidence <= 2);
  const strong = concepts.filter(c => c.confidence >= 4);

  const add = () => {
    if (!form.concept.trim() || !form.explanation.trim()) return;
    const existing = concepts.find(c => c.concept.toLowerCase() === form.concept.toLowerCase().trim());
    if (existing) {
      setConcepts(prev => prev.map(c => c.id === existing.id
        ? { ...c, explanation: form.explanation.trim(), confidence: form.confidence, updatedAt: todayStr() } : c));
      toast({ title: "Conceito atualizado! ✨" });
    } else {
      const nc: FeynmanConcept = { id: Date.now().toString(), subject: form.subject, concept: form.concept.trim(), explanation: form.explanation.trim(), confidence: form.confidence, updatedAt: todayStr() };
      setConcepts(prev => [...prev, nc]);
      toast({ title: "Conceito Feynman registrado! 🧠" });
    }
    setForm(f => ({ ...f, concept: "", explanation: "", confidence: 3 }));
  };

  const del = (id: string) => setConcepts(prev => prev.filter(c => c.id !== id));

  return (
    <div className="space-y-4">
      {/* Info banner */}
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
        <div className="flex items-start gap-3">
          <Lightbulb className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-foreground">Técnica Feynman — Aprenda ensinando</p>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
              Se você não consegue explicar um conceito com palavras simples, você ainda não o domina de verdade.
              Escreva como explicaria para uma criança. Os gaps de compreensão ficam imediatamente visíveis.
            </p>
          </div>
        </div>
      </div>

      {/* Gaps alert */}
      {gaps.length > 0 && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 flex items-center gap-3">
          <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
          <p className="text-xs text-foreground"><b className="text-destructive">{gaps.length} gap{gaps.length > 1 ? "s" : ""} detectado{gaps.length > 1 ? "s"  : ""}:</b> {gaps.map(g => g.concept).join(", ")} — confiança baixa.</p>
        </div>
      )}

      {/* Create/Update */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="font-display text-sm font-semibold mb-4 flex items-center gap-2">
          <Brain className="h-4 w-4 text-primary" /> Registrar Conceito Feynman
        </h3>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Matéria</label>
              {skills.length > 0 ? (
                <select value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  {skills.map(sk => <option key={sk.id} value={sk.name}>{sk.name}</option>)}
                </select>
              ) : (
                <Input value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} placeholder="Matéria..." />
              )}
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Conceito</label>
              <Input value={form.concept} onChange={e => setForm(f => ({ ...f, concept: e.target.value }))} placeholder="Ex: Lei da Gravidade" />
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">✍️ Explique como se fosse para uma criança de 12 anos:</label>
            <textarea value={form.explanation} onChange={e => setForm(f => ({ ...f, explanation: e.target.value }))}
              placeholder="Use linguagem simples, analogias do dia a dia, evite jargão técnico..." rows={4}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-2 block">
              Nível de confiança: <span className="text-primary font-bold">{form.confidence}/5</span>
            </label>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map(n => (
                <button key={n} onClick={() => setForm(f => ({ ...f, confidence: n }))}
                  className={`h-8 w-8 rounded-lg border text-sm transition-all ${n <= form.confidence ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground hover:border-primary/40"}`}>
                  ⭐
                </button>
              ))}
              <span className="text-xs text-muted-foreground ml-2">
                {form.confidence <= 2 ? "Gap detectado — prioridade!" : form.confidence === 3 ? "Parcial — revisar" : "Bom domínio"}
              </span>
            </div>
          </div>
          <Button onClick={add} className="w-full gap-2" disabled={!form.concept || !form.explanation}>
            <Lightbulb className="h-4 w-4" /> Salvar Explicação Feynman
          </Button>
        </div>
      </div>

      {/* Concepts list */}
      {concepts.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-sm font-semibold">{concepts.length} Conceitos Registrados</h3>
            <div className="flex gap-2 text-[10px] text-muted-foreground">
              <span className="text-emerald-400">✓ {strong.length} sólidos</span>
              <span className="text-destructive">⚠ {gaps.length} gaps</span>
            </div>
          </div>
          {concepts.sort((a, b) => a.confidence - b.confidence).map(c => (
            <div key={c.id} className={`rounded-xl border transition-all overflow-hidden group ${c.confidence <= 2 ? "border-destructive/20 bg-destructive/5" : c.confidence >= 4 ? "border-emerald-500/20 bg-emerald-500/5" : "border-border bg-card"}`}>
              <div className="flex items-center gap-3 p-3 cursor-pointer" onClick={() => setExpandedId(expandedId === c.id ? null : c.id)}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground">{c.subject}</span>
                    <div className="flex">{[1,2,3,4,5].map(n => <span key={n} className={`text-[10px] ${n <= c.confidence ? "text-amber-400" : "text-muted-foreground/20"}`}>⭐</span>)}</div>
                    {c.confidence <= 2 && <span className="text-[9px] px-1.5 rounded-full bg-destructive/20 text-destructive">Gap!</span>}
                  </div>
                  <p className="text-sm font-medium text-foreground">{c.concept}</p>
                </div>
                {expandedId === c.id ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
                <button onClick={e => { e.stopPropagation(); del(c.id); }} className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/20 transition-opacity shrink-0">
                  <Trash2 className="h-3 w-3 text-destructive" />
                </button>
              </div>
              <AnimatePresence>
                {expandedId === c.id && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                    className="border-t border-border bg-secondary/10 px-4 py-3 overflow-hidden">
                    <p className="text-xs text-foreground/90 leading-relaxed">{c.explanation}</p>
                    <p className="text-[9px] text-muted-foreground mt-2">Atualizado em {c.updatedAt}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Focus Timer Panel ───────────────────────────────────────────────────────
function FocusTimerPanel({ flowHistory, setFlowHistory, skills, onCreate, addXp }: {
  flowHistory: FlowSession[];
  setFlowHistory: (v: FlowSession[] | ((p: FlowSession[]) => FlowSession[])) => void;
  skills: any[];
  onCreate: (data: any) => Promise<any>;
  addXp: (xp: number) => Promise<any>;
}) {
  const [selectedPreset, setSelectedPreset] = useState(0); // index
  const [customMin, setCustomMin] = useState(25);
  const [useCustom, setUseCustom] = useState(false);
  const [subject, setSubject] = useState(skills[0]?.name || "");
  const [objective, setObjective] = useState("");
  const [running, setRunning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(TIMER_PRESETS[0].min * 60);
  const [totalSeconds, setTotalSeconds] = useState(0);
  const [phase, setPhase] = useState<"focus" | "break">("focus");
  const [sessions, setSessions] = useState(0);
  const [showRating, setShowRating] = useState(false);
  const [flowRating, setFlowRating] = useState(4);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const durationMin = useCustom ? customMin : TIMER_PRESETS[selectedPreset].min;
  const breakMin = durationMin >= 90 ? 20 : durationMin >= 45 ? 10 : 5;
  const total = phase === "focus" ? durationMin * 60 : breakMin * 60;
  const elapsed = total - secondsLeft;
  const pct = (elapsed / total) * 100;
  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const ss = String(secondsLeft % 60).padStart(2, "0");

  useEffect(() => {
    if (!running) { if (intervalRef.current) clearInterval(intervalRef.current); return; }
    intervalRef.current = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          if (phase === "focus") {
            playStudyChime("complete");
            setSessions(s => s + 1);
            setTotalSeconds(t => t + durationMin * 60);
            toast({ title: "🔔 Sessão de foco concluída!", description: `Pausa de ${breakMin} minutos.` });
            setPhase("break");
            setRunning(false);
            return breakMin * 60;
          } else {
            playStudyChime("tick");
            setPhase("focus");
            setRunning(false);
            toast({ title: "☕ Pausa encerrada!", description: "Pronto para mais foco?" });
            return durationMin * 60;
          }
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running, phase, durationMin, breakMin]);

  const setPreset = (idx: number) => {
    setSelectedPreset(idx); setUseCustom(false);
    setSecondsLeft(TIMER_PRESETS[idx].min * 60); setRunning(false); setPhase("focus");
  };

  const resetTimer = () => {
    setRunning(false);
    setSecondsLeft(total);
  };

  const finishSession = async () => {
    setRunning(false);
    if (totalSeconds >= 60) {
      setShowRating(true);
    } else {
      resetAll();
    }
  };

  const saveAndReset = async () => {
    const hours = Math.round((totalSeconds / 3600) * 100) / 100;
    const sub = subject || "Estudo Geral";
    await onCreate({ subject: sub, hours, note: `${sessions} sessões · Flow: ${flowRating}/5 · "${objective}"`, date: new Date().toISOString().split("T")[0] });
    const xp = Math.round(hours * 15 + flowRating * 3);
    await addXp(xp);
    const newSess: FlowSession = { id: Date.now().toString(), subject: sub, objective, durationMin: Math.round(totalSeconds / 60), flowRating, completedAt: new Date().toLocaleString("pt-BR") };
    setFlowHistory(prev => [newSess, ...prev].slice(0, 20));
    toast({ title: `+${xp} XP! ⚡`, description: `${hours}h de foco profundo registradas.` });
    setShowRating(false);
    resetAll();
  };

  const resetAll = () => {
    setRunning(false); setSessions(0); setTotalSeconds(0); setPhase("focus");
    setSecondsLeft(durationMin * 60); setObjective(""); setShowRating(false);
  };

  if (showRating) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="rounded-xl border border-primary/30 bg-primary/5 p-8 text-center space-y-5">
        <Sparkles className="h-10 w-10 text-primary mx-auto" />
        <h3 className="font-display text-xl font-bold">Sessão Concluída! 🎉</h3>
        <p className="text-sm text-muted-foreground">{sessions} pomodoro{sessions > 1 ? "s" : ""} · {Math.round(totalSeconds / 60)} minutos de foco profundo</p>
        <div>
          <p className="text-sm font-medium mb-3">Como foi seu nível de Flow?</p>
          <div className="flex justify-center gap-3">
            {[1, 2, 3, 4, 5].map(n => (
              <button key={n} onClick={() => setFlowRating(n)}
                className={`h-12 w-12 rounded-xl border text-xl transition-all ${n <= flowRating ? "border-primary bg-primary/20 scale-110" : "border-border hover:border-primary/40"}`}>
                {["😵", "😕", "😐", "😊", "🔥"][n - 1]}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-2">{["Muito disperso", "Pouco focado", "Moderado", "Bom foco", "Flow total!"][flowRating - 1]}</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => { setShowRating(false); resetAll(); }} className="flex-1">Descartar</Button>
          <Button onClick={saveAndReset} className="flex-1 gap-2"><CheckCircle2 className="h-4 w-4" /> Salvar Sessão</Button>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Timer */}
      <div className="space-y-4">
        {/* Presets */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="font-display text-sm font-semibold mb-3 flex items-center gap-2">
            <Timer className="h-4 w-4 text-primary" /> Sessão de Foco Profundo
          </h3>
          <div className="grid grid-cols-3 gap-2 mb-4">
            {TIMER_PRESETS.map((p, i) => (
              <button key={p.label} onClick={() => setPreset(i)}
                className={`rounded-lg border p-2.5 text-center transition-all ${!useCustom && selectedPreset === i ? "border-primary bg-primary/10" : "border-border hover:border-primary/30"}`}>
                <div className="text-lg">{p.icon}</div>
                <p className="text-[10px] font-bold text-foreground">{p.label}</p>
                <p className="text-[9px] text-muted-foreground">{p.min}min</p>
              </button>
            ))}
          </div>

          {/* Subject + Objective */}
          <div className="space-y-2 mb-4">
            <div>
              <label className="text-[10px] text-muted-foreground mb-1 block">Matéria</label>
              {skills.length > 0 ? (
                <select value={subject} onChange={e => setSubject(e.target.value)}
                  className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  {skills.map(sk => <option key={sk.id} value={sk.name}>{sk.name}</option>)}
                </select>
              ) : (
                <Input value={subject} onChange={e => setSubject(e.target.value)} className="h-8 text-xs" placeholder="O que vai estudar?" />
              )}
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground mb-1 block">🎯 Objetivo desta sessão</label>
              <Input value={objective} onChange={e => setObjective(e.target.value)}
                placeholder="O que você vai dominar nesta sessão?" className="h-8 text-xs" disabled={running} />
            </div>
          </div>

          {/* Circular Timer */}
          <div className="flex flex-col items-center py-4">
            <div className="relative">
              <svg width="160" height="160" className="rotate-[-90deg]">
                <circle cx="80" cy="80" r="70" fill="none" stroke="hsl(var(--secondary))" strokeWidth="8" />
                <circle cx="80" cy="80" r="70" fill="none"
                  stroke={phase === "focus" ? "hsl(var(--primary))" : "hsl(142, 76%, 36%)"}
                  strokeWidth="8" strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 70}`}
                  strokeDashoffset={`${2 * Math.PI * 70 * (1 - pct / 100)}`}
                  className="transition-all duration-1000" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`text-xs font-bold uppercase tracking-wider ${phase === "focus" ? "text-primary" : "text-emerald-400"}`}>
                  {phase === "focus" ? "🍅 Foco" : "☕ Pausa"}
                </span>
                <span className="text-4xl font-display font-bold tabular-nums">{mm}:{ss}</span>
                {sessions > 0 && <span className="text-[10px] text-muted-foreground">{sessions} sessões</span>}
              </div>
            </div>
          </div>

          <div className="flex justify-center gap-3">
            <Button onClick={() => setRunning(r => !r)} size="lg"
              className={`gap-2 ${running ? "bg-amber-500 hover:bg-amber-600 text-black" : ""}`}>
              {running ? <><Pause className="h-4 w-4" /> Pausar</> : <><Play className="h-4 w-4" /> {secondsLeft === total ? "Iniciar" : "Retomar"}</>}
            </Button>
            <Button onClick={resetTimer} variant="outline" size="lg"><RotateCcw className="h-4 w-4" /></Button>
            {totalSeconds > 0 && (
              <Button onClick={finishSession} variant="outline" size="lg" className="text-primary border-primary/40">Encerrar</Button>
            )}
          </div>
        </div>
      </div>

      {/* Flow History */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="font-display text-sm font-semibold mb-4 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" /> Histórico de Flow
        </h3>
        {flowHistory.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            <Zap className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Nenhuma sessão de foco concluída ainda.</p>
            <p className="text-xs mt-1">Inicie e conclua um timer para registrar!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {flowHistory.slice(0, 8).map((s, i) => (
              <motion.div key={s.id} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                className="flex items-start gap-3 p-2.5 rounded-lg bg-secondary/30 border border-border/60">
                <div className={`h-8 w-8 rounded-lg flex items-center justify-center text-sm shrink-0 ${s.flowRating >= 4 ? "bg-primary/20 text-primary" : s.flowRating >= 3 ? "bg-amber-500/20 text-amber-400" : "bg-secondary text-muted-foreground"}`}>
                  {["😵", "😕", "😐", "😊", "🔥"][s.flowRating - 1]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">{s.subject}</p>
                  {s.objective && <p className="text-[10px] text-muted-foreground truncate">"{s.objective}"</p>}
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[9px] text-muted-foreground">{s.durationMin}min</span>
                    <span className="text-[9px] text-primary font-bold">Flow {s.flowRating}/5</span>
                    <span className="text-[9px] text-muted-foreground">{s.completedAt}</span>
                  </div>
                </div>
              </motion.div>
            ))}
            <div className="pt-2 border-t border-border flex justify-between text-xs text-muted-foreground">
              <span>Média de Flow</span>
              <span className="font-bold text-primary">
                {(flowHistory.reduce((s, h) => s + h.flowRating, 0) / flowHistory.length).toFixed(1)}/5
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
