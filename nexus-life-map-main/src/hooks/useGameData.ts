import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { calculateXpForLevel } from "@/lib/gameData";
import { toast } from "@/hooks/use-toast";

// ============ PROFILE ============
export function useProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    try {
      const { data, error } = await supabase.from("profiles").select("*").eq("user_id", user.id).single();
      if (error) throw error;
      setProfile(data);
    } catch (err: any) {
      console.error("Profile fetch error:", err.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetch(); }, [fetch]);

  const update = async (updates: Record<string, any>) => {
    if (!user) return;
    try {
      const { data, error } = await supabase.from("profiles").update(updates).eq("user_id", user.id).select().single();
      if (error) throw error;
      if (data) setProfile(data);
      return data;
    } catch (err: any) {
      console.error("Profile update error:", err.message);
      toast({ title: "Erro", description: "Falha ao atualizar perfil.", variant: "destructive" });
    }
  };

  const addXp = async (amount: number) => {
    if (!profile) return;
    let newXp = profile.xp + amount;
    let newTotalXp = profile.total_xp + amount;
    let newLevel = profile.level;
    let xpNeeded = calculateXpForLevel(newLevel);

    while (newXp >= xpNeeded) {
      newXp -= xpNeeded;
      newLevel++;
      xpNeeded = calculateXpForLevel(newLevel);
    }

    const today = new Date().toISOString().split("T")[0];
    const lastDate = profile.last_activity_date;
    let newStreak = profile.streak;

    if (lastDate !== today) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      if (lastDate === yesterday.toISOString().split("T")[0]) {
        newStreak += 1;
      } else {
        newStreak = 1;
      }
    }

    const leveledUp = newLevel > profile.level;
    const result = await update({ xp: newXp, total_xp: newTotalXp, level: newLevel, streak: newStreak, last_activity_date: today });
    
    if (leveledUp && result) {
      toast({ title: `🎉 Level Up! Nível ${newLevel}!`, description: "Você avançou de nível. Continue evoluindo!" });
    }
    
    return result;
  };

  return { profile, loading, update, addXp, refetch: fetch };
}

// ============ TASKS ============
export function useTasks() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    try {
      const { data, error } = await supabase.from("tasks").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
      if (error) throw error;
      setTasks(data || []);
    } catch (err: any) {
      console.error("Tasks fetch error:", err.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetch(); }, [fetch]);

  const create = async (task: Record<string, any>) => {
    if (!user) return;
    try {
      const row = { ...task, user_id: user.id };
      const { data, error } = await supabase.from("tasks").insert(row as any).select().single();
      if (error) throw error;
      if (data) setTasks((prev) => [data, ...prev]);
      return data;
    } catch (err: any) {
      toast({ title: "Erro", description: "Falha ao criar missão.", variant: "destructive" });
    }
  };

  const update = async (id: string, updates: Record<string, any>) => {
    try {
      const { data, error } = await supabase.from("tasks").update(updates).eq("id", id).select().single();
      if (error) throw error;
      if (data) setTasks((prev) => prev.map((t) => (t.id === id ? data : t)));
      return data;
    } catch (err: any) {
      toast({ title: "Erro", description: "Falha ao atualizar missão.", variant: "destructive" });
    }
  };

  const remove = async (id: string) => {
    try {
      const { error } = await supabase.from("tasks").delete().eq("id", id);
      if (error) throw error;
      setTasks((prev) => prev.filter((t) => t.id !== id));
    } catch (err: any) {
      toast({ title: "Erro", description: "Falha ao remover missão.", variant: "destructive" });
    }
  };

  const toggle = async (id: string) => {
    const task = tasks.find((t) => t.id === id);
    if (!task) return null;
    const completed = !task.completed;
    return update(id, { completed, completed_at: completed ? new Date().toISOString() : null });
  };

  return { tasks, loading, create, update, remove, toggle, refetch: fetch };
}

