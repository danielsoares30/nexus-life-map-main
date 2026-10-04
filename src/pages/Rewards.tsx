import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Gift, Plus, Trash2, Edit3, CheckCircle2, Sparkles, Star, Zap, Clock,
  Trophy, TrendingUp, Target, Flame, BarChart2, Crown,
  Heart, Coffee, ShoppingBag, Gamepad2, Users, Award,
  Timer, Repeat, Lock, Unlock, ChevronDown, ChevronUp, Layers,
  ArrowUpRight, Percent
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useRewards, useProfile, useTasks } from "@/hooks/useGameData";
import { toast } from "@/hooks/use-toast";
import ConfirmDialog from "@/components/ConfirmDialog";
import { REWARDS_CATALOG, REWARD_CATEGORIES } from "@/lib/rewardsCatalog";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie
} from "recharts";

// ─── Types ─────────────────────────────────────────────────────────────────────
type RewardTier = "bronze" | "prata" | "ouro" | "diamante";
type RewardCategory = "entretenimento" | "comida" | "compras" | "autocuidado" | "experiencias" | "social" | "premium" | "custom";

type Wishlist = {
  id: string;
  title: string;
  description: string;
  xpCost: number;
  category: RewardCategory;
  addedAt: string;
};

type RewardStreak = {
  dates: string[]; // dates of redemptions
};

type RewardPreferences = {
  favoriteCategories: RewardCategory[];
  weeklyBudget: number; // XP weekly budget target
  savingGoal: { title: string; xpTarget: number; saved: number } | null;
};

