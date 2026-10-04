import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  Mountain, Flame, Target, ShieldAlert, Sparkles, Timer, Plus, X, Play, Pause, RotateCcw,
  Trophy, Check, Calendar, BookOpen, Dumbbell, Moon, Brain, Ban, Zap, Skull, Crown,
  Maximize2, Minimize2, AlertTriangle, Coffee, TrendingUp, Star, Sunrise, Sunset,
  Wind, ChevronRight, Eye, BarChart2, Award, Clock, Shield, Layers
} from "lucide-react";

// ---------- Types ----------
type Challenge = {
  id: string;
  user_id: string;
  name: string;
  objective: string;
  motivation: string;
  duration_days: number;
  start_date: string;
  end_date: string | null;
  status: "active" | "completed" | "abandoned";
  rules: string[];
  rituals: string[];
  blocks: string[];
};

type DailyLog = {
  id: string;
  challenge_id: string;
  day_number: number;
  date: string;
  rituals_done: string[];
  rules_broken: string[];
  focus_hours: number;
  sleep_hours: number;
  trained: boolean;
  read_today: boolean;
  rating: number;
  reflection: string;
};

type FocusSession = { id: string; duration: number; startedAt: string; completedAt: string };
type MilestoneKey = 1 | 7 | 14 | 21 | 30;

// ---------- Presets ----------
const PRESET_RULES = [
  "Sem redes sociais (Instagram, TikTok, X)",
  "Sem pornografia / conteúdo adulto",
  "Sem álcool",
  "Sem açúcar / fast food",
  "Sem jogos / streaming sem propósito",
  "Sem reclamar",
  "Sem dormir depois das 23h",
  "Sem celular na primeira hora do dia",
];

const PRESET_RITUALS = [
  "Acordar antes das 6h",
  "Beber 500ml de água ao acordar",
  "Meditar 10 minutos",
  "Treinar (mínimo 45min)",
  "Banho frio",
  "Ler 20 páginas",
  "Estudar 2 horas com foco profundo",
  "Planejar o dia seguinte à noite",
  "Diário de gratidão",
];

const PRESET_BLOCKS = [
  "Instagram", "TikTok", "YouTube Shorts", "X (Twitter)", "Netflix",
  "Reddit", "Discord", "WhatsApp (grupos)", "Notificações"
];

const DURATION_OPTIONS = [
  { days: 7, label: "7 dias · Detox", icon: Zap },
  { days: 21, label: "21 dias · Reset", icon: Flame },
  { days: 40, label: "40 dias · Imersão", icon: Mountain },
  { days: 90, label: "90 dias · Transformação", icon: Crown },
];

const COMMANDMENTS = [
  "Sua missão é maior que seu conforto.",
  "Disciplina é liberdade. Cada 'não' hoje é um 'sim' ao seu futuro.",
  "Silêncio. Trabalho. Resultado.",
  "Ninguém vai te salvar. Levante.",
  "O ambiente molda o homem. Controle o ambiente.",
  "Foco é o novo QI.",
  "Dor temporária, glória permanente.",
  "O sucesso não é um acidente. É escolha repetida diariamente.",
  "Quando sentir vontade de parar, lembre por que começou.",
  "A mente fraca cede. A mente treinada avança.",
];

const MILESTONES: Record<number, { label: string; icon: string; desc: string; color: string }> = {
  1:  { label: "Ignição",          icon: "🔥", desc: "Você acendeu a chama. O primeiro passo é o mais corajoso.", color: "text-orange-400" },
  7:  { label: "Resistência Inicial", icon: "⚡", desc: "Uma semana inteira de disciplina. Seu cérebro está começando a mudar.", color: "text-yellow-400" },
  14: { label: "Meio da Jornada",  icon: "🛡️", desc: "14 dias. Você já provou para si mesmo que é capaz.", color: "text-blue-400" },
  21: { label: "Hábito Fixado",    icon: "🧠", desc: "21 dias — os caminhos neurais estão gravados. Este é você agora.", color: "text-purple-400" },
  30: { label: "Mentalidade Forjada", icon: "👑", desc: "Um mês inteiro. Você não é mais a mesma pessoa que entrou.", color: "text-amber-400" },
};

// ---------- Helpers ----------
const todayStr = () => new Date().toISOString().slice(0, 10);
const daysBetween = (from: string, to: string) =>
  Math.floor((new Date(to).getTime() - new Date(from).getTime()) / 86400000);

function playChime(type: "session" | "break" | "alert") {
  try {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const sequences: Record<string, { freq: number; dur: number }[]> = {
      session: [
        { freq: 523.25, dur: 0.12 }, { freq: 659.25, dur: 0.12 },
        { freq: 783.99, dur: 0.12 }, { freq: 1046.5, dur: 0.35 },
      ],
      break: [{ freq: 440, dur: 0.2 }, { freq: 349.23, dur: 0.3 }],
      alert: [{ freq: 880, dur: 0.08 }, { freq: 880, dur: 0.08 }, { freq: 880, dur: 0.2 }],
    };
    let offset = 0;
    sequences[type].forEach(({ freq, dur }) => {
      setTimeout(() => {
        try {
          const c = new Ctx();
          const osc = c.createOscillator();
          const gain = c.createGain();
          osc.connect(gain); gain.connect(c.destination);
          osc.type = "sine"; osc.frequency.value = freq;
          gain.gain.setValueAtTime(0.07, c.currentTime);
          osc.start();
          gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
          osc.stop(c.currentTime + dur);
        } catch {}
      }, offset);
      offset += dur * 1000;
    });
  } catch {}
}

