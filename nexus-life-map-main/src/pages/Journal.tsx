import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, Plus, Trash2, Edit3, Save, Smile, Frown, Meh, SmilePlus, Laugh, Calendar, Search } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useJournal } from "@/hooks/useHabits";
import { useProfile } from "@/hooks/useGameData";
import { toast } from "@/hooks/use-toast";
import ConfirmDialog from "@/components/ConfirmDialog";

const moodIcons = [Frown, Meh, Smile, SmilePlus, Laugh];
const moodLabels = ["Péssimo", "Ruim", "Neutro", "Bom", "Ótimo"];
const moodColors = ["text-destructive", "text-strength", "text-muted-foreground", "text-mana", "text-health"];

const SUGGESTED_TAGS = ["gratidão", "reflexão", "aprendizado", "conquista", "desafio", "crescimento", "saúde", "relacionamento", "trabalho", "criatividade"];

export default function Journal() {
  const { entries, loading, create, update, remove } = useJournal();
  const { addXp } = useProfile();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({ title: "", content: "", mood: 3, tags: [] as string[] });

  const today = new Date().toISOString().split("T")[0];
  const hasEntryToday = entries.some((e) => e.date === today);
  const totalEntries = entries.length;
  const thisWeek = entries.filter((e) => {
    const d = new Date(e.date + "T12:00:00");
    const now = new Date();
    const diff = (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24);
    return diff <= 7;
  }).length;

  const openCreate = () => {
    setEditing(null);
    setForm({ title: "", content: "", mood: 3, tags: [] });
    setDialogOpen(true);
  };

  const openEdit = (entry: any) => {
    setEditing(entry);
    setForm({ title: entry.title, content: entry.content, mood: entry.mood || 3, tags: entry.tags || [] });
    setDialogOpen(true);
  };

  const toggleTag = (tag: string) => {
    setForm((prev) => ({
      ...prev,
      tags: prev.tags.includes(tag) ? prev.tags.filter((t) => t !== tag) : [...prev.tags, tag],
    }));
  };

  const save = async () => {
    if (!form.content.trim()) {
      toast({ title: "Conteúdo obrigatório", variant: "destructive" });
      return;
    }
    const data = {
      title: form.title.trim() || new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" }),
      content: form.content.trim(),
      mood: form.mood,
      tags: form.tags,
      date: editing ? editing.date : today,
    };
    if (editing) {
      await update(editing.id, data);
      toast({ title: "Entrada atualizada! 📝" });
    } else {
      await create(data);
      if (!hasEntryToday) {
        await addXp(5);
        toast({ title: "+5 XP! 📔", description: "Entrada no diário registrada." });
      } else {
        toast({ title: "Nova entrada salva! 📔" });
      }
    }
    setDialogOpen(false);
  };

  const handleDelete = async () => {
    if (deleteTarget) {
      await remove(deleteTarget);
      setDeleteTarget(null);
      toast({ title: "Entrada removida." });
    }
  };

  const filtered = search
    ? entries.filter((e) =>
        e.title.toLowerCase().includes(search.toLowerCase()) ||
        e.content.toLowerCase().includes(search.toLowerCase()) ||
        (e.tags || []).some((t: string) => t.includes(search.toLowerCase()))
      )
    : entries;

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
          <h2 className="font-display text-2xl md:text-3xl font-bold text-gradient-gold">Diário</h2>
          <p className="text-sm text-muted-foreground mt-1">Reflexão transforma experiência em sabedoria.</p>
        </div>
        <Button onClick={openCreate} size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" /> Nova Entrada
        </Button>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total de Entradas", value: totalEntries.toString(), icon: BookOpen, color: "text-wisdom" },
          { label: "Esta Semana", value: thisWeek.toString(), icon: Calendar, color: "text-mana" },
          { label: "Hoje", value: hasEntryToday ? "✓" : "—", icon: Edit3, color: hasEntryToday ? "text-health" : "text-muted-foreground" },
        ].map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="rounded-xl border border-border bg-card p-4">
            <stat.icon className={`h-5 w-5 ${stat.color} mb-2`} />
            <p className="text-xs text-muted-foreground">{stat.label}</p>
            <p className="text-xl font-bold font-display text-foreground">{stat.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar no diário..." className="pl-10" />
      </div>

      {/* Entries */}
      <div className="space-y-3">
        <AnimatePresence>
          {filtered.map((entry, i) => {
            const MoodIcon = moodIcons[Math.max(0, Math.min((entry.mood || 3) - 1, 4))];
            const date = new Date(entry.date + "T12:00:00");
            return (
              <motion.div
                key={entry.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ delay: i * 0.03 }}
                className="rounded-xl border border-border bg-card p-5 group hover:border-primary/20 transition-all"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <MoodIcon className={`h-5 w-5 ${moodColors[(entry.mood || 3) - 1]}`} />
                    <div>
                      <h4 className="text-sm font-display font-semibold text-foreground">{entry.title || "Sem título"}</h4>
                      <p className="text-[10px] text-muted-foreground">
                        {date.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                        <span className="ml-2">{moodLabels[(entry.mood || 3) - 1]}</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEdit(entry)} className="p-1 rounded hover:bg-secondary"><Edit3 className="h-3 w-3 text-muted-foreground" /></button>
                    <button onClick={() => setDeleteTarget(entry.id)} className="p-1 rounded hover:bg-destructive/20"><Trash2 className="h-3 w-3 text-destructive" /></button>
                  </div>
                </div>
                <p className="text-sm text-secondary-foreground whitespace-pre-wrap line-clamp-3">{entry.content}</p>
                {(entry.tags || []).length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {(entry.tags as string[]).map((tag) => (
                      <span key={tag} className="text-[9px] px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">#{tag}</span>
                    ))}
                  </div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>

        {filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground rounded-xl border border-dashed border-border">
            <BookOpen className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">{search ? "Nenhuma entrada encontrada." : "Nenhuma entrada no diário."}</p>
            <p className="text-xs mt-1">Escreva sobre seu dia e ganhe XP por refletir!</p>
            {!search && <Button onClick={openCreate} size="sm" className="mt-4 gap-1.5"><Plus className="h-3.5 w-3.5" /> Primeira Entrada</Button>}
          </div>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display">{editing ? "Editar Entrada" : "Nova Entrada"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Título (opcional)</label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ex: Um dia produtivo..." />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Como está se sentindo?</label>
              <div className="flex gap-3 justify-center">
                {moodIcons.map((Icon, idx) => (
                  <button key={idx} onClick={() => setForm({ ...form, mood: idx + 1 })}
                    className={`flex flex-col items-center gap-1 rounded-xl p-2 border transition-all ${form.mood === idx + 1 ? "border-primary/40 bg-primary/10 scale-110" : "border-transparent hover:bg-secondary/50"}`}>
                    <Icon className={`h-6 w-6 ${moodColors[idx]}`} />
                    <span className="text-[8px] text-muted-foreground">{moodLabels[idx]}</span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">O que aconteceu hoje?</label>
              <textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} rows={5}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="Escreva sobre seu dia, reflexões, aprendizados..." />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-2 block">Tags</label>
              <div className="flex flex-wrap gap-1.5">
                {SUGGESTED_TAGS.map((tag) => (
                  <button key={tag} onClick={() => toggleTag(tag)}
                    className={`text-[10px] px-2 py-1 rounded-full border transition-all ${form.tags.includes(tag) ? "border-primary/30 bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground"}`}>
                    #{tag}
                  </button>
                ))}
              </div>
            </div>
            <Button onClick={save} className="w-full gap-1.5">
              <Save className="h-4 w-4" /> {editing ? "Salvar" : "Registrar Entrada"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        title="Excluir Entrada"
        description="Tem certeza que deseja excluir esta entrada do diário?"
        onConfirm={handleDelete}
        confirmLabel="Excluir"
      />
    </div>
  );
}
