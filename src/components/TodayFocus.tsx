import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Target } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useTasks, useProfile } from "@/hooks/useGameData";
import { useObjectives, computeProgress } from "@/hooks/usePlanning";

const PRIO: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };

/** "Seu foco hoje": answers "o que eu deveria fazer agora?" with max 3 priorities. */
export default function TodayFocus() {
  const { tasks, toggle } = useTasks();
  const { addXp } = useProfile();
  const { items: objectives } = useObjectives();
  const today = new Date().toISOString().split("T")[0];

  const todays = tasks.filter((t) => !t.completed || t.completed_at?.startsWith(today));
  const done = todays.filter((t) => t.completed).length;
  const pct = todays.length ? Math.round((done / todays.length) * 100) : 0;

  const top = useMemo(() => {
    return tasks
      .filter((t) => !t.completed)
      .map((t) => {
        let s = (PRIO[t.priority] || 2) * 10;
        if (t.due_date && t.due_date <= today) s += 25;
        if (t.objective_id || t.project_id) s += 8;
        return { t, s };
      })
      .sort((a, b) => b.s - a.s)
      .slice(0, 3)
      .map((x) => x.t);
  }, [tasks, today]);

  const activeObjectives = objectives.filter((o) => o.status === "ativo").slice(0, 3);
  const dateLabel = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <div className="md:col-span-2 rounded-xl border border-primary/20 bg-card/60 p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground capitalize">{dateLabel}</p>
            <h3 className="font-display text-lg font-bold text-foreground">🎯 Seu foco hoje</h3>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-primary">{pct}%</p>
            <p className="text-[10px] text-muted-foreground">do dia concluído</p>
          </div>
        </div>
        <Progress value={pct} className="h-1.5 mb-4" />
        {top.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma missão pendente. <Link to="/app/tasks" className="text-primary">Crie uma missão</Link> ou aproveite o descanso.</p>
        ) : (
          <ul className="space-y-2">
            {top.map((t, idx) => (
              <li key={t.id} className="flex items-center gap-3 rounded-lg bg-secondary/40 px-3 py-2.5">
                <span className="text-xs font-bold text-primary w-4">{idx + 1}</span>
                <input type="checkbox" aria-label={`Concluir ${t.title}`} onChange={async () => { await toggle(t.id); await addXp(t.xp_reward || 25); }} />
                <span className="flex-1 text-sm text-foreground">{t.title}</span>
                <span className="text-xs text-xp">+{t.xp_reward} XP</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="rounded-xl border border-border bg-card/60 p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display text-sm font-bold text-foreground flex items-center gap-2"><Target className="h-4 w-4 text-primary" /> Objetivos</h3>
          <Link to="/app/objectives" className="text-xs text-primary">Ver todos</Link>
        </div>
        {activeObjectives.length === 0 ? (
          <p className="text-sm text-muted-foreground">Defina <Link to="/app/objectives" className="text-primary">seu primeiro objetivo</Link> para dar direção ao seu dia.</p>
        ) : (
          <div className="space-y-3">
            {activeObjectives.map((o) => {
              const p = computeProgress(o, tasks, "objective_id");
              return (
                <div key={o.id}>
                  <div className="flex justify-between text-xs mb-1"><span className="text-foreground truncate">{o.title}</span><span className="text-primary">{p}%</span></div>
                  <Progress value={p} className="h-1.5" />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
