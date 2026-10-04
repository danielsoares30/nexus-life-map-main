import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Target, Rocket, CheckCircle2, Plus, Trash2, Edit3, Briefcase,
  TrendingUp, Zap, Brain, Users, Wrench, Shield,
  Calendar, Clock, Sparkles, AlertTriangle, Lightbulb, ArrowUpRight,
  ArrowDownRight, Layers, MapPin, CircleDot, GraduationCap, Handshake,
  Compass, BarChart2, Filter
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useCareerSkills, useCareerGoals } from "@/hooks/useGameData";
import { toast } from "@/hooks/use-toast";
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ResponsiveContainer, Tooltip
} from "recharts";

// ─── Types ─────────────────────────────────────────────────────────────────────
type SkillCategory = "tecnica" | "comportamental" | "lideranca";

type RoadmapMilestone = {
  id: string;
  title: string;
  description: string;
  date: string;
  status: "futuro" | "atual" | "concluido";
};

type SwotItem = {
  id: string;
  text: string;
};

type SwotData = {
  strengths: SwotItem[];
  weaknesses: SwotItem[];
  opportunities: SwotItem[];
  threats: SwotItem[];
};

type GoalPriority = "alta" | "media" | "baixa";
type LearningModel = "experiencia" | "mentoria" | "educacao";

type LocalGoalData = {
  [goalId: string]: {
    progress: number;
    priority: GoalPriority;
    learningModel: LearningModel;
    description: string;
  };
};

type LocalSkillData = {
  [skillId: string]: {
    category: SkillCategory;
  };
};

// ─── Constants ─────────────────────────────────────────────────────────────────
const CAREER_LEVELS = [
  { min: 0, label: "Estagiário", icon: "🌱", color: "text-slate-400", bg: "bg-slate-500/10", xpNeeded: 100 },
  { min: 100, label: "Júnior", icon: "📖", color: "text-blue-400", bg: "bg-blue-500/10", xpNeeded: 250 },
  { min: 350, label: "Pleno", icon: "⚡", color: "text-yellow-400", bg: "bg-yellow-500/10", xpNeeded: 500 },
  { min: 850, label: "Sênior", icon: "🚀", color: "text-purple-400", bg: "bg-purple-500/10", xpNeeded: 800 },
  { min: 1650, label: "Staff", icon: "🔥", color: "text-orange-400", bg: "bg-orange-500/10", xpNeeded: 1200 },
  { min: 2850, label: "Principal", icon: "👑", color: "text-amber-400", bg: "bg-amber-500/10", xpNeeded: 9999 },
];

const SKILL_LEVELS = [
  { min: 0, label: "Novato", color: "text-slate-400", barColor: "bg-slate-500" },
  { min: 21, label: "Básico", color: "text-blue-400", barColor: "bg-blue-500" },
  { min: 41, label: "Intermediário", color: "text-yellow-400", barColor: "bg-yellow-500" },
  { min: 61, label: "Avançado", color: "text-purple-400", barColor: "bg-purple-500" },
  { min: 81, label: "Expert", color: "text-amber-400", barColor: "bg-amber-500" },
];

const CATEGORY_INFO: Record<SkillCategory, { label: string; icon: typeof Wrench; color: string; bg: string }> = {
  tecnica: { label: "Técnica", icon: Wrench, color: "text-blue-400", bg: "bg-blue-500/10" },
  comportamental: { label: "Comportamental", icon: Brain, color: "text-purple-400", bg: "bg-purple-500/10" },
  lideranca: { label: "Liderança", icon: Users, color: "text-amber-400", bg: "bg-amber-500/10" },
};

const PRIORITY_INFO: Record<GoalPriority, { label: string; color: string; bg: string }> = {
  alta: { label: "Alta", color: "text-red-400", bg: "bg-red-500/15" },
  media: { label: "Média", color: "text-yellow-400", bg: "bg-yellow-500/15" },
  baixa: { label: "Baixa", color: "text-blue-400", bg: "bg-blue-500/15" },
};

const LEARNING_MODEL_INFO: Record<LearningModel, { label: string; pct: string; icon: typeof Briefcase; color: string }> = {
  experiencia: { label: "Experiência", pct: "70%", icon: Briefcase, color: "text-emerald-400" },
  mentoria: { label: "Mentoria", pct: "20%", icon: Handshake, color: "text-blue-400" },
  educacao: { label: "Educação", pct: "10%", icon: GraduationCap, color: "text-purple-400" },
};

