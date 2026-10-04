import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles, Check, Plus, Loader2, ArrowRight, Target, Award, ListChecks, HelpCircle
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { generateQuestsFromGoal, GeneratedQuest } from "@/services/aiService";
import { useProfile, useTasks } from "@/hooks/useGameData";
import { toast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onQuestsAdded?: () => void;
}

export default function AiQuestGeneratorModal({ open, onOpenChange, onQuestsAdded }: Props) {
  const { profile } = useProfile();
  const { create } = useTasks();
  const [goal, setGoal] = useState("");
  const [loading, setLoading] = useState(false);
  const [generatedQuests, setGeneratedQuests] = useState<GeneratedQuest[]>([]);
  const [selectedQuests, setSelectedQuests] = useState<Record<number, boolean>>({});
  const [importing, setImporting] = useState(false);

  const handleGenerate = async () => {
    if (!goal.trim()) {
      toast({ title: "Digite um objetivo", description: "Escreva o que deseja alcançar.", variant: "destructive" });
      return;
    }

    setLoading(true);
    setGeneratedQuests([]);
    try {
      const quests = await generateQuestsFromGoal(goal, {
        displayName: profile?.display_name,
        archetype: profile?.archetype || "Guerreiro",
        level: profile?.level || 1,
      });

      setGeneratedQuests(quests);
      const initialSelected: Record<number, boolean> = {};
      quests.forEach((_, idx) => { initialSelected[idx] = true; });
      setSelectedQuests(initialSelected);
      toast({ title: "Missões geradas!", description: `${quests.length} missões táticas criadas pelo Oráculo.` });
    } catch (err: any) {
      toast({ title: "Erro ao gerar", description: err.message || "Tente novamente.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = (idx: number) => {
    setSelectedQuests(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  const handleImport = async () => {
    const toImport = generatedQuests.filter((_, idx) => selectedQuests[idx]);
    if (!toImport.length) {
      toast({ title: "Nenhuma missão selecionada", variant: "destructive" });
      return;
    }

    setImporting(true);
    let count = 0;
    try {
      // Get existing subtasks state
      const savedSubtasks: Record<string, any[]> = (() => {
        try {
          const raw = localStorage.getItem("nexus_quest_subtasks");
          return raw ? JSON.parse(raw) : {};
        } catch {
          return {};
        }
      })();

      for (const q of toImport) {
        const created = await create({
          title: q.title,
          category: q.category,
          difficulty: q.difficulty,
          priority: q.priority,
          xp_reward: q.xp_reward || 150,
        });

        if (created?.id && q.subtasks && q.subtasks.length > 0) {
          savedSubtasks[created.id] = q.subtasks.map((st, i) => ({
            id: `${created.id}-st-${i}`,
            text: st,
            done: false,
          }));
        }
        count++;
      }

      localStorage.setItem("nexus_quest_subtasks", JSON.stringify(savedSubtasks));
      toast({
        title: "Missões incorporadas ao seu Arsenal! ⚔️",
        description: `${count} novas missões gamificadas foram adicionadas à sua lista.`
      });
      onQuestsAdded?.();
      onOpenChange(false);
      setGeneratedQuests([]);
      setGoal("");
    } catch (err: any) {
      toast({ title: "Erro ao adicionar", description: err.message, variant: "destructive" });
    } finally {
      setImporting(false);
    }
  };

  const suggestions = [
    "Aprender a programar em Python em 30 dias",
    "Economizar R$ 3.000 para minha reserva",
    "Melhorar meu condicionamento e correr 5km",
    "Lançar meu primeiro projeto autoral",
    "Parar de procrastinar e blindar minha rotina matinal",
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-6 overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-display text-gradient-gold">
            <Sparkles className="h-5 w-5 text-amber-400 animate-pulse" />
            Gerador de Missões com Inteligência Artificial
          </DialogTitle>
          <DialogDescription>
            Diga ao Oráculo Nexus o que você deseja alcançar no mundo real e ele transformará seu objetivo em missões táticas com XP, níveis de dificuldade e sub-etapas.
          </DialogDescription>
        </DialogHeader>

        {/* Input section */}
        <div className="space-y-3 py-2">
          <div className="flex gap-2">
            <Input
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="Ex: Aprender inglês para conversar fluentemente, criar meu portfolio..."
              onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
              className="flex-1 bg-secondary/50 border-border focus-visible:ring-primary"
            />
            <Button
              onClick={handleGenerate}
              disabled={loading || !goal.trim()}
              className="bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5 shrink-0"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Gerando...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" /> Desmembrar com IA
                </>
              )}
            </Button>
          </div>

          {/* Quick suggestions */}
          {!generatedQuests.length && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              <span className="text-[11px] text-muted-foreground mr-1 self-center">Sugestões rápidas:</span>
              {suggestions.map((s, idx) => (
                <button
                  key={idx}
                  onClick={() => setGoal(s)}
                  className="text-[11px] px-2.5 py-1 rounded-full bg-secondary/80 hover:bg-primary/10 border border-border/60 hover:border-primary/40 text-muted-foreground hover:text-foreground transition-all"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Generated Quests Preview */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-thin my-2">
          <AnimatePresence>
            {generatedQuests.map((q, idx) => {
              const isSelected = !!selectedQuests[idx];
              return (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  onClick={() => toggleSelect(idx)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? "border-primary/50 bg-primary/5 shadow-sm"
                      : "border-border/60 bg-secondary/20 opacity-60 hover:opacity-90"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className={`mt-0.5 h-5 w-5 rounded-md border flex items-center justify-center transition-colors ${
                        isSelected ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground"
                      }`}>
                        {isSelected && <Check className="h-3.5 w-3.5" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-semibold text-sm text-foreground">{q.title}</h4>
                          <Badge variant="outline" className="text-[10px] uppercase font-bold text-primary border-primary/30">
                            +{q.xp_reward} XP
                          </Badge>
                          <Badge variant="secondary" className="text-[10px] uppercase">
                            {q.difficulty}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                          {q.description}
                        </p>
                      </div>
                    </div>
                  </div>

                  {q.subtasks && q.subtasks.length > 0 && (
                    <div className="mt-3 pt-2.5 border-t border-border/40 pl-8 space-y-1">
                      <p className="text-[11px] font-medium text-foreground flex items-center gap-1 mb-1">
                        <ListChecks className="h-3 w-3 text-primary" /> Passos de execução:
                      </p>
                      {q.subtasks.map((st, sIdx) => (
                        <div key={sIdx} className="text-[11px] text-muted-foreground flex items-center gap-2">
                          <span className="h-1.5 w-1.5 rounded-full bg-primary/70 shrink-0" />
                          <span>{st}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Footer actions */}
        {generatedQuests.length > 0 && (
          <div className="pt-3 border-t border-border flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              {Object.values(selectedQuests).filter(Boolean).length} de {generatedQuests.length} missões selecionadas
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={handleImport}
                disabled={importing || !Object.values(selectedQuests).some(Boolean)}
                className="bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5"
              >
                {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Adicionar ao Meu Arsenal
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
