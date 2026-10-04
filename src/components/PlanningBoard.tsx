import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Plus, Trash2, Pencil, Check, Calendar, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useObjectives, useProjects, LIFE_AREAS, PRIORITIES, STATUSES, computeProgress } from "@/hooks/usePlanning";
import { useTasks, useProfile } from "@/hooks/useGameData";
import { toast } from "@/hooks/use-toast";

type Kind = "objective" | "project";

const empty = { title: "", description: "", area: "carreira", priority: "media", status: "ativo", target_date: "", objective_id: "none" };

export default function PlanningBoard({ kind }: { kind: Kind }) {
  const objectives = useObjectives();
  const projects = useProjects();
  const { tasks, create: createTask, toggle } = useTasks();
  const { addXp } = useProfile();
  const store = kind === "objective" ? objectives : projects;
  const key = kind === "objective" ? "objective_id" : "project_id";

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>(empty);
  const [filter, setFilter] = useState("ativo");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [newTask, setNewTask] = useState("");

  const list = useMemo(() => store.items.filter((i) => filter === "todos" || i.status === filter), [store.items, filter]);

  const openNew = () => { setEditing(null); setForm(empty); setOpen(true); };
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
    if (editing) await store.update(editing.id, values);
    else await store.add(values);
    toast({ title: editing ? "Atualizado" : kind === "objective" ? "🎯 Objetivo criado" : "🛠️ Projeto criado" });
    setOpen(false);
  };

  const complete = async (i: any) => {
    await store.update(i.id, { status: "concluido" });
    const xp = kind === "objective" ? 200 : 100;
    await addXp(xp);
    toast({ title: `🏆 ${kind === "objective" ? "Objetivo" : "Projeto"} concluído!`, description: `+${xp} XP` });
  };

  const addLinkedTask = async (i: any) => {
    if (!newTask.trim()) return;
    const row: any = { title: newTask.trim(), [key]: i.id };
    if (kind === "project" && i.objective_id) row.objective_id = i.objective_id;
    await createTask(row);
    setNewTask("");
  };

  const label = kind === "objective" ? "Objetivo" : "Projeto";

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl md:text-3xl font-bold text-gradient-gold">
            {kind === "objective" ? "Objetivos" : "Projetos"}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {kind === "objective" ? "Onde você quer chegar." : "O que você está construindo para chegar lá."}
          </p>
        </div>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" /> Novo {label.toLowerCase()}</Button>
      </div>

      <div className="flex gap-2 flex-wrap">
        {["ativo", "pausado", "concluido", "todos"].map((s) => (
          <Button key={s} size="sm" variant={filter === s ? "default" : "outline"} onClick={() => setFilter(s)}>
            {s === "todos" ? "Todos" : STATUSES[s]}
          </Button>
        ))}
      </div>

      {store.loading ? (
        <div className="h-32 rounded-xl bg-secondary/40 animate-pulse" />
      ) : list.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center">
          <p className="text-3xl mb-2">{kind === "objective" ? "🎯" : "🛠️"}</p>
          <p className="font-medium text-foreground">Nenhum {label.toLowerCase()} ainda</p>
          <p className="text-sm text-muted-foreground mb-4">
            {kind === "objective" ? "Defina onde quer chegar e transforme isso em ações." : "Divida um objetivo em algo concreto para construir."}
          </p>
          <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" /> Criar o primeiro</Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {list.map((i) => {
            const progress = computeProgress(i, tasks, key);
            const linkedTasks = tasks.filter((t) => t[key] === i.id);
            const linkedProjects = kind === "objective" ? projects.items.filter((p) => p.objective_id === i.id) : [];
            const parent = kind === "project" ? objectives.items.find((o) => o.id === i.objective_id) : null;
            const area = LIFE_AREAS[i.area];
            const isOpen = expanded === i.id;
            return (
              <motion.div key={i.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border border-border bg-card/60 p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="text-2xl">{kind === "objective" ? area?.icon || "🎯" : "🛠️"}</div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-semibold text-foreground ${i.status === "concluido" ? "line-through opacity-60" : ""}`}>{i.title}</p>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground mt-1">
                      {kind === "objective" && <span>{area?.label}</span>}
                      {parent && <span>🎯 {parent.title}</span>}
                      <span className={PRIORITIES[i.priority]?.cls}>● {PRIORITIES[i.priority]?.label}</span>
                      {i.target_date && <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(i.target_date + "T00:00").toLocaleDateString("pt-BR")}</span>}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {i.status !== "concluido" && (
                      <Button size="icon" variant="ghost" aria-label="Concluir" onClick={() => complete(i)}><Check className="h-4 w-4" /></Button>
                    )}
                    <Button size="icon" variant="ghost" aria-label="Editar" onClick={() => openEdit(i)}><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" aria-label="Excluir" onClick={() => { if (confirm("Excluir?")) store.remove(i.id); }}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
                {i.description && <p className="text-sm text-muted-foreground">{i.description}</p>}
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Progresso</span>
                    <span className="text-primary font-medium">{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>
                {kind === "objective" && linkedProjects.length > 0 && (
                  <div className="text-xs text-muted-foreground">🛠️ {linkedProjects.map((p) => p.title).join(" · ")}</div>
                )}
                <button onClick={() => setExpanded(isOpen ? null : i.id)} className="flex items-center gap-1 text-xs text-primary">
                  {isOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  Missões ({linkedTasks.filter((t) => !t.completed).length} pendentes)
                </button>
                {isOpen && (
                  <div className="space-y-2">
                    {linkedTasks.map((t) => (
                      <label key={t.id} className="flex items-center gap-2 text-sm cursor-pointer">
                        <input type="checkbox" checked={t.completed} onChange={async () => {
                          await toggle(t.id);
                          if (!t.completed) await addXp(t.xp_reward || 25);
                        }} />
                        <span className={t.completed ? "line-through text-muted-foreground" : "text-foreground"}>{t.title}</span>
                      </label>
                    ))}
                    <div className="flex gap-2">
                      <Input value={newTask} onChange={(e) => setNewTask(e.target.value)} placeholder="Nova missão..."
                        onKeyDown={(e) => e.key === "Enter" && addLinkedTask(i)} className="h-8 text-sm" />
                      <Button size="sm" onClick={() => addLinkedTask(i)}><Plus className="h-4 w-4" /></Button>
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? `Editar ${label.toLowerCase()}` : `Novo ${label.toLowerCase()}`}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Nome" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <Textarea placeholder="Descrição" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            {kind === "objective" ? (
              <Select value={form.area} onValueChange={(v) => setForm({ ...form, area: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(LIFE_AREAS).map(([k, a]) => <SelectItem key={k} value={k}>{a.icon} {a.label}</SelectItem>)}</SelectContent>
              </Select>
            ) : (
              <Select value={form.objective_id} onValueChange={(v) => setForm({ ...form, objective_id: v })}>
                <SelectTrigger><SelectValue placeholder="Objetivo relacionado" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem objetivo</SelectItem>
                  {objectives.items.map((o) => <SelectItem key={o.id} value={o.id}>🎯 {o.title}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            <div className="grid grid-cols-2 gap-3">
              <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(PRIORITIES).map(([k, p]) => <SelectItem key={k} value={k}>{p.label}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(STATUSES).map(([k, s]) => <SelectItem key={k} value={k}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Input type="date" value={form.target_date} onChange={(e) => setForm({ ...form, target_date: e.target.value })} />
            <Button className="w-full" onClick={save}>Salvar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
