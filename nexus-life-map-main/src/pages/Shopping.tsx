import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ShoppingBag, Plus, Trash2, Check, ExternalLink, Wallet, Target, TrendingUp, Sparkles, Filter, Package, Edit3, Search, ArrowUpDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useGameData";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

type Item = {
  id: string;
  user_id: string;
  name: string;
  category: string;
  price: number;
  quantity: number;
  priority: "baixa" | "media" | "alta";
  status: "desejado" | "comprado";
  url: string | null;
  notes: string | null;
  target_date: string | null;
  purchased_at: string | null;
  created_at: string;
  updated_at: string;
};

const CATEGORIES = [
  { value: "roupas", label: "👕 Roupas" },
  { value: "eletronicos", label: "💻 Eletrônicos" },
  { value: "acessorios", label: "⌚ Acessórios" },
  { value: "casa", label: "🏠 Casa" },
  { value: "saude", label: "💪 Saúde" },
  { value: "livros", label: "📚 Livros" },
  { value: "lazer", label: "🎮 Lazer" },
  { value: "presentes", label: "🎁 Presentes" },
  { value: "outros", label: "📦 Outros" },
];

const PRIORITIES = {
  alta: { label: "Alta", color: "bg-destructive/15 text-destructive border-destructive/30" },
  media: { label: "Média", color: "bg-yellow-500/15 text-yellow-500 border-yellow-500/30" },
  baixa: { label: "Baixa", color: "bg-muted-foreground/15 text-muted-foreground border-border" },
};

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function Shopping() {
  const { user } = useAuth();
  const { profile, addXp } = useProfile();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [filterCat, setFilterCat] = useState<string>("all");
  const [monthlyBudget, setMonthlyBudget] = useState<number>(() => Number(localStorage.getItem("shopping_budget") || 0));

  // New states for search, sort and editing
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"created" | "price_asc" | "price_desc" | "priority" | "target">("created");
  const [editingItem, setEditingItem] = useState<Item | null>(null);

  const [form, setForm] = useState({
    name: "",
    category: "outros",
    price: "",
    quantity: "1",
    priority: "media" as "baixa" | "media" | "alta",
    url: "",
    notes: "",
    target_date: "",
  });

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("shopping_items" as any)
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (error) toast.error("Erro ao carregar lista");
    else setItems((data || []) as any);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user?.id]);

  useEffect(() => {
    localStorage.setItem("shopping_budget", String(monthlyBudget));
  }, [monthlyBudget]);

  const handleSubmit = async () => {
    if (!user || !form.name.trim()) return;

    const itemData = {
      user_id: user.id,
      name: form.name.trim(),
      category: form.category,
      price: Number(form.price) || 0,
      quantity: Number(form.quantity) || 1,
      priority: form.priority,
      url: form.url || null,
      notes: form.notes || null,
      target_date: form.target_date || null,
    };

    if (editingItem) {
      const { error } = await supabase
        .from("shopping_items" as any)
        .update(itemData)
        .eq("id", editingItem.id);
      
      if (error) return toast.error("Não foi possível atualizar o desejo");
      toast.success("Desejo atualizado no baú! 🔮");
    } else {
      const { error } = await supabase
        .from("shopping_items" as any)
        .insert(itemData);
      
      if (error) return toast.error("Não foi possível adicionar");
      toast.success("Item adicionado ao baú de desejos ✨");
    }

    setForm({ name: "", category: "outros", price: "", quantity: "1", priority: "media", url: "", notes: "", target_date: "" });
    setEditingItem(null);
    setOpen(false);
    load();
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setEditingItem(null);
      setForm({ name: "", category: "outros", price: "", quantity: "1", priority: "media", url: "", notes: "", target_date: "" });
    }
  };

  const togglePurchased = async (item: Item) => {
    const newStatus = item.status === "comprado" ? "desejado" : "comprado";
    const { error } = await supabase
      .from("shopping_items" as any)
      .update({ status: newStatus, purchased_at: newStatus === "comprado" ? new Date().toISOString() : null })
      .eq("id", item.id);
    if (error) return toast.error("Erro ao alterar o status do item");
    
    if (newStatus === "comprado") {
      const xpGained = item.priority === "alta" ? 150 : item.priority === "media" ? 100 : 50;
      toast.success(`Conquistado! +${xpGained} XP 🏆`);
      if (addXp) {
        await addXp(xpGained);
      }
    } else {
      toast.success("Devolvido ao baú de desejos 📦");
    }
    load();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("shopping_items" as any).delete().eq("id", id);
    if (error) return toast.error("Erro ao remover item");
    toast.success("Removido");
    load();
  };

  const desired = items.filter(i => i.status === "desejado");
  const purchased = items.filter(i => i.status === "comprado");

  // Filtering, Searching & Sorting Logic
  const sortedAndFiltered = useMemo(() => {
    let result = [...items];

    // Filter by Category
    if (filterCat !== "all") {
      result = result.filter(i => i.category === filterCat);
    }

    // Filter by Search Query
    if (searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase();
      result = result.filter(i => i.name.toLowerCase().includes(q) || (i.notes && i.notes.toLowerCase().includes(q)));
    }

    // Sort items
    result.sort((a, b) => {
      if (sortBy === "price_asc") {
        return (a.price * a.quantity) - (b.price * b.quantity);
      }
      if (sortBy === "price_desc") {
        return (b.price * b.quantity) - (a.price * a.quantity);
      }
      if (sortBy === "priority") {
        const priorityWeight = { alta: 3, media: 2, baixa: 1 };
        return priorityWeight[b.priority] - priorityWeight[a.priority];
      }
      if (sortBy === "target") {
        if (!a.target_date) return 1;
        if (!b.target_date) return -1;
        return new Date(a.target_date).getTime() - new Date(b.target_date).getTime();
      }
      // default: created (newest first)
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    return result;
  }, [items, filterCat, searchQuery, sortBy]);

  const totalDesired = desired.reduce((s, i) => s + i.price * i.quantity, 0);
  const totalPurchased = purchased.reduce((s, i) => s + i.price * i.quantity, 0);

  // Potential XP reward from active desires
  const potentialXp = useMemo(() => {
    return desired.reduce((s, i) => {
      const itemXp = i.priority === "alta" ? 150 : i.priority === "media" ? 100 : 50;
      return s + itemXp;
    }, 0);
  }, [desired]);

  // Spent this month
  const monthSpent = useMemo(() => {
    const now = new Date();
    return purchased
      .filter(i => i.purchased_at && new Date(i.purchased_at).getMonth() === now.getMonth() && new Date(i.purchased_at).getFullYear() === now.getFullYear())
      .reduce((s, i) => s + i.price * i.quantity, 0);
  }, [purchased]);

  const budgetPct = monthlyBudget > 0 ? Math.min(100, (monthSpent / monthlyBudget) * 100) : 0;

  // Smart insight: most-wanted category
  const topCategory = useMemo(() => {
    const map: Record<string, number> = {};
    desired.forEach(i => { map[i.category] = (map[i.category] || 0) + i.price * i.quantity; });
    const entry = Object.entries(map).sort((a, b) => b[1] - a[1])[0];
    return entry ? CATEGORIES.find(c => c.value === entry[0]) : null;
  }, [desired]);

  // Daily-savings suggestion based on highest priority item
  const nextGoal = useMemo(() => {
    const high = desired.filter(i => i.priority === "alta").sort((a, b) => b.price - a.price)[0] || desired[0];
    if (!high) return null;
    const total = high.price * high.quantity;
    const daysToTarget = high.target_date
      ? Math.max(1, Math.ceil((new Date(high.target_date + "T00:00:00").getTime() - Date.now()) / 86400000))
      : 30;
    return { item: high, total, perDay: total / daysToTarget, days: daysToTarget };
  }, [desired]);

  // Helper to format days remaining
  const getDaysRemaining = (targetDateStr: string | null) => {
    if (!targetDateStr) return null;
    const target = new Date(targetDateStr + "T00:00:00");
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    target.setHours(0, 0, 0, 0);
    
    const diffTime = target.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return { text: `Atrasado há ${Math.abs(diffDays)}d`, color: "text-destructive font-semibold" };
    if (diffDays === 0) return { text: "Expira hoje!", color: "text-amber-500 font-bold" };
    if (diffDays === 1) return { text: "Amanhã", color: "text-amber-400 font-medium" };
    return { text: `Faltam ${diffDays} dias`, color: "text-muted-foreground" };
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl md:text-4xl font-display font-bold text-gradient-gold flex items-center gap-3">
            <ShoppingBag className="h-8 w-8 text-primary animate-pulse" /> Baú de Desejos
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Planeje suas conquistas materiais com sabedoria, {profile?.display_name || "aventureiro"}. Conquiste itens para ganhar XP e evoluir.
          </p>
        </div>
        
        <Dialog open={open} onOpenChange={handleOpenChange}>
          <Button 
            className="gap-2 font-semibold shadow-md bg-primary hover:bg-primary/95 text-primary-foreground transition-all duration-300"
            onClick={() => {
              setEditingItem(null);
              setForm({ name: "", category: "outros", price: "", quantity: "1", priority: "media", url: "", notes: "", target_date: "" });
              setOpen(true);
            }}
          >
            <Plus className="h-4 w-4" /> Novo desejo
          </Button>
          <DialogContent className="max-w-lg bg-card border-border">
            <DialogHeader>
              <DialogTitle className="font-display text-xl text-gradient-gold">
                {editingItem ? "Editar Desejo no Baú" : "Adicionar ao Baú"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div>
                <Label className="text-foreground">Nome do Desejo *</Label>
                <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ex: Livro de Fantasia ou Teclado Mecânico" className="bg-background/50 border-border mt-1.5 focus-visible:ring-primary" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-foreground">Categoria</Label>
                  <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                    <SelectTrigger className="bg-background/50 border-border mt-1.5"><SelectValue /></SelectTrigger>
                    <SelectContent>{CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-foreground">Prioridade (Ganho de XP)</Label>
                  <Select value={form.priority} onValueChange={(v: any) => setForm({ ...form, priority: v })}>
                    <SelectTrigger className="bg-background/50 border-border mt-1.5"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="alta">🔥 Alta (+150 XP)</SelectItem>
                      <SelectItem value="media">⚡ Média (+100 XP)</SelectItem>
                      <SelectItem value="baixa">🌱 Baixa (+50 XP)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-foreground">Preço Estimado (R$)</Label>
                  <Input type="number" step="0.01" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} placeholder="0,00" className="bg-background/50 border-border mt-1.5 focus-visible:ring-primary" />
                </div>
                <div>
                  <Label className="text-foreground">Quantidade</Label>
                  <Input type="number" min="1" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} className="bg-background/50 border-border mt-1.5 focus-visible:ring-primary" />
                </div>
              </div>
              <div>
                <Label className="text-foreground">Link do Produto (opcional)</Label>
                <Input value={form.url} onChange={e => setForm({ ...form, url: e.target.value })} placeholder="https://loja.com/item" className="bg-background/50 border-border mt-1.5 focus-visible:ring-primary" />
              </div>
              <div>
                <Label className="text-foreground">Data Alvo para Compra (opcional)</Label>
                <Input type="date" value={form.target_date} onChange={e => setForm({ ...form, target_date: e.target.value })} className="bg-background/50 border-border mt-1.5 focus-visible:ring-primary" />
              </div>
              <div>
                <Label className="text-foreground">Notas / Observações</Label>
                <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} placeholder="Detalhes como cor, modelo ou progresso da economia..." className="bg-background/50 border-border mt-1.5 focus-visible:ring-primary" />
              </div>
              <Button onClick={handleSubmit} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-md mt-2">
                {editingItem ? "Salvar Alterações 🔮" : "Adicionar ao Baú 📦"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </motion.div>

      {/* Stats with Glassmorphism */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card/40 backdrop-blur-md border-border hover:border-primary/30 transition-all duration-300 group hover:shadow-[0_0_15px_rgba(212,163,89,0.05)]">
          <CardContent className="p-5">
            <div className="space-y-1">
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                <Package className="h-4 w-4 text-primary" /> Desejos Ativos
              </span>
              <p className="text-3xl font-display font-bold mt-1 text-foreground group-hover:text-primary transition-colors">{desired.length}</p>
              <div className="text-sm font-semibold text-primary/80 mt-1 flex flex-wrap items-center gap-x-1.5">
                {fmt(totalDesired)}
                <span className="text-[10px] text-muted-foreground font-normal">({potentialXp} XP total)</span>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-card/40 backdrop-blur-md border-border hover:border-emerald-500/30 transition-all duration-300 group hover:shadow-[0_0_15px_rgba(16,185,129,0.05)]">
          <CardContent className="p-5">
            <div className="space-y-1">
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                <Check className="h-4 w-4 text-emerald-500" /> Conquistados
              </span>
              <p className="text-3xl font-display font-bold mt-1 text-foreground group-hover:text-emerald-400 transition-colors">{purchased.length}</p>
              <p className="text-sm font-semibold text-emerald-500 mt-1">{fmt(totalPurchased)} acumulado</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/40 backdrop-blur-md border-border hover:border-primary/30 transition-all duration-300 group">
          <CardContent className="p-5">
            <div className="space-y-1">
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                <TrendingUp className="h-4 w-4 text-xp" /> Gasto no Mês
              </span>
              <p className="text-3xl font-display font-bold mt-1 text-foreground">{fmt(monthSpent)}</p>
              {monthlyBudget > 0 ? (
                <div className="mt-2 space-y-1.5">
                  <div className="flex justify-between text-[10px]">
                    <span className="text-muted-foreground">{budgetPct.toFixed(0)}% do limite</span>
                    <span className={monthSpent > monthlyBudget ? "text-destructive font-bold" : "text-muted-foreground"}>
                      {monthSpent > monthlyBudget ? `Excedido em ${fmt(monthSpent - monthlyBudget)}` : `${fmt(monthlyBudget - monthSpent)} restante`}
                    </span>
                  </div>
                  <Progress 
                    value={budgetPct} 
                    className="h-1.5"
                  />
                </div>
              ) : (
                <p className="text-[10px] text-muted-foreground mt-2">Defina um limite ao lado</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/40 backdrop-blur-md border-border hover:border-primary/30 transition-all duration-300 group">
          <CardContent className="p-5">
            <div className="space-y-1">
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                <Wallet className="h-4 w-4 text-primary" /> Limite Mensal
              </span>
              <div className="relative mt-1">
                <span className="absolute left-2.5 top-1.5 text-sm font-semibold text-muted-foreground">R$</span>
                <Input 
                  type="number" 
                  value={monthlyBudget || ""} 
                  onChange={e => setMonthlyBudget(Number(e.target.value))} 
                  placeholder="Definir limite" 
                  className="h-8 pl-8 mt-1 text-lg font-display font-bold bg-background/50 border-border focus-visible:ring-primary" 
                />
              </div>
              <p className="text-[10px] text-muted-foreground mt-1.5">Orçamento pessoal planejado</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Smart insights */}
      {(nextGoal || topCategory) && (
        <Card className="border-primary/30 bg-primary/5 backdrop-blur-sm">
          <CardContent className="p-4 flex flex-col md:flex-row gap-4 items-start md:items-center">
            <div className="p-2 bg-primary/10 rounded-lg border border-primary/20 shrink-0">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 space-y-1">
              {nextGoal && (
                <p className="text-sm text-foreground">
                  <span className="text-muted-foreground">Próxima conquista sugerida:</span>{" "}
                  <strong className="text-primary">{nextGoal.item.name}</strong> — economize{" "}
                  <strong className="text-primary">{fmt(nextGoal.perDay)}/dia</strong> por {nextGoal.days} dias.
                </p>
              )}
              {topCategory && (
                <p className="text-xs text-muted-foreground">
                  Maior foco de investimento: <strong className="text-foreground">{topCategory.label}</strong> (total planejado: {fmt(desired.filter(i => i.category === topCategory.value).reduce((s, i) => s + i.price * i.quantity, 0))})
                </p>
              )}
              {monthlyBudget > 0 && monthSpent > monthlyBudget && (
                <p className="text-xs text-destructive font-semibold flex items-center gap-1">
                  ⚠️ Atenção: O orçamento limite do mês foi ultrapassado em {fmt(monthSpent - monthlyBudget)}! Considere adiar algumas compras.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filter, Search & Sort Panel */}
      <div className="bg-card/30 backdrop-blur-md border border-border rounded-xl p-4 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar desejo por nome ou observações..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9 bg-background/40 border-border focus-visible:ring-primary h-9"
            />
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground whitespace-nowrap flex items-center gap-1">
              <ArrowUpDown className="h-3.5 w-3.5" /> Ordenar por:
            </span>
            <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
              <SelectTrigger className="w-[180px] bg-background/40 border-border h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="created">⏳ Mais recentes</SelectItem>
                <SelectItem value="price_asc">🪙 Menor preço</SelectItem>
                <SelectItem value="price_desc">🪙 Maior preço</SelectItem>
                <SelectItem value="priority">🔥 Prioridade</SelectItem>
                <SelectItem value="target">🎯 Prazo final</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap border-t border-border/40 pt-3">
          <span className="text-xs text-muted-foreground mr-1 flex items-center gap-1"><Filter className="h-3 w-3" /> Categoria:</span>
          <Button 
            size="sm" 
            variant={filterCat === "all" ? "default" : "outline"} 
            onClick={() => setFilterCat("all")}
            className="h-7 text-xs rounded-full"
          >
            Todos
          </Button>
          {CATEGORIES.map(c => (
            <Button 
              key={c.value} 
              size="sm" 
              variant={filterCat === c.value ? "default" : "outline"} 
              onClick={() => setFilterCat(c.value)}
              className="h-7 text-xs rounded-full"
            >
              {c.label}
            </Button>
          ))}
        </div>
      </div>

      <Tabs defaultValue="desejado" className="space-y-4">
        <TabsList className="bg-background/50 border border-border">
          <TabsTrigger value="desejado" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-semibold">
            Desejados ({desired.length})
          </TabsTrigger>
          <TabsTrigger value="comprado" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-semibold">
            Conquistados ({purchased.length})
          </TabsTrigger>
        </TabsList>

        {(["desejado", "comprado"] as const).map(status => (
          <TabsContent key={status} value={status} className="space-y-3 mt-2 outline-none">
            {loading ? (
              <p className="text-sm text-muted-foreground flex items-center gap-2 justify-center py-8">
                <span className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" /> Carregando baú de desejos...
              </p>
            ) : sortedAndFiltered.filter(i => i.status === status).length === 0 ? (
              <Card className="border-dashed border-border/60 bg-card/20 py-10">
                <CardContent className="flex flex-col items-center justify-center text-center space-y-4">
                  <div className="h-16 w-16 rounded-full bg-primary/5 flex items-center justify-center border border-primary/10">
                    <ShoppingBag className="h-8 w-8 text-primary/40" />
                  </div>
                  <div className="space-y-1 max-w-sm">
                    <h3 className="font-display font-semibold text-lg">
                      {status === "desejado" ? "O Baú de Desejos está Vazio" : "Nenhuma Conquista Ainda"}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {status === "desejado" 
                        ? "Você não tem desejos ativos no momento. Adicione itens que você quer adquirir para planejar sua economia!"
                        : "Quando você adquirir um item do seu baú de desejos, marque-o como concluído para vê-lo listado aqui!"}
                    </p>
                  </div>
                  {status === "desejado" && (
                    <Button 
                      size="sm" 
                      onClick={() => {
                        setEditingItem(null);
                        setForm({ name: "", category: "outros", price: "", quantity: "1", priority: "media", url: "", notes: "", target_date: "" });
                        setOpen(true);
                      }}
                      className="gap-2"
                    >
                      <Plus className="h-4 w-4" /> Adicionar Desejo
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : sortedAndFiltered.filter(i => i.status === status).map(item => {
              const cat = CATEGORIES.find(c => c.value === item.category);
              const total = item.price * item.quantity;
              return (
                <motion.div key={item.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
                  <Card className="hover:border-primary/30 transition-all duration-300 bg-card/60 backdrop-blur-sm border-border hover:shadow-[0_0_10px_rgba(212,163,89,0.02)]">
                    <CardContent className="p-4 flex items-center gap-4">
                      {/* Checkbox selector */}
                      <button
                        onClick={() => togglePurchased(item)}
                        className={`h-9 w-9 rounded-full border-2 flex items-center justify-center shrink-0 transition-all duration-300 ${
                          item.status === "comprado" 
                            ? "bg-emerald-500/20 border-emerald-500 text-emerald-500 hover:bg-emerald-500/30" 
                            : "border-border hover:border-primary/50 text-transparent hover:text-primary/50"
                        }`}
                        title={item.status === "comprado" ? "Devolver para Desejados" : "Marcar como Conquistado!"}
                      >
                        <Check className="h-4 w-4 text-current" />
                      </button>

                      {/* Main info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className={`font-semibold text-sm md:text-base ${item.status === "comprado" ? "line-through text-muted-foreground/80" : "text-foreground"}`}>
                            {item.name}
                          </p>
                          <Badge variant="outline" className="text-[10px] bg-muted/40 font-medium px-2 py-0.5">{cat?.label}</Badge>
                          
                          {item.status === "desejado" && (
                            <>
                              <Badge className={`text-[10px] ${PRIORITIES[item.priority].color}`} variant="outline">
                                {PRIORITIES[item.priority].label}
                              </Badge>
                              <Badge className="text-[10px] bg-xp/10 text-primary border-primary/20 flex items-center gap-0.5 font-bold">
                                <Sparkles className="h-2.5 w-2.5" /> +{item.priority === "alta" ? 150 : item.priority === "media" ? 100 : 50} XP
                              </Badge>
                            </>
                          )}
                          
                          {item.quantity > 1 && <span className="text-xs text-muted-foreground font-semibold bg-secondary/50 px-1.5 py-0.5 rounded border border-border">x{item.quantity}</span>}
                        </div>
                        
                        {item.notes && <p className="text-xs text-muted-foreground mt-1 line-clamp-2 max-w-2xl">{item.notes}</p>}
                        
                        {/* Target Date with Remaining Days Countdown */}
                        {item.target_date && item.status === "desejado" && (() => {
                          const statusInfo = getDaysRemaining(item.target_date);
                          return (
                            <p className="text-[10px] mt-1.5 flex items-center gap-1">
                              <Target className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="text-muted-foreground">Prazo: {new Date(item.target_date + "T00:00:00").toLocaleDateString("pt-BR")}</span>
                              {statusInfo && <span className={`font-medium ${statusInfo.color}`}>• {statusInfo.text}</span>}
                            </p>
                          );
                        })()}
                        
                        {item.status === "comprado" && item.purchased_at && (
                          <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                            <Check className="h-3.5 w-3.5 text-emerald-500" />
                            <span>Conquistado em {new Date(item.purchased_at).toLocaleDateString("pt-BR")}</span>
                          </p>
                        )}
                      </div>

                      {/* Prices */}
                      <div className="text-right shrink-0">
                        <p className="font-display font-bold text-primary text-base md:text-lg">{fmt(total)}</p>
                        {item.quantity > 1 && <p className="text-[10px] text-muted-foreground font-medium">{fmt(item.price)} un.</p>}
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1.5 border-l border-border/40 pl-3 shrink-0">
                        {item.url && (
                          <a 
                            href={item.url} 
                            target="_blank" 
                            rel="noreferrer" 
                            className="text-muted-foreground hover:text-primary p-1.5 hover:bg-secondary/40 rounded transition-colors"
                            title="Ir para a loja"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        )}
                        
                        {item.status === "desejado" && (
                          <button 
                            onClick={() => {
                              setEditingItem(item);
                              setForm({
                                name: item.name,
                                category: item.category,
                                price: item.price ? String(item.price) : "",
                                quantity: String(item.quantity || 1),
                                priority: item.priority,
                                url: item.url || "",
                                notes: item.notes || "",
                                target_date: item.target_date || "",
                              });
                              setOpen(true);
                            }} 
                            className="text-muted-foreground hover:text-primary p-1.5 hover:bg-secondary/40 rounded transition-colors"
                            title="Editar desejo"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                        )}

                        <button 
                          onClick={() => remove(item.id)} 
                          className="text-muted-foreground hover:text-destructive p-1.5 hover:bg-destructive/10 rounded transition-colors"
                          title="Remover desejo"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