// ============ MOOD ============
export function useMoodEntries() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    try {
      const { data, error } = await supabase.from("mood_entries").select("*").eq("user_id", user.id).order("date", { ascending: false }).limit(30);
      if (error) throw error;
      setEntries(data || []);
    } catch (err: any) {
      console.error("Mood fetch error:", err.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetch(); }, [fetch]);

  const upsertToday = async (entry: Record<string, any>) => {
    if (!user) return { data: null, isNew: false };
    const today = new Date().toISOString().split("T")[0];
    const existing = entries.find((e) => e.date === today);
    try {
      if (existing) {
        const { data, error } = await supabase.from("mood_entries").update(entry).eq("id", existing.id).select().single();
        if (error) throw error;
        if (data) setEntries((prev) => prev.map((e) => (e.id === data.id ? data : e)));
        return { data, isNew: false };
      } else {
        const row = { ...entry, user_id: user.id, date: today };
        const { data, error } = await supabase.from("mood_entries").insert(row as any).select().single();
        if (error) throw error;
        if (data) setEntries((prev) => [data, ...prev]);
        return { data, isNew: true };
      }
    } catch (err: any) {
      toast({ title: "Erro", description: "Falha ao salvar check-in.", variant: "destructive" });
      return { data: null, isNew: false };
    }
  };

  return { entries, loading, upsertToday, refetch: fetch };
}

// ============ FINANCIAL ENTRIES ============
export function useFinancialEntries() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    try {
      const { data, error } = await supabase.from("financial_entries").select("*").eq("user_id", user.id).order("date", { ascending: false });
      if (error) throw error;
      setEntries(data || []);
    } catch (err: any) {
      console.error("Financial entries fetch error:", err.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetch(); }, [fetch]);

  const create = async (entry: Record<string, any>) => {
    if (!user) return;
    try {
      const row = { ...entry, user_id: user.id };
      const { data, error } = await supabase.from("financial_entries").insert(row as any).select().single();
      if (error) throw error;
      if (data) setEntries((prev) => [data, ...prev]);
      return data;
    } catch (err: any) {
      toast({ title: "Erro", description: "Falha ao criar lançamento.", variant: "destructive" });
    }
  };

  const update = async (id: string, updates: Record<string, any>) => {
    try {
      const { data, error } = await supabase.from("financial_entries").update(updates).eq("id", id).select().single();
      if (error) throw error;
      if (data) setEntries((prev) => prev.map((e) => (e.id === id ? data : e)));
      return data;
    } catch (err: any) {
      toast({ title: "Erro", description: "Falha ao atualizar lançamento.", variant: "destructive" });
    }
  };

  const remove = async (id: string) => {
    try {
      const { error } = await supabase.from("financial_entries").delete().eq("id", id);
      if (error) throw error;
      setEntries((prev) => prev.filter((e) => e.id !== id));
    } catch (err: any) {
      toast({ title: "Erro", description: "Falha ao remover lançamento.", variant: "destructive" });
    }
  };

  return { entries, loading, create, update, remove, refetch: fetch };
}

// ============ FINANCIAL GOALS ============
export function useFinancialGoals() {
  const { user } = useAuth();
  const [goals, setGoals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    try {
      const { data, error } = await supabase.from("financial_goals").select("*").eq("user_id", user.id).order("created_at");
      if (error) throw error;
      setGoals(data || []);
    } catch (err: any) {
      console.error("Financial goals fetch error:", err.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetch(); }, [fetch]);

  const create = async (goal: Record<string, any>) => {
    if (!user) return;
    try {
      const row = { ...goal, user_id: user.id };
      const { data, error } = await supabase.from("financial_goals").insert(row as any).select().single();
      if (error) throw error;
      if (data) setGoals((prev) => [...prev, data]);
      return data;
    } catch (err: any) {
      toast({ title: "Erro", description: "Falha ao criar meta.", variant: "destructive" });
    }
  };

  const update = async (id: string, updates: Record<string, any>) => {
    try {
      const { data, error } = await supabase.from("financial_goals").update(updates).eq("id", id).select().single();
      if (error) throw error;
      if (data) setGoals((prev) => prev.map((g) => (g.id === id ? data : g)));
      return data;
    } catch (err: any) {
      toast({ title: "Erro", description: "Falha ao atualizar meta.", variant: "destructive" });
    }
  };

  const remove = async (id: string) => {
    try {
      const { error } = await supabase.from("financial_goals").delete().eq("id", id);
      if (error) throw error;
      setGoals((prev) => prev.filter((g) => g.id !== id));
    } catch (err: any) {
      toast({ title: "Erro", description: "Falha ao remover meta.", variant: "destructive" });
    }
  };

  return { goals, loading, create, update, remove, refetch: fetch };
}

// ============ STUDY SESSIONS ============
export function useStudySessions() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    try {
      const { data, error } = await supabase.from("study_sessions").select("*").eq("user_id", user.id).order("date", { ascending: false });
      if (error) throw error;
      setSessions(data || []);
    } catch (err: any) {
      console.error("Study sessions fetch error:", err.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetch(); }, [fetch]);

  const create = async (session: Record<string, any>) => {
    if (!user) return;
    try {
      const row = { ...session, user_id: user.id };
      const { data, error } = await supabase.from("study_sessions").insert(row as any).select().single();
      if (error) throw error;
      if (data) setSessions((prev) => [data, ...prev]);
      return data;
    } catch (err: any) {
      toast({ title: "Erro", description: "Falha ao registrar sessão.", variant: "destructive" });
    }
  };

  const remove = async (id: string) => {
    try {
      const { error } = await supabase.from("study_sessions").delete().eq("id", id);
      if (error) throw error;
      setSessions((prev) => prev.filter((s) => s.id !== id));
    } catch (err: any) {
      toast({ title: "Erro", description: "Falha ao remover sessão.", variant: "destructive" });
    }
  };

  return { sessions, loading, create, remove, refetch: fetch };
}