const SWOT_CONFIG = {
  strengths: { label: "Forças", icon: Shield, color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/30", gradient: "from-emerald-500/20 to-emerald-500/5" },
  weaknesses: { label: "Fraquezas", icon: AlertTriangle, color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/30", gradient: "from-red-500/20 to-red-500/5" },
  opportunities: { label: "Oportunidades", icon: Lightbulb, color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/30", gradient: "from-blue-500/20 to-blue-500/5" },
  threats: { label: "Ameaças", icon: AlertTriangle, color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/30", gradient: "from-amber-500/20 to-amber-500/5" },
};

// ─── Helpers ───────────────────────────────────────────────────────────────────
function getSkillLevel(level: number) {
  return [...SKILL_LEVELS].reverse().find(l => level >= l.min) || SKILL_LEVELS[0];
}

function getCareerLevel(xp: number) {
  return [...CAREER_LEVELS].reverse().find(l => xp >= l.min) || CAREER_LEVELS[0];
}

function getCareerXpProgress(xp: number) {
  const level = getCareerLevel(xp);
  const idx = CAREER_LEVELS.indexOf(level);
  const nextLevel = CAREER_LEVELS[idx + 1];
  if (!nextLevel) return { current: xp - level.min, needed: level.xpNeeded, pct: 100 };
  const currentXp = xp - level.min;
  const needed = nextLevel.min - level.min;
  return { current: currentXp, needed, pct: Math.min(100, Math.round((currentXp / needed) * 100)) };
}

function daysUntil(dateStr: string): number {
  const target = new Date(dateStr);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function playCareerChime(type: "success" | "add" | "delete") {
  try {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return;
    const seqs: Record<string, { f: number; d: number }[]> = {
      success: [{ f: 523, d: 0.1 }, { f: 659, d: 0.1 }, { f: 784, d: 0.1 }, { f: 1047, d: 0.4 }],
      add: [{ f: 659, d: 0.08 }, { f: 880, d: 0.18 }],
      delete: [{ f: 350, d: 0.15 }, { f: 280, d: 0.25 }],
    };
    let offset = 0;
    seqs[type].forEach(({ f, d }) => {
      setTimeout(() => {
        try {
          const c = new Ctx();
          const o = c.createOscillator();
          const g = c.createGain();
          o.connect(g); g.connect(c.destination);
          o.type = "sine"; o.frequency.value = f;
          g.gain.setValueAtTime(0.06, c.currentTime);
          o.start();
          g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + d);
          setTimeout(() => { o.stop(); c.close(); }, d * 1000 + 100);
        } catch { /* silent */ }
      }, offset * 1000);
      offset += d;
    });
  } catch { /* silent */ }
}

// ─── localStorage helpers ──────────────────────────────────────────────────────
const LS_KEYS = {
  roadmap: "nexus_career_roadmap",
  swot: "nexus_career_swot",
  goalData: "nexus_career_goal_data",
  skillData: "nexus_career_skill_data",
};

function loadLS<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
}

function saveLS<T>(key: string, data: T) {
  try { localStorage.setItem(key, JSON.stringify(data)); } catch { /* silent */ }
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function Career() {
  const { skills, loading: loadingSkills, create: createSkill, update: updateSkill, remove: removeSkill } = useCareerSkills();
  const { goals, loading: loadingGoals, create: createGoal, update: updateGoal, remove: removeGoal } = useCareerGoals();

  // Local state: localStorage-backed data
  const [roadmap, setRoadmap] = useState<RoadmapMilestone[]>(() => loadLS(LS_KEYS.roadmap, []));
  const [swot, setSwot] = useState<SwotData>(() => loadLS(LS_KEYS.swot, { strengths: [], weaknesses: [], opportunities: [], threats: [] }));
  const [localGoalData, setLocalGoalData] = useState<LocalGoalData>(() => loadLS(LS_KEYS.goalData, {}));
  const [localSkillData, setLocalSkillData] = useState<LocalSkillData>(() => loadLS(LS_KEYS.skillData, {}));

  // Persist to localStorage
  useEffect(() => { saveLS(LS_KEYS.roadmap, roadmap); }, [roadmap]);
  useEffect(() => { saveLS(LS_KEYS.swot, swot); }, [swot]);
  useEffect(() => { saveLS(LS_KEYS.goalData, localGoalData); }, [localGoalData]);
  useEffect(() => { saveLS(LS_KEYS.skillData, localSkillData); }, [localSkillData]);

  // Dialogs
  const [skillDialog, setSkillDialog] = useState(false);
  const [goalDialog, setGoalDialog] = useState(false);
  const [milestoneDialog, setMilestoneDialog] = useState(false);
  const [swotDialog, setSwotDialog] = useState<{ open: boolean; quadrant: keyof SwotData | null }>({ open: false, quadrant: null });

  // Editing state
  const [editingSkill, setEditingSkill] = useState<any>(null);
  const [editingGoal, setEditingGoal] = useState<any>(null);
  const [editingMilestone, setEditingMilestone] = useState<RoadmapMilestone | null>(null);

  // Forms
  const [skillForm, setSkillForm] = useState({ name: "", level: "50", category: "tecnica" as SkillCategory });
  const [goalForm, setGoalForm] = useState({
    title: "", status: "em_progresso", target_date: "",
    progress: "0", priority: "media" as GoalPriority,
    learningModel: "experiencia" as LearningModel, description: ""
  });
  const [milestoneForm, setMilestoneForm] = useState({ title: "", description: "", date: "", status: "futuro" as RoadmapMilestone["status"] });
  const [swotInput, setSwotInput] = useState("");

  // Filters
  const [goalFilter, setGoalFilter] = useState<string>("todos");
  const [skillCategoryFilter, setSkillCategoryFilter] = useState<string>("todos");

  // ─── Calculations ──────────────────────────────────────────────────────────
  const careerXp = useMemo(() => {
    let xp = 0;
    // Skills contribute XP based on level
    skills.forEach((s: any) => xp += s.level * 2);
    // Completed goals give bonus XP
    goals.forEach((g: any) => {
      if (g.status === "concluida") xp += 50;
      else xp += 10;
    });
    // Roadmap milestones
    roadmap.forEach(m => {
      if (m.status === "concluido") xp += 40;
      else if (m.status === "atual") xp += 15;
    });
    // SWOT items
    const swotCount = swot.strengths.length + swot.weaknesses.length + swot.opportunities.length + swot.threats.length;
    xp += swotCount * 5;
    return xp;
  }, [skills, goals, roadmap, swot]);

  const careerLevel = useMemo(() => getCareerLevel(careerXp), [careerXp]);
  const xpProgress = useMemo(() => getCareerXpProgress(careerXp), [careerXp]);

  const radarData = useMemo(() => {
    const categories: SkillCategory[] = ["tecnica", "comportamental", "lideranca"];
    return categories.map(cat => {
      const catSkills = skills.filter((s: any) => (localSkillData[s.id]?.category || "tecnica") === cat);
      const avg = catSkills.length > 0 ? Math.round(catSkills.reduce((sum: number, s: any) => sum + s.level, 0) / catSkills.length) : 0;
      return {
        category: CATEGORY_INFO[cat].label,
        value: avg,
        fullMark: 100,
      };
    });
  }, [skills, localSkillData]);

  const completionRate = useMemo(() => {
    if (goals.length === 0) return 0;
    return Math.round((goals.filter((g: any) => g.status === "concluida").length / goals.length) * 100);
  }, [goals]);

  const filteredGoals = useMemo(() => {
    if (goalFilter === "todos") return goals;
    return goals.filter((g: any) => g.status === goalFilter);
  }, [goals, goalFilter]);

  const filteredSkills = useMemo(() => {
    if (skillCategoryFilter === "todos") return skills;
    return skills.filter((s: any) => (localSkillData[s.id]?.category || "tecnica") === skillCategoryFilter);
  }, [skills, skillCategoryFilter, localSkillData]);

  // ─── Skill CRUD ────────────────────────────────────────────────────────────
  const openAddSkill = () => {
    setEditingSkill(null);
    setSkillForm({ name: "", level: "50", category: "tecnica" });
    setSkillDialog(true);
  };

  const openEditSkill = (s: any) => {
    setEditingSkill(s);
    setSkillForm({
      name: s.name,
      level: s.level.toString(),
      category: localSkillData[s.id]?.category || "tecnica"
    });
    setSkillDialog(true);
  };

  const saveSkill = async () => {
    if (!skillForm.name) return;
    if (editingSkill) {
      await updateSkill(editingSkill.id, { name: skillForm.name, level: Number(skillForm.level) });
      setLocalSkillData(prev => ({ ...prev, [editingSkill.id]: { category: skillForm.category } }));
    } else {
      const created = await createSkill({ name: skillForm.name, level: Number(skillForm.level) });
      if (created) {
        setLocalSkillData(prev => ({ ...prev, [created.id]: { category: skillForm.category } }));
      }
    }
    playCareerChime("add");
    setSkillDialog(false);
  };

  const handleRemoveSkill = async (id: string) => {
    await removeSkill(id);
    setLocalSkillData(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    playCareerChime("delete");
  };

  // ─── Goal CRUD ─────────────────────────────────────────────────────────────
  const openAddGoal = () => {
    setEditingGoal(null);
    setGoalForm({ title: "", status: "em_progresso", target_date: "", progress: "0", priority: "media", learningModel: "experiencia", description: "" });
    setGoalDialog(true);
  };

  const openEditGoal = (g: any) => {
    const local: Partial<LocalGoalData[string]> = localGoalData[g.id] || {};
    setEditingGoal(g);
    setGoalForm({
      title: g.title,
      status: g.status,
      target_date: g.target_date || "",
      progress: (local.progress || 0).toString(),
      priority: local.priority || "media",
      learningModel: local.learningModel || "experiencia",
      description: local.description || "",
    });
    setGoalDialog(true);
  };

  const saveGoal = async () => {
    if (!goalForm.title) return;
    const data = { title: goalForm.title, status: goalForm.status, target_date: goalForm.target_date || null };
    if (editingGoal) {
      await updateGoal(editingGoal.id, data);
      setLocalGoalData(prev => ({
        ...prev,
        [editingGoal.id]: {
          progress: Number(goalForm.progress),
          priority: goalForm.priority,
          learningModel: goalForm.learningModel,
          description: goalForm.description,
        }
      }));
    } else {
      const created = await createGoal(data);
      if (created) {
        setLocalGoalData(prev => ({
          ...prev,
          [created.id]: {
            progress: Number(goalForm.progress),
            priority: goalForm.priority,
            learningModel: goalForm.learningModel,
            description: goalForm.description,
          }
        }));
      }
    }
    if (goalForm.status === "concluida") playCareerChime("success");
    else playCareerChime("add");
    setGoalDialog(false);
  };

  const handleRemoveGoal = async (id: string) => {
    await removeGoal(id);
    setLocalGoalData(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    playCareerChime("delete");
  };

  const toggleGoalComplete = async (g: any) => {
    const newStatus = g.status === "concluida" ? "em_progresso" : "concluida";
    await updateGoal(g.id, { status: newStatus });
    if (newStatus === "concluida") {
      setLocalGoalData(prev => ({ ...prev, [g.id]: { ...prev[g.id], progress: 100 } }));
      playCareerChime("success");
      toast({ title: "🎉 Meta Concluída!", description: `"${g.title}" foi marcada como concluída!` });
    }
  };

  // ─── Milestone CRUD ────────────────────────────────────────────────────────
  const openAddMilestone = () => {
    setEditingMilestone(null);
    setMilestoneForm({ title: "", description: "", date: "", status: "futuro" });
    setMilestoneDialog(true);
  };

  const openEditMilestone = (m: RoadmapMilestone) => {
    setEditingMilestone(m);
    setMilestoneForm({ title: m.title, description: m.description, date: m.date, status: m.status });
    setMilestoneDialog(true);
  };

  const saveMilestone = () => {
    if (!milestoneForm.title) return;
    if (editingMilestone) {
      setRoadmap(prev => prev.map(m => m.id === editingMilestone.id ? { ...m, ...milestoneForm } : m));
    } else {
      setRoadmap(prev => [...prev, { id: generateId(), ...milestoneForm }].sort((a, b) => a.date.localeCompare(b.date)));
    }
    playCareerChime("add");
    setMilestoneDialog(false);
  };

  const removeMilestone = (id: string) => {
    setRoadmap(prev => prev.filter(m => m.id !== id));
    playCareerChime("delete");
  };

  // ─── SWOT CRUD ─────────────────────────────────────────────────────────────
  const openSwotDialog = (quadrant: keyof SwotData) => {
    setSwotInput("");
    setSwotDialog({ open: true, quadrant });
  };

  const addSwotItem = () => {
    if (!swotInput.trim() || !swotDialog.quadrant) return;
    setSwot(prev => ({
      ...prev,
      [swotDialog.quadrant!]: [...prev[swotDialog.quadrant!], { id: generateId(), text: swotInput.trim() }]
    }));
    playCareerChime("add");
    setSwotInput("");
  };

  const removeSwotItem = (quadrant: keyof SwotData, id: string) => {
    setSwot(prev => ({
      ...prev,
      [quadrant]: prev[quadrant].filter(i => i.id !== id)
    }));
    playCareerChime("delete");
  };

  // ─── Loading ───────────────────────────────────────────────────────────────
  if (loadingSkills || loadingGoals) {
    return (
      <div className="max-w-5xl mx-auto flex items-center justify-center py-20">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl md:text-3xl font-bold text-gradient-gold flex items-center gap-2">
            <Briefcase className="h-7 w-7 text-primary" />
            Carreira
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Evolua profissionalmente e conquiste novos patamares.</p>
        </div>
        {/* Career Level Badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="flex items-center gap-3 rounded-xl border border-border bg-card/80 backdrop-blur-sm px-4 py-2.5"
        >
          <span className="text-2xl">{careerLevel.icon}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className={`text-sm font-bold font-display ${careerLevel.color}`}>{careerLevel.label}</span>
              <span className="text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">{careerXp} XP</span>
            </div>
            <div className="stat-bar h-1.5 mt-1 w-28">
              <motion.div
                className="stat-bar-fill xp-fill"
                initial={{ width: 0 }}
                animate={{ width: `${xpProgress.pct}%` }}
                transition={{ duration: 1.2, ease: "easeOut" }}
              />
            </div>
            <p className="text-[9px] text-muted-foreground mt-0.5">{xpProgress.current}/{xpProgress.needed} para próximo nível</p>
          </div>
        </motion.div>
      </motion.div>

      {/* Tabs */}
      <Tabs defaultValue="visao_geral" className="w-full">
        <TabsList className="w-full grid grid-cols-5 bg-secondary/50 border border-border rounded-xl h-10">
          <TabsTrigger value="visao_geral" className="text-xs data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-lg gap-1">
            <BarChart2 className="h-3.5 w-3.5 hidden sm:inline-block" /> Visão Geral
          </TabsTrigger>
          <TabsTrigger value="habilidades" className="text-xs data-[state=active]:bg-blue-500/10 data-[state=active]:text-blue-400 rounded-lg gap-1">
            <Rocket className="h-3.5 w-3.5 hidden sm:inline-block" /> Habilidades
          </TabsTrigger>
          <TabsTrigger value="metas" className="text-xs data-[state=active]:bg-emerald-500/10 data-[state=active]:text-emerald-400 rounded-lg gap-1">
            <Target className="h-3.5 w-3.5 hidden sm:inline-block" /> Metas
          </TabsTrigger>
          <TabsTrigger value="roadmap" className="text-xs data-[state=active]:bg-purple-500/10 data-[state=active]:text-purple-400 rounded-lg gap-1">
            <Compass className="h-3.5 w-3.5 hidden sm:inline-block" /> Roadmap
          </TabsTrigger>
          <TabsTrigger value="swot" className="text-xs data-[state=active]:bg-amber-500/10 data-[state=active]:text-amber-400 rounded-lg gap-1">
            <Layers className="h-3.5 w-3.5 hidden sm:inline-block" /> SWOT
          </TabsTrigger>
        </TabsList>

        {/* ═══════════════ TAB: VISÃO GERAL ═══════════════ */}
        <TabsContent value="visao_geral" className="space-y-5 mt-5">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: "Habilidades", value: skills.length.toString(), icon: Rocket, color: "text-mana", bg: "bg-mana/10" },
              { label: "Metas Ativas", value: goals.filter((g: any) => g.status !== "concluida").length.toString(), icon: Target, color: "text-wisdom", bg: "bg-wisdom/10" },
              { label: "Concluídas", value: goals.filter((g: any) => g.status === "concluida").length.toString(), icon: CheckCircle2, color: "text-health", bg: "bg-health/10" },
              { label: "Taxa de Conclusão", value: `${completionRate}%`, icon: TrendingUp, color: "text-primary", bg: "bg-primary/10" },
            ].map((item, i) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className="rounded-xl border border-border bg-card p-4 hover:border-border/80 transition-colors"
              >
                <div className={`h-8 w-8 rounded-lg ${item.bg} flex items-center justify-center mb-2`}>
                  <item.icon className={`h-4 w-4 ${item.color}`} />
                </div>
                <p className="text-xs text-muted-foreground">{item.label}</p>
                <p className="text-xl font-bold font-display text-foreground mt-0.5">{item.value}</p>
              </motion.div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Radar Chart - Perfil de Competências */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="rounded-xl border border-border bg-card p-5"
            >
              <h3 className="font-display text-base font-semibold text-foreground mb-1">Perfil de Competências</h3>
              <p className="text-[11px] text-muted-foreground mb-3">Média de habilidades por categoria</p>
              {skills.length > 0 ? (
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="75%">
                      <PolarGrid stroke="hsl(230 12% 22%)" />
                      <PolarAngleAxis dataKey="category" tick={{ fill: "hsl(45 20% 70%)", fontSize: 11, fontFamily: "Inter" }} />
                      <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
                      <Radar name="Nível" dataKey="value" stroke="hsl(40 85% 55%)" fill="hsl(40 85% 55%)" fillOpacity={0.2} strokeWidth={2} />
                      <Tooltip
                        contentStyle={{ background: "hsl(230 15% 11%)", border: "1px solid hsl(230 12% 18%)", borderRadius: 8, fontSize: 12 }}
                        labelStyle={{ color: "hsl(45 20% 90%)", fontWeight: 600 }}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-52 flex items-center justify-center">
                  <p className="text-xs text-muted-foreground">Adicione habilidades para visualizar.</p>
                </div>
              )}
            </motion.div>

            {/* IDP Summary + Quick Info */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="space-y-4"
            >
              {/* Plano de Desenvolvimento Individual */}
              <div className="rounded-xl border border-border bg-card p-5">
                <h3 className="font-display text-base font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Plano de Desenvolvimento
                </h3>
                <div className="space-y-2.5">
                  {/* 70-20-10 Breakdown */}
                  {(["experiencia", "mentoria", "educacao"] as LearningModel[]).map(model => {
                    const info = LEARNING_MODEL_INFO[model];
                    const count = goals.filter((g: any) => (localGoalData[g.id]?.learningModel || "experiencia") === model).length;
                    return (
                      <div key={model} className="flex items-center gap-3">
                        <div className={`h-7 w-7 rounded-md bg-secondary flex items-center justify-center`}>
                          <info.icon className={`h-3.5 w-3.5 ${info.color}`} />
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between">
                            <span className="text-xs text-foreground">{info.label} <span className="text-muted-foreground">({info.pct})</span></span>
                            <span className="text-xs text-muted-foreground">{count} meta{count !== 1 ? "s" : ""}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Próximos Milestones */}
              <div className="rounded-xl border border-border bg-card p-5">
                <h3 className="font-display text-base font-semibold text-foreground mb-3 flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-purple-400" />
                  Próximos Milestones
                </h3>
                {roadmap.filter(m => m.status !== "concluido").length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-3">Nenhum milestone pendente.</p>
                ) : (
                  <div className="space-y-2">
                    {roadmap.filter(m => m.status !== "concluido").slice(0, 3).map(m => (
                      <div key={m.id} className="flex items-center gap-2 text-sm">
                        <CircleDot className={`h-3.5 w-3.5 shrink-0 ${m.status === "atual" ? "text-primary" : "text-muted-foreground"}`} />
                        <span className="text-foreground flex-1 truncate">{m.title}</span>
                        {m.date && <span className="text-[10px] text-muted-foreground">{m.date}</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </TabsContent>

        {/* ═══════════════ TAB: HABILIDADES ═══════════════ */}
        <TabsContent value="habilidades" className="space-y-5 mt-5">
          {/* Category Summary Cards */}
          <div className="grid grid-cols-3 gap-3">
            {(["tecnica", "comportamental", "lideranca"] as SkillCategory[]).map((cat, i) => {
              const info = CATEGORY_INFO[cat];
              const catSkills = skills.filter((s: any) => (localSkillData[s.id]?.category || "tecnica") === cat);
              const avg = catSkills.length > 0 ? Math.round(catSkills.reduce((sum: number, s: any) => sum + s.level, 0) / catSkills.length) : 0;
              return (
                <motion.div
                  key={cat}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className={`rounded-xl border border-border bg-card p-4`}
                >
                  <div className={`h-8 w-8 rounded-lg ${info.bg} flex items-center justify-center mb-2`}>
                    <info.icon className={`h-4 w-4 ${info.color}`} />
                  </div>
                  <p className="text-xs text-muted-foreground">{info.label}</p>
                  <p className="text-lg font-bold font-display text-foreground">{catSkills.length}</p>
                  <div className="stat-bar h-1.5 mt-1.5">
                    <motion.div
                      className="stat-bar-fill"
                      style={{
                        background: `linear-gradient(90deg, hsl(var(--${cat === "tecnica" ? "mana" : cat === "comportamental" ? "wisdom" : "xp"})), hsl(var(--${cat === "tecnica" ? "mana" : cat === "comportamental" ? "wisdom" : "xp"}) / 0.7))`,
                        boxShadow: `0 0 8px hsl(var(--${cat === "tecnica" ? "mana" : cat === "comportamental" ? "wisdom" : "xp"}) / 0.5)`,
                      }}
                      initial={{ width: 0 }}
                      animate={{ width: `${avg}%` }}
                      transition={{ duration: 1, delay: 0.2 }}
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">Média: {avg}/100</p>
                </motion.div>
              );
            })}
          </div>

          {/* Filter + Add */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="h-3.5 w-3.5 text-muted-foreground" />
              <select
                value={skillCategoryFilter}
                onChange={(e) => setSkillCategoryFilter(e.target.value)}
                className="rounded-md border border-input bg-background px-2 py-1 text-xs"
              >
                <option value="todos">Todas Categorias</option>
                <option value="tecnica">🔧 Técnica</option>
                <option value="comportamental">🧠 Comportamental</option>
                <option value="lideranca">👥 Liderança</option>
              </select>
            </div>
            <Button onClick={openAddSkill} size="sm" variant="ghost" className="gap-1 h-7 text-xs">
              <Plus className="h-3.5 w-3.5" /> Adicionar
            </Button>
          </div>

          {/* Skills List */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-xl border border-border bg-card p-5">
            {filteredSkills.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">
                {skillCategoryFilter !== "todos" ? "Nenhuma habilidade nesta categoria." : "Nenhuma habilidade adicionada. Comece adicionando suas competências!"}
              </p>
            ) : (
              <div className="space-y-4">
                {filteredSkills.map((skill: any, i: number) => {
                  const cat = localSkillData[skill.id]?.category || "tecnica";
                  const catInfo = CATEGORY_INFO[cat];
                  const levelInfo = getSkillLevel(skill.level);
                  return (
                    <motion.div
                      key={skill.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="group"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <div className={`h-6 w-6 rounded-md ${catInfo.bg} flex items-center justify-center`}>
                            <catInfo.icon className={`h-3 w-3 ${catInfo.color}`} />
                          </div>
                          <span className="text-sm font-medium text-foreground">{skill.name}</span>
                          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${levelInfo.color} bg-secondary`}>
                            {levelInfo.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground tabular-nums">{skill.level}/100</span>
                          <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => openEditSkill(skill)} className="p-0.5 rounded hover:bg-secondary">
                              <Edit3 className="h-3 w-3 text-muted-foreground" />
                            </button>
                            <button onClick={() => handleRemoveSkill(skill.id)} className="p-0.5 rounded hover:bg-destructive/20">
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </button>
                          </div>
                        </div>
                      </div>
                      <div className="stat-bar h-2.5 rounded-full">
                        <motion.div
                          className="stat-bar-fill rounded-full"
                          style={{
                            background: `linear-gradient(90deg, hsl(var(--${cat === "tecnica" ? "mana" : cat === "comportamental" ? "wisdom" : "xp"})), hsl(var(--${cat === "tecnica" ? "mana" : cat === "comportamental" ? "wisdom" : "xp"}) / 0.7))`,
                            boxShadow: `0 0 6px hsl(var(--${cat === "tecnica" ? "mana" : cat === "comportamental" ? "wisdom" : "xp"}) / 0.4)`,
                          }}
                          initial={{ width: 0 }}
                          animate={{ width: `${skill.level}%` }}
                          transition={{ duration: 0.8, delay: i * 0.05 }}
                        />
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        </TabsContent>

        {/* ═══════════════ TAB: METAS ═══════════════ */}
        <TabsContent value="metas" className="space-y-5 mt-5">
          {/* Filter + Add */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="h-3.5 w-3.5 text-muted-foreground" />
              <select
                value={goalFilter}
                onChange={(e) => setGoalFilter(e.target.value)}
                className="rounded-md border border-input bg-background px-2 py-1 text-xs"
              >
                <option value="todos">Todos os Status</option>
                <option value="em_progresso">Em Progresso</option>
                <option value="pausada">Pausada</option>
                <option value="concluida">Concluída</option>
              </select>
            </div>
            <Button onClick={openAddGoal} size="sm" variant="ghost" className="gap-1 h-7 text-xs">
              <Plus className="h-3.5 w-3.5" /> Nova Meta
            </Button>
          </div>

          {/* Goals Summary */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Em Progresso", count: goals.filter((g: any) => g.status === "em_progresso").length, color: "text-blue-400", bg: "bg-blue-500/10", icon: Zap },
              { label: "Pausadas", count: goals.filter((g: any) => g.status === "pausada").length, color: "text-amber-400", bg: "bg-amber-500/10", icon: Clock },
              { label: "Concluídas", count: goals.filter((g: any) => g.status === "concluida").length, color: "text-emerald-400", bg: "bg-emerald-500/10", icon: CheckCircle2 },
            ].map((item, i) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className="rounded-xl border border-border bg-card p-3 flex items-center gap-3"
              >
                <div className={`h-8 w-8 rounded-lg ${item.bg} flex items-center justify-center shrink-0`}>
                  <item.icon className={`h-4 w-4 ${item.color}`} />
                </div>
                <div>
                  <p className="text-lg font-bold font-display text-foreground">{item.count}</p>
                  <p className="text-[10px] text-muted-foreground">{item.label}</p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Goals List */}
          <div className="space-y-3">
            {filteredGoals.length === 0 ? (
              <div className="rounded-xl border border-border bg-card p-8 text-center">
                <Target className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  {goalFilter !== "todos" ? "Nenhuma meta com este status." : "Nenhuma meta de carreira. Defina seus objetivos profissionais!"}
                </p>
              </div>
            ) : (
              <AnimatePresence>
                {filteredGoals.map((goal: any, i: number) => {
                  const local = localGoalData[goal.id] || { progress: 0, priority: "media", learningModel: "experiencia", description: "" };
                  const priorityInfo = PRIORITY_INFO[local.priority || "media"];
                  const modelInfo = LEARNING_MODEL_INFO[local.learningModel || "experiencia"];
                  const deadline = goal.target_date ? daysUntil(goal.target_date) : null;
                  const isOverdue = deadline !== null && deadline < 0 && goal.status !== "concluida";

                  return (
                    <motion.div
                      key={goal.id}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ delay: i * 0.05 }}
                      className={`rounded-xl border bg-card p-4 group transition-colors ${isOverdue ? "border-red-500/40" : "border-border"} ${goal.status === "concluida" ? "opacity-75" : ""}`}
                    >
                      <div className="flex items-start gap-3">
                        {/* Complete toggle */}
                        <button
                          onClick={() => toggleGoalComplete(goal)}
                          className={`mt-0.5 h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${goal.status === "concluida" ? "bg-health border-health" : "border-muted-foreground/30 hover:border-primary"}`}
                        >
                          {goal.status === "concluida" && <CheckCircle2 className="h-3 w-3 text-white" />}
                        </button>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-sm font-medium ${goal.status === "concluida" ? "line-through text-muted-foreground" : "text-foreground"}`}>
                              {goal.title}
                            </span>
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${priorityInfo.bg} ${priorityInfo.color}`}>
                              {priorityInfo.label}
                            </span>
                            <span className={`text-[9px] px-1.5 py-0.5 rounded-full bg-secondary flex items-center gap-0.5 ${modelInfo.color}`}>
                              <modelInfo.icon className="h-2.5 w-2.5" /> {modelInfo.label}
                            </span>
                          </div>

                          {local.description && (
                            <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">{local.description}</p>
                          )}

                          {/* Progress bar */}
                          <div className="mt-2.5">
                            <div className="flex justify-between mb-1">
                              <span className="text-[10px] text-muted-foreground">Progresso</span>
                              <span className="text-[10px] text-muted-foreground tabular-nums">{local.progress || 0}%</span>
                            </div>
                            <div className="stat-bar h-2">
                              <motion.div
                                className="stat-bar-fill health-fill"
                                initial={{ width: 0 }}
                                animate={{ width: `${local.progress || 0}%` }}
                                transition={{ duration: 0.8 }}
                              />
                            </div>
                          </div>

                          {/* Meta info row */}
                          <div className="flex items-center gap-3 mt-2">
                            {goal.status !== "concluida" && (
                              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${goal.status === "em_progresso" ? "bg-blue-500/15 text-blue-400" : "bg-amber-500/15 text-amber-400"}`}>
                                {goal.status === "em_progresso" ? "Em Progresso" : "Pausada"}
                              </span>
                            )}
                            {goal.target_date && (
                              <span className={`text-[10px] flex items-center gap-0.5 ${isOverdue ? "text-red-400 font-medium" : "text-muted-foreground"}`}>
                                <Calendar className="h-2.5 w-2.5" />
                                {goal.target_date}
                                {deadline !== null && goal.status !== "concluida" && (
                                  <span className="ml-0.5">
                                    ({isOverdue ? `${Math.abs(deadline)}d atrasada` : `${deadline}d restantes`})
                                  </span>
                                )}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                          <button onClick={() => openEditGoal(goal)} className="p-1 rounded hover:bg-secondary">
                            <Edit3 className="h-3.5 w-3.5 text-muted-foreground" />
                          </button>
                          <button onClick={() => handleRemoveGoal(goal.id)} className="p-1 rounded hover:bg-destructive/20">
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            )}
          </div>
        </TabsContent>

        {/* ═══════════════ TAB: ROADMAP ═══════════════ */}
        <TabsContent value="roadmap" className="space-y-5 mt-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-display text-base font-semibold text-foreground">Roadmap de Carreira</h3>
              <p className="text-[11px] text-muted-foreground">Visualize sua jornada profissional com milestones.</p>
            </div>
            <Button onClick={openAddMilestone} size="sm" variant="ghost" className="gap-1 h-7 text-xs">
              <Plus className="h-3.5 w-3.5" /> Milestone
            </Button>
          </div>

          {roadmap.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-10 text-center">
              <Compass className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Nenhum milestone definido.</p>
              <p className="text-xs text-muted-foreground mt-1">Crie marcos na sua carreira para visualizar sua evolução.</p>
              <Button onClick={openAddMilestone} size="sm" variant="outline" className="mt-4 gap-1">
                <Plus className="h-3.5 w-3.5" /> Criar Primeiro Milestone
              </Button>
            </div>
          ) : (
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-[18px] top-2 bottom-2 w-0.5 bg-gradient-to-b from-primary/60 via-purple-500/40 to-muted-foreground/20 rounded-full" />

              <div className="space-y-1">
                {roadmap.map((milestone, i) => {
                  const isCompleted = milestone.status === "concluido";
                  const isCurrent = milestone.status === "atual";

                  return (
                    <motion.div
                      key={milestone.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.08 }}
                      className="relative pl-10 py-3 group"
                    >
                      {/* Timeline dot */}
                      <div className={`absolute left-2.5 top-4 h-4 w-4 rounded-full border-2 flex items-center justify-center z-10
                        ${isCompleted ? "bg-health border-health shadow-[0_0_8px_hsl(160_60%_40%/0.5)]" :
                          isCurrent ? "bg-primary border-primary shadow-[0_0_8px_hsl(40_85%_55%/0.5)] animate-pulse-glow" :
                          "bg-secondary border-muted-foreground/30"}`}
                      >
                        {isCompleted && <CheckCircle2 className="h-2.5 w-2.5 text-white" />}
                        {isCurrent && <div className="h-1.5 w-1.5 rounded-full bg-primary-foreground" />}
                      </div>

                      <div className={`rounded-xl border bg-card p-4 transition-colors ${isCurrent ? "border-primary/40 shadow-[0_0_15px_hsl(40_85%_55%/0.08)]" : isCompleted ? "border-health/30" : "border-border"}`}>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className={`text-sm font-semibold ${isCompleted ? "line-through text-muted-foreground" : "text-foreground"}`}>
                                {milestone.title}
                              </span>
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full
                                ${isCompleted ? "bg-health/15 text-health" : isCurrent ? "bg-primary/15 text-primary" : "bg-secondary text-muted-foreground"}`}>
                                {isCompleted ? "✓ Concluído" : isCurrent ? "● Atual" : "○ Futuro"}
                              </span>
                            </div>
                            {milestone.description && (
                              <p className="text-[11px] text-muted-foreground mt-1">{milestone.description}</p>
                            )}
                            {milestone.date && (
                              <span className="text-[10px] text-muted-foreground flex items-center gap-1 mt-1.5">
                                <Calendar className="h-2.5 w-2.5" /> {milestone.date}
                              </span>
                            )}
                          </div>
                          <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                            <button onClick={() => openEditMilestone(milestone)} className="p-1 rounded hover:bg-secondary">
                              <Edit3 className="h-3 w-3 text-muted-foreground" />
                            </button>
                            <button onClick={() => removeMilestone(milestone.id)} className="p-1 rounded hover:bg-destructive/20">
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}
        </TabsContent>

        {/* ═══════════════ TAB: SWOT ═══════════════ */}
        <TabsContent value="swot" className="space-y-5 mt-5">
          <div>
            <h3 className="font-display text-base font-semibold text-foreground">Análise SWOT Pessoal</h3>
            <p className="text-[11px] text-muted-foreground">Autoconhecimento estratégico: identifique forças, fraquezas, oportunidades e ameaças.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {(Object.keys(SWOT_CONFIG) as (keyof SwotData)[]).map((quadrant, qi) => {
              const config = SWOT_CONFIG[quadrant];
              const items = swot[quadrant];
              const isPositive = quadrant === "strengths" || quadrant === "opportunities";

              return (
                <motion.div
                  key={quadrant}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: qi * 0.1 }}
                  className={`rounded-xl border ${config.border} bg-gradient-to-br ${config.gradient} p-4`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className={`h-7 w-7 rounded-lg ${config.bg} flex items-center justify-center`}>
                        <config.icon className={`h-3.5 w-3.5 ${config.color}`} />
                      </div>
                      <div>
                        <h4 className={`text-sm font-semibold ${config.color}`}>{config.label}</h4>
                        <p className="text-[9px] text-muted-foreground">
                          {quadrant === "strengths" && "O que você faz de melhor?"}
                          {quadrant === "weaknesses" && "O que precisa melhorar?"}
                          {quadrant === "opportunities" && "Que chances podem surgir?"}
                          {quadrant === "threats" && "Que riscos você enfrenta?"}
                        </p>
                      </div>
                    </div>
                    <Button onClick={() => openSwotDialog(quadrant)} size="sm" variant="ghost" className="h-6 w-6 p-0">
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  {items.length === 0 ? (
                    <p className="text-[11px] text-muted-foreground text-center py-4">Nenhum item adicionado.</p>
                  ) : (
                    <div className="space-y-1.5">
                      <AnimatePresence>
                        {items.map((item) => (
                          <motion.div
                            key={item.id}
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="flex items-center gap-2 text-xs group"
                          >
                            <span className={`shrink-0 ${isPositive ? "text-emerald-500" : "text-red-400"}`}>
                              {isPositive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                            </span>
                            <span className="text-foreground flex-1">{item.text}</span>
                            <button
                              onClick={() => removeSwotItem(quadrant, item.id)}
                              className="p-0.5 rounded hover:bg-destructive/20 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Trash2 className="h-2.5 w-2.5 text-destructive" />
                            </button>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                  )}

                  <div className="mt-2 pt-2 border-t border-white/5">
                    <span className="text-[9px] text-muted-foreground">{items.length} {items.length === 1 ? "item" : "itens"}</span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      {/* ═══════════════ DIALOGS ═══════════════ */}

      {/* Skill Dialog */}
      <Dialog open={skillDialog} onOpenChange={setSkillDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display">{editingSkill ? "Editar Habilidade" : "Nova Habilidade"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Nome</label>
              <Input value={skillForm.name} onChange={(e) => setSkillForm({ ...skillForm, name: e.target.value })} placeholder="Ex: Python, Comunicação, Gestão de Equipe" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Categoria</label>
              <select
                value={skillForm.category}
                onChange={(e) => setSkillForm({ ...skillForm, category: e.target.value as SkillCategory })}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="tecnica">🔧 Técnica</option>
                <option value="comportamental">🧠 Comportamental</option>
                <option value="lideranca">👥 Liderança</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Nível (0-100)</label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={skillForm.level}
                  onChange={(e) => setSkillForm({ ...skillForm, level: e.target.value })}
                  className="flex-1 h-2 appearance-none bg-secondary rounded-full cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:cursor-pointer"
                />
                <span className={`text-sm font-bold tabular-nums min-w-[36px] text-right ${getSkillLevel(Number(skillForm.level)).color}`}>
                  {skillForm.level}
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">
                Nível: <span className={getSkillLevel(Number(skillForm.level)).color}>{getSkillLevel(Number(skillForm.level)).label}</span>
              </p>
            </div>
            <Button onClick={saveSkill} className="w-full">{editingSkill ? "Salvar" : "Adicionar"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Goal Dialog */}
      <Dialog open={goalDialog} onOpenChange={setGoalDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">{editingGoal ? "Editar Meta" : "Nova Meta SMART"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2 max-h-[65vh] overflow-y-auto pr-1">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Título da Meta</label>
              <Input value={goalForm.title} onChange={(e) => setGoalForm({ ...goalForm, title: e.target.value })} placeholder="Ex: Promoção para Sênior" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Descrição (opcional)</label>
              <Textarea
                value={goalForm.description}
                onChange={(e) => setGoalForm({ ...goalForm, description: e.target.value })}
                placeholder="Descreva os critérios SMART desta meta..."
                className="min-h-[60px] text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Prioridade</label>
                <select
                  value={goalForm.priority}
                  onChange={(e) => setGoalForm({ ...goalForm, priority: e.target.value as GoalPriority })}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="alta">🔴 Alta</option>
                  <option value="media">🟡 Média</option>
                  <option value="baixa">🔵 Baixa</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Modelo 70-20-10</label>
                <select
                  value={goalForm.learningModel}
                  onChange={(e) => setGoalForm({ ...goalForm, learningModel: e.target.value as LearningModel })}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="experiencia">💼 Experiência (70%)</option>
                  <option value="mentoria">🤝 Mentoria (20%)</option>
                  <option value="educacao">🎓 Educação (10%)</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Status</label>
                <select
                  value={goalForm.status}
                  onChange={(e) => setGoalForm({ ...goalForm, status: e.target.value })}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="em_progresso">Em Progresso</option>
                  <option value="concluida">Concluída</option>
                  <option value="pausada">Pausada</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Data Alvo</label>
                <Input type="date" value={goalForm.target_date} onChange={(e) => setGoalForm({ ...goalForm, target_date: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Progresso ({goalForm.progress}%)</label>
              <input
                type="range"
                min="0"
                max="100"
                value={goalForm.progress}
                onChange={(e) => setGoalForm({ ...goalForm, progress: e.target.value })}
                className="w-full h-2 appearance-none bg-secondary rounded-full cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-health [&::-webkit-slider-thumb]:cursor-pointer"
              />
            </div>
            <Button onClick={saveGoal} className="w-full">{editingGoal ? "Salvar" : "Criar Meta"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Milestone Dialog */}
      <Dialog open={milestoneDialog} onOpenChange={setMilestoneDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display">{editingMilestone ? "Editar Milestone" : "Novo Milestone"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Título</label>
              <Input value={milestoneForm.title} onChange={(e) => setMilestoneForm({ ...milestoneForm, title: e.target.value })} placeholder="Ex: Primeira promoção" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Descrição</label>
              <Textarea
                value={milestoneForm.description}
                onChange={(e) => setMilestoneForm({ ...milestoneForm, description: e.target.value })}
                placeholder="Descreva este marco..."
                className="min-h-[60px] text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Data</label>
                <Input type="date" value={milestoneForm.date} onChange={(e) => setMilestoneForm({ ...milestoneForm, date: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Status</label>
                <select
                  value={milestoneForm.status}
                  onChange={(e) => setMilestoneForm({ ...milestoneForm, status: e.target.value as RoadmapMilestone["status"] })}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="futuro">○ Futuro</option>
                  <option value="atual">● Atual</option>
                  <option value="concluido">✓ Concluído</option>
                </select>
              </div>
            </div>
            <Button onClick={saveMilestone} className="w-full">{editingMilestone ? "Salvar" : "Criar Milestone"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* SWOT Item Dialog */}
      <Dialog open={swotDialog.open} onOpenChange={(open) => setSwotDialog({ ...swotDialog, open })}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display">
              {swotDialog.quadrant ? `Adicionar ${SWOT_CONFIG[swotDialog.quadrant].label}` : "SWOT"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Item</label>
              <Input
                value={swotInput}
                onChange={(e) => setSwotInput(e.target.value)}
                placeholder={swotDialog.quadrant === "strengths" ? "Ex: Forte em resolução de problemas" :
                  swotDialog.quadrant === "weaknesses" ? "Ex: Preciso melhorar inglês" :
                  swotDialog.quadrant === "opportunities" ? "Ex: Vaga aberta no time de dados" :
                  "Ex: Mercado em recessão na área"}
                onKeyDown={(e) => e.key === "Enter" && addSwotItem()}
              />
            </div>
            <Button onClick={addSwotItem} className="w-full">Adicionar</Button>

            {/* Show existing items */}
            {swotDialog.quadrant && swot[swotDialog.quadrant].length > 0 && (
              <div className="pt-2 border-t border-border">
                <p className="text-xs text-muted-foreground mb-2">Itens existentes:</p>
                <div className="space-y-1">
                  {swot[swotDialog.quadrant!].map(item => (
                    <div key={item.id} className="flex items-center gap-2 text-xs group">
                      <span className="text-foreground flex-1">{item.text}</span>
                      <button
                        onClick={() => removeSwotItem(swotDialog.quadrant!, item.id)}
                        className="p-0.5 rounded hover:bg-destructive/20"
                      >
                        <Trash2 className="h-2.5 w-2.5 text-destructive" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
