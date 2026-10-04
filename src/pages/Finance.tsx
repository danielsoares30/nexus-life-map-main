import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  DollarSign, TrendingUp, TrendingDown, PiggyBank, Target, Plus, Trash2, Edit3, Landmark,
  Flame, Shield, BarChart2, Calculator, Crown, Trophy, AlertTriangle,
  CheckCircle2, Info, Sparkles, ArrowUpRight, Percent, Clock, RefreshCw,
  CreditCard, AlertCircle, Wallet, Bell, XCircle, TrendingUp as TrendUp, Zap
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useFinancialEntries, useFinancialGoals, useInvestments } from "@/hooks/useGameData";

// ---- Debt types ----
type Debt = {
  id: string;
  name: string;
  type: string;
  total: number;
  remaining: number;
  monthlyPayment: number;
  interestRate: number;
  dueDay: number;
};

const DEBT_TYPES = [
  { value: "cartao", label: "Cartão de Crédito", icon: "💳" },
  { value: "emprestimo", label: "Empréstimo", icon: "🏦" },
  { value: "financiamento", label: "Financiamento", icon: "🏠" },
  { value: "cheque", label: "Cheque Especial", icon: "📝" },
  { value: "consignado", label: "Consignado", icon: "👔" },
  { value: "outro", label: "Outro", icon: "💸" },
];

function loadDebts(): Debt[] {
  try { return JSON.parse(localStorage.getItem("nexus_debts") || "[]"); } catch { return []; }
}
function saveDebts(d: Debt[]) {
  localStorage.setItem("nexus_debts", JSON.stringify(d));
}

// ---- Constants ----
const INVESTMENT_TYPES = [
  { value: "renda_fixa", label: "Renda Fixa", icon: "🏦" },
  { value: "acoes", label: "Ações", icon: "📈" },
  { value: "fii", label: "FIIs", icon: "🏢" },
  { value: "cripto", label: "Cripto", icon: "₿" },
  { value: "tesouro", label: "Tesouro Direto", icon: "🇧🇷" },
  { value: "poupanca", label: "Poupança", icon: "🐷" },
  { value: "outro", label: "Outro", icon: "💼" },
];

const FI_LEVELS = [
  { min: 0,   max: 10,  label: "Sobrevivente",  icon: "🌱", color: "text-red-400",    bg: "bg-red-500/10",    desc: "Construa sua reserva de emergência primeiro." },
  { min: 10,  max: 25,  label: "Estável",        icon: "🛡️", color: "text-orange-400", bg: "bg-orange-500/10", desc: "Reserva garantida. Hora de começar a investir!" },
  { min: 25,  max: 50,  label: "Construtor",     icon: "⚡", color: "text-yellow-400", bg: "bg-yellow-500/10", desc: "Você investe regularmente. Continue!" },
  { min: 50,  max: 75,  label: "Acelerado",      icon: "🚀", color: "text-blue-400",   bg: "bg-blue-500/10",  desc: "Patrimônio crescendo forte. Metade do caminho!" },
  { min: 75,  max: 100, label: "Pré-FIRE",       icon: "🔥", color: "text-purple-400", bg: "bg-purple-500/10", desc: "Quase lá! Mantenha a disciplina." },
  { min: 100, max: Infinity, label: "FIRE 🏆",   icon: "👑", color: "text-amber-400",  bg: "bg-amber-500/10", desc: "Você atingiu a Independência Financeira!" },
];

const EXPENSE_CATEGORIES_50 = ["moradia", "alimentação", "saúde", "transporte", "educação", "serviços essenciais"];
const EXPENSE_CATEGORIES_30 = ["lazer", "restaurantes", "assinaturas", "roupas", "viagens", "entretenimento"];

const fmt = (n: number) =>
  n.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

const fmtFull = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

// ---- Helpers ----
function yearsToFIRE(currentPatrimony: number, fireNumber: number, monthlyContrib: number, annualReturn: number): number {
  if (fireNumber <= 0 || currentPatrimony >= fireNumber) return 0;
  if (monthlyContrib <= 0 && annualReturn <= 0) return Infinity;
  const r = annualReturn / 100 / 12;
  if (r <= 0) {
    if (monthlyContrib <= 0) return Infinity;
    return Math.ceil((fireNumber - currentPatrimony) / monthlyContrib / 12);
  }
  // FV = P*(1+r)^n + PMT*((1+r)^n - 1)/r  => solve for n
  // Binary search
  let lo = 0, hi = 600;
  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2;
    const fv = currentPatrimony * Math.pow(1 + r, mid) + monthlyContrib * (Math.pow(1 + r, mid) - 1) / r;
    if (fv >= fireNumber) hi = mid;
    else lo = mid;
  }
  return hi / 12;
}