// ============ CAREER SKILLS ============
export function useCareerSkills() {
  const { user } = useAuth();
  const [skills, setSkills] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    try {
      const { data, error } = await supabase.from("career_skills").select("*").eq("user_id", user.id).order("created_at");
      if (error) throw error;
      setSkills(data || []);
    } catch (err: any) {
      console.error("Career skills fetch error:", err.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetch(); }, [fetch]);

  const create = async (skill: Record<string, any>) => {
    if (!user) return;
    try {
      const row = { ...skill, user_id: user.id };
      const { data, error } = await supabase.from("career_skills").insert(row as any).select().single();
      if (error) throw error;
      if (data) setSkills((prev) => [...prev, data]);
      return data;
    } catch (err: any) {
      toast({ title: "Erro", description: "Falha ao adicionar habilidade.", variant: "destructive" });
    }
  };

  const update = async (id: string, updates: Record<string, any>) => {
    try {
      const { data, error } = await supabase.from("career_skills").update(updates).eq("id", id).select().single();
      if (error) throw error;
      if (data) setSkills((prev) => prev.map((s) => (s.id === id ? data : s)));
      return data;
    } catch (err: any) {
      toast({ title: "Erro", description: "Falha ao atualizar habilidade.", variant: "destructive" });
    }
  };

  const remove = async (id: string) => {
    try {
      const { error } = await supabase.from("career_skills").delete().eq("id", id);
      if (error) throw error;
      setSkills((prev) => prev.filter((s) => s.id !== id));
    } catch (err: any) {
      toast({ title: "Erro", description: "Falha ao remover habilidade.", variant: "destructive" });
    }
  };

  return { skills, loading, create, update, remove, refetch: fetch };
}

