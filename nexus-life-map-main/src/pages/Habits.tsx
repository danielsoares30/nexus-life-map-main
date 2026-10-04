import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Target, Plus, Flame, Trash2, Edit3, CheckCircle2, Circle, Trophy, Zap, TrendingUp, Volume2, VolumeX, Sparkles, Brain, Award, Info, ChevronDown, ChevronUp } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useHabits } from "@/hooks/useHabits";
import { useProfile } from "@/hooks/useGameData";
import { toast } from "@/hooks/use-toast";
import ConfirmDialog from "@/components/ConfirmDialog";

const HABIT_ICONS = ["✅", "💧", "🏃", "📚", "🧘", "💪", "🎯", "🌅", "💊", "🥗", "😴", "📝", "🎵", "🧠", "🙏", "🚿"];
const HABIT_CATEGORIES = [
  { value: "health", label: "Saúde", icon: "💚" },
  { value: "mind", label: "Mente", icon: "🧠" },
  { value: "productivity", label: "Produtividade", icon: "⚡" },
  { value: "personal", label: "Pessoal", icon: "🏠" },
  { value: "fitness", label: "Fitness", icon: "💪" },
  { value: "spiritual", label: "Espiritual", icon: "✨" },
];

export default function Habits() {
  const { habits, loading, create, update, remove, toggleToday, isCompletedToday, getCompletionRate, getWeekMap } = useHabits();
  const { addXp } = useProfile();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  
  // Neuroscience habits metadata storage
  const [habitsMeta, setHabitsMeta] = useState<Record<string, { cue: string; identity: string; twoMinute: string }>>(() => {
    try {
      const saved = localStorage.getItem("nexus_habits_neuro_meta");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [expandedHabitId, setExpandedHabitId] = useState<string | null>(null);
  const [dungeonMute, setDungeonMute] = useState(false);

  const [form, setForm] = useState({ 
    name: "", 
    icon: "✅", 
    category: "health", 
    xp_reward: "10",
    cue: "",
    identity: "",
    twoMinute: ""
  });

  useEffect(() => {
    localStorage.setItem("nexus_habits_neuro_meta", JSON.stringify(habitsMeta));
  }, [habitsMeta]);

  // Synthesize positive chime for immediate reward feedback
  const playHabitChime = () => {
    if (dungeonMute) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      
      // Dopamine hit arpeggio: C4 -> E4 -> G4 -> C5
      const notes = [261.63, 329.63, 392.00, 523.25];
      const durs = [0.08, 0.08, 0.08, 0.25];
      let offset = 0;

      notes.forEach((freq, idx) => {
        setTimeout(() => {
          try {
            const subCtx = new AudioCtx();
            const osc = subCtx.createOscillator();
            const gain = subCtx.createGain();
            osc.connect(gain);
            gain.connect(subCtx.destination);
            osc.type = "sine";
            osc.frequency.setValueAtTime(freq, subCtx.currentTime);
            gain.gain.setValueAtTime(0.06, subCtx.currentTime);
            osc.start();
            gain.gain.exponentialRampToValueAtTime(0.001, subCtx.currentTime + durs[idx]);
            osc.stop(subCtx.currentTime + durs[idx]);
          } catch {}
        }, offset);
        offset += durs[idx] * 1000;
      });
    } catch (e) {
      console.warn("Audio Context blocked", e);
    }
  };

  const today = new Date().toISOString().split("T")[0];
  const completedToday = habits.filter((h) => isCompletedToday(h.id)).length;
  const totalHabits = habits.length;
  const completionPercent = totalHabits > 0 ? (completedToday / totalHabits) * 100 : 0;
  const totalStreaks = habits.reduce((s, h) => s + (h.current_streak || 0), 0);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: "", icon: "✅", category: "health", xp_reward: "10", cue: "", identity: "", twoMinute: "" });
    setDialogOpen(true);
  };

  const openEdit = (h: any) => {
    setEditing(h);
    const meta = habitsMeta[h.id] || { cue: "", identity: "", twoMinute: "" };
    setForm({ 
      name: h.name, 
      icon: h.icon, 
      category: h.category, 
      xp_reward: h.xp_reward.toString(),
      cue: meta.cue,
      identity: meta.identity,
      twoMinute: meta.twoMinute
    });
    setDialogOpen(true);
  };

  const save = async () => {
    if (!form.name.trim()) {
      toast({ title: "Nome obrigatório", variant: "destructive" });
      return;
    }
    const data = { name: form.name.trim(), icon: form.icon, category: form.category, xp_reward: Number(form.xp_reward) || 10 };
    if (editing) {
      const updated = await update(editing.id, data);
      if (updated) {
        setHabitsMeta(prev => ({
          ...prev,
          [updated.id]: { cue: form.cue.trim(), identity: form.identity.trim(), twoMinute: form.twoMinute.trim() }
        }));
      }
      toast({ title: "Hábito atualizado! 📝" });
    } else {
      const created = await create(data);
      if (created) {
        setHabitsMeta(prev => ({
          ...prev,
          [created.id]: { cue: form.cue.trim(), identity: form.identity.trim(), twoMinute: form.twoMinute.trim() }
        }));
      }
      toast({ title: "Novo hábito criado! 🎯", description: `"${data.name}" adicionado à sua rotina.` });
    }
    setDialogOpen(false);
  };

  const handleToggle = async (habit: any) => {
    const result = await toggleToday(habit.id);
    if (result.isNew) {
      playHabitChime();
      await addXp(habit.xp_reward);
      toast({ title: `+${habit.xp_reward} XP! ${habit.icon}`, description: `Hábito "${habit.name}" concluído!` });
    }
  };

  const handleDelete = async () => {
    if (deleteTarget) {
      await remove(deleteTarget);
      setDeleteTarget(null);
      toast({ title: "Hábito removido." });
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto flex items-center justify-center py-20">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl md:text-3xl font-bold text-gradient-gold">Hábitos</h2>
          <p className="text-sm text-muted-foreground mt-1">Consistência é a chave da evolução. Construa sua rotina.</p>
        </div>
        <Button onClick={openCreate} size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" /> Novo Hábito
        </Button>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Hoje", value: `${completedToday}/${totalHabits}`, icon: Target, color: "text-health", sub: `${completionPercent.toFixed(0)}% feito` },
          { label: "Hábitos Ativos", value: totalHabits.toString(), icon: Zap, color: "text-xp", sub: "em sua rotina" },
          { label: "Streaks Totais", value: totalStreaks.toString(), icon: Flame, color: "text-destructive", sub: "dias acumulados" },
          { label: "Melhor Streak", value: habits.length > 0 ? Math.max(...habits.map(h => h.best_streak || 0)).toString() : "0", icon: Trophy, color: "text-primary", sub: "recorde pessoal" },
        ].map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 mb-1">
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{stat.label}</span>
            </div>
            <p className="text-2xl font-bold font-display text-foreground">{stat.value}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{stat.sub}</p>
          </motion.div>
        ))}
      </div>

      {/* Daily Progress */}
      {totalHabits > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-primary/20 bg-primary/5 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-foreground">Progresso do Dia</span>
            <span className="text-xs font-bold text-primary">{completionPercent.toFixed(0)}%</span>
          </div>
          <div className="stat-bar h-3 rounded-lg">
            <motion.div className="stat-bar-fill xp-fill rounded-lg" animate={{ width: `${completionPercent}%` }} transition={{ duration: 0.5 }} />
          </div>
          {completionPercent >= 100 && (
            <p className="text-[10px] text-health font-medium mt-2 text-center">🎉 Todos os hábitos concluídos hoje! +Bônus de consistência</p>
          )}
        </motion.div>
      )}

      {/* Habits List */}
      <div className="space-y-3">
        <AnimatePresence>
          {habits.map((habit, i) => {
            const done = isCompletedToday(habit.id);
            const rate = getCompletionRate(habit.id);
            const week = getWeekMap(habit.id);
            const catInfo = HABIT_CATEGORIES.find(c => c.value === habit.category);
            const isExpanded = expandedHabitId === habit.id;
            const meta = habitsMeta[habit.id] || { cue: "", identity: "", twoMinute: "" };

            // Determine flame glowing class based on streak milestones (neuroscience-guided)
            const streak = habit.current_streak || 0;
            const streakColor = streak >= 21 
              ? "text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.8)] animate-pulse" 
              : streak >= 7 
                ? "text-blue-400 drop-shadow-[0_0_5px_rgba(96,165,250,0.8)]" 
                : streak >= 3 
                  ? "text-orange-400 drop-shadow-[0_0_3px_rgba(251,146,60,0.8)]" 
                  : "text-destructive";

            return (
              <motion.div
                key={habit.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ delay: i * 0.03 }}
                className={`rounded-xl border transition-all flex flex-col overflow-hidden group ${
                  done 
                    ? "border-emerald-500/30 bg-emerald-500/5 shadow-[0_2px_15px_-5px_rgba(16,185,129,0.1)]" 
                    : "border-border bg-card hover:border-primary/20 hover:scale-[1.005] shadow-[0_4px_20px_-10px_rgba(0,0,0,0.2)]"
                }`}
              >
                {/* Main Row */}
                <div className="flex items-center gap-3 p-4">
                  <button onClick={() => handleToggle(habit)} className="shrink-0">
                    {done ? <CheckCircle2 className="h-6 w-6 text-health animate-pulse" /> : <Circle className="h-6 w-6 text-muted-foreground group-hover:text-primary transition-colors" />}
                  </button>

                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setExpandedHabitId(isExpanded ? null : habit.id)}>
                    <div className="flex items-center gap-2">
                      <span className="text-base">{habit.icon}</span>
                      <span className={`text-sm font-medium ${done ? "line-through text-muted-foreground" : "text-foreground"}`}>{habit.name}</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-secondary border border-border text-muted-foreground">
                        {catInfo?.icon} {catInfo?.label}
                      </span>
                    </div>

                    {/* Week dots */}
                    <div className="flex items-center gap-1.5 mt-2">
                      {week.map((d) => (
                        <div key={d.date} className="flex flex-col items-center gap-0.5">
                          <div className={`h-5 w-5 rounded-full flex items-center justify-center text-[8px] font-bold transition-all ${
                            d.done 
                              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-[0_0_8px_rgba(16,185,129,0.3)] animate-pulse" 
                              : "bg-secondary/60 text-muted-foreground border border-border"
                          }`}>
                            {d.done ? "✓" : ""}
                          </div>
                          <span className="text-[7px] text-muted-foreground">{d.day}</span>
                        </div>
                      ))}
                      <div className="ml-2 flex items-center gap-1">
                        <TrendingUp className="h-3 w-3 text-muted-foreground" />
                        <span className="text-[9px] text-muted-foreground">{(rate * 100).toFixed(0)}%</span>
                      </div>
                    </div>
                  </div>

                  {/* Streak & actions */}
                  <div className="shrink-0 flex flex-col items-end gap-1">
                    <div className="flex items-center gap-1 bg-secondary/30 px-2 py-0.5 rounded-full border border-border/40">
                      <Flame className={`h-3.5 w-3.5 ${streakColor}`} />
                      <span className="text-xs font-bold text-foreground">{streak}</span>
                    </div>
                    <span className="text-[8px] text-muted-foreground">melhor: {habit.best_streak || 0}</span>
                    <span className="text-[9px] text-xp font-bold">+{habit.xp_reward} XP</span>
                  </div>

                  <div className="shrink-0 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEdit(habit)} className="p-1.5 rounded hover:bg-secondary border border-border bg-secondary/30"><Edit3 className="h-3.5 w-3.5 text-muted-foreground" /></button>
                    <button onClick={() => setDeleteTarget(habit.id)} className="p-1.5 rounded hover:bg-destructive/20 border border-destructive/20 bg-destructive/5"><Trash2 className="h-3.5 w-3.5 text-destructive" /></button>
                  </div>
                </div>

                {/* Expanded Neuroscience details */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-border bg-secondary/15 px-4 py-3.5 overflow-hidden"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {/* Cue/Gatilho */}
                        <div className="p-2.5 bg-card border border-border/80 rounded-lg flex items-start gap-2.5 shadow-sm">
                          <Brain className="h-4 w-4 text-primary mt-0.5 shrink-0 animate-pulse" />
                          <div>
                            <span className="text-[9px] text-muted-foreground font-bold block uppercase tracking-wider">Gatilho (Law 1: Óbvio)</span>
                            <p className="text-xs text-foreground mt-0.5 font-medium leading-relaxed">
                              {meta.cue ? `Depois de "${meta.cue}", eu vou executar.` : "Nenhum gatilho mental configurado ainda. Edite para ancorar este hábito!"}
                            </p>
                          </div>
                        </div>

                        {/* Identity */}
                        <div className="p-2.5 bg-card border border-border/80 rounded-lg flex items-start gap-2.5 shadow-sm">
                          <Award className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
                          <div>
                            <span className="text-[9px] text-muted-foreground font-bold block uppercase tracking-wider">Identidade (Law 2: Atraente)</span>
                            <p className="text-xs text-foreground mt-0.5 font-medium leading-relaxed">
                              {meta.identity ? `Isso apoia minha identidade de: "${meta.identity}".` : "Nenhuma identidade vinculada. Defina quem você quer se tornar fazendo isso!"}
                            </p>
                          </div>
                        </div>

                        {/* Two minute rule */}
                        <div className="p-2.5 bg-card border border-border/80 rounded-lg flex items-start gap-2.5 shadow-sm">
                          <Sparkles className="h-4 w-4 text-blue-400 mt-0.5 shrink-0" />
                          <div>
                            <span className="text-[9px] text-muted-foreground font-bold block uppercase tracking-wider">Início Fácil (Law 3: Simples)</span>
                            <p className="text-xs text-foreground mt-0.5 font-medium leading-relaxed text-muted-foreground italic">
                              {meta.twoMinute ? `Comece com: "${meta.twoMinute}" (Regra de 2 min)` : "Regra dos 2 minutos não configurada. Defina uma mini-ação para vencer a inércia!"}
                            </p>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {habits.length === 0 && (
          <div className="text-center py-12 text-muted-foreground rounded-xl border border-dashed border-border">
            <Target className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Nenhum hábito criado ainda.</p>
            <p className="text-xs mt-1">Crie hábitos diários para ganhar XP consistentemente!</p>
            <Button onClick={openCreate} size="sm" className="mt-4 gap-1.5"><Plus className="h-3.5 w-3.5" /> Criar Primeiro Hábito</Button>
          </div>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md bg-card border-primary/20">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2 text-primary">
              <Brain className="h-5 w-5 animate-pulse" />
              {editing ? "Aprimorar Hábito" : "Criar Hábito Novo"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Forme hábitos sólidos integrando os conceitos de Gatilho, Desejo, Resposta e Recompensa.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Nome do Hábito</label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Beber 2L de água" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-2 block">Ícone Representativo</label>
              <div className="flex flex-wrap gap-2 max-h-[80px] overflow-y-auto pr-1 scrollbar-thin">
                {HABIT_ICONS.map((icon) => (
                  <button key={icon} type="button" onClick={() => setForm({ ...form, icon })}
                    className={`h-8 w-8 rounded border flex items-center justify-center text-base transition-all ${form.icon === icon ? "border-primary bg-primary/10 scale-110" : "border-border hover:bg-secondary/50"}`}>
                    {icon}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Categoria</label>
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  {HABIT_CATEGORIES.map((cat) => (
                    <option key={cat.value} value={cat.value}>{cat.icon} {cat.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">XP por Conclusão</label>
                <Input type="number" value={form.xp_reward} onChange={(e) => setForm({ ...form, xp_reward: e.target.value })} min="1" />
              </div>
            </div>

            {/* Neuroscience parameters */}
            <div className="border-t border-border/80 pt-3.5 space-y-3">
              <span className="text-[10px] text-primary font-bold uppercase tracking-wider flex items-center gap-1.5">
                🧠 Leis da Neurociência (Atomic Habits)
              </span>
              
              <div>
                <label className="text-xs text-muted-foreground mb-1 block flex items-center gap-1">
                  <Brain className="h-3.5 w-3.5 text-primary" /> Gatilho Mental (Cue / Obvious)
                </label>
                <Input 
                  value={form.cue} 
                  onChange={(e) => setForm({ ...form, cue: e.target.value })} 
                  placeholder="Gatilho: 'Depois de [hábito atual], eu vou...'" 
                  className="text-xs h-8.5 bg-background"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block flex items-center gap-1">
                    <Award className="h-3.5 w-3.5 text-emerald-400" /> Identidade (Attractive)
                  </label>
                  <Input 
                    value={form.identity} 
                    onChange={(e) => setForm({ ...form, identity: e.target.value })} 
                    placeholder="Ex: Pessoa saudável" 
                    className="text-xs h-8.5 bg-background"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block flex items-center gap-1">
                    <Sparkles className="h-3.5 w-3.5 text-blue-400" /> Início Fácil (Easy / 2-Min)
                  </label>
                  <Input 
                    value={form.twoMinute} 
                    onChange={(e) => setForm({ ...form, twoMinute: e.target.value })} 
                    placeholder="Ex: Calçar os tênis" 
                    className="text-xs h-8.5 bg-background"
                  />
                </div>
              </div>
            </div>

            <Button onClick={save} className="w-full font-bold">{editing ? "Confirmar Mudanças" : "Fixar Novo Hábito"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        title="Excluir Hábito"
        description="Tem certeza que deseja excluir este hábito? Todo o histórico será perdido."
        onConfirm={handleDelete}
        confirmLabel="Excluir"
      />
    </div>
  );
}
