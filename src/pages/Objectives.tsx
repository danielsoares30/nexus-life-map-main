import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Trash2, Pencil, Check, Calendar, ChevronDown, ChevronUp,
  Target, Flame, Clock, Star, Zap, TrendingUp, Trophy, Filter,
  BookOpen, Briefcase, Heart, Dumbbell, DollarSign, Brain, Users,
  LayoutGrid, List, Search, X, Flag, ArrowRight, CheckCircle2,
  AlertCircle, Circle, Pause, Archive,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useObjectives, useProjects, LIFE_AREAS, PRIORITIES, STATUSES, computeProgress } from "@/hooks/usePlanning";
import { useTasks, useProfile } from "@/hooks/useGameData";
import { toast } from "@/hooks/use-toast";

type Kind = "objective" | "project";

const empty = {
  title: "", description: "", area: "carreira", priority: "media",
  status: "ativo", target_date: "", objective_id: "none",
};

const AREA_ICONS: Record<string, any> = {
  carreira: Briefcase, saude: Heart, financas: DollarSign, estudos: BookOpen,
  relacionamentos: Users, espiritualidade: Star, fitness: Dumbbell, mente: Brain,
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  urgente: { label: "Urgente", color: "text-red-400", bg: "bg-red-500/10 border-red-500/30", icon: Flame },
  alta:    { label: "Alta",    color: "text-orange-400", bg: "bg-orange-500/10 border-orange-500/30", icon: Zap },
  media:   { label: "Média",   color: "text-amber-400",  bg: "bg-amber-500/10 border-amber-500/30",  icon: TrendingUp },
  baixa:   { label: "Baixa",   color: "text-slate-400",  bg: "bg-slate-500/10 border-slate-500/30",  icon: Circle },
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  ativo:     { label: "Ativo",     color: "text-emerald-400", icon: CheckCircle2 },
  pausado:   { label: "Pausado",   color: "text-amber-400",   icon: Pause },
  concluido: { label: "Concluído", color: "text-primary",     icon: Trophy },
  cancelado: { label: "Cancelado", color: "text-red-400",     icon: AlertCircle },
};

function daysUntil(dateStr: string) {
  if (!dateStr) return null;
  const diff = Math.ceil((new Date(dateStr + "T00:00").getTime() - Date.now()) / 86400000);
  return diff;
}