// ============ CAREER GOALS ============
export function useCareerGoals() {
  const { user } = useAuth();
  const [goals, setGoals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    try {
      const { data, error } = await supabase.from("career_goals").select("*").eq("user_id", user.id).order("created_at");
      if (error) throw error;
      setGoals(data || []);
    } catch (err: any) {
      console.error("Career goals fetch error:", err.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetch(); }, [fetch]);

  const create = async (goal: Record<string, any>) => {
    if (!user) return;
    try {
      const row = { ...goal, user_id: user.id };
      const { data, error } = await supabase.from("career_goals").insert(row as any).select().single();
      if (error) throw error;
      if (data) setGoals((prev) => [...prev, data]);
      return data;
    } catch (err: any) {
      toast({ title: "Erro", description: "Falha ao criar meta.", variant: "destructive" });
    }
  };

  const update = async (id: string, updates: Record<string, any>) => {
    try {
      const { data, error } = await supabase.from("career_goals").update(updates).eq("id", id).select().single();
      if (error) throw error;
      if (data) setGoals((prev) => prev.map((g) => (g.id === id ? data : g)));
      return data;
    } catch (err: any) {
      toast({ title: "Erro", description: "Falha ao atualizar meta.", variant: "destructive" });
    }
  };

  const remove = async (id: string) => {
    try {
      const { error } = await supabase.from("career_goals").delete().eq("id", id);
      if (error) throw error;
      setGoals((prev) => prev.filter((g) => g.id !== id));
    } catch (err: any) {
      toast({ title: "Erro", description: "Falha ao remover meta.", variant: "destructive" });
    }
  };

  return { goals, loading, create, update, remove, refetch: fetch };
}

// ============ INVESTMENTS ============
export function useInvestments() {
  const { user } = useAuth();
  const [investments, setInvestments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    try {
      const { data, error } = await supabase.from("investments").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
      if (error) throw error;
      setInvestments(data || []);
    } catch (err: any) {
      console.error("Investments fetch error:", err.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetch(); }, [fetch]);

  const create = async (inv: Record<string, any>) => {
    if (!user) return;
    try {
      const row = { ...inv, user_id: user.id };
      const { data, error } = await supabase.from("investments").insert(row as any).select().single();
      if (error) throw error;
      if (data) setInvestments((prev) => [data, ...prev]);
      return data;
    } catch (err: any) {
      toast({ title: "Erro", description: "Falha ao criar investimento.", variant: "destructive" });
    }
  };

  const update = async (id: string, updates: Record<string, any>) => {
    try {
      const { data, error } = await supabase.from("investments").update(updates).eq("id", id).select().single();
      if (error) throw error;
      if (data) setInvestments((prev) => prev.map((i) => (i.id === id ? data : i)));
      return data;
    } catch (err: any) {
      toast({ title: "Erro", description: "Falha ao atualizar investimento.", variant: "destructive" });
    }
  };

  const remove = async (id: string) => {
    try {
      const { error } = await supabase.from("investments").delete().eq("id", id);
      if (error) throw error;
      setInvestments((prev) => prev.filter((i) => i.id !== id));
    } catch (err: any) {
      toast({ title: "Erro", description: "Falha ao remover investimento.", variant: "destructive" });
    }
  };

  return { investments, loading, create, update, remove, refetch: fetch };
}

// ============ WORKOUTS ============
export function useWorkouts() {
  const { user } = useAuth();
  const [workouts, setWorkouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    try {
      const { data, error } = await supabase.from("workouts" as any).select("*").eq("user_id", user.id).order("date", { ascending: false });
      if (error) throw error;
      setWorkouts((data as any[]) || []);
    } catch (err: any) {
      console.error("Workouts fetch error:", err.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetch(); }, [fetch]);

  const create = async (workout: Record<string, any>) => {
    if (!user) return;
    try {
      const row = { ...workout, user_id: user.id };
      const { data, error } = await supabase.from("workouts" as any).insert(row as any).select().single();
      if (error) throw error;
      if (data) setWorkouts((prev) => [data as any, ...prev]);
      return data;
    } catch (err: any) {
      toast({ title: "Erro", description: "Falha ao registrar treino.", variant: "destructive" });
    }
  };

  const remove = async (id: string) => {
    try {
      const { error } = await supabase.from("workouts" as any).delete().eq("id", id);
      if (error) throw error;
      setWorkouts((prev) => prev.filter((w) => w.id !== id));
    } catch (err: any) {
      toast({ title: "Erro", description: "Falha ao remover treino.", variant: "destructive" });
    }
  };

  return { workouts, loading, create, remove, refetch: fetch };
}

// ============ WORKOUT SCHEDULE (Calendário) ============
export function useWorkoutSchedule() {
  const { user } = useAuth();
  const [schedule, setSchedule] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    try {
      const { data, error } = await supabase
        .from("workout_schedule" as any)
        .select("*")
        .eq("user_id", user.id)
        .order("planned_date", { ascending: true });
      if (error) throw error;
      setSchedule((data as any[]) || []);
    } catch (err: any) {
      console.error("Schedule fetch error:", err.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetch(); }, [fetch]);

  const create = async (item: Record<string, any>) => {
    if (!user) return;
    try {
      const row = { ...item, user_id: user.id };
      const { data, error } = await supabase.from("workout_schedule" as any).insert(row as any).select().single();
      if (error) throw error;
      if (data) setSchedule((prev) => [...prev, data as any].sort((a, b) => a.planned_date.localeCompare(b.planned_date)));
      return data;
    } catch (err: any) {
      toast({ title: "Erro", description: "Falha ao agendar treino.", variant: "destructive" });
    }
  };

  const update = async (id: string, updates: Record<string, any>) => {
    try {
      const { data, error } = await supabase.from("workout_schedule" as any).update(updates).eq("id", id).select().single();
      if (error) throw error;
      if (data) setSchedule((prev) => prev.map((s) => (s.id === id ? (data as any) : s)));
      return data;
    } catch (err: any) {
      toast({ title: "Erro", description: "Falha ao atualizar agendamento.", variant: "destructive" });
    }
  };

  const remove = async (id: string) => {
    try {
      const { error } = await supabase.from("workout_schedule" as any).delete().eq("id", id);
      if (error) throw error;
      setSchedule((prev) => prev.filter((s) => s.id !== id));
    } catch (err: any) {
      toast({ title: "Erro", description: "Falha ao remover agendamento.", variant: "destructive" });
    }
  };

  return { schedule, loading, create, update, remove, refetch: fetch };
}



// ============ REWARDS ============
export function useRewards() {
  const { user } = useAuth();
  const [rewards, setRewards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    try {
      const { data, error } = await supabase.from("rewards").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
      if (error) throw error;
      setRewards(data || []);
    } catch (err: any) {
      console.error("Rewards fetch error:", err.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetch(); }, [fetch]);

  const create = async (reward: Record<string, any>) => {
    if (!user) return;
    try {
      const row = { ...reward, user_id: user.id };
      const { data, error } = await supabase.from("rewards").insert(row as any).select().single();
      if (error) throw error;
      if (data) setRewards((prev) => [data, ...prev]);
      return data;
    } catch (err: any) {
      toast({ title: "Erro", description: "Falha ao criar recompensa.", variant: "destructive" });
    }
  };

  const update = async (id: string, updates: Record<string, any>) => {
    try {
      const { data, error } = await supabase.from("rewards").update(updates).eq("id", id).select().single();
      if (error) throw error;
      if (data) setRewards((prev) => prev.map((r) => (r.id === id ? data : r)));
      return data;
    } catch (err: any) {
      toast({ title: "Erro", description: "Falha ao atualizar recompensa.", variant: "destructive" });
    }
  };

  const remove = async (id: string) => {
    try {
      const { error } = await supabase.from("rewards").delete().eq("id", id);
      if (error) throw error;
      setRewards((prev) => prev.filter((r) => r.id !== id));
    } catch (err: any) {
      toast({ title: "Erro", description: "Falha ao remover recompensa.", variant: "destructive" });
    }
  };

  const redeem = async (id: string) => {
    return update(id, { redeemed: true, redeemed_at: new Date().toISOString() });
  };

  return { rewards, loading, create, update, remove, redeem, refetch: fetch };
}

// ============ ACHIEVEMENTS ============
export function useAchievements() {
  const { user } = useAuth();
  const [unlockedKeys, setUnlockedKeys] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    try {
      const { data, error } = await supabase.from("user_achievements").select("achievement_key").eq("user_id", user.id);
      if (error) throw error;
      setUnlockedKeys((data || []).map((a) => a.achievement_key));
    } catch (err: any) {
      console.error("Achievements fetch error:", err.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetch(); }, [fetch]);

  const unlock = async (key: string) => {
    if (!user || unlockedKeys.includes(key)) return;
    try {
      const { error } = await supabase.from("user_achievements").insert({ user_id: user.id, achievement_key: key } as any);
      if (error) throw error;
      setUnlockedKeys((prev) => [...prev, key]);
      return true;
    } catch {
      return false;
    }
  };

  return { unlockedKeys, loading, unlock, refetch: fetch };
}

// ============ ACHIEVEMENT CHECKER ============
export function useAchievementChecker() {
  const { profile } = useProfile();
  const { tasks } = useTasks();
  const { entries: moodEntries } = useMoodEntries();
  const { sessions: studySessions } = useStudySessions();
  const { unlockedKeys, unlock } = useAchievements();

  const checkAndUnlock = useCallback(async () => {
    if (!profile) return;

    const completedTasks = tasks.filter((t) => t.completed);
    const totalStudyHours = studySessions.reduce((s, session) => s + Number(session.hours), 0);

    const checks: { key: string; condition: boolean; title: string; description: string; icon: string }[] = [
      { key: "first_task", condition: completedTasks.length >= 1, title: "🏅 Primeiro Passo", description: "Complete sua primeira tarefa", icon: "🏅" },
      { key: "streak_3", condition: profile.streak >= 3, title: "🕯️ Centelha", description: "3 dias de streak", icon: "🕯️" },
      { key: "first_mood", condition: moodEntries.length >= 1, title: "🧠 Autoconhecimento", description: "Primeiro check-in mental", icon: "🧠" },
      { key: "first_study", condition: totalStudyHours >= 1, title: "📖 Início da Jornada", description: "Primeira hora de estudo", icon: "📖" },
      { key: "tasks_10", condition: completedTasks.length >= 10, title: "⚔️ Soldado", description: "10 missões completas", icon: "⚔️" },
      { key: "streak_7", condition: profile.streak >= 7, title: "🔥 Chama Acesa", description: "7 dias de streak", icon: "🔥" },
      { key: "hard_10", condition: completedTasks.filter(t => t.difficulty === "hard" || t.difficulty === "epic").length >= 10, title: "💪 Guerreiro do Foco", description: "10 missões difíceis", icon: "💪" },
      { key: "mood_30", condition: moodEntries.length >= 30, title: "🧘 Corpo e Mente", description: "30 check-ins mentais", icon: "🧘" },
      { key: "level_10", condition: profile.level >= 10, title: "⭐ Aventureiro Veterano", description: "Nível 10", icon: "⭐" },
      { key: "study_20h", condition: totalStudyHours >= 20, title: "📚 Estudioso", description: "20h de estudo", icon: "📚" },
      { key: "tasks_50", condition: completedTasks.length >= 50, title: "🗡️ Capitão", description: "50 missões completas", icon: "🗡️" },
      { key: "streak_30", condition: profile.streak >= 30, title: "💎 Inabalável", description: "30 dias de streak", icon: "💎" },
      { key: "study_100h", condition: totalStudyHours >= 100, title: "🎓 Scholar", description: "100h de estudo", icon: "🎓" },
      { key: "master_time", condition: completedTasks.length >= 100, title: "⏰ Mestre do Tempo", description: "100 missões completas", icon: "⏰" },
      { key: "investor", condition: profile.total_xp >= 10000, title: "💎 Investidor", description: "10.000 XP total", icon: "💎" },
      { key: "zen_master", condition: moodEntries.length >= 50, title: "🧘 Zen Master", description: "50 check-ins", icon: "🧘" },
      { key: "level_25", condition: profile.level >= 25, title: "🏛️ Veterano", description: "Nível 25", icon: "🏛️" },
      { key: "tasks_200", condition: completedTasks.length >= 200, title: "🦅 General", description: "200 missões completas", icon: "🦅" },
      { key: "streak_100", condition: profile.streak >= 100, title: "🏛️ Centurião", description: "100 dias de streak", icon: "🏛️" },
      { key: "streak_365", condition: profile.streak >= 365, title: "🏆 Maratonista", description: "365 dias de streak", icon: "🏆" },
      { key: "polymath", condition: profile.level >= 50, title: "🌟 Polímata", description: "Nível 50", icon: "🌟" },
      { key: "transcendent", condition: profile.level >= 100, title: "🌌 Transcendente", description: "Nível 100", icon: "🌌" },
      { key: "tasks_500", condition: completedTasks.length >= 500, title: "👑 Lendário", description: "500 missões completas", icon: "👑" },
      { key: "study_500h", condition: totalStudyHours >= 500, title: "📜 Erudito", description: "500h de estudo", icon: "📜" },
    ];

    for (const check of checks) {
      if (check.condition && !unlockedKeys.includes(check.key)) {
        const ok = await unlock(check.key);
        if (ok) toast({ title: `${check.icon} Conquista Desbloqueada!`, description: `${check.title} — ${check.description}` });
      }
    }
  }, [profile, tasks, moodEntries, studySessions, unlockedKeys, unlock]);

  return { checkAndUnlock };
}