// ---- Main Component ----
export default function Finance() {
  const { entries, loading: loadingEntries, create: createEntry, update: updateEntry, remove: removeEntry } = useFinancialEntries();
  const { goals, loading: loadingGoals, create: createGoal, update: updateGoal, remove: removeGoal } = useFinancialGoals();
  const { investments, loading: loadingInvestments, create: createInvestment, update: updateInvestment, remove: removeInvestment } = useInvestments();

  const [entryDialog, setEntryDialog] = useState(false);
  const [goalDialog, setGoalDialog] = useState(false);
  const [investmentDialog, setInvestmentDialog] = useState(false);
  const [editingEntry, setEditingEntry] = useState<any>(null);
  const [editingGoal, setEditingGoal] = useState<any>(null);
  const [editingInvestment, setEditingInvestment] = useState<any>(null);
  const [entryForm, setEntryForm] = useState({ type: "expense", category: "", description: "", amount: "", date: new Date().toISOString().split("T")[0] });
  const [goalForm, setGoalForm] = useState({ name: "", target_amount: "", current_amount: "0" });
  const [investmentForm, setInvestmentForm] = useState({ name: "", type: "outro", amount_invested: "", current_value: "" });

  // ---- Derived numbers ----
  const income = entries.filter(e => e.type === "income").reduce((s, e) => s + Number(e.amount), 0);
  const expenses = entries.filter(e => e.type === "expense").reduce((s, e) => s + Number(e.amount), 0);
  const balance = income - expenses;
  const savingsRate = income > 0 ? ((income - expenses) / income) * 100 : 0;

  const totalInvested = investments.reduce((s, inv) => s + Number(inv.amount_invested), 0);
  const totalCurrentValue = investments.reduce((s, inv) => s + Number(inv.current_value), 0);
  const investmentReturn = totalInvested > 0 ? ((totalCurrentValue - totalInvested) / totalInvested) * 100 : 0;

  const expensesByCategory: Record<string, number> = {};
  entries.filter(e => e.type === "expense").forEach(e => {
    expensesByCategory[e.category] = (expensesByCategory[e.category] || 0) + Number(e.amount);
  });

  // ---- FIRE state (localStorage) ----
  const loadFire = () => {
    try { return JSON.parse(localStorage.getItem("nexus_fire_config") || "{}"); } catch { return {}; }
  };
  const [fireConfig, setFireConfigRaw] = useState<Record<string, string>>(() => ({
    patrimony: "",
    annualReturn: "8",
    monthlyExpenses: "",
    monthlyIncome: "",
    ...loadFire(),
  }));
  const setFireConfig = (upd: Partial<Record<string, string>>) => {
    const next = { ...fireConfig, ...upd };
    setFireConfigRaw(next);
    localStorage.setItem("nexus_fire_config", JSON.stringify(next));
  };

  // Use registry data as fallback
  const fireMonthlyExpenses = Number(fireConfig.monthlyExpenses) || expenses;
  const fireMonthlyIncome = Number(fireConfig.monthlyIncome) || income;
  const firePatrimony = Number(fireConfig.patrimony) || totalCurrentValue;
  const fireAnnualReturn = Number(fireConfig.annualReturn) || 8;

  const fireNumber = fireMonthlyExpenses * 12 * 25;
  const fireSavingsRate = fireMonthlyIncome > 0 ? ((fireMonthlyIncome - fireMonthlyExpenses) / fireMonthlyIncome) * 100 : 0;
  const fireMonthlyContrib = fireMonthlyIncome - fireMonthlyExpenses;
  const fireYears = yearsToFIRE(firePatrimony, fireNumber, fireMonthlyContrib, fireAnnualReturn);
  const fiScore = fireNumber > 0 ? Math.min((firePatrimony / fireNumber) * 100, 100) : 0;
  const currentLevel = FI_LEVELS.find(l => fiScore >= l.min && fiScore < l.max) || FI_LEVELS[0];

  // ---- Compound Interest Simulator (localStorage) ----
  const loadSim = () => { try { return JSON.parse(localStorage.getItem("nexus_sim_config") || "{}"); } catch { return {}; } };
  const [simConfig, setSimConfigRaw] = useState(() => ({ monthlyContrib: "500", annualRate: "10", years: "20", ...loadSim() }));
  const setSimConfig = (upd: any) => { const n = { ...simConfig, ...upd }; setSimConfigRaw(n); localStorage.setItem("nexus_sim_config", JSON.stringify(n)); };

  const simData = useMemo(() => {
    const pmt = Number(simConfig.monthlyContrib) || 0;
    const r = (Number(simConfig.annualRate) || 0) / 100 / 12;
    const totalMonths = (Number(simConfig.years) || 0) * 12;
    const points: { year: number; total: number; invested: number; returns: number }[] = [];
    let total = 0;
    for (let m = 1; m <= totalMonths; m++) {
      total = total * (1 + r) + pmt;
      if (m % 12 === 0) {
        const invested = pmt * m;
        points.push({ year: m / 12, total: Math.round(total), invested: Math.round(invested), returns: Math.round(total - invested) });
      }
    }
    return points;
  }, [simConfig.monthlyContrib, simConfig.annualRate, simConfig.years]);

  const simMax = simData.length > 0 ? Math.max(...simData.map(d => d.total), 1) : 1;
  const simFinal = simData[simData.length - 1];

  // ---- 50/30/20 Budget ----
  const needs = Object.entries(expensesByCategory)
    .filter(([cat]) => EXPENSE_CATEGORIES_50.some(k => cat.toLowerCase().includes(k)))
    .reduce((s, [, v]) => s + v, 0);
  const wants = Object.entries(expensesByCategory)
    .filter(([cat]) => EXPENSE_CATEGORIES_30.some(k => cat.toLowerCase().includes(k)))
    .reduce((s, [, v]) => s + v, 0);
  const savings_actual = balance > 0 ? balance : 0;

  const needsLimit = income * 0.5;
  const wantsLimit = income * 0.3;
  const savingsLimit = income * 0.2;

  // ---- Handlers ----
  const openAddEntry = (type: string) => {
    setEditingEntry(null);
    setEntryForm({ type, category: "", description: "", amount: "", date: new Date().toISOString().split("T")[0] });
    setEntryDialog(true);
  };
  const openEditEntry = (e: any) => {
    setEditingEntry(e);
    setEntryForm({ type: e.type, category: e.category, description: e.description, amount: e.amount.toString(), date: e.date });
    setEntryDialog(true);
  };
  const saveEntry = async () => {
    if (!entryForm.description || !entryForm.amount) return;
    const data = { type: entryForm.type, category: entryForm.category || "outros", description: entryForm.description, amount: Number(entryForm.amount), date: entryForm.date };
    if (editingEntry) { await updateEntry(editingEntry.id, data); } else { await createEntry(data); }
    setEntryDialog(false);
  };
  const openAddGoal = () => { setEditingGoal(null); setGoalForm({ name: "", target_amount: "", current_amount: "0" }); setGoalDialog(true); };
  const openEditGoal = (g: any) => { setEditingGoal(g); setGoalForm({ name: g.name, target_amount: g.target_amount.toString(), current_amount: g.current_amount.toString() }); setGoalDialog(true); };
  const saveGoal = async () => {
    if (!goalForm.name || !goalForm.target_amount) return;
    const data = { name: goalForm.name, target_amount: Number(goalForm.target_amount), current_amount: Number(goalForm.current_amount) };
    if (editingGoal) { await updateGoal(editingGoal.id, data); } else { await createGoal(data); }
    setGoalDialog(false);
  };
  const openAddInvestment = () => { setEditingInvestment(null); setInvestmentForm({ name: "", type: "outro", amount_invested: "", current_value: "" }); setInvestmentDialog(true); };
  const openEditInvestment = (inv: any) => {
    setEditingInvestment(inv);
    setInvestmentForm({ name: inv.name, type: inv.type, amount_invested: inv.amount_invested.toString(), current_value: inv.current_value.toString() });
    setInvestmentDialog(true);
  };
  const saveInvestment = async () => {
    if (!investmentForm.name || !investmentForm.amount_invested) return;
    const data = { name: investmentForm.name, type: investmentForm.type, amount_invested: Number(investmentForm.amount_invested), current_value: Number(investmentForm.current_value) || Number(investmentForm.amount_invested) };
    if (editingInvestment) { await updateInvestment(editingInvestment.id, data); } else { await createInvestment(data); }
    setInvestmentDialog(false);
  };

  if (loadingEntries || loadingGoals || loadingInvestments) {
    return (
      <div className="max-w-5xl mx-auto flex items-center justify-center py-20">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-xl border border-border bg-gradient-to-br from-card via-secondary/30 to-card p-6">
        <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(circle_at_70%_30%,hsl(43_96%_56%/.6),transparent_60%)]" />
        <div className="relative flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-bold text-gradient-gold">Independência Financeira</h1>
            <p className="text-sm text-muted-foreground mt-1">Transforme cada real em um passo rumo à liberdade.</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button onClick={() => openAddEntry("income")} size="sm" variant="outline" className="gap-1.5 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10">
              <TrendingUp className="h-4 w-4" /> Receita
            </Button>
            <Button onClick={() => openAddEntry("expense")} size="sm" variant="outline" className="gap-1.5 border-destructive/40 text-destructive hover:bg-destructive/10">
              <TrendingDown className="h-4 w-4" /> Despesa
            </Button>
            <Button onClick={openAddInvestment} size="sm" className="gap-1.5">
              <Landmark className="h-4 w-4" /> Investimento
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Top KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Receita", value: fmtFull(income), icon: TrendingUp, color: "text-emerald-400", sub: "este mês" },
          { label: "Despesas", value: fmtFull(expenses), icon: TrendingDown, color: "text-destructive", sub: "este mês" },
          { label: "Saldo Livre", value: fmtFull(balance), icon: DollarSign, color: balance >= 0 ? "text-primary" : "text-destructive", sub: balance >= 0 ? "disponível" : "negativo!" },
          { label: "Taxa de Poupança", value: `${savingsRate.toFixed(1)}%`, icon: Percent, color: savingsRate >= 20 ? "text-emerald-400" : savingsRate >= 10 ? "text-amber-400" : "text-destructive", sub: savingsRate >= 20 ? "✓ Ideal" : "< 20% ideal" },
        ].map((kpi, i) => (
          <motion.div key={kpi.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
            className="rounded-xl border border-border bg-card p-4 hover:border-primary/20 transition-all">
            <div className="flex items-center gap-2 mb-2">
              <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{kpi.label}</span>
            </div>
            <p className={`text-lg font-bold font-display ${kpi.color}`}>{kpi.value}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{kpi.sub}</p>
          </motion.div>
        ))}
      </div>

      {/* FI Score Banner */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className={`rounded-xl border p-5 ${currentLevel.bg} border-amber-500/20 relative overflow-hidden`}>
        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-7xl opacity-10 select-none pointer-events-none">
          {currentLevel.icon}
        </div>
        <div className="flex items-center gap-6 flex-wrap">
          {/* Circular FI Score */}
          <div className="relative shrink-0">
            <svg width="90" height="90" className="rotate-[-90deg]">
              <circle cx="45" cy="45" r="38" fill="none" stroke="hsl(var(--secondary))" strokeWidth="7" />
              <circle cx="45" cy="45" r="38" fill="none" stroke="hsl(43 96% 56%)" strokeWidth="7" strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 38}`}
                strokeDashoffset={`${2 * Math.PI * 38 * (1 - fiScore / 100)}`}
                className="transition-all duration-1000" />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center rotate-0">
              <span className="text-base font-bold font-display text-amber-400">{fiScore.toFixed(0)}%</span>
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">{currentLevel.icon}</span>
              <h3 className="font-display text-lg font-bold text-foreground">FI Score — {currentLevel.label}</h3>
            </div>
            <p className="text-sm text-muted-foreground">{currentLevel.desc}</p>
            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
              <span>Patrimônio: <b className="text-foreground">{fmtFull(firePatrimony)}</b></span>
              <span>Meta FIRE: <b className="text-amber-400">{fmtFull(fireNumber)}</b></span>
              {fireYears < 200 && <span>Previsão: <b className="text-primary">{fireYears.toFixed(1)} anos</b></span>}
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            {FI_LEVELS.slice(0, 5).map((lv) => (
              <div key={lv.label} className={`flex items-center gap-1.5 text-[10px] ${fiScore >= lv.min ? lv.color : "text-muted-foreground/40"}`}>
                <span>{fiScore >= lv.min ? "●" : "○"}</span>
                <span>{lv.label}</span>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Main Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid grid-cols-5 w-full">
          <TabsTrigger value="overview" className="text-xs gap-1"><BarChart2 className="h-3.5 w-3.5" />Geral</TabsTrigger>
          <TabsTrigger value="fire" className="text-xs gap-1"><Flame className="h-3.5 w-3.5" />FIRE</TabsTrigger>
          <TabsTrigger value="budget" className="text-xs gap-1"><Percent className="h-3.5 w-3.5" />Orçamento</TabsTrigger>
          <TabsTrigger value="debts" className="text-xs gap-1"><CreditCard className="h-3.5 w-3.5" />Dívidas</TabsTrigger>
          <TabsTrigger value="simulator" className="text-xs gap-1"><Calculator className="h-3.5 w-3.5" />Simulador</TabsTrigger>
        </TabsList>

        {/* ---- TAB: OVERVIEW ---- */}
        <TabsContent value="overview" className="mt-4 space-y-4">
          {/* Investments */}
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Landmark className="h-4 w-4 text-primary" />
                <h3 className="font-display text-base font-semibold">Meus Investimentos</h3>
              </div>
              <Button onClick={openAddInvestment} size="sm" variant="ghost" className="gap-1 h-7 text-xs"><Plus className="h-3.5 w-3.5" /> Novo</Button>
            </div>
            {investments.length > 0 && (
              <div className="grid grid-cols-3 gap-3 mb-4">
                {[
                  { label: "Investido", value: fmtFull(totalInvested), color: "text-foreground" },
                  { label: "Valor Atual", value: fmtFull(totalCurrentValue), color: "text-emerald-400" },
                  { label: "Rentabilidade", value: `${investmentReturn >= 0 ? "+" : ""}${investmentReturn.toFixed(1)}%`, color: investmentReturn >= 0 ? "text-emerald-400" : "text-destructive" },
                ].map(k => (
                  <div key={k.label} className="rounded-lg bg-background/60 border border-border p-3 text-center">
                    <p className="text-[10px] text-muted-foreground">{k.label}</p>
                    <p className={`text-sm font-bold ${k.color}`}>{k.value}</p>
                  </div>
                ))}
              </div>
            )}
            {investments.length === 0 ? (
              <div className="text-center py-6">
                <Landmark className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">Nenhum investimento registrado ainda.</p>
                <Button size="sm" onClick={openAddInvestment} className="mt-3 gap-1.5"><Plus className="h-3.5 w-3.5" /> Adicionar Primeiro</Button>
              </div>
            ) : (
              <div className="space-y-2">
                {investments.map((inv) => {
                  const retPct = Number(inv.amount_invested) > 0 ? ((Number(inv.current_value) - Number(inv.amount_invested)) / Number(inv.amount_invested)) * 100 : 0;
                  const typeInfo = INVESTMENT_TYPES.find(t => t.value === inv.type);
                  const pct = totalCurrentValue > 0 ? (Number(inv.current_value) / totalCurrentValue) * 100 : 0;
                  return (
                    <div key={inv.id} className="flex items-center gap-3 rounded-lg bg-background/60 border border-border px-4 py-3 group hover:border-primary/20 transition-all">
                      <span className="text-lg shrink-0">{typeInfo?.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium">{inv.name}</span>
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-secondary border border-border text-muted-foreground">{typeInfo?.label}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] text-muted-foreground">Investido: {fmtFull(Number(inv.amount_invested))}</span>
                          <span className="text-[10px] text-muted-foreground">Atual: {fmtFull(Number(inv.current_value))}</span>
                          <span className={`text-[10px] font-bold ${retPct >= 0 ? "text-emerald-400" : "text-destructive"}`}>{retPct >= 0 ? "+" : ""}{retPct.toFixed(1)}%</span>
                        </div>
                        <div className="mt-1.5 h-1 bg-secondary rounded-full overflow-hidden">
                          <div className="h-full bg-primary/60 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                      <span className="text-[10px] text-muted-foreground shrink-0">{pct.toFixed(0)}%</span>
                      <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openEditInvestment(inv)} className="p-1 rounded hover:bg-secondary"><Edit3 className="h-3 w-3 text-muted-foreground" /></button>
                        <button onClick={() => removeInvestment(inv.id)} className="p-1 rounded hover:bg-destructive/20"><Trash2 className="h-3 w-3 text-destructive" /></button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Emergency Fund */}
          <EmergencyFundCard expenses={expenses} currentValue={totalCurrentValue} />

          {/* Goals + Expense breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-xl border border-border bg-card p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2"><Target className="h-4 w-4 text-primary" /><h3 className="font-display text-sm font-semibold">Metas Financeiras</h3></div>
                <Button onClick={openAddGoal} size="sm" variant="ghost" className="gap-1 h-7 text-xs"><Plus className="h-3.5 w-3.5" /> Nova</Button>
              </div>
              {goals.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">Nenhuma meta criada.</p>
              ) : goals.map((goal) => {
                const pct = Number(goal.target_amount) > 0 ? (Number(goal.current_amount) / Number(goal.target_amount)) * 100 : 0;
                return (
                  <div key={goal.id} className="rounded-lg bg-secondary/40 border border-border p-4 group">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <PiggyBank className="h-4 w-4 text-emerald-400" />
                        <span className="text-sm font-medium">{goal.name}</span>
                      </div>
                      <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openEditGoal(goal)} className="p-0.5 rounded hover:bg-secondary"><Edit3 className="h-3 w-3 text-muted-foreground" /></button>
                        <button onClick={() => removeGoal(goal.id)} className="p-0.5 rounded hover:bg-destructive/20"><Trash2 className="h-3 w-3 text-destructive" /></button>
                      </div>
                    </div>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-muted-foreground">{fmtFull(Number(goal.current_amount))} / {fmtFull(Number(goal.target_amount))}</span>
                      <span className={`font-bold ${pct >= 100 ? "text-emerald-400" : "text-primary"}`}>{pct.toFixed(0)}%</span>
                    </div>
                    <div className="h-2.5 bg-secondary rounded-full overflow-hidden">
                      <motion.div className="h-full bg-emerald-500 rounded-full" initial={{ width: 0 }} animate={{ width: `${Math.min(pct, 100)}%` }} transition={{ duration: 0.8 }} />
                    </div>
                    {pct >= 100 && <p className="text-[10px] text-emerald-400 mt-1.5">🎉 Meta atingida!</p>}
                  </div>
                );
              })}
            </div>

            <div className="rounded-xl border border-border bg-card p-5">
              <h3 className="font-display text-sm font-semibold mb-4 flex items-center gap-2"><BarChart2 className="h-4 w-4 text-primary" />Despesas por Categoria</h3>
              {Object.keys(expensesByCategory).length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">Nenhuma despesa registrada.</p>
              ) : (
                <div className="space-y-2.5">
                  {Object.entries(expensesByCategory).sort((a, b) => b[1] - a[1]).map(([cat, amount]) => {
                    const pct = expenses > 0 ? (amount / expenses) * 100 : 0;
                    return (
                      <div key={cat} className="flex items-center gap-3">
                        <span className="text-xs text-foreground/80 w-24 capitalize truncate">{cat}</span>
                        <div className="flex-1 h-2.5 bg-secondary rounded-full overflow-hidden">
                          <div className="h-full bg-primary/70 rounded-full transition-all" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-[10px] text-muted-foreground w-20 text-right">{fmtFull(amount)}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Recent Entries */}
          {entries.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-5">
              <h3 className="font-display text-sm font-semibold mb-4">Últimos Lançamentos</h3>
              <div className="space-y-1.5">
                {entries.slice(0, 12).map(entry => (
                  <div key={entry.id} className="flex items-center gap-3 group rounded-lg px-3 py-2 hover:bg-secondary/30 transition-colors">
                    {entry.type === "income"
                      ? <TrendingUp className="h-4 w-4 text-emerald-400 shrink-0" />
                      : <TrendingDown className="h-4 w-4 text-destructive shrink-0" />}
                    <span className="text-sm text-foreground flex-1 truncate">{entry.description}</span>
                    <span className="text-[10px] text-muted-foreground capitalize hidden sm:block">{entry.category}</span>
                    <span className={`text-sm font-semibold shrink-0 ${entry.type === "income" ? "text-emerald-400" : "text-destructive"}`}>
                      {entry.type === "income" ? "+" : "-"}{fmtFull(Number(entry.amount))}
                    </span>
                    <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openEditEntry(entry)} className="p-0.5 rounded hover:bg-secondary"><Edit3 className="h-3 w-3 text-muted-foreground" /></button>
                      <button onClick={() => removeEntry(entry.id)} className="p-0.5 rounded hover:bg-destructive/20"><Trash2 className="h-3 w-3 text-destructive" /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        {/* ---- TAB: FIRE ---- */}
        <TabsContent value="fire" className="mt-4 space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Config */}
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5 space-y-4">
              <h3 className="font-display text-base font-semibold flex items-center gap-2">
                <Flame className="h-5 w-5 text-amber-400" /> Configurar Calculadora FIRE
              </h3>
              <p className="text-xs text-muted-foreground">Os dados dos seus lançamentos são usados automaticamente, mas você pode sobrescrever aqui.</p>
              {[
                { key: "monthlyIncome", label: "Renda Mensal (R$)", placeholder: `${fmt(income)} (do registro)`, type: "number" },
                { key: "monthlyExpenses", label: "Despesas Mensais (R$)", placeholder: `${fmt(expenses)} (do registro)`, type: "number" },
                { key: "patrimony", label: "Patrimônio Atual (R$)", placeholder: `${fmt(totalCurrentValue)} (investimentos)`, type: "number" },
                { key: "annualReturn", label: "Retorno Esperado (% a.a.)", placeholder: "8", type: "number" },
              ].map(field => (
                <div key={field.key}>
                  <label className="text-xs text-muted-foreground mb-1 block">{field.label}</label>
                  <Input
                    type={field.type}
                    value={fireConfig[field.key] || ""}
                    onChange={e => setFireConfig({ [field.key]: e.target.value })}
                    placeholder={field.placeholder}
                    className="bg-background"
                  />
                </div>
              ))}
              <Button variant="outline" size="sm" className="gap-2 w-full"
                onClick={() => setFireConfig({ monthlyIncome: String(income), monthlyExpenses: String(expenses), patrimony: String(totalCurrentValue) })}>
                <RefreshCw className="h-3.5 w-3.5" /> Sincronizar do Registro
              </Button>
            </div>

            {/* Results */}
            <div className="space-y-3">
              {/* FIRE Number */}
              <div className="rounded-xl border border-amber-500/30 bg-card p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Crown className="h-5 w-5 text-amber-400" />
                  <h4 className="font-display font-semibold">Número FIRE</h4>
                </div>
                <p className="text-3xl font-bold font-display text-amber-400">{fmtFull(fireNumber)}</p>
                <p className="text-xs text-muted-foreground mt-1">Despesas anuais × 25 (Regra dos 4%)</p>
                <div className="mt-3 h-2.5 bg-secondary rounded-full overflow-hidden">
                  <motion.div className="h-full bg-amber-400 rounded-full" initial={{ width: 0 }} animate={{ width: `${Math.min(fiScore, 100)}%` }} transition={{ duration: 1.2 }} />
                </div>
                <div className="flex justify-between text-[10px] mt-1 text-muted-foreground">
                  <span>Atual: {fmtFull(firePatrimony)}</span>
                  <span className="text-amber-400 font-bold">{fiScore.toFixed(1)}%</span>
                </div>
              </div>

              {/* KPI grid */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Taxa de Poupança", value: `${fireSavingsRate.toFixed(1)}%`, icon: Percent, color: fireSavingsRate >= 20 ? "text-emerald-400" : "text-destructive", desc: fireSavingsRate >= 50 ? "Excelente! (FIRE acelerado)" : fireSavingsRate >= 20 ? "Bom! (padrão recomendado)" : "Abaixo do ideal (< 20%)" },
                  { label: "Anos para FIRE", value: fireYears < 200 ? `${fireYears.toFixed(1)} anos` : "∞", icon: Clock, color: fireYears < 15 ? "text-emerald-400" : fireYears < 30 ? "text-amber-400" : "text-destructive", desc: fireYears < 10 ? "FIRE ultra-rápido!" : fireYears < 20 ? "Ótimo ritmo!" : "Aumente a poupança" },
                  { label: "Aporte Mensal", value: fmtFull(Math.max(fireMonthlyContrib, 0)), icon: ArrowUpRight, color: "text-primary", desc: "capacidade atual de aporte" },
                  { label: "Renda Passiva Atual", value: fmtFull(firePatrimony * 0.04 / 12), icon: Sparkles, color: "text-purple-400", desc: "4% a.a. do patrimônio atual / 12" },
                ].map(k => (
                  <div key={k.label} className="rounded-lg border border-border bg-secondary/30 p-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <k.icon className={`h-3.5 w-3.5 ${k.color}`} />
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{k.label}</span>
                    </div>
                    <p className={`text-lg font-bold font-display ${k.color}`}>{k.value}</p>
                    <p className="text-[9px] text-muted-foreground mt-0.5">{k.desc}</p>
                  </div>
                ))}
              </div>

              {/* Savings Rate Scenarios */}
              <div className="rounded-xl border border-border bg-card p-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Cenários de Poupança</h4>
                {[
                  { label: "10% poupança", rate: 10 },
                  { label: "20% poupança", rate: 20 },
                  { label: "30% poupança", rate: 30 },
                  { label: "50% poupança", rate: 50 },
                ].map(sc => {
                  const scExpenses = fireMonthlyIncome * (1 - sc.rate / 100);
                  const scContrib = fireMonthlyIncome * sc.rate / 100;
                  const scFireNum = scExpenses * 12 * 25;
                  const scYears = yearsToFIRE(firePatrimony, scFireNum, scContrib, fireAnnualReturn);
                  return (
                    <div key={sc.rate} className={`flex items-center justify-between py-1.5 border-b border-border/50 last:border-0 ${Math.abs(sc.rate - fireSavingsRate) < 5 ? "text-primary" : "text-muted-foreground"}`}>
                      <span className="text-xs">{sc.label}</span>
                      <span className="text-xs font-bold">{scYears < 200 ? `${scYears.toFixed(1)} anos` : "∞"}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* FIRE Level badges */}
          <div className="rounded-xl border border-border bg-card p-5">
            <h4 className="font-display text-sm font-semibold mb-4 flex items-center gap-2"><Trophy className="h-4 w-4 text-amber-400" />Níveis de Independência Financeira</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {FI_LEVELS.map(lv => {
                const unlocked = fiScore >= lv.min;
                return (
                  <div key={lv.label} className={`rounded-lg border p-3 transition-all ${unlocked ? `${lv.bg} border-current/30` : "border-border bg-secondary/20 opacity-50"}`}>
                    <div className={`flex items-center gap-2 mb-1 ${unlocked ? lv.color : "text-muted-foreground"}`}>
                      <span className="text-xl">{lv.icon}</span>
                      <span className="text-xs font-bold">{lv.label}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">{lv.min}% → {lv.max === Infinity ? "∞" : lv.max}%</p>
                    <p className="text-[9px] text-muted-foreground/70 mt-0.5">{lv.desc}</p>
                    {unlocked && <CheckCircle2 className={`h-3.5 w-3.5 mt-1.5 ${lv.color}`} />}
                  </div>
                );
              })}
            </div>
          </div>
        </TabsContent>

        {/* ---- TAB: BUDGET 50/30/20 ---- */}
        <TabsContent value="budget" className="mt-4 space-y-4">
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 mb-2">
              <Percent className="h-5 w-5 text-primary" />
              <h3 className="font-display text-base font-semibold">Regra 50/30/20</h3>
            </div>
            <p className="text-xs text-muted-foreground mb-5">Com base na sua renda de <b className="text-foreground">{fmtFull(income)}</b>. As categorias de despesas são classificadas automaticamente por nome.</p>

            {income === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Info className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Registre receitas para ativar a análise de orçamento.</p>
                <Button size="sm" onClick={() => openAddEntry("income")} className="mt-3 gap-1.5"><Plus className="h-3.5 w-3.5" /> Adicionar Receita</Button>
              </div>
            ) : (
              <div className="space-y-6">
                {[
                  { label: "50% — Necessidades", emoji: "🏠", actual: needs, limit: needsLimit, pct: 50, desc: "Moradia, alimentação, saúde, transporte, educação", color: "bg-blue-500", textColor: "text-blue-400" },
                  { label: "30% — Desejos", emoji: "🎯", actual: wants, limit: wantsLimit, pct: 30, desc: "Lazer, restaurantes, assinaturas, entretenimento", color: "bg-purple-500", textColor: "text-purple-400" },
                  { label: "20% — Poupança", emoji: "💰", actual: savings_actual, limit: savingsLimit, pct: 20, desc: "Investimentos, reserva de emergência, aportes", color: "bg-emerald-500", textColor: "text-emerald-400" },
                ].map(item => {
                  const ratio = item.limit > 0 ? (item.actual / item.limit) * 100 : 0;
                  const status = ratio <= 90 ? "ok" : ratio <= 110 ? "warning" : "over";
                  return (
                    <div key={item.label} className={`rounded-xl border p-4 transition-all ${
                      status === "ok" ? "border-emerald-500/20 bg-emerald-500/5"
                      : status === "warning" ? "border-amber-500/20 bg-amber-500/5"
                      : "border-destructive/20 bg-destructive/5"
                    }`}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{item.emoji}</span>
                          <div>
                            <p className="text-sm font-bold text-foreground">{item.label}</p>
                            <p className="text-[10px] text-muted-foreground">{item.desc}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`text-sm font-bold ${item.textColor}`}>{fmtFull(item.actual)}</p>
                          <p className="text-[10px] text-muted-foreground">limite: {fmtFull(item.limit)}</p>
                        </div>
                      </div>
                      <div className="relative h-3 bg-secondary rounded-full overflow-hidden">
                        <motion.div
                          className={`h-full rounded-full ${item.color} ${status === "over" ? "opacity-100" : "opacity-80"}`}
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(ratio, 100)}%` }}
                          transition={{ duration: 0.8 }}
                        />
                        {/* ideal line at 100% */}
                        <div className="absolute right-0 top-0 h-full w-0.5 bg-white/30" />
                      </div>
                      <div className="flex justify-between mt-1.5 text-[10px]">
                        <span className={status === "ok" ? "text-emerald-400" : status === "warning" ? "text-amber-400" : "text-destructive"}>
                          {status === "ok" ? `✓ ${ratio.toFixed(0)}% do limite — dentro!` : status === "warning" ? `⚠️ ${ratio.toFixed(0)}% — próximo do limite` : `✗ ${ratio.toFixed(0)}% — limite estourado!`}
                        </span>
                        <span className="text-muted-foreground">
                          {item.actual <= item.limit ? `Sobra: ${fmtFull(item.limit - item.actual)}` : `Excedeu: ${fmtFull(item.actual - item.limit)}`}
                        </span>
                      </div>
                    </div>
                  );
                })}

                {/* Summary tip */}
                <div className="rounded-xl border border-border bg-secondary/20 p-4">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5"><Info className="h-3.5 w-3.5" /> Como classificar automaticamente</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    O NEXUS classifica suas despesas pelo nome da <b className="text-foreground">categoria</b> que você digita. 
                    Use nomes como <b className="text-blue-400">moradia, alimentação, saúde</b> para Necessidades; 
                    <b className="text-purple-400"> lazer, restaurantes, assinaturas</b> para Desejos. 
                    O saldo positivo vai automaticamente para Poupança.
                  </p>
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ---- TAB: SIMULATOR ---- */}
        <TabsContent value="simulator" className="mt-4 space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Config */}
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-5 space-y-4">
              <h3 className="font-display text-base font-semibold flex items-center gap-2">
                <Calculator className="h-5 w-5 text-primary" /> Simulador de Juros Compostos
              </h3>
              <p className="text-xs text-muted-foreground">"Os juros compostos são a oitava maravilha do mundo." — Albert Einstein</p>
              {[
                { key: "monthlyContrib", label: "Aporte Mensal (R$)", placeholder: "500" },
                { key: "annualRate", label: "Taxa Anual (% a.a.)", placeholder: "10" },
                { key: "years", label: "Prazo (anos)", placeholder: "20" },
              ].map(f => (
                <div key={f.key}>
                  <label className="text-xs text-muted-foreground mb-1 block">{f.label}</label>
                  <Input
                    type="number"
                    value={simConfig[f.key as keyof typeof simConfig] || ""}
                    onChange={e => setSimConfig({ [f.key]: e.target.value })}
                    placeholder={f.placeholder}
                    className="bg-background"
                  />
                </div>
              ))}

              {simFinal && (
                <div className="space-y-2 pt-2 border-t border-border">
                  {[
                    { label: "Patrimônio Final", value: fmtFull(simFinal.total), color: "text-primary text-xl font-bold" },
                    { label: "Total Investido", value: fmtFull(simFinal.invested), color: "text-foreground" },
                    { label: "Rendimento Puro", value: fmtFull(simFinal.returns), color: "text-emerald-400 font-bold" },
                    { label: "Multiplicador", value: `${(simFinal.total / simFinal.invested).toFixed(1)}×`, color: "text-amber-400 font-bold" },
                  ].map(k => (
                    <div key={k.label} className="flex justify-between text-xs">
                      <span className="text-muted-foreground">{k.label}</span>
                      <span className={k.color}>{k.value}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Chart */}
            <div className="rounded-xl border border-border bg-card p-5">
              <h4 className="text-sm font-semibold mb-4 flex items-center gap-2"><BarChart2 className="h-4 w-4 text-primary" /> Crescimento Ano a Ano</h4>
              {simData.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Calculator className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Configure o simulador ao lado.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-end gap-1 h-40 overflow-x-auto pb-1">
                    {simData.map((d, i) => {
                      const heightTotal = (d.total / simMax) * 140;
                      const heightInvested = (d.invested / simMax) * 140;
                      const showLabel = simData.length <= 10 || i % Math.ceil(simData.length / 10) === 0 || i === simData.length - 1;
                      return (
                        <div key={d.year} className="flex flex-col items-center gap-0.5 flex-1 min-w-[20px]" title={`Ano ${d.year}: ${fmtFull(d.total)}`}>
                          <div className="w-full relative" style={{ height: `${heightTotal}px` }}>
                            {/* returns overlay */}
                            <div className="absolute bottom-0 left-0 right-0 rounded-t-sm bg-emerald-500/60" style={{ height: `${heightTotal}px` }} />
                            {/* invested base */}
                            <div className="absolute bottom-0 left-0 right-0 bg-primary/50" style={{ height: `${heightInvested}px` }} />
                          </div>
                          {showLabel && <span className="text-[8px] text-muted-foreground">{d.year}</span>}
                        </div>
                      );
                    })}
                  </div>

                  {/* Legend */}
                  <div className="flex items-center gap-4 text-[10px] text-muted-foreground pt-1 border-t border-border">
                    <div className="flex items-center gap-1.5"><div className="h-2.5 w-2.5 rounded-sm bg-primary/50" /><span>Investido</span></div>
                    <div className="flex items-center gap-1.5"><div className="h-2.5 w-2.5 rounded-sm bg-emerald-500/60" /><span>Rendimento</span></div>
                  </div>

                  {/* Milestones */}
                  <div className="space-y-1 pt-1">
                    {[100_000, 500_000, 1_000_000].map(milestone => {
                      const hitYear = simData.find(d => d.total >= milestone);
                      if (!hitYear) return null;
                      return (
                        <div key={milestone} className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Milestone {fmtFull(milestone)}</span>
                          <span className="text-primary font-bold">Ano {hitYear.year} 🏆</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Educational tips */}
          <div className="rounded-xl border border-border bg-card p-5">
            <h4 className="font-display text-sm font-semibold mb-3 flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> Conceitos-chave de Independência Financeira</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {[
                { icon: "🎯", title: "Regra dos 4%", desc: "Retire no máximo 4% do seu patrimônio por ano. Isso mantém o capital crescendo e dura para sempre." },
                { icon: "📈", title: "Poder dos Aportes", desc: "Aumentar o aporte mensal tem mais impacto do que qualquer coisa. Dobre o aporte, corte quase na metade o tempo." },
                { icon: "⏰", title: "Tempo × Capital", desc: "Começar 10 anos antes vale mais do que dobrar o aporte. O tempo é o maior aliado dos juros compostos." },
              ].map(tip => (
                <div key={tip.title} className="rounded-lg border border-border bg-secondary/20 p-3">
                  <span className="text-2xl">{tip.icon}</span>
                  <p className="text-xs font-bold text-foreground mt-2 mb-1">{tip.title}</p>
                  <p className="text-[10px] text-muted-foreground leading-relaxed">{tip.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* ---- TAB: DÍVIDAS ---- */}
        <TabsContent value="debts" className="mt-4">
          <DebtTracker income={income} />
        </TabsContent>

      </Tabs>

      {/* ---- Dialogs ---- */}
      <Dialog open={entryDialog} onOpenChange={setEntryDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              {entryForm.type === "income" ? <TrendingUp className="h-5 w-5 text-emerald-400" /> : <TrendingDown className="h-5 w-5 text-destructive" />}
              {editingEntry ? "Editar Lançamento" : entryForm.type === "income" ? "Nova Receita" : "Nova Despesa"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Descrição</label>
              <Input value={entryForm.description} onChange={e => setEntryForm({ ...entryForm, description: e.target.value })} placeholder="Ex: Salário, Aluguel..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Categoria</label>
                <Input value={entryForm.category} onChange={e => setEntryForm({ ...entryForm, category: e.target.value })} placeholder="Ex: moradia, lazer..." />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Valor (R$)</label>
                <Input type="number" value={entryForm.amount} onChange={e => setEntryForm({ ...entryForm, amount: e.target.value })} placeholder="0" />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Data</label>
              <Input type="date" value={entryForm.date} onChange={e => setEntryForm({ ...entryForm, date: e.target.value })} />
            </div>
            <Button onClick={saveEntry} className="w-full">{editingEntry ? "Salvar" : "Adicionar"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={goalDialog} onOpenChange={setGoalDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              {editingGoal ? "Editar Meta" : "Nova Meta Financeira"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Nome</label>
              <Input value={goalForm.name} onChange={e => setGoalForm({ ...goalForm, name: e.target.value })} placeholder="Ex: Reserva de Emergência" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Meta (R$)</label>
                <Input type="number" value={goalForm.target_amount} onChange={e => setGoalForm({ ...goalForm, target_amount: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Atual (R$)</label>
                <Input type="number" value={goalForm.current_amount} onChange={e => setGoalForm({ ...goalForm, current_amount: e.target.value })} />
              </div>
            </div>
            <Button onClick={saveGoal} className="w-full">{editingGoal ? "Salvar" : "Criar Meta"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={investmentDialog} onOpenChange={setInvestmentDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <Landmark className="h-5 w-5 text-primary" />
              {editingInvestment ? "Editar Investimento" : "Novo Investimento"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Nome</label>
              <Input value={investmentForm.name} onChange={e => setInvestmentForm({ ...investmentForm, name: e.target.value })} placeholder="Ex: Tesouro Selic 2029" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Tipo</label>
              <div className="grid grid-cols-4 gap-1.5">
                {INVESTMENT_TYPES.map(t => (
                  <button key={t.value} type="button" onClick={() => setInvestmentForm({ ...investmentForm, type: t.value })}
                    className={`px-2 py-1.5 rounded-lg border text-xs flex flex-col items-center gap-0.5 transition-all ${investmentForm.type === t.value ? "border-primary/60 bg-primary/10 text-primary" : "border-border hover:border-primary/30"}`}>
                    <span className="text-base">{t.icon}</span>
                    <span className="text-[9px]">{t.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Valor Investido (R$)</label>
                <Input type="number" value={investmentForm.amount_invested} onChange={e => setInvestmentForm({ ...investmentForm, amount_invested: e.target.value })} placeholder="0" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Valor Atual (R$)</label>
                <Input type="number" value={investmentForm.current_value} onChange={e => setInvestmentForm({ ...investmentForm, current_value: e.target.value })} placeholder="0" />
              </div>
            </div>
            <Button onClick={saveInvestment} className="w-full">{editingInvestment ? "Salvar" : "Adicionar Investimento"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---- Emergency Fund Card ----
function EmergencyFundCard({ expenses, currentValue }: { expenses: number; currentValue: number }) {
  const min3 = expenses * 3;
  const ideal6 = expenses * 6;
  const max12 = expenses * 12;

  const pct = ideal6 > 0 ? Math.min((currentValue / ideal6) * 100, 150) : 0;
  const status = currentValue >= ideal6 ? "ideal" : currentValue >= min3 ? "mínimo" : "insuficiente";

  if (expenses === 0) return null;

  return (
    <div className={`rounded-xl border p-5 ${
      status === "ideal" ? "border-emerald-500/30 bg-emerald-500/5"
      : status === "mínimo" ? "border-amber-500/30 bg-amber-500/5"
      : "border-destructive/30 bg-destructive/5"
    }`}>
      <div className="flex items-center gap-2 mb-4">
        <Shield className={`h-5 w-5 ${status === "ideal" ? "text-emerald-400" : status === "mínimo" ? "text-amber-400" : "text-destructive"}`} />
        <h3 className="font-display text-sm font-semibold">Fundo de Emergência</h3>
        <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${
          status === "ideal" ? "border-emerald-500/40 text-emerald-400 bg-emerald-500/10"
          : status === "mínimo" ? "border-amber-500/40 text-amber-400 bg-amber-500/10"
          : "border-destructive/40 text-destructive bg-destructive/10"
        }`}>{status.toUpperCase()}</span>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        {[
          { label: "Mínimo (3 meses)", value: min3, milestone: true },
          { label: "Ideal (6 meses)", value: ideal6, milestone: true },
          { label: "Blindado (12 meses)", value: max12, milestone: false },
        ].map(m => (
          <div key={m.label} className={`rounded-lg border p-3 text-center ${currentValue >= m.value ? "border-emerald-500/30 bg-emerald-500/5" : "border-border bg-background/60"}`}>
            <p className="text-[9px] text-muted-foreground mb-1">{m.label}</p>
            <p className={`text-sm font-bold ${currentValue >= m.value ? "text-emerald-400" : "text-foreground"}`}>{fmtFull(m.value)}</p>
            {currentValue >= m.value && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 mx-auto mt-1" />}
          </div>
        ))}
      </div>

      <div className="relative h-3 bg-secondary rounded-full overflow-hidden mb-2">
        <motion.div
          className={`h-full rounded-full ${status === "ideal" ? "bg-emerald-500" : status === "mínimo" ? "bg-amber-400" : "bg-destructive"}`}
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(pct, 100)}%` }}
          transition={{ duration: 1 }}
        />
        {/* milestone marks */}
        <div className="absolute top-0 h-full" style={{ left: `${(min3 / ideal6) * 100}%` }}>
          <div className="h-full w-0.5 bg-white/30" />
        </div>
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>Patrimônio líquido: <b className="text-foreground">{fmtFull(currentValue)}</b></span>
        <span className={status === "ideal" ? "text-emerald-400" : status === "mínimo" ? "text-amber-400" : "text-destructive"}>
          {pct.toFixed(0)}% da meta ideal
        </span>
      </div>
      {status === "insuficiente" && (
        <p className="text-xs text-destructive mt-2 flex items-center gap-1.5">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          Faltam <b>{fmtFull(min3 - currentValue)}</b> para a reserva mínima. Prioridade máxima!
        </p>
      )}
    </div>
  );
}

// ---- Debt Tracker ----
function DebtTracker({ income }: { income: number }) {
  const [debts, setDebts] = useState<Debt[]>(loadDebts);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDebt, setEditingDebt] = useState<Debt | null>(null);
  const [strategy, setStrategy] = useState<"snowball" | "avalanche">("avalanche");
  const [form, setForm] = useState({
    name: "", type: "cartao", total: "", remaining: "", monthlyPayment: "", interestRate: "", dueDay: "5"
  });

  const totalDebt = debts.reduce((s, d) => s + d.remaining, 0);
  const totalMonthly = debts.reduce((s, d) => s + d.monthlyPayment, 0);
  const debtRatio = income > 0 ? (totalMonthly / income) * 100 : 0;

  const openAdd = () => {
    setEditingDebt(null);
    setForm({ name: "", type: "cartao", total: "", remaining: "", monthlyPayment: "", interestRate: "", dueDay: "5" });
    setDialogOpen(true);
  };
  const openEdit = (d: Debt) => {
    setEditingDebt(d);
    setForm({ name: d.name, type: d.type, total: String(d.total), remaining: String(d.remaining), monthlyPayment: String(d.monthlyPayment), interestRate: String(d.interestRate), dueDay: String(d.dueDay) });
    setDialogOpen(true);
  };
  const save = () => {
    if (!form.name || !form.remaining) return;
    const entry: Debt = {
      id: editingDebt?.id || Date.now().toString(),
      name: form.name, type: form.type,
      total: Number(form.total) || Number(form.remaining),
      remaining: Number(form.remaining),
      monthlyPayment: Number(form.monthlyPayment) || 0,
      interestRate: Number(form.interestRate) || 0,
      dueDay: Number(form.dueDay) || 5,
    };
    const updated = editingDebt
      ? debts.map(d => d.id === editingDebt.id ? entry : d)
      : [...debts, entry];
    setDebts(updated); saveDebts(updated); setDialogOpen(false);
  };
  const remove = (id: string) => {
    const updated = debts.filter(d => d.id !== id);
    setDebts(updated); saveDebts(updated);
  };
  const markPaid = (id: string, amount: number) => {
    const updated = debts.map(d => d.id === id ? { ...d, remaining: Math.max(0, d.remaining - amount) } : d).filter(d => d.remaining > 0);
    setDebts(updated); saveDebts(updated);
  };

  // Sort by strategy
  const sortedDebts = [...debts].sort((a, b) =>
    strategy === "snowball" ? a.remaining - b.remaining : b.interestRate - a.interestRate
  );

  // Payoff projections
  const projections = debts.map(d => {
    if (d.monthlyPayment <= 0 || d.interestRate <= 0) return { ...d, months: d.monthlyPayment > 0 ? Math.ceil(d.remaining / d.monthlyPayment) : null };
    const r = d.interestRate / 100 / 12;
    const months = Math.log(d.monthlyPayment / (d.monthlyPayment - r * d.remaining)) / Math.log(1 + r);
    return { ...d, months: Math.ceil(isFinite(months) ? months : d.remaining / d.monthlyPayment) };
  });

  // Upcoming due days this month
  const today = new Date().getDate();
  const upcoming = debts.filter(d => d.dueDay >= today && d.dueDay <= today + 7).sort((a, b) => a.dueDay - b.dueDay);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display text-base font-semibold flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-destructive" /> Rastreador de Dívidas
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">Controle e elimine suas dívidas com estratégia.</p>
        </div>
        <Button onClick={openAdd} size="sm" className="gap-1.5"><Plus className="h-4 w-4" /> Adicionar</Button>
      </div>

      {/* KPI strip */}
      {debts.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Total Devedor", value: fmtFull(totalDebt), color: totalDebt > 0 ? "text-destructive" : "text-emerald-400", icon: CreditCard },
            { label: "Pagamento Mensal", value: fmtFull(totalMonthly), color: "text-foreground", icon: Wallet },
            { label: "Comprometimento", value: `${debtRatio.toFixed(1)}%`, color: debtRatio > 30 ? "text-destructive" : debtRatio > 20 ? "text-amber-400" : "text-emerald-400", icon: Percent },
            { label: "N° de Dívidas", value: debts.length, color: "text-muted-foreground", icon: AlertCircle },
          ].map(k => (
            <div key={k.label} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-1.5 mb-1.5">
                <k.icon className={`h-3.5 w-3.5 ${k.color}`} />
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{k.label}</span>
              </div>
              <p className={`text-lg font-bold font-display ${k.color}`}>{k.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Spending limit alert */}
      {debtRatio > 30 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-destructive">⚠️ Comprometimento alto!</p>
            <p className="text-xs text-muted-foreground mt-1">
              Você está comprometendo <b className="text-destructive">{debtRatio.toFixed(0)}%</b> da sua renda com dívidas.
              O recomendado é abaixo de 30%. Priorize quitar as dívidas com juros mais altos.
            </p>
          </div>
        </motion.div>
      )}

      {/* Upcoming payments */}
      {upcoming.length > 0 && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
          <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Bell className="h-3.5 w-3.5" /> Vencimentos nos próximos 7 dias
          </h4>
          <div className="space-y-2">
            {upcoming.map(d => (
              <div key={d.id} className="flex items-center justify-between text-sm">
                <span className="text-foreground">{d.name}</span>
                <div className="flex items-center gap-3">
                  <span className="text-amber-400 font-bold">{fmtFull(d.monthlyPayment)}</span>
                  <span className="text-[10px] text-muted-foreground">dia {d.dueDay}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Strategy selector */}
      {debts.length > 1 && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
          <h4 className="text-xs font-bold text-primary uppercase tracking-wider">Estratégia de Quitação</h4>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => setStrategy("avalanche")}
              className={`rounded-lg border p-3 text-left transition-all ${strategy === "avalanche" ? "border-primary bg-primary/10" : "border-border"}`}>
              <p className="text-sm font-bold text-foreground">🔥 Avalanche</p>
              <p className="text-[10px] text-muted-foreground mt-1">Quita primeiro a dívida com maior juros. Economiza mais dinheiro no longo prazo.</p>
            </button>
            <button onClick={() => setStrategy("snowball")}
              className={`rounded-lg border p-3 text-left transition-all ${strategy === "snowball" ? "border-primary bg-primary/10" : "border-border"}`}>
              <p className="text-sm font-bold text-foreground">❄️ Snowball</p>
              <p className="text-[10px] text-muted-foreground mt-1">Quita primeiro a menor dívida. Gera mais motivação e momentum psicológico.</p>
            </button>
          </div>
          <p className="text-[10px] text-muted-foreground">
            Ordem sugerida: {sortedDebts.map(d => d.name).join(" → ")}
          </p>
        </div>
      )}

      {/* Debts list */}
      {debts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center">
          <CreditCard className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="font-medium text-foreground mb-1">Nenhuma dívida registrada</p>
          <p className="text-sm text-muted-foreground mb-4">Sem dívidas = liberdade financeira. Se tiver, registre aqui para controlar.</p>
          <Button onClick={openAdd} size="sm" className="gap-1.5"><Plus className="h-4 w-4" /> Adicionar Dívida</Button>
        </div>
      ) : (
        <div className="space-y-3">
          {projections.sort((a, b) => {
            if (strategy === "snowball") return a.remaining - b.remaining;
            return b.interestRate - a.interestRate;
          }).map((d, i) => {
            const paidPct = d.total > 0 ? ((d.total - d.remaining) / d.total) * 100 : 0;
            const typeInfo = DEBT_TYPES.find(t => t.value === d.type);
            return (
              <div key={d.id} className="rounded-xl border border-border bg-card p-4 group hover:border-destructive/30 transition-all">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-lg bg-destructive/10 border border-destructive/20 flex items-center justify-center shrink-0 text-lg">
                    {typeInfo?.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {i === 0 && debts.length > 1 && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/10 border border-primary/30 text-primary font-bold">FOCO AQUI</span>
                      )}
                      <span className="font-medium text-foreground">{d.name}</span>
                      <span className="text-[9px] text-muted-foreground">{typeInfo?.label}</span>
                    </div>
                    <div className="flex flex-wrap gap-3 text-[10px] text-muted-foreground mb-2">
                      <span>Restante: <b className="text-destructive">{fmtFull(d.remaining)}</b></span>
                      {d.interestRate > 0 && <span>Juros: <b className="text-amber-400">{d.interestRate}% a.m.</b></span>}
                      {d.monthlyPayment > 0 && <span>Parcela: <b className="text-foreground">{fmtFull(d.monthlyPayment)}</b></span>}
                      {d.months && <span>Quitação: <b className="text-primary">~{d.months} meses</b></span>}
                      {d.dueDay > 0 && <span>Vence dia: <b className="text-foreground">{d.dueDay}</b></span>}
                    </div>
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-emerald-500 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${paidPct}%` }}
                        transition={{ duration: 0.8 }}
                      />
                    </div>
                    <div className="flex justify-between text-[9px] mt-1 text-muted-foreground">
                      <span>Pago: {paidPct.toFixed(0)}%</span>
                      <span>Total original: {fmtFull(d.total)}</span>
                    </div>
                  </div>
                  <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    {d.monthlyPayment > 0 && (
                      <button onClick={() => markPaid(d.id, d.monthlyPayment)}
                        title="Registrar pagamento"
                        className="p-1.5 rounded hover:bg-emerald-500/10 text-muted-foreground hover:text-emerald-400">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <button onClick={() => openEdit(d)} className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground">
                      <Edit3 className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => remove(d.id)} className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-destructive" />
              {editingDebt ? "Editar Dívida" : "Registrar Dívida"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-xs text-muted-foreground mb-1 block">Nome</label>
                <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ex: Cartão Nubank" />
              </div>
              <div className="col-span-2">
                <label className="text-xs text-muted-foreground mb-1 block">Tipo</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {DEBT_TYPES.map(t => (
                    <button key={t.value} type="button" onClick={() => setForm({ ...form, type: t.value })}
                      className={`px-2 py-2 rounded-lg border text-xs flex items-center gap-1.5 transition-all ${form.type === t.value ? "border-destructive/60 bg-destructive/10 text-destructive" : "border-border hover:border-destructive/30"}`}>
                      <span>{t.icon}</span><span>{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Valor Total (R$)</label>
                <Input type="number" value={form.total} onChange={e => setForm({ ...form, total: e.target.value })} placeholder="0" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Saldo Restante (R$)</label>
                <Input type="number" value={form.remaining} onChange={e => setForm({ ...form, remaining: e.target.value })} placeholder="0" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Parcela Mensal (R$)</label>
                <Input type="number" value={form.monthlyPayment} onChange={e => setForm({ ...form, monthlyPayment: e.target.value })} placeholder="0" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Taxa de Juros (% a.m.)</label>
                <Input type="number" value={form.interestRate} onChange={e => setForm({ ...form, interestRate: e.target.value })} placeholder="0" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Dia de Vencimento</label>
                <Input type="number" min={1} max={31} value={form.dueDay} onChange={e => setForm({ ...form, dueDay: e.target.value })} placeholder="5" />
              </div>
            </div>
            <Button onClick={save} className="w-full bg-destructive hover:bg-destructive/90">
              {editingDebt ? "Salvar" : "Registrar Dívida"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

