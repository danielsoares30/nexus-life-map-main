import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Smile, Frown, Meh, SmilePlus, Laugh, Zap, Target, Wind, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMoodEntries, useProfile } from "@/hooks/useGameData";
import { toast } from "@/hooks/use-toast";

const moods = [
  { value: 1, icon: Frown, label: "Péssimo", color: "text-destructive" },
  { value: 2, icon: Meh, label: "Ruim", color: "text-strength" },
  { value: 3, icon: Smile, label: "Neutro", color: "text-muted-foreground" },
  { value: 4, icon: SmilePlus, label: "Bom", color: "text-mana" },
  { value: 5, icon: Laugh, label: "Ótimo", color: "text-health" },
];

export default function Mental() {
  const { entries, loading, upsertToday } = useMoodEntries();
  const { addXp } = useProfile();
  const [todayMood, setTodayMood] = useState(3);
  const [todayEnergy, setTodayEnergy] = useState(3);
  const [todayFocus, setTodayFocus] = useState(3);
  const [todayStress, setTodayStress] = useState(2);
  const [todayNote, setTodayNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [initialized, setInitialized] = useState(false);

  // Pre-fill with today's existing entry
  useEffect(() => {
    if (!loading && entries.length > 0 && !initialized) {
      const today = new Date().toISOString().split("T")[0];
      const todayEntry = entries.find((e) => e.date === today);
      if (todayEntry) {
        setTodayMood(todayEntry.mood);
        setTodayEnergy(todayEntry.energy);
        setTodayFocus(todayEntry.focus);
        setTodayStress(todayEntry.stress);
        setTodayNote(todayEntry.note || "");
      }
      setInitialized(true);
    }
  }, [loading, entries, initialized]);

  const saveTodayEntry = async () => {
    setSaving(true);
    const result = await upsertToday({ mood: todayMood, energy: todayEnergy, focus: todayFocus, stress: todayStress, note: todayNote || null });
    // Only give XP on first check-in of the day
    if (result.isNew) {
      await addXp(10);
      toast({ title: "+10 XP!", description: "Check-in mental registrado com sucesso." });
    } else {
      toast({ title: "Check-in atualizado!", description: "Seus dados de hoje foram atualizados." });
    }
    setSaving(false);
  };

  const last7 = entries.slice(0, 7).reverse();
  const days = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  const avgMood = last7.length ? (last7.reduce((s, d) => s + d.mood, 0) / last7.length).toFixed(1) : "-";
  const avgEnergy = last7.length ? (last7.reduce((s, d) => s + d.energy, 0) / last7.length).toFixed(1) : "-";
  const avgFocus = last7.length ? (last7.reduce((s, d) => s + d.focus, 0) / last7.length).toFixed(1) : "-";

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto flex items-center justify-center py-20">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const today = new Date().toISOString().split("T")[0];
  const hasToday = entries.some((e) => e.date === today);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <h2 className="font-display text-2xl md:text-3xl font-bold text-gradient-gold">Gestão Mental</h2>
        <p className="text-sm text-muted-foreground mt-1">Acompanhe seu estado emocional e identifique padrões.</p>
      </motion.div>

      {/* Today's check-in */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-border bg-card p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-base font-semibold text-foreground">Check-in de Hoje</h3>
          {hasToday && (
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-health/20 text-health">
              ✓ Registrado
            </span>
          )}
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-2 block">Como você está?</label>
          <div className="flex items-center justify-center gap-4">
            {moods.map((m) => (
              <button key={m.value} onClick={() => setTodayMood(m.value)} className={`flex flex-col items-center gap-1.5 rounded-xl p-3 border transition-all ${todayMood === m.value ? "border-primary/40 bg-primary/10 scale-110" : "border-transparent hover:bg-secondary/50"}`}>
                <m.icon className={`h-8 w-8 ${m.color}`} />
                <span className="text-[10px] text-muted-foreground">{m.label}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Energia", value: todayEnergy, set: setTodayEnergy, color: "text-health" },
            { label: "Foco", value: todayFocus, set: setTodayFocus, color: "text-mana" },
            { label: "Estresse", value: todayStress, set: setTodayStress, color: "text-destructive" },
          ].map((item) => (
            <div key={item.label}>
              <label className="text-xs text-muted-foreground mb-1 block">{item.label}: <span className={`font-bold ${item.color}`}>{item.value}/5</span></label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((v) => (
                  <button key={v} onClick={() => item.set(v)} className={`flex-1 h-8 rounded-md border transition-all text-xs font-bold ${v <= item.value ? "border-primary/30 bg-primary/20 text-primary" : "border-border bg-secondary/30 text-muted-foreground hover:bg-secondary/50"}`}>{v}</button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Nota do dia</label>
          <textarea value={todayNote} onChange={(e) => setTodayNote(e.target.value)} rows={2} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" placeholder="Como foi seu dia?" />
        </div>
        <Button onClick={saveTodayEntry} className="w-full gap-1.5" disabled={saving}>
          <Save className="h-4 w-4" />
          {saving ? "Salvando..." : hasToday ? "Atualizar Check-in" : "Salvar Check-in (+10 XP)"}
        </Button>
      </motion.div>

      {/* Week overview */}
      {last7.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="rounded-xl border border-border bg-card p-6">
          <h3 className="font-display text-base font-semibold text-foreground mb-4">Últimos Registros</h3>
          <div className="grid grid-cols-7 gap-2">
            {last7.map((d) => {
              const date = new Date(d.date + "T12:00:00");
              const dayName = days[date.getDay()];
              return (
                <div key={d.id} className="flex flex-col items-center gap-2 rounded-lg p-1">
                  <span className="text-xs text-muted-foreground">{dayName}</span>
                  <div className="space-y-1">
                    {[d.mood, d.energy, d.focus].map((val, i) => (
                      <div key={i} className="h-6 w-6 rounded-md flex items-center justify-center text-[10px] font-bold" style={{ background: `hsl(var(--${i === 0 ? "xp" : i === 1 ? "health" : "mana"}) / ${val / 5})`, color: val >= 3 ? "hsl(var(--primary-foreground))" : "hsl(var(--muted-foreground))" }}>{val}</div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-4 mt-3 justify-center">
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground"><div className="h-2 w-2 rounded-sm bg-xp" /> Humor</span>
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground"><div className="h-2 w-2 rounded-sm bg-health" /> Energia</span>
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground"><div className="h-2 w-2 rounded-sm bg-mana" /> Foco</span>
          </div>
        </motion.div>
      )}

      {/* Insights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { icon: Zap, label: "Energia Média", value: `${avgEnergy}/5`, color: "text-health" },
          { icon: Target, label: "Foco Médio", value: `${avgFocus}/5`, color: "text-mana" },
          { icon: Wind, label: "Humor Médio", value: `${avgMood}/5`, color: "text-xp" },
        ].map((item, i) => (
          <motion.div key={item.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.1 }} className="rounded-xl border border-border bg-card p-4">
            <item.icon className={`h-5 w-5 ${item.color} mb-2`} />
            <p className="text-xs text-muted-foreground">{item.label}</p>
            <p className="text-xl font-bold font-display text-foreground">{item.value}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