// ─── Constants ─────────────────────────────────────────────────────────────────
const TIER_CONFIG: Record<RewardTier, { label: string; icon: string; color: string; bg: string; border: string; minRedeems: number }> = {
  bronze: { label: "Bronze", icon: "🥉", color: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/30", minRedeems: 0 },
  prata: { label: "Prata", icon: "🥈", color: "text-slate-300", bg: "bg-slate-400/10", border: "border-slate-400/30", minRedeems: 10 },
  ouro: { label: "Ouro", icon: "🏅", color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/30", minRedeems: 30 },
  diamante: { label: "Diamante", icon: "💎", color: "text-cyan-400", bg: "bg-cyan-500/10", border: "border-cyan-500/30", minRedeems: 75 },
};

const CATEGORY_ICONS: Record<string, { icon: typeof Gift; color: string; bg: string; emoji: string }> = {
  entretenimento: { icon: Gamepad2, color: "text-purple-400", bg: "bg-purple-500/10", emoji: "🎬" },
  comida: { icon: Coffee, color: "text-orange-400", bg: "bg-orange-500/10", emoji: "🍔" },
  compras: { icon: ShoppingBag, color: "text-pink-400", bg: "bg-pink-500/10", emoji: "🛍️" },
  autocuidado: { icon: Heart, color: "text-red-400", bg: "bg-red-500/10", emoji: "🧘" },
  experiencias: { icon: Star, color: "text-emerald-400", bg: "bg-emerald-500/10", emoji: "🌍" },
  social: { icon: Users, color: "text-blue-400", bg: "bg-blue-500/10", emoji: "🎯" },
  premium: { icon: Crown, color: "text-amber-400", bg: "bg-amber-500/10", emoji: "🏆" },
  custom: { icon: Gift, color: "text-primary", bg: "bg-primary/10", emoji: "✨" },
};

// Dopamine science tips — based on Huberman Lab, Daniel Pink, Nir Eyal research
const SCIENCE_TIPS = [
  { title: "Recompensa Variável", desc: "Recompensas imprevisíveis aumentam a dopamina 3x mais que as previsíveis (Schultz, 1997). Varie seus prêmios!", icon: "🎰" },
  { title: "Celebração Imediata", desc: "Celebrar no momento da conquista gera mais motivação que recompensas atrasadas (BJ Fogg, Tiny Habits).", icon: "🎉" },
  { title: "Antecipação > Prazer", desc: "A antecipação de uma recompensa gera mais dopamina que a recompensa em si (Sapolsky). Planeje com antecedência!", icon: "✨" },
  { title: "Recompensa Intrínseca", desc: "Recompensas de autocuidado e experiências trazem felicidade mais duradoura que compras materiais (Gilovich, 2015).", icon: "💎" },
  { title: "Regra do Progresso", desc: "O princípio do progresso (Amabile): a sensação de avanço é o maior motivador no trabalho.", icon: "📈" },
  { title: "Equilíbrio Esforço-Recompensa", desc: "Recompensas devem ser proporcionais ao esforço. Excesso de facilidade diminui a motivação (Overjustification Effect).", icon: "⚖️" },
  { title: "Recompensas Sociais", desc: "Compartilhar conquistas com outros amplia o prazer (Lieberman, Social Brain). Celebre com amigos!", icon: "👥" },
  { title: "Poupança de Recompensa", desc: "Poupar XP para recompensas maiores treina o cortex pré-frontal e melhora o autocontrole (Walter Mischel, Marshmallow Test).", icon: "🏦" },
];

// ─── Helpers ───────────────────────────────────────────────────────────────────
function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function getTier(totalRedeems: number): RewardTier {
  if (totalRedeems >= 75) return "diamante";
  if (totalRedeems >= 30) return "ouro";
  if (totalRedeems >= 10) return "prata";
  return "bronze";
}

function getNextTier(currentTier: RewardTier): RewardTier | null {
  const order: RewardTier[] = ["bronze", "prata", "ouro", "diamante"];
  const idx = order.indexOf(currentTier);
  return idx < order.length - 1 ? order[idx + 1] : null;
}

function getDayStr(d?: Date): string {
  return (d || new Date()).toISOString().split("T")[0];
}

function getWeekDates(): string[] {
  const dates: string[] = [];
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    dates.push(getDayStr(d));
  }
  return dates;
}

function playRewardChime(type: "redeem" | "add" | "tier_up" | "save") {
  try {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return;
    const seqs: Record<string, { f: number; d: number }[]> = {
      redeem: [{ f: 523, d: 0.08 }, { f: 659, d: 0.08 }, { f: 784, d: 0.08 }, { f: 1047, d: 0.3 }],
      add: [{ f: 659, d: 0.08 }, { f: 880, d: 0.15 }],
      tier_up: [{ f: 392, d: 0.1 }, { f: 523, d: 0.1 }, { f: 659, d: 0.1 }, { f: 784, d: 0.1 }, { f: 1047, d: 0.5 }],
      save: [{ f: 440, d: 0.06 }, { f: 554, d: 0.1 }],
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
  wishlist: "nexus_rewards_wishlist",
  streak: "nexus_rewards_streak",
  prefs: "nexus_rewards_prefs",
  rewardMeta: "nexus_rewards_meta", // category per reward
  scienceTipIdx: "nexus_rewards_tip_idx",
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
export default function Rewards() {
  const { rewards, loading, create, update, remove, redeem } = useRewards();
  const { profile } = useProfile();
  const { tasks } = useTasks();

  // localStorage state
  const [wishlist, setWishlist] = useState<Wishlist[]>(() => loadLS(LS_KEYS.wishlist, []));
  const [streak, setStreak] = useState<RewardStreak>(() => loadLS(LS_KEYS.streak, { dates: [] }));
  const [prefs, setPrefs] = useState<RewardPreferences>(() => loadLS(LS_KEYS.prefs, { favoriteCategories: [], weeklyBudget: 500, savingGoal: null }));
  const [rewardMeta, setRewardMeta] = useState<Record<string, { category: RewardCategory }>>(() => loadLS(LS_KEYS.rewardMeta, {}));
  const [scienceTipIdx, setScienceTipIdx] = useState<number>(() => loadLS(LS_KEYS.scienceTipIdx, 0));

  // Persist
  useEffect(() => { saveLS(LS_KEYS.wishlist, wishlist); }, [wishlist]);
  useEffect(() => { saveLS(LS_KEYS.streak, streak); }, [streak]);
  useEffect(() => { saveLS(LS_KEYS.prefs, prefs); }, [prefs]);
  useEffect(() => { saveLS(LS_KEYS.rewardMeta, rewardMeta); }, [rewardMeta]);
  useEffect(() => { saveLS(LS_KEYS.scienceTipIdx, scienceTipIdx); }, [scienceTipIdx]);

  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [wishlistDialog, setWishlistDialog] = useState(false);
  const [savingDialog, setSavingDialog] = useState(false);
  const [scienceOpen, setScienceOpen] = useState(false);
  const [catalogFilter, setCatalogFilter] = useState("all");
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ title: "", description: "", xp_cost: "100", category: "custom" as RewardCategory });
  const [wishlistForm, setWishlistForm] = useState({ title: "", description: "", xpCost: "200", category: "custom" as RewardCategory });
  const [savingForm, setSavingForm] = useState({ title: "", xpTarget: "500" });
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [redeemTarget, setRedeemTarget] = useState<any>(null);
  const [historyExpanded, setHistoryExpanded] = useState(false);

  // ─── Calculations ──────────────────────────────────────────────────────────
  const today = getDayStr();
  const xpEarnedToday = tasks.filter(t => t.completed && t.completed_at?.startsWith(today)).reduce((sum: number, t: any) => sum + (t.xp_reward || 0), 0);
  const xpSpentToday = rewards.filter(r => r.redeemed && r.redeemed_at?.startsWith(today)).reduce((sum: number, r: any) => sum + (r.xp_cost || 0), 0);
  const dailyXpBalance = xpEarnedToday - xpSpentToday;

  const available = rewards.filter((r: any) => !r.redeemed);
  const redeemedRewards = rewards.filter((r: any) => r.redeemed);
  const totalRedeems = redeemedRewards.length;

  const currentTier = useMemo(() => getTier(totalRedeems), [totalRedeems]);
  const nextTier = useMemo(() => getNextTier(currentTier), [currentTier]);
  const tierProgress = useMemo(() => {
    const config = TIER_CONFIG[currentTier];
    const nextConfig = nextTier ? TIER_CONFIG[nextTier] : null;
    if (!nextConfig) return { current: totalRedeems, needed: totalRedeems, pct: 100 };
    const progress = totalRedeems - config.minRedeems;
    const needed = nextConfig.minRedeems - config.minRedeems;
    return { current: progress, needed, pct: Math.min(100, Math.round((progress / needed) * 100)) };
  }, [totalRedeems, currentTier, nextTier]);

  // Weekly XP spending chart data
  const weeklyChartData = useMemo(() => {
    const weekDates = getWeekDates();
    const dayNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
    return weekDates.map(date => {
      const d = new Date(date + "T12:00:00");
      const earned = tasks.filter((t: any) => t.completed && t.completed_at?.startsWith(date)).reduce((s: number, t: any) => s + (t.xp_reward || 0), 0);
      const spent = rewards.filter((r: any) => r.redeemed && r.redeemed_at?.startsWith(date)).reduce((s: number, r: any) => s + (r.xp_cost || 0), 0);
      return { day: dayNames[d.getDay()], earned, spent, date };
    });
  }, [tasks, rewards]);

  // Category breakdown
  const categoryBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    redeemedRewards.forEach((r: any) => {
      const cat = rewardMeta[r.id]?.category || "custom";
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return Object.entries(counts).map(([cat, count]) => ({
      name: CATEGORY_ICONS[cat]?.emoji + " " + (cat.charAt(0).toUpperCase() + cat.slice(1)),
      value: count,
      category: cat,
    })).sort((a, b) => b.value - a.value);
  }, [redeemedRewards, rewardMeta]);

  // Redemption streak (consecutive days with at least 1 task completed AND reward redeemed)
  const currentStreak = useMemo(() => {
    let s = 0;
    const now = new Date();
    for (let i = 0; i < 365; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = getDayStr(d);
      const hadTask = tasks.some((t: any) => t.completed && t.completed_at?.startsWith(dateStr));
      const hadReward = rewards.some((r: any) => r.redeemed && r.redeemed_at?.startsWith(dateStr));
      if (hadTask && hadReward) s++;
      else if (i > 0) break;
    }
    return s;
  }, [tasks, rewards]);

  const totalXpSpent = useMemo(() => redeemedRewards.reduce((s: number, r: any) => s + (r.xp_cost || 0), 0), [redeemedRewards]);
  const avgRewardCost = useMemo(() => totalRedeems > 0 ? Math.round(totalXpSpent / totalRedeems) : 0, [totalXpSpent, totalRedeems]);

  // Filtered catalog
  const filteredCatalog = catalogFilter === "all" ? REWARDS_CATALOG : REWARDS_CATALOG.filter(r => r.category === catalogFilter);

  // Saving goal progress
  const savingProgress = useMemo(() => {
    if (!prefs.savingGoal) return null;
    const pct = Math.min(100, Math.round((prefs.savingGoal.saved / prefs.savingGoal.xpTarget) * 100));
    return { ...prefs.savingGoal, pct };
  }, [prefs.savingGoal]);

  // Science tip rotation
  const currentTip = SCIENCE_TIPS[scienceTipIdx % SCIENCE_TIPS.length];

  // ─── CRUD ──────────────────────────────────────────────────────────────────
  const openCreate = () => {
    setEditing(null);
    setForm({ title: "", description: "", xp_cost: "100", category: "custom" });
    setDialogOpen(true);
  };

  const openEdit = (r: any) => {
    setEditing(r);
    setForm({ title: r.title, description: r.description || "", xp_cost: r.xp_cost.toString(), category: rewardMeta[r.id]?.category || "custom" });
    setDialogOpen(true);
  };

  const addFromCatalog = async (template: typeof REWARDS_CATALOG[0]) => {
    const created = await create({ title: template.title, description: template.description, xp_cost: template.xp_cost });
    if (created) {
      setRewardMeta(prev => ({ ...prev, [created.id]: { category: template.category as RewardCategory } }));
      playRewardChime("add");
      toast({ title: "Recompensa adicionada!", description: `"${template.title}" foi adicionada.` });
    }
  };

  const save = async () => {
    if (!form.title.trim()) {
      toast({ title: "Título obrigatório", description: "Insira um nome para a recompensa.", variant: "destructive" });
      return;
    }
    if (Number(form.xp_cost) <= 0) {
      toast({ title: "Custo inválido", description: "O custo em XP deve ser maior que zero.", variant: "destructive" });
      return;
    }
    const data = { title: form.title.trim(), description: form.description.trim() || null, xp_cost: Number(form.xp_cost) };
    if (editing) {
      await update(editing.id, data);
      setRewardMeta(prev => ({ ...prev, [editing.id]: { category: form.category } }));
      toast({ title: "Recompensa atualizada!" });
    } else {
      const created = await create(data);
      if (created) {
        setRewardMeta(prev => ({ ...prev, [created.id]: { category: form.category } }));
      }
      playRewardChime("add");
      toast({ title: "Recompensa criada!", description: `"${data.title}" foi adicionada.` });
    }
    setDialogOpen(false);
  };

  const handleRedeem = async () => {
    if (!profile || !redeemTarget) return;
    if (dailyXpBalance < redeemTarget.xp_cost) {
      toast({ title: "XP diário insuficiente", description: `Você precisa de ${redeemTarget.xp_cost} XP diário. Saldo atual: ${dailyXpBalance} XP.`, variant: "destructive" });
      setRedeemTarget(null);
      return;
    }
    await redeem(redeemTarget.id);
    playRewardChime("redeem");

    // Track streak
    setStreak(prev => {
      const dates = [...prev.dates];
      if (!dates.includes(today)) dates.push(today);
      return { dates };
    });

    // Contribute to saving goal
    if (prefs.savingGoal) {
      const contribution = Math.round(redeemTarget.xp_cost * 0.1); // 10% bonus goes to savings
      setPrefs(prev => ({
        ...prev,
        savingGoal: prev.savingGoal ? { ...prev.savingGoal, saved: prev.savingGoal.saved + contribution } : null,
      }));
    }

    // Rotate science tip
    setScienceTipIdx(prev => prev + 1);

    toast({ title: "🎉 Recompensa resgatada!", description: `Você ganhou: ${redeemTarget.title}` });
    setRedeemTarget(null);
  };

  const handleDelete = async () => {
    if (deleteTarget) {
      await remove(deleteTarget);
      setRewardMeta(prev => { const n = { ...prev }; delete n[deleteTarget]; return n; });
      setDeleteTarget(null);
      toast({ title: "Recompensa removida." });
    }
  };

  // Wishlist CRUD
  const addToWishlist = () => {
    if (!wishlistForm.title.trim()) return;
    setWishlist(prev => [...prev, {
      id: generateId(),
      title: wishlistForm.title.trim(),
      description: wishlistForm.description.trim(),
      xpCost: Number(wishlistForm.xpCost),
      category: wishlistForm.category,
      addedAt: new Date().toISOString(),
    }]);
    playRewardChime("add");
    setWishlistForm({ title: "", description: "", xpCost: "200", category: "custom" });
    setWishlistDialog(false);
  };

  const promoteWishlist = async (item: Wishlist) => {
    const created = await create({ title: item.title, description: item.description || null, xp_cost: item.xpCost });
    if (created) {
      setRewardMeta(prev => ({ ...prev, [created.id]: { category: item.category } }));
      setWishlist(prev => prev.filter(w => w.id !== item.id));
      playRewardChime("add");
      toast({ title: "Promovida!", description: `"${item.title}" agora é uma recompensa ativa.` });
    }
  };

  const removeWishlistItem = (id: string) => {
    setWishlist(prev => prev.filter(w => w.id !== id));
  };

  // Saving goal
  const createSavingGoal = () => {
    if (!savingForm.title.trim() || Number(savingForm.xpTarget) <= 0) return;
    setPrefs(prev => ({
      ...prev,
      savingGoal: { title: savingForm.title.trim(), xpTarget: Number(savingForm.xpTarget), saved: 0 },
    }));
    playRewardChime("save");
    setSavingDialog(false);
    toast({ title: "Meta de poupança criada!", description: `Economize XP para: "${savingForm.title.trim()}"` });
  };

  const claimSavingGoal = () => {
    if (!prefs.savingGoal) return;
    playRewardChime("tier_up");
    toast({ title: "🎉 Meta alcançada!", description: `Você economizou XP suficiente para: "${prefs.savingGoal.title}"!` });
    setPrefs(prev => ({ ...prev, savingGoal: null }));
  };

  // ─── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
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
            <Gift className="h-7 w-7 text-primary" />
            Recompensas
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Gaste seu XP diário em prêmios que você merece.</p>
        </div>
        {/* Tier Badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className={`flex items-center gap-3 rounded-xl border ${TIER_CONFIG[currentTier].border} ${TIER_CONFIG[currentTier].bg} px-4 py-2.5`}
        >
          <span className="text-2xl">{TIER_CONFIG[currentTier].icon}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className={`text-sm font-bold font-display ${TIER_CONFIG[currentTier].color}`}>{TIER_CONFIG[currentTier].label}</span>
              <span className="text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">{totalRedeems} resgates</span>
            </div>
            {nextTier && (
              <>
                <div className="stat-bar h-1.5 mt-1 w-28">
                  <motion.div className="stat-bar-fill xp-fill" initial={{ width: 0 }} animate={{ width: `${tierProgress.pct}%` }} transition={{ duration: 1.2 }} />
                </div>
                <p className="text-[9px] text-muted-foreground mt-0.5">{tierProgress.current}/{tierProgress.needed} para {TIER_CONFIG[nextTier].label}</p>
              </>
            )}
          </div>
        </motion.div>
      </motion.div>

      {/* Tabs */}
      <Tabs defaultValue="painel" className="w-full">
        <TabsList className="w-full grid grid-cols-4 bg-secondary/50 border border-border rounded-xl h-10">
          <TabsTrigger value="painel" className="text-xs data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-lg gap-1">
            <BarChart2 className="h-3.5 w-3.5 hidden sm:inline-block" /> Painel
          </TabsTrigger>
          <TabsTrigger value="recompensas" className="text-xs data-[state=active]:bg-emerald-500/10 data-[state=active]:text-emerald-400 rounded-lg gap-1">
            <Gift className="h-3.5 w-3.5 hidden sm:inline-block" /> Recompensas
          </TabsTrigger>
          <TabsTrigger value="wishlist" className="text-xs data-[state=active]:bg-purple-500/10 data-[state=active]:text-purple-400 rounded-lg gap-1">
            <Star className="h-3.5 w-3.5 hidden sm:inline-block" /> Wishlist
          </TabsTrigger>
          <TabsTrigger value="ciencia" className="text-xs data-[state=active]:bg-blue-500/10 data-[state=active]:text-blue-400 rounded-lg gap-1">
            <Trophy className="h-3.5 w-3.5 hidden sm:inline-block" /> Insights
          </TabsTrigger>
        </TabsList>

        {/* ═══════════════ TAB: PAINEL ═══════════════ */}
        <TabsContent value="painel" className="space-y-5 mt-5">
          {/* Daily XP Balance */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-primary/30 bg-gradient-to-br from-primary/5 to-primary/0 p-5">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="h-5 w-5 text-xp" />
              <h3 className="font-display text-sm font-semibold text-foreground">Saldo XP do Dia</h3>
              <span className="text-[9px] text-muted-foreground ml-auto flex items-center gap-1">
                <Clock className="h-3 w-3" /> Reseta à meia-noite
              </span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg bg-background/60 border border-border p-3 text-center">
                <p className="text-[10px] text-muted-foreground">Ganho Hoje</p>
                <p className="text-lg font-bold font-display text-health">+{xpEarnedToday}</p>
              </div>
              <div className="rounded-lg bg-background/60 border border-border p-3 text-center">
                <p className="text-[10px] text-muted-foreground">Gasto Hoje</p>
                <p className="text-lg font-bold font-display text-destructive">-{xpSpentToday}</p>
              </div>
              <div className="rounded-lg bg-background/60 border border-primary/20 p-3 text-center">
                <p className="text-[10px] text-muted-foreground">Saldo</p>
                <p className={`text-xl font-bold font-display ${dailyXpBalance >= 0 ? "text-primary" : "text-destructive"}`}>{dailyXpBalance} XP</p>
              </div>
            </div>
          </motion.div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: "Total Resgatadas", value: totalRedeems.toString(), icon: CheckCircle2, color: "text-health", bg: "bg-health/10" },
              { label: "XP Investido", value: totalXpSpent.toString(), icon: Sparkles, color: "text-primary", bg: "bg-primary/10" },
              { label: "Custo Médio", value: `${avgRewardCost} XP`, icon: TrendingUp, color: "text-mana", bg: "bg-mana/10" },
              { label: "Streak Ativo", value: `${currentStreak}d`, icon: Flame, color: "text-orange-400", bg: "bg-orange-500/10" },
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
            {/* Weekly Chart */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="rounded-xl border border-border bg-card p-5">
              <h3 className="font-display text-base font-semibold text-foreground mb-1">XP Semanal</h3>
              <p className="text-[11px] text-muted-foreground mb-3">Ganho vs. gasto nos últimos 7 dias</p>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weeklyChartData} barGap={2}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(230 12% 18%)" />
                    <XAxis dataKey="day" tick={{ fill: "hsl(220 10% 50%)", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "hsl(220 10% 50%)", fontSize: 10 }} axisLine={false} tickLine={false} width={35} />
                    <Tooltip
                      contentStyle={{ background: "hsl(230 15% 11%)", border: "1px solid hsl(230 12% 18%)", borderRadius: 8, fontSize: 12 }}
                      labelStyle={{ color: "hsl(45 20% 90%)", fontWeight: 600 }}
                    />
                    <Bar dataKey="earned" name="Ganho" fill="hsl(160 60% 40%)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="spent" name="Gasto" fill="hsl(0 70% 50%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </motion.div>

            {/* Saving Goal + Science Tip */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="space-y-4">
              {/* Saving Goal */}
              <div className="rounded-xl border border-border bg-card p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-display text-base font-semibold text-foreground flex items-center gap-2">
                    <Target className="h-4 w-4 text-purple-400" />
                    Meta de Poupança
                  </h3>
                  {!prefs.savingGoal && (
                    <Button onClick={() => { setSavingForm({ title: "", xpTarget: "500" }); setSavingDialog(true); }} size="sm" variant="ghost" className="h-7 text-xs gap-1">
                      <Plus className="h-3.5 w-3.5" /> Criar
                    </Button>
                  )}
                </div>
                {savingProgress ? (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-foreground">{savingProgress.title}</span>
                      <span className="text-[10px] text-muted-foreground tabular-nums">{savingProgress.saved}/{savingProgress.xpTarget} XP</span>
                    </div>
                    <div className="stat-bar h-3 rounded-full">
                      <motion.div className="stat-bar-fill rounded-full" style={{ background: "linear-gradient(90deg, hsl(270 50% 55%), hsl(320 55% 55%))", boxShadow: "0 0 8px hsl(270 50% 55% / 0.5)" }} initial={{ width: 0 }} animate={{ width: `${savingProgress.pct}%` }} transition={{ duration: 1 }} />
                    </div>
                    <div className="flex justify-between mt-2">
                      <span className="text-[10px] text-muted-foreground">{savingProgress.pct}% concluído</span>
                      {savingProgress.pct >= 100 ? (
                        <Button onClick={claimSavingGoal} size="sm" className="h-6 text-[10px] gap-1">
                          <Trophy className="h-3 w-3" /> Resgatar!
                        </Button>
                      ) : (
                        <span className="text-[10px] text-purple-400">+10% de cada resgate contribui</span>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground text-center py-3">Poupe XP para uma recompensa especial!</p>
                )}
              </div>

              {/* Science Tip */}
              <div className="rounded-xl border border-blue-500/20 bg-gradient-to-br from-blue-500/5 to-blue-500/0 p-5">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">{currentTip.icon}</span>
                  <h4 className="text-sm font-semibold text-blue-400">{currentTip.title}</h4>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">{currentTip.desc}</p>
                <button
                  onClick={() => setScienceTipIdx(prev => prev + 1)}
                  className="text-[10px] text-blue-400/70 hover:text-blue-400 mt-2 flex items-center gap-1 transition-colors"
                >
                  <Repeat className="h-2.5 w-2.5" /> Próxima dica
                </button>
              </div>
            </motion.div>
          </div>

          {/* Redeemed Today */}
          {redeemedRewards.filter((r: any) => r.redeemed_at?.startsWith(today)).length > 0 && (
            <div>
              <h3 className="font-display text-base font-semibold text-foreground mb-3 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-health" /> Resgatadas Hoje
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {redeemedRewards.filter((r: any) => r.redeemed_at?.startsWith(today)).map((reward: any) => (
                  <motion.div key={reward.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-xl border border-health/20 bg-health/5 p-4">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-health shrink-0" />
                      <h4 className="text-sm font-display font-semibold text-foreground">{reward.title}</h4>
                      <span className="text-[10px] text-xp font-medium ml-auto">-{reward.xp_cost} XP</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        {/* ═══════════════ TAB: RECOMPENSAS ═══════════════ */}
        <TabsContent value="recompensas" className="space-y-5 mt-5">
          {/* Action Bar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-foreground">{available.length} disponíve{available.length === 1 ? "l" : "is"}</span>
              <span className="text-xs text-muted-foreground">·</span>
              <span className={`text-xs font-bold tabular-nums ${dailyXpBalance >= 0 ? "text-primary" : "text-destructive"}`}>{dailyXpBalance} XP livre</span>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setCatalogOpen(true)} size="sm" variant="outline" className="gap-1.5 h-7 text-xs">
                <Layers className="h-3.5 w-3.5" /> Catálogo
              </Button>
              <Button onClick={openCreate} size="sm" className="gap-1.5 h-7 text-xs">
                <Plus className="h-3.5 w-3.5" /> Criar
              </Button>
            </div>
          </div>

          {/* Available Rewards */}
          {available.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-10 text-center">
              <Gift className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-50" />
              <p className="text-sm text-muted-foreground">Nenhuma recompensa criada ainda.</p>
              <p className="text-xs text-muted-foreground mt-1">Use o catálogo ou crie prêmios personalizados!</p>
              <div className="flex gap-2 justify-center mt-4">
                <Button onClick={() => setCatalogOpen(true)} size="sm" variant="outline" className="gap-1">
                  <Layers className="h-3.5 w-3.5" /> Catálogo
                </Button>
                <Button onClick={openCreate} size="sm" className="gap-1">
                  <Plus className="h-3.5 w-3.5" /> Criar Recompensa
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <AnimatePresence>
                {available.map((reward: any) => {
                  const canRedeem = dailyXpBalance >= reward.xp_cost;
                  const cat = rewardMeta[reward.id]?.category || "custom";
                  const catInfo = CATEGORY_ICONS[cat] || CATEGORY_ICONS.custom;

                  return (
                    <motion.div
                      key={reward.id}
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="rounded-xl border border-border bg-card p-4 group hover:border-primary/20 hover:card-glow transition-all"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-start gap-2.5 flex-1 min-w-0">
                          <div className={`h-8 w-8 rounded-lg ${catInfo.bg} flex items-center justify-center shrink-0 mt-0.5`}>
                            <catInfo.icon className={`h-4 w-4 ${catInfo.color}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-display font-semibold text-foreground">{reward.title}</h4>
                            {reward.description && <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{reward.description}</p>}
                          </div>
                        </div>
                        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2">
                          <button onClick={() => openEdit(reward)} className="p-1 rounded hover:bg-secondary"><Edit3 className="h-3 w-3 text-muted-foreground" /></button>
                          <button onClick={() => setDeleteTarget(reward.id)} className="p-1 rounded hover:bg-destructive/20"><Trash2 className="h-3 w-3 text-destructive" /></button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-3">
                        <span className="flex items-center gap-1 text-xs text-xp font-bold">
                          <Sparkles className="h-3.5 w-3.5" /> {reward.xp_cost} XP
                        </span>
                        <Button
                          size="sm"
                          variant={canRedeem ? "default" : "outline"}
                          className="h-7 text-xs gap-1"
                          onClick={() => setRedeemTarget(reward)}
                          disabled={!canRedeem}
                        >
                          {canRedeem ? <><Unlock className="h-3 w-3" /> Resgatar</> : <><Lock className="h-3 w-3" /> XP insuficiente</>}
                        </Button>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}

          {/* Historical */}
          {redeemedRewards.length > 0 && (
            <div>
              <button
                onClick={() => setHistoryExpanded(!historyExpanded)}
                className="flex items-center gap-2 text-base font-display font-semibold text-foreground mb-3 hover:text-primary transition-colors"
              >
                <Award className="h-4 w-4 text-muted-foreground" />
                Histórico ({redeemedRewards.length})
                {historyExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
              <AnimatePresence>
                {historyExpanded && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="grid grid-cols-1 md:grid-cols-2 gap-2 overflow-hidden">
                    {redeemedRewards.slice(0, 12).map((reward: any) => (
                      <div key={reward.id} className="rounded-xl border border-border bg-secondary/20 p-3 opacity-60">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-3.5 w-3.5 text-health shrink-0" />
                          <h4 className="text-xs font-medium text-foreground flex-1 truncate">{reward.title}</h4>
                          <span className="text-[10px] text-xp font-medium whitespace-nowrap">-{reward.xp_cost} XP</span>
                        </div>
                        {reward.redeemed_at && (
                          <p className="text-[9px] text-muted-foreground mt-1 ml-5">
                            {new Date(reward.redeemed_at).toLocaleDateString("pt-BR")}
                          </p>
                        )}
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </TabsContent>

        {/* ═══════════════ TAB: WISHLIST ═══════════════ */}
        <TabsContent value="wishlist" className="space-y-5 mt-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-display text-base font-semibold text-foreground">Lista de Desejos</h3>
              <p className="text-[11px] text-muted-foreground">Recompensas que você quer conquistar no futuro. Baseado no efeito de antecipação da dopamina.</p>
            </div>
            <Button onClick={() => { setWishlistForm({ title: "", description: "", xpCost: "200", category: "custom" }); setWishlistDialog(true); }} size="sm" variant="ghost" className="gap-1 h-7 text-xs">
              <Plus className="h-3.5 w-3.5" /> Adicionar
            </Button>
          </div>

          {wishlist.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-10 text-center">
              <Star className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Nenhuma recompensa na wishlist.</p>
              <p className="text-xs text-muted-foreground mt-1">A antecipação de uma recompensa gera mais dopamina que o resgate em si!</p>
              <Button onClick={() => { setWishlistForm({ title: "", description: "", xpCost: "200", category: "custom" }); setWishlistDialog(true); }} size="sm" variant="outline" className="mt-4 gap-1">
                <Plus className="h-3.5 w-3.5" /> Adicionar ao Wishlist
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {wishlist.map((item, i) => {
                const catInfo = CATEGORY_ICONS[item.category] || CATEGORY_ICONS.custom;
                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="rounded-xl border border-purple-500/20 bg-gradient-to-r from-purple-500/5 to-purple-500/0 p-4 group"
                  >
                    <div className="flex items-start gap-3">
                      <div className={`h-9 w-9 rounded-lg ${catInfo.bg} flex items-center justify-center shrink-0`}>
                        <catInfo.icon className={`h-4 w-4 ${catInfo.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-foreground">{item.title}</span>
                          <span className="text-[10px] text-xp font-bold flex items-center gap-0.5">
                            <Sparkles className="h-2.5 w-2.5" /> {item.xpCost} XP
                          </span>
                        </div>
                        {item.description && <p className="text-[11px] text-muted-foreground mt-0.5">{item.description}</p>}
                        <p className="text-[9px] text-muted-foreground mt-1">
                          Adicionado em {new Date(item.addedAt).toLocaleDateString("pt-BR")}
                        </p>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button onClick={() => promoteWishlist(item)} size="sm" variant="ghost" className="h-7 text-xs gap-1 text-primary">
                          <ArrowUpRight className="h-3 w-3" /> Ativar
                        </Button>
                        <button onClick={() => removeWishlistItem(item.id)} className="p-1 rounded hover:bg-destructive/20 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ═══════════════ TAB: INSIGHTS / CIÊNCIA ═══════════════ */}
        <TabsContent value="ciencia" className="space-y-5 mt-5">
          <div>
            <h3 className="font-display text-base font-semibold text-foreground">Insights de Produtividade</h3>
            <p className="text-[11px] text-muted-foreground">Ciência do comportamento aplicada ao seu sistema de recompensas.</p>
          </div>

          {/* Category Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-border bg-card p-5">
              <h4 className="font-display text-sm font-semibold text-foreground mb-3">Distribuição por Categoria</h4>
              {categoryBreakdown.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6">Resgate recompensas para ver a distribuição.</p>
              ) : (
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryBreakdown}
                        cx="50%"
                        cy="50%"
                        outerRadius={70}
                        innerRadius={35}
                        paddingAngle={3}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {categoryBreakdown.map((entry, idx) => {
                          const colors = ["hsl(160 60% 40%)", "hsl(40 85% 55%)", "hsl(220 70% 55%)", "hsl(270 50% 55%)", "hsl(0 65% 55%)", "hsl(320 55% 55%)", "hsl(200 80% 60%)"];
                          return <Cell key={idx} fill={colors[idx % colors.length]} />;
                        })}
                      </Pie>
                      <Tooltip
                        contentStyle={{ background: "hsl(230 15% 11%)", border: "1px solid hsl(230 12% 18%)", borderRadius: 8, fontSize: 12 }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </motion.div>

            {/* Reward Effectiveness Stats */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="rounded-xl border border-border bg-card p-5">
              <h4 className="font-display text-sm font-semibold text-foreground mb-3">Métricas de Eficácia</h4>
              <div className="space-y-3">
                <div className="flex items-center gap-3 rounded-lg bg-secondary/30 p-3">
                  <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                    <Percent className="h-4 w-4 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-xs text-foreground font-medium">Taxa de Resgate</p>
                    <p className="text-lg font-bold font-display text-emerald-400">
                      {rewards.length > 0 ? Math.round((totalRedeems / rewards.length) * 100) : 0}%
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-lg bg-secondary/30 p-3">
                  <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <Timer className="h-4 w-4 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-xs text-foreground font-medium">Disponíveis</p>
                    <p className="text-lg font-bold font-display text-blue-400">{available.length}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-lg bg-secondary/30 p-3">
                  <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                    <Flame className="h-4 w-4 text-amber-400" />
                  </div>
                  <div>
                    <p className="text-xs text-foreground font-medium">Streak de Recompensas</p>
                    <p className="text-lg font-bold font-display text-amber-400">{currentStreak} dias</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Science Tips Grid */}
          <div>
            <h4 className="font-display text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <Trophy className="h-4 w-4 text-blue-400" />
              Ciência das Recompensas
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {SCIENCE_TIPS.map((tip, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className="rounded-xl border border-blue-500/15 bg-gradient-to-br from-blue-500/5 to-transparent p-4"
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-lg">{tip.icon}</span>
                    <h5 className="text-xs font-semibold text-blue-400">{tip.title}</h5>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">{tip.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* ═══════════════ DIALOGS ═══════════════ */}

      {/* Catalog Dialog */}
      <Dialog open={catalogOpen} onOpenChange={setCatalogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <Gift className="h-5 w-5 text-xp" /> Catálogo de Recompensas ({REWARDS_CATALOG.length})
            </DialogTitle>
          </DialogHeader>
          <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-thin">
            <button
              onClick={() => setCatalogFilter("all")}
              className={`text-[10px] px-2 py-1 rounded-full whitespace-nowrap border transition-all ${catalogFilter === "all" ? "border-primary/30 bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}
            >
              Todas
            </button>
            {REWARD_CATEGORIES.map(cat => (
              <button
                key={cat.value}
                onClick={() => setCatalogFilter(cat.value)}
                className={`text-[10px] px-2 py-1 rounded-full whitespace-nowrap border transition-all ${catalogFilter === cat.value ? "border-primary/30 bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}
              >
                {cat.label}
              </button>
            ))}
          </div>
          <div className="space-y-2 mt-2">
            {filteredCatalog.map((template, i) => {
              const catInfo = CATEGORY_ICONS[template.category] || CATEGORY_ICONS.custom;
              return (
                <div key={i} className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5 hover:border-primary/20 transition-all">
                  <div className={`h-7 w-7 rounded-md ${catInfo.bg} flex items-center justify-center shrink-0`}>
                    <catInfo.icon className={`h-3.5 w-3.5 ${catInfo.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{template.title}</p>
                    <p className="text-[10px] text-muted-foreground">{template.description}</p>
                  </div>
                  <span className="text-[10px] text-xp font-bold whitespace-nowrap">{template.xp_cost} XP</span>
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => addFromCatalog(template)}>
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">{editing ? "Editar Recompensa" : "Nova Recompensa"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Título</label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ex: Assistir um filme" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Descrição (opcional)</label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Detalhes da recompensa..."
                className="min-h-[60px] text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Custo em XP</label>
                <Input type="number" value={form.xp_cost} onChange={(e) => setForm({ ...form, xp_cost: e.target.value })} min="1" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Categoria</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value as RewardCategory })}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="custom">✨ Personalizada</option>
                  <option value="entretenimento">🎬 Entretenimento</option>
                  <option value="comida">🍔 Comida</option>
                  <option value="compras">🛍️ Compras</option>
                  <option value="autocuidado">🧘 Autocuidado</option>
                  <option value="experiencias">🌍 Experiências</option>
                  <option value="social">🎯 Social</option>
                  <option value="premium">🏆 Premium</option>
                </select>
              </div>
            </div>
            <Button onClick={save} className="w-full">{editing ? "Salvar" : "Criar Recompensa"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Wishlist Dialog */}
      <Dialog open={wishlistDialog} onOpenChange={setWishlistDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <Star className="h-5 w-5 text-purple-400" /> Adicionar à Wishlist
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Título</label>
              <Input value={wishlistForm.title} onChange={(e) => setWishlistForm({ ...wishlistForm, title: e.target.value })} placeholder="Ex: Viagem de fim de semana" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Descrição (opcional)</label>
              <Textarea
                value={wishlistForm.description}
                onChange={(e) => setWishlistForm({ ...wishlistForm, description: e.target.value })}
                placeholder="Detalhes..."
                className="min-h-[50px] text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Custo XP estimado</label>
                <Input type="number" value={wishlistForm.xpCost} onChange={(e) => setWishlistForm({ ...wishlistForm, xpCost: e.target.value })} min="1" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Categoria</label>
                <select
                  value={wishlistForm.category}
                  onChange={(e) => setWishlistForm({ ...wishlistForm, category: e.target.value as RewardCategory })}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="custom">✨ Personalizada</option>
                  <option value="entretenimento">🎬 Entretenimento</option>
                  <option value="comida">🍔 Comida</option>
                  <option value="compras">🛍️ Compras</option>
                  <option value="autocuidado">🧘 Autocuidado</option>
                  <option value="experiencias">🌍 Experiências</option>
                  <option value="social">🎯 Social</option>
                  <option value="premium">🏆 Premium</option>
                </select>
              </div>
            </div>
            <Button onClick={addToWishlist} className="w-full">Adicionar ao Wishlist</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Saving Goal Dialog */}
      <Dialog open={savingDialog} onOpenChange={setSavingDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <Target className="h-5 w-5 text-purple-400" /> Meta de Poupança
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <p className="text-[11px] text-muted-foreground">Baseado no Marshmallow Test (Walter Mischel): adiar recompensas fortalece o autocontrole e leva a resultados superiores.</p>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Para qual recompensa você está poupando?</label>
              <Input value={savingForm.title} onChange={(e) => setSavingForm({ ...savingForm, title: e.target.value })} placeholder="Ex: PlayStation 5, Viagem..." />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Meta de XP</label>
              <Input type="number" value={savingForm.xpTarget} onChange={(e) => setSavingForm({ ...savingForm, xpTarget: e.target.value })} min="1" />
              <p className="text-[9px] text-muted-foreground mt-1">10% de cada resgate contribui automaticamente para a meta.</p>
            </div>
            <Button onClick={createSavingGoal} className="w-full">Criar Meta</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirm Dialogs */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        title="Excluir Recompensa"
        description="Tem certeza que deseja excluir esta recompensa?"
        onConfirm={handleDelete}
        confirmLabel="Excluir"
      />

      <ConfirmDialog
        open={!!redeemTarget}
        onOpenChange={(open) => { if (!open) setRedeemTarget(null); }}
        title="Resgatar Recompensa"
        description={redeemTarget ? `Deseja resgatar "${redeemTarget.title}" por ${redeemTarget.xp_cost} XP do seu saldo diário?` : ""}
        onConfirm={handleRedeem}
        confirmLabel="Resgatar 🎉"
        destructive={false}
      />
    </div>
  );
}
