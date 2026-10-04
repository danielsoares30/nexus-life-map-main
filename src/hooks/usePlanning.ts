import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "@/hooks/use-toast";

type Table = "objectives" | "projects";

function useCrud(table: Table) {
  const { user } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    const { data, error } = await (supabase as any).from(table).select("*").order("created_at", { ascending: false });
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    setItems(data || []);
    setLoading(false);
  }, [user, table]);

  useEffect(() => { fetch(); }, [fetch]);

  const add = async (values: Record<string, any>) => {
    if (!user) return;
    const { data, error } = await (supabase as any).from(table).insert({ ...values, user_id: user.id }).select().single();
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    setItems((p) => [data, ...p]);
    return data;
  };
  const update = async (id: string, values: Record<string, any>) => {
    const { data, error } = await (supabase as any).from(table).update(values).eq("id", id).select().single();
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    setItems((p) => p.map((i) => (i.id === id ? data : i)));
  };
  const remove = async (id: string) => {
    const { error } = await (supabase as any).from(table).delete().eq("id", id);
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    setItems((p) => p.filter((i) => i.id !== id));
  };
  return { items, loading, add, update, remove, refetch: fetch };
}

export const useObjectives = () => useCrud("objectives");
export const useProjects = () => useCrud("projects");

export const LIFE_AREAS: Record<string, { label: string; icon: string }> = {
  carreira: { label: "Carreira", icon: "💼" },
  estudos: { label: "Estudos", icon: "📚" },
  saude: { label: "Saúde", icon: "💪" },
  financas: { label: "Finanças", icon: "💰" },
  relacionamentos: { label: "Relacionamentos", icon: "❤️" },
  desenvolvimento: { label: "Desenvolvimento pessoal", icon: "🌱" },
  espiritualidade: { label: "Espiritualidade", icon: "✨" },
  lazer: { label: "Lazer", icon: "🎮" },
};

export const PRIORITIES: Record<string, { label: string; cls: string }> = {
  baixa: { label: "Baixa", cls: "text-muted-foreground" },
  media: { label: "Média", cls: "text-mana" },
  alta: { label: "Alta", cls: "text-xp" },
  critica: { label: "Crítica", cls: "text-destructive" },
};

export const STATUSES: Record<string, string> = {
  ativo: "Ativo",
  pausado: "Pausado",
  concluido: "Concluído",
};

/** Progress = % of linked tasks completed (status concluído forces 100). */
export function computeProgress(item: any, tasks: any[], key: "objective_id" | "project_id") {
  if (item.status === "concluido") return 100;
  const linked = tasks.filter((t) => t[key] === item.id);
  if (!linked.length) return 0;
  return Math.round((linked.filter((t) => t.completed).length / linked.length) * 100);
}
