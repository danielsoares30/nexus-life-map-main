import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "@/hooks/use-toast";

export function useHabits() {
  const { user } = useAuth();
  const [habits, setHabits] = useState<any[]>([]);
  const [completions, setCompletions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    try {
      const [habitsRes, completionsRes] = await Promise.all([
        supabase.from("habits").select("*").eq("user_id", user.id).order("created_at"),
        supabase.from("habit_completions").select("*").eq("user_id", user.id).order("completed_date", { ascending: false }).limit(500),
      ]);
      if (habitsRes.error) throw habitsRes.error;
      if (completionsRes.error) throw completionsRes.error;
      setHabits(habitsRes.data || []);
      setCompletions(completionsRes.data || []);
    } catch (err: any) {
      console.error("Habits fetch error:", err.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetch(); }, [fetch]);

  const create = async (habit: Record<string, any>) => {
    if (!user) return;
    try {
      const row = { ...habit, user_id: user.id };
      const { data, error } = await supabase.from("habits").insert(row as any).select().single();
      if (error) throw error;
      if (data) setHabits((prev) => [...prev, data]);
      return data;
    } catch (err: any) {
      toast({ title: "Erro", description: "Falha ao criar hábito.", variant: "destructive" });
    }
  };

  const update = async (id: string, updates: Record<string, any>) => {
    try {
      const { data, error } = await supabase.from("habits").update(updates).eq("id", id).select().single();
      if (error) throw error;
      if (data) setHabits((prev) => prev.map((h) => (h.id === id ? data : h)));
      return data;
    } catch (err: any) {
      toast({ title: "Erro", description: "Falha ao atualizar hábito.", variant: "destructive" });
    }
  };

  const remove = async (id: string) => {
    try {
      const { error } = await supabase.from("habits").delete().eq("id", id);
      if (error) throw error;
      setHabits((prev) => prev.filter((h) => h.id !== id));
    } catch (err: any) {
      toast({ title: "Erro", description: "Falha ao remover hábito.", variant: "destructive" });
    }
  };

  const toggleToday = async (habitId: string) => {
    if (!user) return { completed: false, isNew: false };
    const today = new Date().toISOString().split("T")[0];
    const existing = completions.find((c) => c.habit_id === habitId && c.completed_date === today);

    try {
      if (existing) {
        // Uncomplete
        const { error } = await supabase.from("habit_completions").delete().eq("id", existing.id);
        if (error) throw error;
        setCompletions((prev) => prev.filter((c) => c.id !== existing.id));

        // Update streak
        const habit = habits.find((h) => h.id === habitId);
        if (habit && habit.current_streak > 0) {
          await update(habitId, { current_streak: habit.current_streak - 1 });
        }
        return { completed: false, isNew: false };
      } else {
        // Complete
        const { data, error } = await supabase.from("habit_completions")
          .insert({ habit_id: habitId, user_id: user.id, completed_date: today } as any)
          .select().single();
        if (error) throw error;
        if (data) setCompletions((prev) => [data, ...prev]);

        // Update streak
        const habit = habits.find((h) => h.id === habitId);
        if (habit) {
          const newStreak = habit.current_streak + 1;
          const bestStreak = Math.max(habit.best_streak, newStreak);
          await update(habitId, { current_streak: newStreak, best_streak: bestStreak });
        }
        return { completed: true, isNew: true };
      }
    } catch (err: any) {
      toast({ title: "Erro", description: "Falha ao registrar hábito.", variant: "destructive" });
      return { completed: false, isNew: false };
    }
  };

  const isCompletedToday = (habitId: string) => {
    const today = new Date().toISOString().split("T")[0];
    return completions.some((c) => c.habit_id === habitId && c.completed_date === today);
  };

  const getCompletionRate = (habitId: string, days: number = 7) => {
    const dates = Array.from({ length: days }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toISOString().split("T")[0];
    });
    const completed = dates.filter((date) => completions.some((c) => c.habit_id === habitId && c.completed_date === date)).length;
    return completed / days;
  };

  const getWeekMap = (habitId: string) => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      const date = d.toISOString().split("T")[0];
      return {
        date,
        day: d.toLocaleDateString("pt-BR", { weekday: "short" }).slice(0, 3),
        done: completions.some((c) => c.habit_id === habitId && c.completed_date === date),
      };
    });
  };

  return { habits, completions, loading, create, update, remove, toggleToday, isCompletedToday, getCompletionRate, getWeekMap, refetch: fetch };
}

export function useJournal() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    try {
      const { data, error } = await supabase.from("journal_entries").select("*").eq("user_id", user.id).order("date", { ascending: false }).limit(100);
      if (error) throw error;
      setEntries(data || []);
    } catch (err: any) {
      console.error("Journal fetch error:", err.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetch(); }, [fetch]);

  const create = async (entry: Record<string, any>) => {
    if (!user) return;
    try {
      const row = { ...entry, user_id: user.id };
      const { data, error } = await supabase.from("journal_entries").insert(row as any).select().single();
      if (error) throw error;
      if (data) setEntries((prev) => [data, ...prev]);
      return data;
    } catch (err: any) {
      toast({ title: "Erro", description: "Falha ao salvar entrada.", variant: "destructive" });
    }
  };

  const update = async (id: string, updates: Record<string, any>) => {
    try {
      const { data, error } = await supabase.from("journal_entries").update(updates).eq("id", id).select().single();
      if (error) throw error;
      if (data) setEntries((prev) => prev.map((e) => (e.id === id ? data : e)));
      return data;
    } catch (err: any) {
      toast({ title: "Erro", description: "Falha ao atualizar entrada.", variant: "destructive" });
    }
  };

  const remove = async (id: string) => {
    try {
      const { error } = await supabase.from("journal_entries").delete().eq("id", id);
      if (error) throw error;
      setEntries((prev) => prev.filter((e) => e.id !== id));
    } catch (err: any) {
      toast({ title: "Erro", description: "Falha ao remover entrada.", variant: "destructive" });
    }
  };

  return { entries, loading, create, update, remove, refetch: fetch };
}