// ---------- Page ----------
export default function CaveMode() {
  const { user } = useAuth();
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [immersive, setImmersive] = useState(() => localStorage.getItem("cave_immersive") === "true");
  const [milestone, setMilestone] = useState<MilestoneKey | null>(null);

  useEffect(() => {
    if (user) load();
  }, [user]);

  // Immersive mode: hide sidebar by toggling body class
  useEffect(() => {
    if (immersive) {
      document.body.classList.add("cave-immersive");
    } else {
      document.body.classList.remove("cave-immersive");
    }
    localStorage.setItem("cave_immersive", String(immersive));
    return () => document.body.classList.remove("cave-immersive");
  }, [immersive]);

  async function load() {
    setLoading(true);
    const { data: ch } = await supabase
      .from("cave_challenges")
      .select("*")
      .eq("user_id", user!.id)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (ch) {
      setChallenge(ch as any);
      const { data: l } = await supabase
        .from("cave_daily_logs")
        .select("*")
        .eq("challenge_id", ch.id)
        .order("day_number", { ascending: true });
      setLogs((l as any) || []);
    } else {
      setChallenge(null);
      setLogs([]);
    }
    setLoading(false);
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className={`space-y-6 max-w-7xl mx-auto transition-all duration-500 ${immersive ? "cave-mode-immersive" : ""}`}>
      <Header immersive={immersive} onToggleImmersive={() => setImmersive(v => !v)} />

      {!challenge ? (
        <NoChallenge onCreate={() => setCreateOpen(true)} />
      ) : (
        <ActiveChallenge
          challenge={challenge}
          logs={logs}
          onReload={load}
          onAbandon={() => setChallenge(null)}
          onMilestone={(d) => setMilestone(d as MilestoneKey)}
        />
      )}

      <CreateChallengeDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(c) => { setChallenge(c); setCreateOpen(false); load(); }}
      />

      {/* Milestone Badge Modal */}
      <AnimatePresence>
        {milestone && MILESTONES[milestone] && (
          <MilestoneModal
            day={milestone}
            data={MILESTONES[milestone]}
            onClose={() => setMilestone(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ---------- Header ----------
function Header({ immersive, onToggleImmersive }: { immersive: boolean; onToggleImmersive: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-xl border border-border bg-gradient-to-br from-card via-secondary/40 to-card p-6 md:p-8"
    >
      <div className="absolute inset-0 opacity-20 pointer-events-none bg-[radial-gradient(circle_at_30%_20%,hsl(0_70%_50%/.4),transparent_60%)]" />
      <div className="absolute inset-0 opacity-5 pointer-events-none"
        style={{ backgroundImage: "radial-gradient(circle, hsl(var(--primary)) 1px, transparent 1px)", backgroundSize: "28px 28px" }} />
      <div className="relative flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-xl bg-destructive/10 border border-destructive/30 flex items-center justify-center shadow-[0_0_20px_rgba(239,68,68,0.2)]">
            <Mountain className="h-7 w-7 text-destructive" />
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground">
              Modo <span className="text-destructive drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]">Caverna</span>
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Imersão profunda. Sem distrações. Apenas missão.
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onToggleImmersive}
          className={`gap-2 border transition-all ${immersive ? "border-primary/60 bg-primary/10 text-primary" : "border-border"}`}
        >
          {immersive ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          {immersive ? "Sair Imersivo" : "Modo Imersivo"}
        </Button>
      </div>
    </motion.div>
  );
}

// ---------- No Challenge ----------
function NoChallenge({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="grid gap-6 md:grid-cols-3">
      <Card className="md:col-span-2 rarity-legendary border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-display">
            <Skull className="h-5 w-5 text-destructive" />
            Entre na Caverna
          </CardTitle>
          <CardDescription>
            Um período intenso de foco onde você corta tudo que te afasta da sua missão. Você sai outro.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {DURATION_OPTIONS.map((d) => (
              <div key={d.days} className="rounded-lg border border-border bg-secondary/40 p-3 text-center hover:border-primary/40 transition-all cursor-default">
                <d.icon className="h-5 w-5 mx-auto text-primary mb-1" />
                <p className="text-xs text-muted-foreground">{d.label}</p>
              </div>
            ))}
          </div>
          <Button onClick={onCreate} size="lg" className="w-full bg-destructive hover:bg-destructive/90 text-destructive-foreground">
            <Flame className="h-4 w-4" /> Iniciar Desafio
          </Button>
        </CardContent>
      </Card>

      <Card className="bg-secondary/30">
        <CardHeader>
          <CardTitle className="text-base font-display flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" /> Mandamentos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {COMMANDMENTS.slice(0, 6).map((c, i) => (
            <p key={i} className="text-xs text-muted-foreground italic border-l-2 border-primary/40 pl-2">
              "{c}"
            </p>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

// ---------- Create dialog ----------
function CreateChallengeDialog({
  open, onOpenChange, onCreated,
}: { open: boolean; onOpenChange: (b: boolean) => void; onCreated: (c: Challenge) => void }) {
  const { user } = useAuth();
  const [name, setName] = useState("Modo Caverna");
  const [objective, setObjective] = useState("");
  const [motivation, setMotivation] = useState("");
  const [duration, setDuration] = useState(40);
  const [rules, setRules] = useState<string[]>(PRESET_RULES.slice(0, 4));
  const [rituals, setRituals] = useState<string[]>(PRESET_RITUALS.slice(0, 4));
  const [blocks, setBlocks] = useState<string[]>(PRESET_BLOCKS.slice(0, 4));
  const [customRule, setCustomRule] = useState("");
  const [customRitual, setCustomRitual] = useState("");

  const toggle = (list: string[], setList: (v: string[]) => void, item: string) => {
    setList(list.includes(item) ? list.filter((i) => i !== item) : [...list, item]);
  };

  async function create() {
    if (!objective.trim()) return toast.error("Defina seu objetivo");
    if (!motivation.trim()) return toast.error("Escreva sua motivação");

    const start = todayStr();
    const end = new Date();
    end.setDate(end.getDate() + duration);

    const { data, error } = await supabase
      .from("cave_challenges")
      .insert({
        user_id: user!.id,
        name, objective, motivation, duration_days: duration,
        start_date: start, end_date: end.toISOString().slice(0, 10),
        rules, rituals, blocks, status: "active",
      })
      .select()
      .single();

    if (error) return toast.error("Erro ao criar desafio");
    toast.success("Você entrou na Caverna 🔥");
    onCreated(data as any);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <Mountain className="h-5 w-5 text-destructive" /> Novo Desafio Caverna
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Nome do desafio</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <Label>Duração</Label>
              <Select value={String(duration)} onValueChange={(v) => setDuration(Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DURATION_OPTIONS.map((d) => (
                    <SelectItem key={d.days} value={String(d.days)}>{d.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Objetivo principal</Label>
            <Input value={objective} onChange={(e) => setObjective(e.target.value)}
              placeholder="Ex: Aprovação na prova / Lançar meu produto" />
          </div>

          <div>
            <Label>Sua motivação (leia todo dia)</Label>
            <Textarea value={motivation} onChange={(e) => setMotivation(e.target.value)} rows={3}
              placeholder="Por que você precisa fazer isso?" />
          </div>

          <ChipSelector title="Regras (proibições)" icon={Ban} preset={PRESET_RULES}
            selected={rules} onToggle={(i) => toggle(rules, setRules, i)}
            customValue={customRule} setCustomValue={setCustomRule}
            onAddCustom={() => { if (customRule) { setRules([...rules, customRule]); setCustomRule(""); } }} />

          <ChipSelector title="Rituais diários" icon={Sparkles} preset={PRESET_RITUALS}
            selected={rituals} onToggle={(i) => toggle(rituals, setRituals, i)}
            customValue={customRitual} setCustomValue={setCustomRitual}
            onAddCustom={() => { if (customRitual) { setRituals([...rituals, customRitual]); setCustomRitual(""); } }} />

          <ChipSelector title="Bloqueios (apps/sites)" icon={ShieldAlert} preset={PRESET_BLOCKS}
            selected={blocks} onToggle={(i) => toggle(blocks, setBlocks, i)} />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={create} className="bg-destructive hover:bg-destructive/90">
            <Flame className="h-4 w-4" /> Entrar na Caverna
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ChipSelector({
  title, icon: Icon, preset, selected, onToggle, customValue, setCustomValue, onAddCustom,
}: {
  title: string; icon: any; preset: string[]; selected: string[]; onToggle: (i: string) => void;
  customValue?: string; setCustomValue?: (v: string) => void; onAddCustom?: () => void;
}) {
  return (
    <div>
      <Label className="flex items-center gap-2 mb-2"><Icon className="h-4 w-4" /> {title}</Label>
      <div className="flex flex-wrap gap-2">
        {preset.map((item) => {
          const active = selected.includes(item);
          return (
            <button key={item} type="button" onClick={() => onToggle(item)}
              className={`px-2.5 py-1 text-xs rounded-full border transition-all ${
                active ? "bg-primary/15 border-primary/40 text-primary" : "bg-secondary/40 border-border text-muted-foreground hover:text-foreground"
              }`}>
              {active && <Check className="h-3 w-3 inline mr-1" />}{item}
            </button>
          );
        })}
        {selected.filter((s) => !preset.includes(s)).map((item) => (
          <button key={item} type="button" onClick={() => onToggle(item)}
            className="px-2.5 py-1 text-xs rounded-full border bg-primary/15 border-primary/40 text-primary">
            <Check className="h-3 w-3 inline mr-1" />{item}
            <X className="h-3 w-3 inline ml-1" />
          </button>
        ))}
      </div>
      {setCustomValue && onAddCustom && (
        <div className="flex gap-2 mt-2">
          <Input value={customValue} onChange={(e) => setCustomValue(e.target.value)} placeholder="Adicionar personalizado..." className="text-xs" />
          <Button type="button" size="sm" variant="outline" onClick={onAddCustom}><Plus className="h-3 w-3" /></Button>
        </div>
      )}
    </div>
  );
}

// ---------- Active challenge ----------
function ActiveChallenge({
  challenge, logs, onReload, onAbandon, onMilestone,
}: { challenge: Challenge; logs: DailyLog[]; onReload: () => void; onAbandon: () => void; onMilestone: (day: number) => void }) {
  const { user } = useAuth();
  const dayNumber = Math.min(daysBetween(challenge.start_date, todayStr()) + 1, challenge.duration_days);
  const progress = (dayNumber / challenge.duration_days) * 100;
  const todayLog = logs.find((l) => l.date === todayStr());
  const completedDays = logs.filter((l) => l.rituals_done.length >= challenge.rituals.length * 0.7).length;
  const failedDays = logs.filter((l) => l.rules_broken.length > 0).length;
  const streak = calcStreak(logs);

  // Emergency signal state
  const [showEmergency, setShowEmergency] = useState(false);
  const [breatheActive, setBreatheActive] = useState(false);
  const [breathePhase, setBreathePhase] = useState<"inhale" | "hold" | "exhale">("inhale");
  const [breatheCount, setBreatheCount] = useState(0);
  const breatheRef = useRef<NodeJS.Timeout | null>(null);

  const startBreathing = useCallback(() => {
    setBreatheActive(true);
    setBreatheCount(0);
    playChime("alert");
    let cycle = 0;
    const phases: ("inhale" | "hold" | "exhale")[] = ["inhale", "hold", "exhale"];
    const durations = [4000, 4000, 4000];
    let pIdx = 0;
    const run = () => {
      setBreathePhase(phases[pIdx]);
      breatheRef.current = setTimeout(() => {
        pIdx = (pIdx + 1) % 3;
        if (pIdx === 0) cycle++;
        if (cycle >= 3) { setBreatheActive(false); return; }
        run();
      }, durations[pIdx]);
    };
    run();
  }, []);

  useEffect(() => () => { if (breatheRef.current) clearTimeout(breatheRef.current); }, []);

  async function abandon() {
    if (!confirm("Abandonar o desafio? Você pode começar outro depois.")) return;
    await supabase.from("cave_challenges").update({ status: "abandoned" }).eq("id", challenge.id);
    toast("Desafio abandonado");
    onAbandon();
    onReload();
  }

  async function complete() {
    await supabase.from("cave_challenges").update({ status: "completed" }).eq("id", challenge.id);
    toast.success("🏆 Você venceu a Caverna!");
    onReload();
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={Calendar} label="Dia" value={`${dayNumber}/${challenge.duration_days}`} accent="text-primary" />
        <StatCard icon={Trophy} label="Dias completos" value={completedDays} accent="text-emerald-400" />
        <StatCard icon={ShieldAlert} label="Dias com falha" value={failedDays} accent="text-destructive" />
        <StatCard icon={Flame} label="Streak atual" value={streak} accent="text-orange-400" />
      </div>

      {/* Progress bar */}
      <Card className="border-border/60">
        <CardContent className="pt-5 pb-5 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-display text-lg font-semibold">{challenge.name}</h3>
              <p className="text-xs text-muted-foreground">🎯 {challenge.objective}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="border-destructive/40 text-destructive">
                {Math.max(challenge.duration_days - dayNumber, 0)} dias restantes
              </Badge>
              {streak >= 7 && <Badge className="bg-amber-500/20 text-amber-400 border border-amber-500/40">🔥 {streak}-day streak</Badge>}
            </div>
          </div>
          <Progress value={progress} className="h-2.5" />
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>Início: {challenge.start_date}</span>
            <span className="font-bold text-primary">{progress.toFixed(0)}% concluído</span>
            <span>Fim: {challenge.end_date}</span>
          </div>
          {dayNumber >= challenge.duration_days && (
            <Button onClick={complete} className="w-full bg-primary hover:bg-primary/90">
              <Crown className="h-4 w-4" /> Marcar como concluído — Você venceu!
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Emergency Signal */}
      <AnimatePresence>
        {showEmergency ? (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-4 space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-amber-400 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" /> Sinal de Emergência Ativado
              </span>
              <button onClick={() => { setShowEmergency(false); setBreatheActive(false); if (breatheRef.current) clearTimeout(breatheRef.current); }}
                className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
            </div>
            {breatheActive ? (
              <div className="flex flex-col items-center gap-4 py-4">
                <motion.div
                  animate={{ scale: breathePhase === "inhale" ? 1.6 : breathePhase === "hold" ? 1.6 : 1 }}
                  transition={{ duration: 4, ease: "easeInOut" }}
                  className="h-24 w-24 rounded-full border-4 border-primary/60 bg-primary/10 flex items-center justify-center shadow-[0_0_30px_rgba(var(--primary-rgb),0.2)]"
                >
                  <Wind className="h-8 w-8 text-primary" />
                </motion.div>
                <p className="text-sm font-medium text-foreground capitalize">{
                  breathePhase === "inhale" ? "Inspire... (4s)" : breathePhase === "hold" ? "Segure... (4s)" : "Expire... (4s)"
                }</p>
                <p className="text-xs text-muted-foreground">Técnica 4-4-4 de controle de impulso</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <Button onClick={startBreathing} variant="outline" className="border-amber-500/40 text-amber-400 hover:bg-amber-500/10 gap-2">
                  <Wind className="h-4 w-4" /> Respiração Guiada
                </Button>
                <Button variant="outline" className="border-primary/40 text-primary hover:bg-primary/10 gap-2"
                  onClick={() => { setShowEmergency(false); }}>
                  <Eye className="h-4 w-4" /> Ver Minha Motivação
                </Button>
              </div>
            )}
            {!breatheActive && (
              <div className="bg-card border border-border rounded-lg p-3">
                <p className="text-xs text-muted-foreground mb-1 font-bold uppercase tracking-wider">Lembre-se:</p>
                <p className="text-sm font-medium italic text-foreground">"{challenge.motivation}"</p>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Button
              variant="outline"
              onClick={() => setShowEmergency(true)}
              className="w-full border-amber-500/40 text-amber-400 hover:bg-amber-500/10 gap-2 text-sm"
            >
              <AlertTriangle className="h-4 w-4" /> Estou prestes a ceder — Ativar Sinal de Emergência
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      <Tabs defaultValue="today" className="w-full">
        <TabsList className="grid grid-cols-4 w-full mb-1">
          <TabsTrigger value="today" className="text-xs">Hoje</TabsTrigger>
          <TabsTrigger value="intention" className="text-xs">Intenção</TabsTrigger>
          <TabsTrigger value="focus" className="text-xs">Foco</TabsTrigger>
          <TabsTrigger value="analysis" className="text-xs">Análise</TabsTrigger>
        </TabsList>
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="warjournal" className="text-xs">📖 Diário</TabsTrigger>
          <TabsTrigger value="quantumhabits" className="text-xs">⚡ Hábitos</TabsTrigger>
          <TabsTrigger value="history" className="text-xs">Histórico</TabsTrigger>
          <TabsTrigger value="settings" className="text-xs">Regras</TabsTrigger>
        </TabsList>

        <TabsContent value="today" className="mt-4">
          <TodayPanel challenge={challenge} log={todayLog} dayNumber={dayNumber} userId={user!.id} onSaved={() => { onReload(); }} onMilestone={onMilestone} />
        </TabsContent>

        <TabsContent value="intention" className="mt-4">
          <IntentionPanel challenge={challenge} dayNumber={dayNumber} />
        </TabsContent>

        <TabsContent value="focus" className="mt-4">
          <FocusTimer dayNumber={dayNumber} challengeId={challenge.id} />
        </TabsContent>

        <TabsContent value="analysis" className="mt-4">
          <AnalysisPanel logs={logs} challenge={challenge} />
        </TabsContent>

        <TabsContent value="warjournal" className="mt-4">
          <WarJournal challengeId={challenge.id} dayNumber={dayNumber} motivation={challenge.motivation} />
        </TabsContent>

        <TabsContent value="quantumhabits" className="mt-4">
          <QuantumHabits challengeId={challenge.id} logs={logs} />
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <HistoryPanel logs={logs} challenge={challenge} />
        </TabsContent>

        <TabsContent value="settings" className="mt-4">
          <SettingsPanel challenge={challenge} onAbandon={abandon} onReload={onReload} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function calcStreak(logs: DailyLog[]) {
  let s = 0;
  const sorted = [...logs].sort((a, b) => b.date.localeCompare(a.date));
  for (const l of sorted) {
    if (l.rules_broken.length === 0) s++;
    else break;
  }
  return s;
}

function StatCard({ icon: Icon, label, value, accent }: any) {
  return (
    <Card className="bg-secondary/30 hover:bg-secondary/50 transition-colors">
      <CardContent className="p-4 flex items-center gap-3">
        <Icon className={`h-5 w-5 ${accent}`} />
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
          <p className="text-xl font-bold font-display">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------- Daily Intention Panel ----------
function IntentionPanel({ challenge, dayNumber }: { challenge: Challenge; dayNumber: number }) {
  const storageKey = `cave_intention_${challenge.id}_${todayStr()}`;
  const [mip, setMip] = useState(() => {
    try { return JSON.parse(localStorage.getItem(storageKey) || "{}").mip || ""; } catch { return ""; }
  });
  const [why, setWhy] = useState(() => {
    try { return JSON.parse(localStorage.getItem(storageKey) || "{}").why || ""; } catch { return ""; }
  });
  const [eveningReview, setEveningReview] = useState(() => {
    try { return JSON.parse(localStorage.getItem(storageKey) || "{}").eveningReview || ""; } catch { return ""; }
  });
  const [energyLevel, setEnergyLevel] = useState(() => {
    try { return JSON.parse(localStorage.getItem(storageKey) || "{}").energyLevel || 7; } catch { return 7; }
  });
  const [saved, setSaved] = useState(false);

  const save = () => {
    localStorage.setItem(storageKey, JSON.stringify({ mip, why, eveningReview, energyLevel }));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    toast.success("Intenção do dia salva! 🎯");
  };

  const randomCommandment = useMemo(() => COMMANDMENTS[dayNumber % COMMANDMENTS.length], [dayNumber]);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Morning Ritual */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Sunrise className="h-4 w-4 text-amber-400" /> Ritual da Manhã — Dia {dayNumber}
          </CardTitle>
          <CardDescription className="text-xs">Defina sua intenção antes de começar.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">
              🎯 MIP — Tarefa Mais Importante do Dia
            </Label>
            <Input
              value={mip}
              onChange={(e) => setMip(e.target.value)}
              placeholder="Se eu só fizer UMA coisa hoje, será..."
              className="text-sm"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">
              💡 Por que essa tarefa importa?
            </Label>
            <Textarea
              value={why}
              onChange={(e) => setWhy(e.target.value)}
              rows={2}
              placeholder="Conecte a tarefa ao seu objetivo maior..."
              className="text-sm resize-none"
            />
          </div>
        </CardContent>
      </Card>

      {/* Evening Review */}
      <Card className="border-blue-500/20 bg-gradient-to-br from-blue-500/5 to-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Sunset className="h-4 w-4 text-blue-400" /> Revisão da Noite
          </CardTitle>
          <CardDescription className="text-xs">Feche o dia com clareza.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">
              🌙 O que aconteceu de bom hoje?
            </Label>
            <Textarea
              value={eveningReview}
              onChange={(e) => setEveningReview(e.target.value)}
              rows={3}
              placeholder="Vitórias, aprendizados, o que funcionou..."
              className="text-sm resize-none"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">
              ⚡ Nível de energia hoje: {energyLevel}/10
            </Label>
            <input type="range" min={1} max={10} value={energyLevel}
              onChange={(e) => setEnergyLevel(Number(e.target.value))}
              className="w-full accent-primary" />
          </div>
        </CardContent>
      </Card>

      {/* Quote of the day */}
      <Card className="md:col-span-2 bg-gradient-to-br from-destructive/10 via-card to-primary/10 border-primary/20">
        <CardContent className="pt-5 text-center">
          <Sparkles className="h-5 w-5 text-primary mx-auto mb-2" />
          <p className="text-base font-display italic text-foreground">"{randomCommandment}"</p>
          <p className="text-xs text-muted-foreground mt-2">Mandamento do Dia {dayNumber}</p>
        </CardContent>
      </Card>

      <Button onClick={save} className={`md:col-span-2 w-full gap-2 transition-all ${saved ? "bg-emerald-600 hover:bg-emerald-700" : ""}`}>
        {saved ? <><Check className="h-4 w-4" /> Intenção Salva!</> : <><Target className="h-4 w-4" /> Fixar Intenção do Dia</>}
      </Button>
    </div>
  );
}

// ---------- Today panel ----------
function TodayPanel({
  challenge, log, dayNumber, userId, onSaved, onMilestone,
}: { challenge: Challenge; log?: DailyLog; dayNumber: number; userId: string; onSaved: () => void; onMilestone: (day: number) => void }) {
  const [ritualsDone, setRitualsDone] = useState<string[]>(log?.rituals_done || []);
  const [rulesBroken, setRulesBroken] = useState<string[]>(log?.rules_broken || []);
  const [focusHours, setFocusHours] = useState<number>(log?.focus_hours || 0);
  const [sleepHours, setSleepHours] = useState<number>(log?.sleep_hours || 0);
  const [trained, setTrained] = useState(log?.trained || false);
  const [readToday, setReadToday] = useState(log?.read_today || false);
  const [rating, setRating] = useState(log?.rating || 5);
  const [reflection, setReflection] = useState(log?.reflection || "");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const payload = {
      user_id: userId, challenge_id: challenge.id, day_number: dayNumber, date: todayStr(),
      rituals_done: ritualsDone, rules_broken: rulesBroken,
      focus_hours: focusHours, sleep_hours: sleepHours, trained, read_today: readToday,
      rating, reflection,
    };
    if (log) {
      await supabase.from("cave_daily_logs").update(payload).eq("id", log.id);
    } else {
      await supabase.from("cave_daily_logs").insert(payload);
    }
    toast.success("Dia salvo ✅");
    setSaving(false);
    onSaved();

    // Check for milestone
    if ([1, 7, 14, 21, 30].includes(dayNumber)) {
      setTimeout(() => onMilestone(dayNumber), 600);
    }
  }

  const toggle = (list: string[], setList: (v: string[]) => void, item: string) =>
    setList(list.includes(item) ? list.filter((i) => i !== item) : [...list, item]);

  const ritualsPercent = challenge.rituals.length > 0 ? (ritualsDone.length / challenge.rituals.length) * 100 : 0;

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center justify-between gap-2">
            <span className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" /> Rituais de hoje
            </span>
            <Badge variant="outline" className={`text-[10px] ${ritualsPercent >= 100 ? "border-emerald-500/40 text-emerald-400" : ""}`}>
              {ritualsDone.length}/{challenge.rituals.length}
            </Badge>
          </CardTitle>
          <Progress value={ritualsPercent} className="h-1.5 mt-1" />
        </CardHeader>
        <CardContent className="space-y-1.5">
          {challenge.rituals.map((r) => (
            <label key={r} className="flex items-center gap-2 text-sm cursor-pointer p-2 rounded-lg hover:bg-secondary/40 transition-colors">
              <Checkbox checked={ritualsDone.includes(r)} onCheckedChange={() => toggle(ritualsDone, setRitualsDone, r)} />
              <span className={ritualsDone.includes(r) ? "line-through text-muted-foreground" : ""}>{r}</span>
              {ritualsDone.includes(r) && <Check className="h-3 w-3 text-emerald-400 ml-auto" />}
            </label>
          ))}
        </CardContent>
      </Card>

      <Card className="border-destructive/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2"><Ban className="h-4 w-4 text-destructive" /> Quebrei alguma regra?</CardTitle>
          <CardDescription className="text-xs">Seja honesto. O crescimento começa na verdade.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-1.5">
          {challenge.rules.map((r) => (
            <label key={r} className="flex items-center gap-2 text-sm cursor-pointer p-2 rounded-lg hover:bg-secondary/40 transition-colors">
              <Checkbox checked={rulesBroken.includes(r)} onCheckedChange={() => toggle(rulesBroken, setRulesBroken, r)} />
              <span className={rulesBroken.includes(r) ? "text-destructive line-through" : ""}>{r}</span>
            </label>
          ))}
          {rulesBroken.length > 0 && (
            <p className="text-xs text-destructive mt-2 pl-1">⚠️ {rulesBroken.length} regra(s) quebrada(s) hoje. Amanhã é uma nova chance.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><BarChart2 className="h-4 w-4 text-primary" /> Métricas do dia</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-xs flex items-center gap-1"><Brain className="h-3 w-3" /> Foco (h)</Label>
              <Input type="number" step="0.5" value={focusHours} onChange={(e) => setFocusHours(Number(e.target.value))} /></div>
            <div><Label className="text-xs flex items-center gap-1"><Moon className="h-3 w-3" /> Sono (h)</Label>
              <Input type="number" step="0.5" value={sleepHours} onChange={(e) => setSleepHours(Number(e.target.value))} /></div>
          </div>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox checked={trained} onCheckedChange={(v) => setTrained(!!v)} /> <Dumbbell className="h-4 w-4" /> Treinei
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox checked={readToday} onCheckedChange={(v) => setReadToday(!!v)} /> <BookOpen className="h-4 w-4" /> Li
            </label>
          </div>
          <div>
            <Label className="text-xs">Nota do dia: <span className="font-bold text-primary">{rating}/10</span></Label>
            <input type="range" min={1} max={10} value={rating} onChange={(e) => setRating(Number(e.target.value))} className="w-full accent-primary" />
            <div className="flex justify-between text-[9px] text-muted-foreground mt-0.5">
              <span>Péssimo</span><span>Médio</span><span>Épico</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Reflexão do dia</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Textarea rows={5} value={reflection} onChange={(e) => setReflection(e.target.value)}
            placeholder="O que aprendi hoje? O que farei diferente amanhã? Qual foi minha maior vitória?" className="resize-none" />
          <Button onClick={save} disabled={saving} className="w-full gap-2">
            {saving ? "Salvando..." : <><Check className="h-4 w-4" /> Fechar o Dia {dayNumber}</>}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// ---------- Enhanced Focus Timer ----------
function FocusTimer({ dayNumber, challengeId }: { dayNumber: number; challengeId: string }) {
  const storageKey = `cave_focus_sessions_${challengeId}_${todayStr()}`;
  const [duration, setDuration] = useState(50 * 60);
  const [remaining, setRemaining] = useState(50 * 60);
  const [running, setRunning] = useState(false);
  const [onBreak, setOnBreak] = useState(false);
  const [breakRemaining, setBreakRemaining] = useState(5 * 60);
  const [sessions, setSessions] = useState<FocusSession[]>(() => {
    try { return JSON.parse(localStorage.getItem(storageKey) || "[]"); } catch { return []; }
  });
  const [sessionNote, setSessionNote] = useState("");
  const startTimeRef = useRef<string>("");

  // Focus countdown
  useEffect(() => {
    if (!running || onBreak) return;
    const t = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          setRunning(false);
          playChime("session");
          toast.success(`🔔 Sessão de foco concluída! +1 sessão hoje`);
          // Save session
          const session: FocusSession = {
            id: Date.now().toString(),
            duration: duration / 60,
            startedAt: startTimeRef.current,
            completedAt: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
          };
          setSessions(prev => {
            const updated = [...prev, session];
            localStorage.setItem(storageKey, JSON.stringify(updated));
            return updated;
          });
          setOnBreak(true);
          setBreakRemaining(5 * 60);
          return duration;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [running, onBreak, duration, storageKey]);

  // Break countdown
  useEffect(() => {
    if (!onBreak) return;
    const t = setInterval(() => {
      setBreakRemaining((r) => {
        if (r <= 1) {
          setOnBreak(false);
          playChime("break");
          toast("☕ Intervalo acabou. Hora de focar de novo!");
          return 5 * 60;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [onBreak]);

  const startSession = () => {
    startTimeRef.current = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    setRunning(true);
  };

  const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");
  const bMm = String(Math.floor(breakRemaining / 60)).padStart(2, "0");
  const bSs = String(breakRemaining % 60).padStart(2, "0");
  const presets = [25, 50, 90];
  const totalFocusMin = sessions.reduce((s, sess) => s + sess.duration, 0);
  const progressAngle = ((duration - remaining) / duration) * 360;

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="font-display flex items-center justify-between gap-2">
            <span className="flex items-center gap-2"><Timer className="h-5 w-5 text-primary" /> Sessão de Foco</span>
            <Badge className="bg-primary/15 text-primary border-primary/40">
              Sessão {sessions.length + 1} hoje
            </Badge>
          </CardTitle>
          <CardDescription>Sem celular. Sem abas extras. Só você e a missão.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Circular progress timer */}
          <div className="relative flex items-center justify-center py-4">
            <svg width="180" height="180" className="rotate-[-90deg]">
              <circle cx="90" cy="90" r="80" fill="none" stroke="hsl(var(--secondary))" strokeWidth="8" />
              <circle cx="90" cy="90" r="80" fill="none"
                stroke={onBreak ? "hsl(var(--primary))" : running ? "hsl(var(--destructive))" : "hsl(var(--primary))"}
                strokeWidth="8" strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 80}`}
                strokeDashoffset={`${2 * Math.PI * 80 * (1 - progressAngle / 360)}`}
                className="transition-all duration-1000"
              />
            </svg>
            <div className="absolute flex flex-col items-center">
              {onBreak ? (
                <>
                  <Coffee className="h-5 w-5 text-primary mb-1" />
                  <div className="text-3xl font-display font-bold text-primary tabular-nums">{bMm}:{bSs}</div>
                  <p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-widest">Intervalo</p>
                </>
              ) : (
                <>
                  <div className="text-5xl font-display font-bold tabular-nums text-foreground">{mm}:{ss}</div>
                  <p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-widest">
                    {running ? "FOCO ATIVO" : "PRONTO"}
                  </p>
                </>
              )}
            </div>
          </div>

          <div className="flex justify-center gap-2">
            {presets.map((m) => (
              <Button key={m} size="sm" variant="outline" disabled={running || onBreak}
                onClick={() => { setDuration(m * 60); setRemaining(m * 60); setRunning(false); }}>
                {m}m
              </Button>
            ))}
          </div>

          {!onBreak && (
            <div className="flex justify-center gap-3">
              <Button onClick={running ? () => setRunning(false) : startSession} size="lg"
                className={running ? "bg-destructive hover:bg-destructive/90" : "bg-primary hover:bg-primary/90"}>
                {running ? <><Pause className="h-4 w-4" /> Pausar</> : <><Play className="h-4 w-4" /> Iniciar</>}
              </Button>
              <Button onClick={() => { setRemaining(duration); setRunning(false); }} variant="outline" size="lg">
                <RotateCcw className="h-4 w-4" /> Reset
              </Button>
            </div>
          )}
          {onBreak && (
            <Button onClick={() => { setOnBreak(false); setRemaining(duration); }}
              variant="outline" className="w-full gap-2">
              <ChevronRight className="h-4 w-4" /> Pular Intervalo
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Session history */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center justify-between">
            <span className="flex items-center gap-2"><Clock className="h-4 w-4 text-primary" /> Sessões de Hoje</span>
            <Badge variant="outline" className="text-[10px]">
              {totalFocusMin}min totais
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {sessions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Timer className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Nenhuma sessão concluída ainda.</p>
              <p className="text-xs mt-1">Inicie o timer para começar!</p>
            </div>
          ) : (
            <>
              {sessions.map((s, i) => (
                <motion.div
                  key={s.id}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center justify-between p-2.5 bg-secondary/30 rounded-lg border border-border/60"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="h-7 w-7 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center text-[11px] font-bold text-primary">
                      {i + 1}
                    </div>
                    <div>
                      <p className="text-xs font-medium">{s.duration}min de foco</p>
                      <p className="text-[10px] text-muted-foreground">{s.startedAt} → {s.completedAt}</p>
                    </div>
                  </div>
                  <Check className="h-4 w-4 text-emerald-400" />
                </motion.div>
              ))}
              <div className="pt-2 border-t border-border">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Total de sessões</span>
                  <span className="font-bold text-foreground">{sessions.length}</span>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>Foco acumulado</span>
                  <span className="font-bold text-primary">{totalFocusMin} min ({(totalFocusMin / 60).toFixed(1)}h)</span>
                </div>
              </div>
              <Button variant="outline" size="sm" className="w-full text-xs text-destructive border-destructive/20"
                onClick={() => { setSessions([]); localStorage.removeItem(storageKey); }}>
                <RotateCcw className="h-3 w-3 mr-1" /> Resetar sessões do dia
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ---------- Analysis Panel ----------
function AnalysisPanel({ logs, challenge }: { logs: DailyLog[]; challenge: Challenge }) {
  const last7 = useMemo(() => {
    const sorted = [...logs].sort((a, b) => a.date.localeCompare(b.date)).slice(-7);
    return sorted;
  }, [logs]);

  const avgRating = last7.length > 0 ? (last7.reduce((s, l) => s + l.rating, 0) / last7.length).toFixed(1) : "—";
  const avgFocus = last7.length > 0 ? (last7.reduce((s, l) => s + l.focus_hours, 0) / last7.length).toFixed(1) : "—";
  const avgSleep = last7.length > 0 ? (last7.reduce((s, l) => s + l.sleep_hours, 0) / last7.length).toFixed(1) : "—";
  const trainedDays = last7.filter(l => l.trained).length;
  const readDays = last7.filter(l => l.read_today).length;

  const maxFocus = Math.max(...last7.map(l => l.focus_hours), 1);
  const maxSleep = Math.max(...last7.map(l => l.sleep_hours), 8);

  const ritualRate = useMemo(() => {
    if (!challenge.rituals.length) return [];
    return last7.map(l => ({
      day: l.day_number,
      rate: Math.round((l.rituals_done.length / challenge.rituals.length) * 100),
    }));
  }, [last7, challenge.rituals]);

  if (logs.length === 0) {
    return (
      <Card>
        <CardContent className="pt-8 pb-8 text-center text-muted-foreground">
          <BarChart2 className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Nenhum dado ainda.</p>
          <p className="text-xs mt-1">Salve pelo menos 1 dia para ver a análise.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Nota Média (7d)", value: avgRating, icon: Star, color: "text-amber-400" },
          { label: "Foco Médio/dia", value: `${avgFocus}h`, icon: Brain, color: "text-primary" },
          { label: "Sono Médio/dia", value: `${avgSleep}h`, icon: Moon, color: "text-blue-400" },
          { label: "Dias Treinando", value: `${trainedDays}/7`, icon: Dumbbell, color: "text-emerald-400" },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="bg-secondary/30">
            <CardContent className="p-4 flex items-center gap-3">
              <Icon className={`h-5 w-5 ${color} shrink-0`} />
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
                <p className="text-xl font-bold font-display">{value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Focus Hours Chart */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2"><Brain className="h-4 w-4 text-primary" /> Horas de Foco — Últimos 7 dias</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-2 h-28">
            {last7.map((l) => (
              <div key={l.day_number} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[9px] text-primary font-bold">{l.focus_hours}h</span>
                <div className="w-full rounded-t-sm bg-primary/20 border-t border-primary/40 transition-all"
                  style={{ height: `${Math.max((l.focus_hours / maxFocus) * 80, 4)}px` }} />
                <span className="text-[9px] text-muted-foreground">D{l.day_number}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Sleep + Rating side by side */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2"><Moon className="h-4 w-4 text-blue-400" /> Sono (h)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-1.5 h-20">
              {last7.map((l) => (
                <div key={l.day_number} className="flex-1 flex flex-col items-center gap-0.5">
                  <div className="w-full rounded-t-sm transition-all"
                    style={{
                      height: `${Math.max((l.sleep_hours / maxSleep) * 64, 3)}px`,
                      background: l.sleep_hours >= 7 ? "hsl(217, 91%, 60%)" : "hsl(217, 91%, 40%)",
                      opacity: 0.7,
                    }} />
                  <span className="text-[8px] text-muted-foreground">D{l.day_number}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2"><Star className="h-4 w-4 text-amber-400" /> Nota do Dia</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-1.5 h-20">
              {last7.map((l) => (
                <div key={l.day_number} className="flex-1 flex flex-col items-center gap-0.5">
                  <div className="w-full rounded-t-sm transition-all"
                    style={{
                      height: `${Math.max((l.rating / 10) * 64, 3)}px`,
                      background: l.rating >= 7 ? "hsl(43, 96%, 56%)" : l.rating >= 5 ? "hsl(43, 96%, 40%)" : "hsl(0, 72%, 51%)",
                      opacity: 0.75,
                    }} />
                  <span className="text-[8px] text-muted-foreground">D{l.day_number}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Ritual completion rate */}
      {ritualRate.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> Taxa de Rituais por Dia (%)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {ritualRate.map(({ day, rate }) => (
                <div key={day} className="flex items-center gap-3">
                  <span className="text-[10px] text-muted-foreground w-10 shrink-0">Dia {day}</span>
                  <div className="flex-1 h-3 bg-secondary rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${rate >= 80 ? "bg-emerald-500" : rate >= 50 ? "bg-amber-500" : "bg-destructive"}`}
                      style={{ width: `${rate}%` }} />
                  </div>
                  <span className="text-[10px] font-bold w-8 text-right">{rate}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Highlights */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-emerald-500/5 border-emerald-500/20">
          <CardContent className="p-4 flex items-center gap-3">
            <BookOpen className="h-5 w-5 text-emerald-400 shrink-0" />
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Dias Lendo</p>
              <p className="text-xl font-bold">{readDays}/7</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4 flex items-center gap-3">
            <Shield className="h-5 w-5 text-primary shrink-0" />
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Dias Limpos</p>
              <p className="text-xl font-bold">{last7.filter(l => l.rules_broken.length === 0).length}/7</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ---------- Motivation ----------
function MotivationPanel({ challenge }: { challenge: Challenge }) {
  const today = useMemo(() => COMMANDMENTS[new Date().getDate() % COMMANDMENTS.length], []);
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card className="rarity-legendary border">
        <CardHeader><CardTitle className="font-display flex items-center gap-2"><Target className="h-5 w-5 text-primary" /> Seu objetivo</CardTitle></CardHeader>
        <CardContent>
          <p className="text-lg font-semibold text-foreground">{challenge.objective}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="font-display flex items-center gap-2"><Flame className="h-5 w-5 text-destructive" /> Sua motivação</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground italic whitespace-pre-line">"{challenge.motivation}"</p>
        </CardContent>
      </Card>
      <Card className="md:col-span-2 bg-gradient-to-br from-destructive/10 via-card to-primary/10 border-primary/20">
        <CardContent className="pt-6 text-center">
          <Sparkles className="h-6 w-6 text-primary mx-auto mb-2" />
          <p className="text-xl font-display italic">"{today}"</p>
          <p className="text-xs text-muted-foreground mt-2">Mandamento do dia</p>
        </CardContent>
      </Card>
      <Card className="md:col-span-2">
        <CardHeader><CardTitle className="text-sm">Bloqueios desta caverna</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {challenge.blocks.map((b) => (
            <Badge key={b} variant="outline" className="border-destructive/40 text-destructive">
              <Ban className="h-3 w-3 mr-1" />{b}
            </Badge>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

// ---------- History ----------
function HistoryPanel({ logs, challenge }: { logs: DailyLog[]; challenge: Challenge }) {
  const days = Array.from({ length: challenge.duration_days }, (_, i) => i + 1);
  const logByDay = new Map(logs.map((l) => [l.day_number, l]));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-display">Mapa da Jornada</CardTitle>
        <CardDescription>Verde: dia limpo · Vermelho: regra quebrada · Cinza: pendente</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 sm:grid-cols-10 gap-1.5">
          {days.map((d) => {
            const log = logByDay.get(d);
            const isMilestone = [1, 7, 14, 21, 30].includes(d);
            const status = !log ? "pending" : log.rules_broken.length > 0 ? "fail" : "clean";
            return (
              <div key={d}
                className={`aspect-square rounded text-[10px] flex items-center justify-center font-mono border transition-all ${
                  status === "clean" ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.2)]"
                  : status === "fail" ? "bg-destructive/20 border-destructive/40 text-destructive"
                  : "bg-secondary/30 border-border text-muted-foreground"
                } ${isMilestone ? "ring-1 ring-amber-500/50" : ""}`}
                title={log?.reflection || `Dia ${d}${isMilestone ? " 🏆 Marco!" : ""}`}>
                {isMilestone && status === "clean" ? "🏆" : d}
              </div>
            );
          })}
        </div>
        {logs.length > 0 && (
          <div className="mt-6 space-y-2">
            <h4 className="text-sm font-medium text-foreground">Últimas reflexões</h4>
            {logs.slice(-5).reverse().map((l) => (
              <div key={l.id} className="border-l-2 border-primary/40 pl-3 py-1.5">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="text-xs text-muted-foreground">Dia {l.day_number} · Nota {l.rating}/10</p>
                  {l.rules_broken.length === 0 && <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[9px] px-1.5">Limpo ✓</Badge>}
                  {l.trained && <Badge variant="outline" className="text-[9px] px-1.5">🏋️ Treino</Badge>}
                </div>
                {l.reflection && <p className="text-sm text-foreground/80">{l.reflection}</p>}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ---------- Settings ----------
function SettingsPanel({ challenge, onAbandon, onReload }: { challenge: Challenge; onAbandon: () => void; onReload: () => void }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Ban className="h-4 w-4 text-destructive" /> Regras</CardTitle></CardHeader>
        <CardContent className="space-y-1.5">
          {challenge.rules.map((r) => (
            <div key={r} className="text-sm flex items-center gap-2 p-2 rounded bg-secondary/30">
              <Ban className="h-3 w-3 text-destructive shrink-0" />{r}
            </div>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> Rituais</CardTitle></CardHeader>
        <CardContent className="space-y-1.5">
          {challenge.rituals.map((r) => (
            <div key={r} className="text-sm flex items-center gap-2 p-2 rounded bg-secondary/30">
              <Sparkles className="h-3 w-3 text-primary shrink-0" />{r}
            </div>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Shield className="h-4 w-4 text-muted-foreground" /> Bloqueios</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {challenge.blocks.map((b) => (
            <Badge key={b} variant="outline" className="border-destructive/30 text-destructive/80">{b}</Badge>
          ))}
        </CardContent>
      </Card>
      <Card className="border-destructive/30">
        <CardHeader><CardTitle className="text-sm text-destructive flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> Zona de Perigo</CardTitle></CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground mb-3">Abandonar encerrará o desafio permanentemente.</p>
          <Button variant="destructive" onClick={onAbandon} className="gap-2">
            <X className="h-4 w-4" /> Abandonar desafio
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// ---------- Milestone Modal ----------
function MilestoneModal({ day, data, onClose }: { day: number; data: { label: string; icon: string; desc: string; color: string }; onClose: () => void }) {
  useEffect(() => { playChime("session"); }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.5, opacity: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="relative bg-card border border-primary/30 rounded-2xl p-8 max-w-sm w-full mx-4 text-center shadow-[0_0_60px_rgba(var(--primary-rgb),0.3)]"
      >
        {/* Glow rings */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/10 via-transparent to-amber-500/10 pointer-events-none" />

        <motion.div
          animate={{ scale: [1, 1.15, 1], rotate: [0, 5, -5, 0] }}
          transition={{ repeat: 2, duration: 0.6 }}
          className="text-7xl mb-4"
        >
          {data.icon}
        </motion.div>

        <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Marco Atingido — Dia {day}</p>
        <h2 className={`text-2xl font-display font-bold mb-3 ${data.color}`}>{data.label}</h2>
        <p className="text-sm text-muted-foreground leading-relaxed mb-6">{data.desc}</p>

        <div className="flex justify-center gap-1 mb-6">
          {[...Array(5)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <Star className={`h-5 w-5 ${data.color} fill-current`} />
            </motion.div>
          ))}
        </div>

        <Button onClick={onClose} className="w-full bg-primary hover:bg-primary/90 gap-2">
          <Award className="h-4 w-4" /> Continuar a Jornada
        </Button>
      </motion.div>
    </motion.div>
  );
}

// ---------- War Journal ----------
type JournalEntry = { date: string; gratitude: string; obstacle: string; lesson: string; wins: string };

function WarJournal({ challengeId, dayNumber, motivation }: { challengeId: string; dayNumber: number; motivation: string }) {
  const key = `cave_journal_${challengeId}`;
  const loadAll = (): JournalEntry[] => { try { return JSON.parse(localStorage.getItem(key) || "[]"); } catch { return []; } };
  const [entries, setEntries] = useState<JournalEntry[]>(loadAll);
  const today = todayStr();
  const todayEntry = entries.find(e => e.date === today) || { date: today, gratitude: "", obstacle: "", wins: "", lesson: "" };
  const [form, setForm] = useState(todayEntry);
  const [saved, setSaved] = useState(false);
  const [viewAll, setViewAll] = useState(false);

  const save = () => {
    const updated = entries.filter(e => e.date !== today);
    updated.push(form);
    updated.sort((a, b) => b.date.localeCompare(a.date));
    setEntries(updated);
    localStorage.setItem(key, JSON.stringify(updated));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-4">
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-card">
        <CardHeader className="pb-3">
          <CardTitle className="font-display text-base flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            Diário do Guerreiro — Dia {dayNumber}
          </CardTitle>
          <CardDescription className="text-xs italic">"{motivation}"</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-xs text-amber-400 mb-1.5 block">🌟 3 coisas pelas quais sou grato hoje</Label>
            <Textarea
              value={form.gratitude}
              onChange={e => setForm({ ...form, gratitude: e.target.value })}
              placeholder="1. ... 2. ... 3. ..."
              rows={3}
              className="resize-none text-sm"
            />
          </div>
          <div>
            <Label className="text-xs text-emerald-400 mb-1.5 block">🏆 Minhas maiores vitórias de hoje</Label>
            <Textarea
              value={form.wins}
              onChange={e => setForm({ ...form, wins: e.target.value })}
              placeholder="O que eu conquistei? O que funcionou?"
              rows={2}
              className="resize-none text-sm"
            />
          </div>
          <div>
            <Label className="text-xs text-destructive mb-1.5 block">⚔️ Principal obstáculo enfrentado</Label>
            <Textarea
              value={form.obstacle}
              onChange={e => setForm({ ...form, obstacle: e.target.value })}
              placeholder="O que me desafiou? Como reagi?"
              rows={2}
              className="resize-none text-sm"
            />
          </div>
          <div>
            <Label className="text-xs text-blue-400 mb-1.5 block">💡 Maior aprendizado do dia</Label>
            <Textarea
              value={form.lesson}
              onChange={e => setForm({ ...form, lesson: e.target.value })}
              placeholder="O que aprendi que vou aplicar amanhã?"
              rows={2}
              className="resize-none text-sm"
            />
          </div>
          <Button onClick={save} className={`w-full gap-2 transition-all ${saved ? "bg-emerald-600 hover:bg-emerald-700" : ""}`}>
            {saved ? <><Check className="h-4 w-4" /> Salvo!</> : <><BookOpen className="h-4 w-4" /> Salvar Entrada do Diário</>}
          </Button>
        </CardContent>
      </Card>

      {/* Past entries */}
      {entries.length > 1 && (
        <div>
          <button
            onClick={() => setViewAll(v => !v)}
            className="flex items-center gap-2 text-xs text-primary hover:text-primary/80 mb-3"
          >
            {viewAll ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            Ver entradas anteriores ({entries.filter(e => e.date !== today).length})
          </button>
          {viewAll && (
            <div className="space-y-3">
              {entries.filter(e => e.date !== today).map(e => (
                <Card key={e.date} className="bg-secondary/30">
                  <CardHeader className="py-3 px-4">
                    <CardTitle className="text-xs text-muted-foreground">{new Date(e.date + "T12:00").toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}</CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4 space-y-2">
                    {e.wins && <p className="text-xs"><span className="text-emerald-400 font-bold">🏆</span> {e.wins}</p>}
                    {e.lesson && <p className="text-xs"><span className="text-blue-400 font-bold">💡</span> {e.lesson}</p>}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------- Quantum Habits ----------
const DEFAULT_QUANTUM_HABITS = [
  { id: "agua", label: "2L de água", icon: "💧", category: "saude" },
  { id: "exercicio", label: "Exercício físico", icon: "🏋️", category: "corpo" },
  { id: "meditacao", label: "Meditação", icon: "🧘", category: "mente" },
  { id: "leitura", label: "Leitura 20min+", icon: "📚", category: "mente" },
  { id: "semtela", label: "Sem telas 1h antes de dormir", icon: "📵", category: "sono" },
  { id: "gratidao", label: "Gratidão escrita", icon: "📝", category: "mente" },
  { id: "frio", label: "Banho frio", icon: "🚿", category: "corpo" },
  { id: "dormicedo", label: "Dormir antes das 23h", icon: "🌙", category: "sono" },
  { id: "semjunk", label: "Sem junk food", icon: "🥗", category: "saude" },
  { id: "proteina", label: "Proteína na dieta", icon: "🥩", category: "saude" },
];

function QuantumHabits({ challengeId, logs }: { challengeId: string; logs: DailyLog[] }) {
  const storageKey = `cave_qhabits_config_${challengeId}`;
  const logKey = `cave_qhabits_log_${challengeId}`;
  const today = todayStr();

  const [selected, setSelected] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(storageKey) || "[]"); } catch { return DEFAULT_QUANTUM_HABITS.slice(0, 6).map(h => h.id); }
  });
  const [dailyLogs, setDailyLogs] = useState<Record<string, string[]>>(() => {
    try { return JSON.parse(localStorage.getItem(logKey) || "{}"); } catch { return {}; }
  });
  const [configMode, setConfigMode] = useState(false);
  const [newHabit, setNewHabit] = useState("");
  const [customHabits, setCustomHabits] = useState<typeof DEFAULT_QUANTUM_HABITS>(() => {
    try { return JSON.parse(localStorage.getItem(`${storageKey}_custom`) || "[]"); } catch { return []; }
  });

  const allHabits = [...DEFAULT_QUANTUM_HABITS, ...customHabits].filter(h => selected.includes(h.id));
  const todayDone = dailyLogs[today] || [];

  const toggleHabit = (id: string) => {
    const updated = todayDone.includes(id)
      ? todayDone.filter(h => h !== id)
      : [...todayDone, id];
    const newLogs = { ...dailyLogs, [today]: updated };
    setDailyLogs(newLogs);
    localStorage.setItem(logKey, JSON.stringify(newLogs));
  };

  const toggleSelect = (id: string) => {
    const updated = selected.includes(id) ? selected.filter(s => s !== id) : [...selected, id];
    setSelected(updated);
    localStorage.setItem(storageKey, JSON.stringify(updated));
  };

  const addCustom = () => {
    if (!newHabit.trim()) return;
    const id = `custom_${Date.now()}`;
    const h = { id, label: newHabit.trim(), icon: "⚡", category: "custom" };
    const updated = [...customHabits, h];
    setCustomHabits(updated);
    localStorage.setItem(`${storageKey}_custom`, JSON.stringify(updated));
    setSelected(s => { const n = [...s, id]; localStorage.setItem(storageKey, JSON.stringify(n)); return n; });
    setNewHabit("");
  };

  // Streak calculation per habit
  const getStreak = (habitId: string) => {
    let streak = 0;
    const sortedDates = Object.keys(dailyLogs).sort((a, b) => b.localeCompare(a));
    for (const date of sortedDates) {
      if ((dailyLogs[date] || []).includes(habitId)) streak++;
      else break;
    }
    return streak;
  };

  const totalCompletionRate = allHabits.length > 0
    ? Math.round((todayDone.filter(d => allHabits.some(h => h.id === d)).length / allHabits.length) * 100)
    : 0;

  // Last 7 days for mini heatmap
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().slice(0, 10);
  });

  return (
    <div className="space-y-4">
      <Card className="border-amber-500/20 bg-amber-500/5">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-display text-base font-semibold flex items-center gap-2">
                <Zap className="h-5 w-5 text-amber-400" /> Hábitos Quânticos
              </h3>
              <p className="text-xs text-muted-foreground">Hábitos que se compõem dia após dia.</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-right">
                <p className="text-2xl font-bold font-display text-amber-400">{totalCompletionRate}%</p>
                <p className="text-[10px] text-muted-foreground">hoje</p>
              </div>
              <Button size="sm" variant="outline" onClick={() => setConfigMode(v => !v)} className="text-xs">
                {configMode ? "Fechar" : "Configurar"}
              </Button>
            </div>
          </div>
          <Progress value={totalCompletionRate} className="h-2 mb-1" />
        </CardContent>
      </Card>

      {/* Config mode */}
      {configMode && (
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Selecionar Hábitos</CardTitle>
            <CardDescription className="text-xs">Escolha os hábitos que quer rastrear durante a Caverna.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {[...DEFAULT_QUANTUM_HABITS, ...customHabits].map(h => (
                <button key={h.id} onClick={() => toggleSelect(h.id)}
                  className={`px-2.5 py-1 text-xs rounded-full border transition-all flex items-center gap-1 ${
                    selected.includes(h.id)
                      ? "bg-primary/15 border-primary/40 text-primary"
                      : "bg-secondary/40 border-border text-muted-foreground hover:text-foreground"
                  }`}>
                  {h.icon} {h.label}
                  {selected.includes(h.id) && <Check className="h-2.5 w-2.5" />}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={newHabit}
                onChange={e => setNewHabit(e.target.value)}
                onKeyDown={e => e.key === "Enter" && addCustom()}
                placeholder="Adicionar hábito personalizado..."
                className="text-xs"
              />
              <Button size="sm" variant="outline" onClick={addCustom}><Plus className="h-3.5 w-3.5" /></Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Today's habits */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {allHabits.map(h => {
          const done = todayDone.includes(h.id);
          const streak = getStreak(h.id);
          return (
            <motion.button
              key={h.id}
              onClick={() => toggleHabit(h.id)}
              whileTap={{ scale: 0.97 }}
              className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                done
                  ? "border-emerald-500/40 bg-emerald-500/10"
                  : "border-border bg-card hover:border-primary/30"
              }`}
            >
              <span className="text-xl">{h.icon}</span>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${done ? "text-emerald-400 line-through opacity-80" : "text-foreground"}`}>
                  {h.label}
                </p>
                {streak > 0 && (
                  <p className="text-[10px] text-amber-400 flex items-center gap-1">
                    <Flame className="h-2.5 w-2.5" /> {streak} dias seguidos
                  </p>
                )}
              </div>
              <div className={`h-6 w-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                done ? "bg-emerald-500 border-emerald-500" : "border-border"
              }`}>
                {done && <Check className="h-3.5 w-3.5 text-white" />}
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* 7-day heatmap */}
      {allHabits.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart2 className="h-4 w-4 text-primary" /> Últimos 7 dias
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-[10px]">
                <thead>
                  <tr>
                    <th className="text-left text-muted-foreground pb-2 pr-2 font-normal w-32">Hábito</th>
                    {last7.map(d => (
                      <th key={d} className="text-center text-muted-foreground pb-2 font-normal px-1">
                        {new Date(d + "T12:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {allHabits.map(h => (
                    <tr key={h.id}>
                      <td className="pr-2 py-1 text-muted-foreground truncate max-w-[120px]">{h.icon} {h.label}</td>
                      {last7.map(d => {
                        const done = (dailyLogs[d] || []).includes(h.id);
                        return (
                          <td key={d} className="text-center py-1 px-1">
                            <div className={`h-5 w-5 rounded mx-auto ${done ? "bg-emerald-500" : "bg-secondary"}`}>
                              {done && <Check className="h-3 w-3 text-white m-auto mt-1" />}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

