import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Sparkles, ShieldCheck, AlertTriangle, TrendingUp, CheckCircle,
  Lightbulb, ArrowUpRight, DollarSign, Wallet, RefreshCw, Loader2, Copy, Check
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { generateFinancialDiagnosis, FinanceAuditResult } from "@/services/aiService";
import { toast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  financeData: {
    balance: number;
    totalIncome: number;
    totalExpenses: number;
    emergencyFund: number;
    debts?: any[];
  };
}

export default function AiFinanceAuditModal({ open, onOpenChange, financeData }: Props) {
  const [loading, setLoading] = useState(false);
  const [audit, setAudit] = useState<FinanceAuditResult | null>(null);
  const [copied, setCopied] = useState(false);

  const runAudit = async () => {
    setLoading(true);
    try {
      const res = await generateFinancialDiagnosis(financeData);
      setAudit(res);
    } catch (err: any) {
      toast({ title: "Erro na Auditoria", description: err.message || "Tente novamente", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && !audit) {
      runAudit();
    }
  }, [open]);

  const copyReport = () => {
    if (!audit) return;
    const text = `📊 DIAGNÓSTICO FINANCEIRO NEXUS - ${audit.title}
Nota de Saúde: ${audit.score}/100
Resumo: ${audit.summary}

Pontos Fortes:
${audit.strengths.map(s => `• ${s}`).join("\n")}

Vulnerabilidades:
${audit.vulnerabilities.map(v => `• ${v}`).join("\n")}

Passos de Ação:
${audit.actionSteps.map(a => `• [${a.priority.toUpperCase()}] ${a.action} (${a.impact})`).join("\n")}

Reserva de Emergência: ${audit.emergencyFundAdvice}
Estratégia de Dívidas: ${audit.debtStrategy}`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Relatório copiado com sucesso!" });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[88vh] flex flex-col p-6 overflow-hidden">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-xl font-display text-gradient-gold">
              <Sparkles className="h-5 w-5 text-amber-400 animate-pulse" />
              Diagnóstico Financeiro com Inteligência Artificial
            </DialogTitle>
            {audit && (
              <Button
                variant="ghost"
                size="sm"
                onClick={runAudit}
                disabled={loading}
                className="h-8 text-xs gap-1 text-muted-foreground hover:text-foreground"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Recalcular
              </Button>
            )}
          </div>
          <DialogDescription>
            Auditoria algorítmica profunda baseada em suas receitas, despesas, reserva de segurança e passivos cadastrados.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 space-y-4">
            <div className="relative">
              <div className="h-16 w-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
              <DollarSign className="h-7 w-7 text-primary absolute inset-0 m-auto" />
            </div>
            <p className="text-sm font-medium text-foreground">O Oráculo está auditando suas finanças...</p>
            <p className="text-xs text-muted-foreground">Cruzando fluxo de caixa, taxa de poupança e índice de endividamento</p>
          </div>
        ) : audit ? (
          <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-thin my-2">
            {/* Score Banner */}
            <div className="rounded-xl border border-primary/30 bg-gradient-to-r from-primary/10 via-secondary/40 to-background p-4 flex items-center justify-between gap-4">
              <div>
                <span className="text-[11px] font-semibold tracking-wider uppercase text-primary">Score de Saúde Financeira</span>
                <h3 className="text-lg font-bold text-foreground mt-0.5">{audit.title}</h3>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed max-w-md">
                  {audit.summary}
                </p>
              </div>
              <div className="flex flex-col items-center justify-center h-20 w-20 shrink-0 rounded-2xl bg-background border border-primary/40 shadow-inner">
                <span className="text-2xl font-black text-primary font-display">{audit.score}</span>
                <span className="text-[10px] text-muted-foreground font-medium">/ 100</span>
              </div>
            </div>

            {/* Strengths & Weaknesses Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3.5 space-y-2">
                <h4 className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle className="h-4 w-4" /> Pontos Fortes do Caixa
                </h4>
                <ul className="space-y-1.5 text-xs text-muted-foreground">
                  {audit.strengths.map((s, idx) => (
                    <li key={idx} className="flex items-start gap-1.5">
                      <span className="text-emerald-400 font-bold">•</span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3.5 space-y-2">
                <h4 className="text-xs font-semibold text-amber-400 flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4" /> Pontos de Atenção & Vazamentos
                </h4>
                <ul className="space-y-1.5 text-xs text-muted-foreground">
                  {audit.vulnerabilities.map((v, idx) => (
                    <li key={idx} className="flex items-start gap-1.5">
                      <span className="text-amber-400 font-bold">•</span>
                      <span>{v}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Action Steps */}
            <div className="rounded-xl border border-border bg-secondary/30 p-4 space-y-3">
              <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Lightbulb className="h-4 w-4 text-primary" /> Passos Táticos Imediatos
              </h4>
              <div className="space-y-2">
                {audit.actionSteps.map((step, idx) => (
                  <div key={idx} className="flex items-start justify-between gap-3 p-2.5 rounded-lg bg-background/60 border border-border/60">
                    <div className="flex-1">
                      <p className="text-xs font-medium text-foreground">{step.action}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">Impacto: {step.impact}</p>
                    </div>
                    <Badge variant={step.priority === "alta" ? "destructive" : "secondary"} className="text-[10px] shrink-0 uppercase">
                      {step.priority}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>

            {/* Emergency Fund & Debt Recommendations */}
            <div className="rounded-xl border border-border/70 bg-background/50 p-4 space-y-3">
              <div>
                <h5 className="text-xs font-semibold text-primary flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4" /> Diretiva da Reserva de Emergência
                </h5>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  {audit.emergencyFundAdvice}
                </p>
              </div>

              <div className="pt-2 border-t border-border/50">
                <h5 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <TrendingUp className="h-4 w-4 text-primary" /> Estratégia de Passivos & Investimentos
                </h5>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  {audit.debtStrategy}
                </p>
              </div>
            </div>
          </div>
        ) : null}

        {audit && (
          <div className="pt-3 border-t border-border flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={copyReport}
              className="text-xs gap-1.5"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copiado!" : "Copiar Relatório Completo"}
            </Button>
            <Button
              size="sm"
              onClick={() => onOpenChange(false)}
              className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs"
            >
              Entendido
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
