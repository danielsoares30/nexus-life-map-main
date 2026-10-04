import { useState } from "react";
import { motion } from "framer-motion";
import {
  Sparkles, Mountain, ShieldAlert, Swords, Flame, Loader2, Check, RefreshCw, Volume2
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { generateCaveWarriorAdvice } from "@/services/aiService";
import { useProfile } from "@/hooks/useGameData";
import { toast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dayNumber: number;
}

export default function AiCaveAdvisorModal({ open, onOpenChange, dayNumber }: Props) {
  const { profile } = useProfile();
  const [obstacle, setObstacle] = useState("");
  const [loading, setLoading] = useState(false);
  const [advice, setAdvice] = useState<string | null>(null);

  const predefinedObstacles = [
    "Vontade intensa de abrir redes sociais ou distrações",
    "Sensação de cansaço mental e procrastinação",
    "Perda momentânea da clareza do meu propósito",
    "Dificuldade de entrar em estado de hiperfoco",
  ];

  const handleConsult = async (selectedObstacle?: string) => {
    const obstacleToUse = selectedObstacle !== undefined ? selectedObstacle : obstacle;
    setLoading(true);
    try {
      const res = await generateCaveWarriorAdvice(
        dayNumber || 1,
        profile?.archetype || "Guerreiro",
        obstacleToUse
      );
      setAdvice(res);
    } catch (err: any) {
      toast({ title: "Erro na consulta", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[85vh] flex flex-col p-6 overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-display text-gradient-gold">
            <Mountain className="h-5 w-5 text-amber-400" />
            Oráculo da Caverna • Guardião Estoico
          </DialogTitle>
          <DialogDescription>
            Dia {dayNumber || 1} de Isolamento. Consulte o guardião quando a fraqueza mental tentar sabotar sua disciplina inegociável.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 flex-1 overflow-y-auto pr-1 scrollbar-thin">
          {!advice ? (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-foreground mb-2 block">
                  Qual tentação ou obstáculo está ameaçando seu dia na Caverna?
                </label>
                <div className="space-y-2">
                  {predefinedObstacles.map((obs, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setObstacle(obs);
                        handleConsult(obs);
                      }}
                      disabled={loading}
                      className="w-full text-left p-3 rounded-xl border border-border/80 bg-secondary/30 hover:bg-primary/10 hover:border-primary/40 text-xs text-foreground transition-all flex items-center justify-between group"
                    >
                      <span>{obs}</span>
                      <Flame className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2">
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Ou relate com suas próprias palavras:</label>
                <div className="flex gap-2">
                  <Input
                    value={obstacle}
                    onChange={(e) => setObstacle(e.target.value)}
                    placeholder="Ex: Estou há 1 hora travado na mesma tarefa..."
                    className="text-xs bg-secondary/50 border-border"
                    onKeyDown={(e) => e.key === "Enter" && handleConsult()}
                  />
                  <Button
                    onClick={() => handleConsult()}
                    disabled={loading}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs shrink-0"
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Swords className="h-4 w-4 mr-1" />}
                    Consultar
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-xl border border-primary/30 bg-gradient-to-b from-primary/10 via-secondary/20 to-background p-4 leading-relaxed text-xs sm:text-sm text-foreground space-y-3 shadow-inner">
                <div className="whitespace-pre-wrap font-sans leading-relaxed select-text">
                  {advice}
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAdvice(null)}
                  className="text-xs gap-1"
                >
                  <RefreshCw className="h-3.5 w-3.5" /> Outro Obstáculo
                </Button>
                <Button
                  size="sm"
                  onClick={() => onOpenChange(false)}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs"
                >
                  <Check className="h-3.5 w-3.5 mr-1" /> Voltar ao Combate
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