function DeadlineBadge({ date }: { date: string }) {
  if (!date) return null;
  const days = daysUntil(date);
  if (days === null) return null;
  const overdue = days < 0;
  const urgent = days >= 0 && days <= 7;
  const label = overdue ? `${Math.abs(days)}d atrasado` : days === 0 ? "hoje!" : `${days}d`;
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border font-medium ${
      overdue ? "bg-red-500/10 border-red-500/30 text-red-400" :
      urgent  ? "bg-amber-500/10 border-amber-500/30 text-amber-400" :
                "bg-border/50 border-border text-muted-foreground"
    }`}>
      <Clock className="h-2.5 w-2.5" />
      {label}
    </span>
  );
}

export default function Objectives() {
  const objectives = useObjectives();
  const projects = useProjects();
  const { tasks, create: createTask, toggle } = useTasks();
  const { addXp } = useProfile();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>(empty);
  const [filter, setFilter] = useState("ativo");
  const [areaFilter, setAreaFilter] = useState("todos");
  const [priorityFilter, setPriorityFilter] = useState("todos");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [newTask, setNewTask] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"objectives" | "projects">("objectives");

  const store = activeTab === "objective" as any ? objectives : objectives;
  const kind: Kind = activeTab === "objectives" ? "objective" : "project";
  const currentStore = kind === "objective" ? objectives : projects;
  const key = kind === "objective" ? "objective_id" : "project_id";
  const label = kind === "objective" ? "Missão" : "Projeto";

  const list = useMemo(() => {
    let items = currentStore.items;
    if (filter !== "todos") items = items.filter(i => i.status === filter);
    if (areaFilter !== "todos" && kind === "objective") items = items.filter(i => i.area === areaFilter);
    if (priorityFilter !== "todos") items = items.filter(i => i.priority === priorityFilter);
    if (search.trim()) items = items.filter(i => i.title.toLowerCase().includes(search.toLowerCase()) || (i.description || "").toLowerCase().includes(search.toLowerCase()));
    return items;
  }, [currentStore.items, filter, areaFilter, priorityFilter, search, kind]);

  // Summary stats
  const total = currentStore.items.length;
  const active = currentStore.items.filter(i => i.status === "ativo").length;
  const completed = currentStore.items.filter(i => i.status === "concluido").length;
  const overdue = currentStore.items.filter(i => i.target_date && daysUntil(i.target_date)! < 0 && i.status === "ativo").length;

  const openNew = () => { setEditing(null); setForm({ ...empty }); setOpen(true); };
  const openEdit = (i: any) => {
    setEditing(i);
    setForm({ ...empty, ...i, target_date: i.target_date || "", objective_id: i.objective_id || "none" });
    setOpen(true);
  };

  const save = async () => {
    if (!form.title.trim()) return;
    const values: any = {
      title: form.title.trim(),
      description: form.description,
      priority: form.priority,
      status: form.status,
      target_date: form.target_date || null,
    };
    if (kind === "objective") values.area = form.area;
    else values.objective_id = form.objective_id === "none" ? null : form.objective_id;
    if (editing) await currentStore.update(editing.id, values);
    else await currentStore.add(values);
    toast({ title: editing ? "Atualizado!" : `🎯 ${label} criada!` });
    setOpen(false);
  };

  const complete = async (i: any) => {
    await currentStore.update(i.id, { status: "concluido" });
    const xp = kind === "objective" ? 200 : 100;
    await addXp(xp);
    toast({ title: `🏆 ${label} concluída! +${xp} XP` });
  };

  const addLinkedTask = async (i: any) => {
    if (!newTask.trim()) return;
    const row: any = { title: newTask.trim(), [key]: i.id };
    if (kind === "project" && i.objective_id) row.objective_id = i.objective_id;
    await createTask(row);
    setNewTask("");
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-xl border border-border bg-gradient-to-br from-card via-secondary/30 to-card p-6">
        <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(circle_at_70%_30%,hsl(270_50%_55%/.6),transparent_60%)]" />
        <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-bold text-gradient-gold flex items-center gap-3">
              <Target className="h-7 w-7 text-primary" />
              Missões & Projetos
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Defina onde quer chegar e construa o caminho para lá.</p>
          </div>
          <Button onClick={openNew} className="gap-2 shrink-0">
            <Plus className="h-4 w-4" /> Nova {label}
          </Button>
        </div>
      </motion.div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total", value: total, icon: LayoutGrid, color: "text-foreground" },
          { label: "Ativas", value: active, icon: Flame, color: "text-emerald-400" },
          { label: "Concluídas", value: completed, icon: Trophy, color: "text-primary" },
          { label: "Atrasadas", value: overdue, icon: AlertCircle, color: overdue > 0 ? "text-red-400" : "text-muted-foreground" },
        ].map((kpi, i) => (
          <motion.div key={kpi.label} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
            className="rounded-xl border border-border bg-card p-4 hover:border-primary/20 transition-all">
            <div className="flex items-center gap-2 mb-2">
              <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{kpi.label}</span>
            </div>
            <p className={`text-2xl font-bold font-display ${kpi.color}`}>{kpi.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-border pb-0">
        {(["objectives", "projects"] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-all -mb-px ${
              activeTab === tab
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab === "objectives" ? "🎯 Missões" : "🛠️ Projetos"}
          </button>
        ))}
      </div>

      {/* Filters bar */}
      <div className="flex flex-wrap gap-2 items-center">
        {/* Search */}
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar missão..." className="pl-8 h-8 text-sm"
          />
          {search && <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X className="h-3.5 w-3.5" /></button>}
        </div>

        {/* Status filter */}
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos status</SelectItem>
            {Object.entries(STATUS_CONFIG).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Priority filter */}
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Toda prioridade</SelectItem>
            {Object.entries(PRIORITY_CONFIG).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Area filter (only for objectives) */}
        {kind === "objective" && (
          <Select value={areaFilter} onValueChange={setAreaFilter}>
            <SelectTrigger className="w-36 h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Toda área</SelectItem>
              {Object.entries(LIFE_AREAS).map(([k, a]) => (
                <SelectItem key={k} value={k}>{a.icon} {a.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* View mode */}
        <div className="flex gap-1 rounded-md border border-border p-0.5">
          <button onClick={() => setViewMode("grid")} className={`p-1.5 rounded transition-all ${viewMode === "grid" ? "bg-primary/10 text-primary" : "text-muted-foreground"}`}>
            <LayoutGrid className="h-3.5 w-3.5" />
          </button>
          <button onClick={() => setViewMode("list")} className={`p-1.5 rounded transition-all ${viewMode === "list" ? "bg-primary/10 text-primary" : "text-muted-foreground"}`}>
            <List className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Content */}
      {currentStore.loading ? (
        <div className={`grid gap-4 ${viewMode === "grid" ? "md:grid-cols-2" : ""}`}>
          {[1, 2, 3].map(i => <div key={i} className="h-36 rounded-xl bg-secondary/40 animate-pulse" />)}
        </div>
      ) : list.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="rounded-xl border border-dashed border-border p-12 text-center">
          <div className="text-5xl mb-4">{kind === "objective" ? "🎯" : "🛠️"}</div>
          <p className="font-display text-lg font-medium text-foreground mb-1">
            {search ? "Nenhuma missão encontrada" : `Nenhuma ${label.toLowerCase()} ainda`}
          </p>
          <p className="text-sm text-muted-foreground mb-6">
            {search ? "Tente buscar com outros termos." : `Crie sua primeira ${label.toLowerCase()} e comece a jornada.`}
          </p>
          {!search && <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" /> Criar {label}</Button>}
        </motion.div>
      ) : (
        <div className={viewMode === "grid" ? "grid gap-4 md:grid-cols-2" : "space-y-3"}>
          {list.map((item, idx) => {
            const progress = computeProgress(item, tasks, key);
            const linkedTasks = tasks.filter(t => t[key] === item.id);
            const pendingTasks = linkedTasks.filter(t => !t.completed);
            const doneTasks = linkedTasks.filter(t => t.completed);
            const linkedProjects = kind === "objective" ? projects.items.filter(p => p.objective_id === item.id) : [];
            const parent = kind === "project" ? objectives.items.find(o => o.id === item.objective_id) : null;
            const area = LIFE_AREAS[item.area];
            const AreaIcon = AREA_ICONS[item.area] || Target;
            const pConf = PRIORITY_CONFIG[item.priority] || PRIORITY_CONFIG.media;
            const PriorityIcon = pConf.icon;
            const sConf = STATUS_CONFIG[item.status] || STATUS_CONFIG.ativo;
            const StatusIcon = sConf.icon;
            const isExpanded = expanded === item.id;
            const completed_item = item.status === "concluido";

            return (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04 }}
                className={`rounded-xl border bg-card transition-all hover:shadow-md group ${
                  completed_item
                    ? "border-border/40 opacity-70"
                    : item.priority === "urgente"
                    ? "border-red-500/30 hover:border-red-500/50"
                    : "border-border hover:border-primary/30"
                }`}
              >
                <div className="p-4 space-y-3">
                  {/* Top row */}
                  <div className="flex items-start gap-3">
                    <div className={`shrink-0 h-10 w-10 rounded-lg flex items-center justify-center border ${pConf.bg}`}>
                      <AreaIcon className={`h-5 w-5 ${pConf.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className={`font-semibold text-foreground leading-tight ${completed_item ? "line-through opacity-60" : ""}`}>
                          {item.title}
                        </h3>
                        <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border ${pConf.bg} ${pConf.color}`}>
                          <PriorityIcon className="h-2.5 w-2.5" />
                          {pConf.label}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {kind === "objective" && area && (
                          <span className="text-[10px] text-muted-foreground">{area.icon} {area.label}</span>
                        )}
                        {parent && <span className="text-[10px] text-muted-foreground">→ {parent.title}</span>}
                        <span className={`inline-flex items-center gap-1 text-[10px] ${sConf.color}`}>
                          <StatusIcon className="h-2.5 w-2.5" />
                          {sConf.label}
                        </span>
                        <DeadlineBadge date={item.target_date} />
                      </div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      {!completed_item && (
                        <button
                          onClick={() => complete(item)}
                          title="Marcar concluído"
                          className="p-1.5 rounded-lg hover:bg-emerald-500/10 text-muted-foreground hover:text-emerald-400 transition-colors"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        onClick={() => openEdit(item)}
                        className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => { if (confirm("Excluir?")) currentStore.remove(item.id); }}
                        className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Description */}
                  {item.description && (
                    <p className="text-xs text-muted-foreground leading-relaxed">{item.description}</p>
                  )}

                  {/* Progress bar */}
                  <div>
                    <div className="flex justify-between text-[10px] mb-1.5">
                      <span className="text-muted-foreground">
                        {doneTasks.length}/{linkedTasks.length} tarefas
                        {linkedProjects.length > 0 && ` · ${linkedProjects.length} projetos`}
                      </span>
                      <span className={`font-bold ${progress === 100 ? "text-emerald-400" : "text-primary"}`}>{progress}%</span>
                    </div>
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                      <motion.div
                        className={`h-full rounded-full ${progress === 100 ? "bg-emerald-500" : "bg-primary"}`}
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                      />
                    </div>
                  </div>

                  {/* Linked projects pills (objectives only) */}
                  {kind === "objective" && linkedProjects.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {linkedProjects.map(p => (
                        <span key={p.id} className="text-[10px] bg-secondary border border-border px-2 py-0.5 rounded-full text-muted-foreground">
                          🛠️ {p.title}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Expand toggle */}
                  <button
                    onClick={() => setExpanded(isExpanded ? null : item.id)}
                    className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors w-full"
                  >
                    {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    <span>Tarefas ({pendingTasks.length} pendentes)</span>
                    {!isExpanded && pendingTasks.length > 0 && (
                      <span className="ml-auto flex gap-1">
                        {pendingTasks.slice(0, 3).map(t => (
                          <span key={t.id} className="text-[9px] bg-secondary border border-border px-1.5 py-0.5 rounded-full text-muted-foreground truncate max-w-[80px]">
                            {t.title}
                          </span>
                        ))}
                        {pendingTasks.length > 3 && <span className="text-[9px] text-muted-foreground">+{pendingTasks.length - 3}</span>}
                      </span>
                    )}
                  </button>

                  {/* Tasks panel */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="border-t border-border pt-3 space-y-2">
                          {linkedTasks.length === 0 && (
                            <p className="text-xs text-muted-foreground text-center py-2">Nenhuma tarefa vinculada ainda.</p>
                          )}
                          {linkedTasks.map(t => (
                            <label key={t.id} className="flex items-center gap-2.5 cursor-pointer group/task rounded-lg px-2 py-1.5 hover:bg-secondary/50 transition-colors">
                              <div
                                onClick={async (e) => { e.preventDefault(); await toggle(t.id); if (!t.completed) await addXp(t.xp_reward || 25); }}
                                className={`h-4 w-4 rounded border-2 shrink-0 flex items-center justify-center cursor-pointer transition-all ${
                                  t.completed ? "bg-emerald-500 border-emerald-500" : "border-border hover:border-primary"
                                }`}
                              >
                                {t.completed && <Check className="h-2.5 w-2.5 text-white" />}
                              </div>
                              <span className={`text-xs flex-1 ${t.completed ? "line-through text-muted-foreground" : "text-foreground"}`}>
                                {t.title}
                              </span>
                              {t.xp_reward && !t.completed && (
                                <span className="text-[9px] text-primary opacity-0 group-hover/task:opacity-100 transition-opacity">+{t.xp_reward} XP</span>
                              )}
                            </label>
                          ))}
                          <div className="flex gap-2 pt-1">
                            <Input
                              value={newTask}
                              onChange={e => setNewTask(e.target.value)}
                              placeholder="Nova tarefa..."
                              onKeyDown={e => e.key === "Enter" && addLinkedTask(item)}
                              className="h-8 text-xs"
                            />
                            <Button size="sm" onClick={() => addLinkedTask(item)} className="h-8 px-3">
                              <Plus className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              {kind === "objective" ? <Target className="h-5 w-5 text-primary" /> : <Flag className="h-5 w-5 text-primary" />}
              {editing ? `Editar ${label}` : `Nova ${label}`}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Título *</label>
              <Input placeholder="Nome da missão..." value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Descrição</label>
              <Textarea placeholder="Contexto, estratégia, resultado esperado..." value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} className="resize-none" />
            </div>

            {kind === "objective" ? (
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Área de Vida</label>
                <Select value={form.area} onValueChange={v => setForm({ ...form, area: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(LIFE_AREAS).map(([k, a]) => (
                      <SelectItem key={k} value={k}>{a.icon} {a.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Missão relacionada</label>
                <Select value={form.objective_id} onValueChange={v => setForm({ ...form, objective_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Vincular a uma missão" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem missão vinculada</SelectItem>
                    {objectives.items.map(o => <SelectItem key={o.id} value={o.id}>🎯 {o.title}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Prioridade</label>
                <Select value={form.priority} onValueChange={v => setForm({ ...form, priority: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(PRIORITY_CONFIG).map(([k, p]) => (
                      <SelectItem key={k} value={k}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Status</label>
                <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(STATUS_CONFIG).map(([k, s]) => (
                      <SelectItem key={k} value={k}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1 block flex items-center gap-1">
                <Calendar className="h-3 w-3" /> Prazo
              </label>
              <Input type="date" value={form.target_date} onChange={e => setForm({ ...form, target_date: e.target.value })} />
            </div>

            <Button className="w-full" onClick={save}>
              <ArrowRight className="h-4 w-4 mr-1" /> {editing ? "Salvar alterações" : `Criar ${label}`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
