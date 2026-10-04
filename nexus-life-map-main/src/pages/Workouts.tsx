import { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import { Dumbbell, Plus, Trash2, Clock, Trophy, ChevronDown, ChevronUp, Save, Calendar as CalIcon, Sparkles, Check, X, Wand2, Loader2, Play, Volume2, VolumeX, PlusCircle, Award, Heart, Flame, Trash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useWorkouts, useWorkoutSchedule, useProfile } from "@/hooks/useGameData";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const MUSCLE_GROUPS = [
  { value: "chest", label: "Peito", icon: "🫁" },
  { value: "back", label: "Costas", icon: "🔙" },
  { value: "shoulders", label: "Ombros", icon: "💪" },
  { value: "arms", label: "Braços", icon: "💪" },
  { value: "legs", label: "Pernas", icon: "🦵" },
  { value: "core", label: "Core/Abdômen", icon: "🎯" },
  { value: "cardio", label: "Cardio", icon: "❤️" },
  { value: "full_body", label: "Full Body", icon: "🏋️" },
];

const EXERCISE_TEMPLATES: Record<string, string[]> = {
  chest: ["Supino Reto", "Supino Inclinado", "Crucifixo", "Crossover", "Flexão", "Peck Deck"],
  back: ["Puxada Frontal", "Remada Curvada", "Remada Unilateral", "Pulldown", "Barra Fixa", "Remada Sentada"],
  shoulders: ["Desenvolvimento", "Elevação Lateral", "Elevação Frontal", "Crucifixo Invertido", "Arnold Press"],
  arms: ["Rosca Direta", "Rosca Alternada", "Tríceps Testa", "Tríceps Corda", "Rosca Martelo", "Tríceps Francês"],
  legs: ["Agachamento", "Leg Press", "Cadeira Extensora", "Mesa Flexora", "Panturrilha", "Búlgaro", "Stiff"],
  core: ["Abdominal Crunch", "Prancha", "Prancha Lateral", "Elevação de Pernas", "Russian Twist", "Bicicleta"],
  cardio: ["Corrida", "Bike", "Elíptico", "Pular Corda", "HIIT", "Natação"],
  full_body: ["Burpee", "Kettlebell Swing", "Clean & Press", "Snatch", "Turkish Get-Up", "Thruster"],
};

const WEEK_DAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

interface Exercise { name: string; sets: number; reps: number; weight: number; }

function ymd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function startOfWeek(d: Date) {
  const x = new Date(d);
  x.setDate(x.getDate() - x.getDay());
  x.setHours(0, 0, 0, 0);
  return x;
}

export default function Workouts() {
  const { workouts, loading, create: createWorkout, remove: removeWorkout } = useWorkouts();
  const { schedule, loading: scheduleLoading, create: createSchedule, update: updateSchedule, remove: removeSchedule } = useWorkoutSchedule();
  const { profile, addXp } = useProfile();

  const [tab, setTab] = useState("calendar");
  const [open, setOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Custom exercises per muscle group (persisted locally)
  const [customExercises, setCustomExercises] = useState<Record<string, string[]>>(() => {
    try {
      const raw = localStorage.getItem("workout_custom_exercises");
      return raw ? JSON.parse(raw) : {};
    } catch { return {}; }
  });
  useEffect(() => {
    localStorage.setItem("workout_custom_exercises", JSON.stringify(customExercises));
  }, [customExercises]);
  const getGroupExercises = (group: string): string[] => {
    const base = EXERCISE_TEMPLATES[group] || [];
    const custom = customExercises[group] || [];
    return Array.from(new Set([...custom, ...base]));
  };
  const [manageGroup, setManageGroup] = useState<string | null>(null);
  const [newExerciseName, setNewExerciseName] = useState("");
  const addCustomExercise = (group: string, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setCustomExercises(prev => {
      const list = prev[group] || [];
      if (list.includes(trimmed) || (EXERCISE_TEMPLATES[group] || []).includes(trimmed)) return prev;
      return { ...prev, [group]: [...list, trimmed] };
    });
    setNewExerciseName("");
  };
  const removeCustomExercise = (group: string, name: string) => {
    setCustomExercises(prev => ({ ...prev, [group]: (prev[group] || []).filter(n => n !== name) }));
  };

  // Calendar
  const [weekOffset, setWeekOffset] = useState(0);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleDate, setScheduleDate] = useState<string>("");

  // Schedule form
  const [sGroup, setSGroup] = useState("chest");
  const [sExerciseCount, setSExerciseCount] = useState(4);
  const [sNotes, setSNotes] = useState("");

  // Workout log form
  const [workoutName, setWorkoutName] = useState("");
  const [muscleGroup, setMuscleGroup] = useState("chest");
  const [duration, setDuration] = useState(45);
  const [exercises, setExercises] = useState<Exercise[]>([{ name: "", sets: 3, reps: 12, weight: 0 }]);
  const [notes, setNotes] = useState("");

  // AI
  const [aiOpen, setAiOpen] = useState(false);
  const [aiGoal, setAiGoal] = useState("hipertrofia");
  const [aiExperience, setAiExperience] = useState("intermediario");
  const [aiDays, setAiDays] = useState(4);
  const [aiDuration, setAiDuration] = useState(60);
  const [aiPrefs, setAiPrefs] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiPlan, setAiPlan] = useState<any | null>(null);

  // Active Workout State
  const [activeWorkout, setActiveWorkout] = useState<{
    scheduleId?: string;
    name: string;
    muscleGroup: string;
    startTime: number;
    elapsedSeconds: number;
    exercises: {
      name: string;
      sets: {
        id: string;
        reps: number;
        weight: number;
        done: boolean;
      }[];
    }[];
    notes: string;
  } | null>(null);

  const [showTracker, setShowTracker] = useState(false);
  const [activeExerciseIndex, setActiveExerciseIndex] = useState(0);

  // Rest Timer State
  const [restTimer, setRestTimer] = useState<{
    remaining: number;
    duration: number;
    isActive: boolean;
  }>({ remaining: 60, duration: 60, isActive: false });

  const [muteSound, setMuteSound] = useState(false);

  // Workout End Summary State
  const [showSummary, setShowSummary] = useState(false);
  const [summaryData, setSummaryData] = useState<{
    name: string;
    muscleGroup: string;
    elapsedSeconds: number;
    volumeLifted: number;
    xpEarned: number;
    exercisesCompleted: number;
    setsCompleted: number;
  } | null>(null);

  // Web Audio API rest beep
  const playBeep = () => {
    if (muteSound) return;
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      
      // First chime
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(880, ctx.currentTime);
      gain1.gain.setValueAtTime(0.08, ctx.currentTime);
      osc1.start();
      gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc1.stop(ctx.currentTime + 0.3);

      // Second chime after 150ms
      setTimeout(() => {
        try {
          const ctx2 = new AudioContextClass();
          const osc2 = ctx2.createOscillator();
          const gain2 = ctx2.createGain();
          osc2.connect(gain2);
          gain2.connect(ctx2.destination);
          osc2.type = "sine";
          osc2.frequency.setValueAtTime(1174.66, ctx2.currentTime);
          gain2.gain.setValueAtTime(0.08, ctx2.currentTime);
          osc2.start();
          gain2.gain.exponentialRampToValueAtTime(0.001, ctx2.currentTime + 0.4);
          osc2.stop(ctx2.currentTime + 0.4);
        } catch (err) {}
      }, 150);
    } catch (err) {
      console.warn("Audio Context blocked or not supported", err);
    }
  };

  // Stopwatch effect
  useEffect(() => {
    let interval: any;
    if (showTracker && activeWorkout) {
      interval = setInterval(() => {
        setActiveWorkout(prev => {
          if (!prev) return null;
          return {
            ...prev,
            elapsedSeconds: Math.floor((Date.now() - prev.startTime) / 1000)
          };
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [showTracker, activeWorkout === null]);

  // Rest Timer effect
  useEffect(() => {
    let interval: any;
    if (restTimer.isActive && restTimer.remaining > 0) {
      interval = setInterval(() => {
        setRestTimer(prev => {
          if (prev.remaining <= 1) {
            playBeep();
            return { ...prev, remaining: 0, isActive: false };
          }
          return { ...prev, remaining: prev.remaining - 1 };
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [restTimer.isActive, restTimer.remaining, muteSound]);

  const startScheduledWorkout = (item: any) => {
    const defaultExs = item.exercises || [];
    const formattedExercises = defaultExs.map((ex: any) => {
      const setsCount = Number(ex.sets) || 3;
      const repsCount = Number(ex.reps) || 12;
      const weightVal = Number(ex.weight) || 0;
      return {
        name: ex.name || "Exercício",
        sets: Array.from({ length: setsCount }, (_, index) => ({
          id: `${ex.name || "ex"}-${index}-${Date.now()}`,
          reps: repsCount,
          weight: weightVal,
          done: false
        }))
      };
    });

    if (formattedExercises.length === 0) {
      const templateList = EXERCISE_TEMPLATES[item.muscle_group] || ["Exercício Geral"];
      formattedExercises.push({
        name: templateList[0],
        sets: Array.from({ length: 3 }, (_, index) => ({
          id: `default-${index}-${Date.now()}`,
          reps: 12,
          weight: 0,
          done: false
        }))
      });
    }

    setActiveWorkout({
      scheduleId: item.id,
      name: item.name,
      muscleGroup: item.muscle_group,
      startTime: Date.now(),
      elapsedSeconds: 0,
      exercises: formattedExercises,
      notes: item.notes || ""
    });
    setActiveExerciseIndex(0);
    setRestTimer({ remaining: 60, duration: 60, isActive: false });
    setShowTracker(true);
  };

  const startQuickWorkout = (mGroup = "full_body") => {
    const groupName = MUSCLE_GROUPS.find(g => g.value === mGroup)?.label || "Full Body";
    const templateList = EXERCISE_TEMPLATES[mGroup] || ["Exercício Geral"];
    
    const initialExercise = {
      name: templateList[0],
      sets: Array.from({ length: 3 }, (_, index) => ({
        id: `init-${index}-${Date.now()}`,
        reps: 12,
        weight: 0,
        done: false
      }))
    };

    setActiveWorkout({
      name: `Treino Rápido — ${groupName}`,
      muscleGroup: mGroup,
      startTime: Date.now(),
      elapsedSeconds: 0,
      exercises: [initialExercise],
      notes: ""
    });
    setActiveExerciseIndex(0);
    setRestTimer({ remaining: 60, duration: 60, isActive: false });
    setShowTracker(true);
  };

  const toggleSetCompleted = (exerciseIndex: number, setIndex: number) => {
    if (!activeWorkout) return;

    const updatedExercises = [...activeWorkout.exercises];
    const targetSet = updatedExercises[exerciseIndex].sets[setIndex];
    const isNowDone = !targetSet.done;
    targetSet.done = isNowDone;

    setActiveWorkout({
      ...activeWorkout,
      exercises: updatedExercises
    });

    if (isNowDone) {
      setRestTimer({
        remaining: restTimer.duration,
        duration: restTimer.duration,
        isActive: true
      });
    }
  };

  const activeAddSet = (exerciseIndex: number) => {
    if (!activeWorkout) return;
    const updatedExercises = [...activeWorkout.exercises];
    const currentSets = updatedExercises[exerciseIndex].sets;
    const lastSet = currentSets[currentSets.length - 1] || { reps: 12, weight: 0 };
    
    currentSets.push({
      id: `set-added-${Date.now()}-${Math.random()}`,
      reps: lastSet.reps,
      weight: lastSet.weight,
      done: false
    });

    setActiveWorkout({
      ...activeWorkout,
      exercises: updatedExercises
    });
  };

  const activeRemoveSet = (exerciseIndex: number, setIndex: number) => {
    if (!activeWorkout) return;
    const updatedExercises = [...activeWorkout.exercises];
    const currentSets = updatedExercises[exerciseIndex].sets;
    if (currentSets.length <= 1) return;
    currentSets.splice(setIndex, 1);

    setActiveWorkout({
      ...activeWorkout,
      exercises: updatedExercises
    });
  };

  const activeAddExercise = (exerciseName: string) => {
    if (!activeWorkout) return;
    let name = exerciseName;
    if (exerciseName === "Outro") {
      const customName = prompt("Digite o nome do exercício:");
      if (!customName || !customName.trim()) return;
      name = customName.trim();
    }
    const newEx = {
      name,
      sets: Array.from({ length: 3 }, (_, index) => ({
        id: `added-ex-${index}-${Date.now()}`,
        reps: 12,
        weight: 0,
        done: false
      }))
    };
    setActiveWorkout({
      ...activeWorkout,
      exercises: [...activeWorkout.exercises, newEx]
    });
    setActiveExerciseIndex(activeWorkout.exercises.length);
  };

  const activeRemoveExercise = (exerciseIndex: number) => {
    if (!activeWorkout) return;
    if (activeWorkout.exercises.length <= 1) return;
    const updatedExercises = activeWorkout.exercises.filter((_, idx) => idx !== exerciseIndex);
    setActiveWorkout({
      ...activeWorkout,
      exercises: updatedExercises
    });
    setActiveExerciseIndex(prev => Math.min(prev, updatedExercises.length - 1));
  };

  const finishActiveWorkout = async () => {
    if (!activeWorkout) return;

    const completedExercisesList: any[] = [];
    let totalSetsDone = 0;
    let totalVolume = 0;

    activeWorkout.exercises.forEach(ex => {
      const doneSets = ex.sets.filter(s => s.done);
      if (doneSets.length > 0) {
        totalSetsDone += doneSets.length;
        doneSets.forEach(s => {
          totalVolume += s.reps * s.weight;
        });

        const groups: { reps: number; weight: number; count: number }[] = [];
        doneSets.forEach(s => {
          const matching = groups.find(g => g.reps === s.reps && g.weight === s.weight);
          if (matching) {
            matching.count++;
          } else {
            groups.push({ reps: s.reps, weight: s.weight, count: 1 });
          }
        });

        groups.forEach(g => {
          completedExercisesList.push({
            name: ex.name,
            sets: g.count,
            reps: g.reps,
            weight: g.weight
          });
        });
      }
    });

    if (totalSetsDone === 0) {
      toast({ title: "Treino sem séries concluídas", description: "Conclua pelo menos uma série para salvar.", variant: "destructive" });
      return;
    }

    const durationMinutes = Math.max(1, Math.floor(activeWorkout.elapsedSeconds / 60));
    const xpEarned = Math.round(20 + completedExercisesList.length * 5 + totalSetsDone * 2 + durationMinutes * 1.5);

    await createWorkout({
      name: activeWorkout.name,
      muscle_group: activeWorkout.muscleGroup,
      exercises: completedExercisesList,
      duration_minutes: durationMinutes,
      xp_earned: xpEarned,
      notes: activeWorkout.notes || null,
      date: ymd(new Date())
    });

    if (activeWorkout.scheduleId) {
      await updateSchedule(activeWorkout.scheduleId, {
        completed: true,
        completed_at: new Date().toISOString()
      });
    }

    await addXp(xpEarned);

    setSummaryData({
      name: activeWorkout.name,
      muscleGroup: activeWorkout.muscleGroup,
      elapsedSeconds: activeWorkout.elapsedSeconds,
      volumeLifted: totalVolume,
      xpEarned: xpEarned,
      exercisesCompleted: completedExercisesList.length,
      setsCompleted: totalSetsDone
    });

    setShowSummary(true);
    setShowTracker(false);
    setActiveWorkout(null);
  };

  const formatTime = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return [
      h > 0 ? String(h).padStart(2, "0") : null,
      String(m).padStart(2, "0"),
      String(s).padStart(2, "0")
    ].filter(Boolean).join(":");
  };

  // Week dates
  const weekStart = useMemo(() => {
    const s = startOfWeek(new Date());
    s.setDate(s.getDate() + weekOffset * 7);
    return s;
  }, [weekOffset]);

  const weekDates = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [weekStart]);

  const scheduleByDate = useMemo(() => {
    const map: Record<string, any[]> = {};
    schedule.forEach(s => {
      if (!map[s.planned_date]) map[s.planned_date] = [];
      map[s.planned_date].push(s);
    });
    return map;
  }, [schedule]);

  const openScheduleDialog = (dateStr: string) => {
    setScheduleDate(dateStr);
    setSGroup("chest");
    setSExerciseCount(4);
    setSNotes("");
    setScheduleOpen(true);
  };

  const handleSaveSchedule = async () => {
    const mg = MUSCLE_GROUPS.find(m => m.value === sGroup);
    const autoName = `Treino ${mg?.label || sGroup}`;
    const estimatedDuration = sExerciseCount * 8; // ~8 min per exercise
    await createSchedule({
      planned_date: scheduleDate,
      name: autoName,
      muscle_group: sGroup,
      estimated_duration: estimatedDuration,
      exercises: (EXERCISE_TEMPLATES[sGroup] || []).slice(0, sExerciseCount).map(n => ({ name: n, sets: 3, reps: 12, weight: 0 })),
      notes: sNotes.trim() || null,
    });
    toast({ title: "📅 Treino agendado!", description: `${mg?.icon} ${autoName} · ${sExerciseCount} exercícios` });
    setScheduleOpen(false);
  };

  const handleMarkDone = async (item: any) => {
    if (item.completed) {
      await updateSchedule(item.id, { completed: false, completed_at: null });
      return;
    }
    await updateSchedule(item.id, { completed: true, completed_at: new Date().toISOString() });
    const mg = MUSCLE_GROUPS.find(m => m.value === item.muscle_group);
    await createWorkout({
      name: item.name,
      muscle_group: item.muscle_group,
      exercises: item.exercises || [],
      duration_minutes: item.estimated_duration,
      xp_earned: 30,
      notes: item.notes,
      date: item.planned_date,
    });
    await addXp(30);
    toast({ title: `✅ Treino concluído! +30 XP`, description: `${mg?.icon} ${item.name}` });
  };

  const addExercise = () => setExercises([...exercises, { name: "", sets: 3, reps: 12, weight: 0 }]);
  const updateExercise = (i: number, f: keyof Exercise, v: any) => setExercises(exercises.map((e, idx) => idx === i ? { ...e, [f]: v } : e));
  const removeExercise = (i: number) => { if (exercises.length <= 1) return; setExercises(exercises.filter((_, idx) => idx !== i)); };

  const calcXp = () => 20 + exercises.length * 5 + Math.floor(duration / 15) * 5;

  const handleSave = async () => {
    if (!workoutName.trim()) { toast({ title: "Nome obrigatório", variant: "destructive" }); return; }
    const valid = exercises.filter(e => e.name.trim());
    if (valid.length === 0) { toast({ title: "Adicione 1 exercício", variant: "destructive" }); return; }
    const xp = calcXp();
    await createWorkout({ name: workoutName.trim(), muscle_group: muscleGroup, exercises: valid, duration_minutes: duration, xp_earned: xp, notes: notes.trim() || null });
    await addXp(xp);
    toast({ title: `🏋️ Treino registrado! +${xp} XP` });
    setOpen(false);
    setWorkoutName(""); setMuscleGroup("chest"); setDuration(45); setExercises([{ name: "", sets: 3, reps: 12, weight: 0 }]); setNotes("");
  };

  // AI
  const generateAiPlan = async () => {
    setAiLoading(true);
    setAiPlan(null);
    try {
      const { data, error } = await supabase.functions.invoke("workout-planner", {
        body: { goal: aiGoal, experience: aiExperience, daysPerWeek: aiDays, durationMinutes: aiDuration, archetype: profile?.archetype || "warrior", preferences: aiPrefs },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setAiPlan(data);
    } catch (err: any) {
      toast({ title: "Erro IA", description: err.message || "Falha ao gerar plano", variant: "destructive" });
    } finally {
      setAiLoading(false);
    }
  };

  const applyAiPlan = async () => {
    if (!aiPlan?.plan) return;
    const baseSunday = startOfWeek(new Date());
    let added = 0;
    for (const it of aiPlan.plan) {
      const d = new Date(baseSunday);
      d.setDate(d.getDate() + (it.dayOfWeek ?? 1));
      await createSchedule({
        planned_date: ymd(d),
        name: it.name || "Treino IA",
        muscle_group: it.muscle_group || "full_body",
        estimated_duration: it.estimated_duration || 60,
        exercises: it.exercises || [],
      });
      added++;
    }
    toast({ title: `🪄 ${added} treinos agendados pela IA!` });
    setAiOpen(false);
    setAiPlan(null);
    setTab("calendar");
  };

  // Stats
  const today = ymd(new Date());
  const thisWeek = workouts.filter(w => {
    const d = new Date(w.date);
    const diff = (Date.now() - d.getTime()) / (1000 * 60 * 60 * 24);
    return diff <= 7;
  });
  const todayWorkouts = workouts.filter(w => w.date === today);
  const totalXpWeek = thisWeek.reduce((s, w) => s + (w.xp_earned || 0), 0);
  const totalDurationWeek = thisWeek.reduce((s, w) => s + (w.duration_minutes || 0), 0);
  const plannedThisWeek = weekDates.reduce((acc, d) => acc + (scheduleByDate[ymd(d)]?.length || 0), 0);
  const doneThisWeek = weekDates.reduce((acc, d) => acc + (scheduleByDate[ymd(d)]?.filter((s: any) => s.completed).length || 0), 0);

  const mgLabel = (v: string) => MUSCLE_GROUPS.find(m => m.value === v);

  // 🤖 Smart suggestion: least-trained group in last 14d
  const smartSuggestion = useMemo(() => {
    const counts: Record<string, number> = {};
    MUSCLE_GROUPS.forEach(g => { counts[g.value] = 0; });
    workouts.forEach(w => {
      const d = new Date(w.date);
      const diff = (Date.now() - d.getTime()) / (1000 * 60 * 60 * 24);
      if (diff <= 14 && counts[w.muscle_group] !== undefined) counts[w.muscle_group]++;
    });
    const candidates = ["chest","back","shoulders","arms","legs","core"];
    let best = candidates[0];
    candidates.forEach(c => { if (counts[c] < counts[best]) best = c; });
    return { group: best, count: counts[best] };
  }, [workouts]);

  // 🔁 Repeat previous week into current
  const repeatLastWeek = async () => {
    const prevStart = new Date(weekStart); prevStart.setDate(prevStart.getDate() - 7);
    const prevDates = Array.from({ length: 7 }, (_, i) => { const d = new Date(prevStart); d.setDate(d.getDate() + i); return ymd(d); });
    const prevItems = prevDates.flatMap((ds, idx) => (scheduleByDate[ds] || []).map((it: any) => ({ ...it, dayIdx: idx })));
    if (prevItems.length === 0) { toast({ title: "Nenhum treino na semana anterior", variant: "destructive" }); return; }
    let added = 0;
    for (const it of prevItems) {
      const target = new Date(weekStart); target.setDate(target.getDate() + it.dayIdx);
      await createSchedule({
        planned_date: ymd(target), name: it.name, muscle_group: it.muscle_group,
        estimated_duration: it.estimated_duration, exercises: it.exercises || [], notes: it.notes || null,
      });
      added++;
    }
    toast({ title: `🔁 ${added} treinos copiados da semana anterior!` });
  };

  // ⚡ Quick-add suggested workout for today
  const quickAddSuggested = async () => {
    const mg = MUSCLE_GROUPS.find(m => m.value === smartSuggestion.group);
    const exNames = (EXERCISE_TEMPLATES[smartSuggestion.group] || []).slice(0, 4);
    await createSchedule({
      planned_date: today, name: `Treino ${mg?.label}`, muscle_group: smartSuggestion.group,
      estimated_duration: 50, exercises: exNames.map(n => ({ name: n, sets: 3, reps: 12, weight: 0 })),
    });
    toast({ title: `⚡ Treino sugerido agendado para hoje!`, description: `${mg?.icon} ${mg?.label}` });
  };

  if (loading || scheduleLoading) {
    return <div className="flex items-center justify-center p-12"><div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" /></div>;
  }

  return (
    showTracker && activeWorkout ? (
      <div className="fixed inset-0 z-50 bg-background/98 backdrop-blur-lg overflow-y-auto p-4 md:p-6 flex items-center justify-center animate-in fade-in duration-300">
        <div className="w-full max-w-4xl bg-card border border-border shadow-[0_0_50px_rgba(255,215,0,0.1)] rounded-2xl p-4 md:p-6 flex flex-col md:flex-row gap-6 relative overflow-hidden">
          {/* Decorative glowing gradient */}
          <div className="absolute -left-20 -bottom-20 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
          
          {/* Main Exercise Panel */}
          <div className="flex-1 space-y-4">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-border pb-4 gap-2">
              <div>
                <span className="text-[10px] text-primary uppercase font-bold tracking-widest flex items-center gap-1">
                  ⚔️ Missão Ativa
                </span>
                <h2 className="text-xl font-bold flex items-center gap-2 text-gradient-gold">
                  <Dumbbell className="h-5 w-5 text-primary animate-pulse" /> {activeWorkout.name}
                </h2>
                <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-1">
                  <span>Foco: </span>
                  <Badge variant="outline" className="border-primary/30 text-primary capitalize text-[10px] py-0">
                    {mgLabel(activeWorkout.muscleGroup)?.icon} {mgLabel(activeWorkout.muscleGroup)?.label}
                  </Badge>
                </p>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wider">Tempo Decorrido</p>
                  <p className="text-2xl font-mono font-bold text-primary tracking-wider">{formatTime(activeWorkout.elapsedSeconds)}</p>
                </div>
              </div>
            </div>

            {/* Exercise tabs */}
            <div className="space-y-1.5">
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Exercícios</p>
              <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-thin">
                {activeWorkout.exercises.map((ex, index) => {
                  const completedCount = ex.sets.filter(s => s.done).length;
                  const totalSets = ex.sets.length;
                  const isCompleted = completedCount === totalSets && totalSets > 0;
                  const isActive = index === activeExerciseIndex;
                  return (
                    <button
                      key={index}
                      onClick={() => setActiveExerciseIndex(index)}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold whitespace-nowrap transition-all shrink-0 ${
                        isActive 
                          ? "bg-primary text-primary-foreground border-primary shadow-[0_0_15px_rgba(255,215,0,0.2)]" 
                          : isCompleted 
                            ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" 
                            : "bg-secondary text-muted-foreground border-border hover:bg-secondary/80"
                      }`}
                    >
                      {isCompleted && <Check className="h-3 w-3" />}
                      {ex.name}
                      <span className="text-[9px] opacity-80">({completedCount}/{totalSets})</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Exercise Card detail */}
            {activeWorkout.exercises[activeExerciseIndex] && (
              <div className="rounded-xl border border-border bg-secondary/10 p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-primary uppercase font-bold tracking-widest">Exercício Atual</span>
                    <h3 className="text-base font-bold text-foreground">{activeWorkout.exercises[activeExerciseIndex].name}</h3>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-destructive hover:bg-destructive/10 text-xs h-8"
                    onClick={() => activeRemoveExercise(activeExerciseIndex)}
                    disabled={activeWorkout.exercises.length <= 1}
                  >
                    <Trash className="h-3.5 w-3.5 mr-1" /> Remover
                  </Button>
                </div>

                {/* Sets Table */}
                <div className="space-y-2">
                  <div className="grid grid-cols-12 gap-2 text-center text-[10px] font-bold text-muted-foreground uppercase px-2">
                    <div className="col-span-2 text-left">Série</div>
                    <div className="col-span-3">Carga (kg)</div>
                    <div className="col-span-3">Reps</div>
                    <div className="col-span-3">Status</div>
                    <div className="col-span-1"></div>
                  </div>

                  <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
                    {activeWorkout.exercises[activeExerciseIndex].sets.map((set, setIdx) => (
                      <div 
                        key={set.id}
                        className={`grid grid-cols-12 gap-2 items-center rounded-lg p-1.5 transition-all ${
                          set.done 
                            ? "bg-emerald-500/5 border border-emerald-500/10" 
                            : "bg-secondary/40 border border-transparent"
                        }`}
                      >
                        <div className="col-span-2 text-xs font-bold text-muted-foreground pl-2">
                          #{setIdx + 1}
                        </div>
                        <div className="col-span-3">
                          <Input 
                            type="number" 
                            value={set.weight} 
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              const updated = [...activeWorkout.exercises];
                              updated[activeExerciseIndex].sets[setIdx].weight = val;
                              setActiveWorkout({ ...activeWorkout, exercises: updated });
                            }}
                            className="h-8 text-center text-xs font-semibold"
                            disabled={set.done}
                          />
                        </div>
                        <div className="col-span-3">
                          <Input 
                            type="number" 
                            value={set.reps} 
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              const updated = [...activeWorkout.exercises];
                              updated[activeExerciseIndex].sets[setIdx].reps = val;
                              setActiveWorkout({ ...activeWorkout, exercises: updated });
                            }}
                            className="h-8 text-center text-xs font-semibold"
                            disabled={set.done}
                          />
                        </div>
                        <div className="col-span-3">
                          <button
                            onClick={() => toggleSetCompleted(activeExerciseIndex, setIdx)}
                            className={`w-full h-8 rounded-md text-xs font-bold flex items-center justify-center gap-1 transition-all ${
                              set.done 
                                ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/10" 
                                : "bg-secondary hover:bg-secondary/80 border border-border text-muted-foreground"
                            }`}
                          >
                            {set.done ? (
                              <><Check className="h-3.5 w-3.5" /> Feito</>
                            ) : (
                              "Concluir"
                            )}
                          </button>
                        </div>
                        <div className="col-span-1 flex justify-center">
                          <button
                            onClick={() => activeRemoveSet(activeExerciseIndex, setIdx)}
                            disabled={activeWorkout.exercises[activeExerciseIndex].sets.length <= 1}
                            className="text-destructive/50 hover:text-destructive disabled:opacity-30 p-1"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1 text-xs h-8 border-dashed gap-1"
                    onClick={() => activeAddSet(activeExerciseIndex)}
                  >
                    <Plus className="h-3 w-3" /> Adicionar Série
                  </Button>
                </div>
              </div>
            )}

            {/* Notes */}
            <div className="space-y-1.5">
              <label className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Notas do Treino</label>
              <Textarea
                value={activeWorkout.notes}
                onChange={(e) => setActiveWorkout({ ...activeWorkout, notes: e.target.value })}
                placeholder="Observações do treino, carga máxima, intensidade..."
                rows={2}
                className="text-xs bg-secondary/20"
              />
            </div>
          </div>

          {/* Sidebar / Rest Timer */}
          <div className="w-full md:w-72 bg-secondary/20 rounded-xl p-4 border border-border flex flex-col justify-between space-y-4">
            <div className="space-y-4">
              {/* Rest Timer Card */}
              <div className="rounded-xl border border-border bg-card p-4 space-y-3 relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                    ⏱️ Temporizador de Descanso
                  </p>
                  <button 
                    onClick={() => setMuteSound(!muteSound)}
                    className="text-muted-foreground hover:text-primary p-1"
                  >
                    {muteSound ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                  </button>
                </div>

                <div className="text-center">
                  <p className={`text-4xl font-mono font-bold tracking-widest ${
                    restTimer.isActive ? "text-primary animate-pulse" : "text-muted-foreground"
                  }`}>
                    {String(restTimer.remaining).padStart(2, "0")}<span className="text-xs font-sans text-muted-foreground ml-0.5">s</span>
                  </p>

                  {/* Rest progress bar */}
                  <div className="w-full bg-secondary h-1.5 rounded-full overflow-hidden mt-3">
                    <div 
                      className="bg-primary h-full rounded-full transition-all"
                      style={{ width: `${(restTimer.remaining / restTimer.duration) * 100}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-1 pt-1">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-6 text-[10px] p-0"
                    onClick={() => setRestTimer(prev => ({ ...prev, remaining: Math.max(0, prev.remaining - 15) }))}
                  >
                    -15s
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-6 text-[10px] p-0"
                    onClick={() => setRestTimer(prev => ({ 
                      ...prev, 
                      remaining: Math.min(prev.duration * 2, prev.remaining + 15) 
                    }))}
                  >
                    +15s
                  </Button>
                  <Button 
                    variant={restTimer.isActive ? "secondary" : "default"} 
                    size="sm" 
                    className="h-6 text-[10px] p-0"
                    onClick={() => setRestTimer(prev => ({ ...prev, isActive: !prev.isActive }))}
                  >
                    {restTimer.isActive ? "Pausar" : "Iniciar"}
                  </Button>
                </div>

                <div className="flex gap-1">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="w-full h-6 text-[10px] text-muted-foreground hover:text-foreground"
                    onClick={() => setRestTimer(prev => ({ ...prev, remaining: 0, isActive: false }))}
                  >
                    Pular Descanso
                  </Button>
                </div>

                {/* Target Rest Select */}
                <div className="space-y-1 mt-2 pt-2 border-t border-border/50">
                  <label className="text-[9px] font-bold text-muted-foreground uppercase">Duração Alvo</label>
                  <Select 
                    value={String(restTimer.duration)} 
                    onValueChange={(val) => {
                      const num = Number(val);
                      setRestTimer({ remaining: num, duration: num, isActive: false });
                    }}
                  >
                    <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30">30 segundos</SelectItem>
                      <SelectItem value="45">45 segundos</SelectItem>
                      <SelectItem value="60">60 segundos (1m)</SelectItem>
                      <SelectItem value="90">90 segundos (1.5m)</SelectItem>
                      <SelectItem value="120">120 segundos (2m)</SelectItem>
                      <SelectItem value="180">180 segundos (3m)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Quick Add Exercise */}
              <div className="space-y-1.5 pt-2 border-t border-border/40">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <PlusCircle className="h-3.5 w-3.5 text-primary" /> Adicionar Exercício
                </label>
                <Select onValueChange={(val) => { if (val) activeAddExercise(val); }}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Escolher exercício..." /></SelectTrigger>
                  <SelectContent>
                    {getGroupExercises(activeWorkout.muscleGroup).map(n => (
                      <SelectItem key={n} value={n}>{n}</SelectItem>
                    ))}
                    <SelectItem value="Outro">Outro...</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Active Tracker Main Controls */}
            <div className="space-y-2 pt-4 border-t border-border/50">
              <Button 
                onClick={finishActiveWorkout}
                className="w-full h-11 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm tracking-wide gap-2 shadow-[0_0_15px_rgba(16,185,129,0.25)] border border-emerald-500/20 rounded-xl"
              >
                <Check className="h-4 w-4" /> Finalizar Treino
              </Button>
              
              <Button 
                variant="ghost" 
                onClick={() => {
                  if (confirm("Tem certeza que deseja cancelar a sessão? Seus dados não serão salvos.")) {
                    setShowTracker(false);
                    setActiveWorkout(null);
                  }
                }}
                className="w-full h-9 hover:bg-destructive/10 text-destructive hover:text-destructive text-xs font-semibold tracking-wide gap-1 rounded-xl"
              >
                <X className="h-3.5 w-3.5" /> Cancelar Treino
              </Button>
            </div>
          </div>
        </div>
      </div>
    ) : (
      <div className="space-y-6 max-w-5xl mx-auto pb-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-gradient-gold flex items-center gap-2">
            <Dumbbell className="h-6 w-6 text-primary" /> Sala de Treinos
          </h1>
          <p className="text-sm text-muted-foreground">Agende, treine e evolua seu personagem</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setAiOpen(true)} className="gap-2 text-xs sm:text-sm">
            <Sparkles className="h-4 w-4 text-primary" /> IA Coach
          </Button>
          <Button variant="secondary" onClick={() => startQuickWorkout("full_body")} className="gap-2 text-xs sm:text-sm border border-primary/30 hover:bg-secondary/85 transition-colors">
            <Play className="h-4 w-4 text-primary animate-pulse" /> Iniciar Treino
          </Button>
          <Button onClick={() => setOpen(true)} className="gap-2 text-xs sm:text-sm"><Plus className="h-4 w-4" /> Registrar</Button>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "Hoje", value: todayWorkouts.length, icon: "🏋️" },
          { label: "Semana", value: thisWeek.length, icon: "📅" },
          { label: "XP Semana", value: `+${totalXpWeek}`, icon: "⚡" },
          { label: "Minutos", value: totalDurationWeek, icon: "⏱️" },
          { label: "Plano", value: `${doneThisWeek}/${plannedThisWeek}`, icon: "🎯" },
        ].map((s, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
            className="rounded-xl border border-border bg-card p-3 text-center">
            <span className="text-2xl">{s.icon}</span>
            <p className="text-lg font-bold text-foreground mt-1">{s.value}</p>
            <p className="text-[10px] text-muted-foreground">{s.label}</p>
          </motion.div>
        ))}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="calendar" className="gap-1"><CalIcon className="h-3.5 w-3.5" /> Calendário</TabsTrigger>
          <TabsTrigger value="history" className="gap-1"><Clock className="h-3.5 w-3.5" /> Histórico</TabsTrigger>
          <TabsTrigger value="muscles" className="gap-1"><Trophy className="h-3.5 w-3.5" /> Grupos</TabsTrigger>
        </TabsList>

        {/* CALENDAR */}
        <TabsContent value="calendar" className="space-y-3 mt-4">
          {/* Smart suggestion banner */}
          <div className="rounded-xl border border-primary/30 bg-gradient-to-r from-primary/10 to-primary/5 p-3 flex items-center gap-3">
            <span className="text-2xl">{mgLabel(smartSuggestion.group)?.icon}</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground">Sugestão inteligente para hoje</p>
              <p className="text-[11px] text-muted-foreground">
                Você treinou <span className="font-bold text-primary">{mgLabel(smartSuggestion.group)?.label}</span> apenas {smartSuggestion.count}x nos últimos 14 dias
              </p>
            </div>
            <Button size="sm" onClick={quickAddSuggested} className="gap-1 shrink-0"><Plus className="h-3 w-3" /> Agendar</Button>
          </div>

          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" onClick={() => setWeekOffset(weekOffset - 1)}>←</Button>
              <div className="text-xs sm:text-sm font-medium text-foreground">
                {weekStart.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })} – {weekDates[6].toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                {weekOffset === 0 && <Badge variant="outline" className="ml-2 text-[10px]">Esta semana</Badge>}
              </div>
              <Button variant="ghost" size="sm" onClick={() => setWeekOffset(weekOffset + 1)}>→</Button>
            </div>
            <Button variant="outline" size="sm" onClick={repeatLastWeek} className="gap-1 text-xs">
              🔁 Repetir semana anterior
            </Button>
          </div>

          {/* Mobile: vertical list (full names visible) */}
          <div className="space-y-2 lg:hidden">
            {weekDates.map((d, i) => {
              const dStr = ymd(d);
              const items = scheduleByDate[dStr] || [];
              const isToday = dStr === today;
              const isPast = d < new Date(new Date().setHours(0, 0, 0, 0));
              return (
                <motion.div key={dStr} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                  className={`rounded-xl border p-3 ${isToday ? "border-primary bg-primary/5" : "border-border bg-card"}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold uppercase ${isToday ? "text-primary" : "text-muted-foreground"}`}>{WEEK_DAYS[i]}</span>
                      <span className={`text-lg font-bold ${isToday ? "text-primary" : "text-foreground"}`}>{d.getDate()}</span>
                      {isToday && <Badge variant="outline" className="text-[9px] h-4 border-primary/40 text-primary">Hoje</Badge>}
                    </div>
                    <button onClick={() => openScheduleDialog(dStr)} className="text-[11px] text-primary hover:underline flex items-center gap-1">
                      <Plus className="h-3 w-3" /> agendar
                    </button>
                  </div>
                  {items.length === 0 ? (
                    <p className="text-[11px] text-muted-foreground italic">Dia de descanso</p>
                  ) : (
                    <div className="space-y-1.5">
                      {items.map((it: any) => {
                        const mg = mgLabel(it.muscle_group);
                        return (
                          <div key={it.id} className={`group rounded-lg border p-2.5 cursor-pointer transition-all ${it.completed ? "border-emerald-500/40 bg-emerald-500/10" : isPast ? "border-destructive/30 bg-destructive/5" : "border-primary/30 bg-primary/10 active:bg-primary/20"}`}
                            onClick={() => handleMarkDone(it)}>
                            <div className="flex items-center gap-2">
                              <span className="text-xl">{mg?.icon}</span>
                              <div className="flex-1 min-w-0">
                                <p className={`text-sm font-medium ${it.completed ? "line-through text-muted-foreground" : "text-foreground"}`}>{it.name}</p>
                                <p className="text-[11px] text-muted-foreground">{mg?.label} · {it.estimated_duration}min</p>
                              </div>
                              {!it.completed && (
                                <button onClick={(e) => { e.stopPropagation(); startScheduledWorkout(it); }}
                                  className="h-7 px-2.5 rounded bg-primary text-primary-foreground hover:bg-primary/95 text-xs font-semibold flex items-center justify-center gap-1 transition-all shadow-sm shrink-0">
                                  <Play className="h-3 w-3 fill-current" /> Iniciar
                                </button>
                              )}
                              {it.completed && <Check className="h-4 w-4 text-emerald-500 shrink-0" />}
                              <button onClick={(e) => { e.stopPropagation(); removeSchedule(it.id); }}
                                className="text-destructive/60 hover:text-destructive p-1 shrink-0">
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>

          {/* Desktop: 7-column grid with wrapping names */}
          <div className="hidden lg:grid grid-cols-7 gap-2">
            {weekDates.map((d, i) => {
              const dStr = ymd(d);
              const items = scheduleByDate[dStr] || [];
              const isToday = dStr === today;
              const isPast = d < new Date(new Date().setHours(0, 0, 0, 0));
              return (
                <motion.div key={dStr} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                  className={`rounded-xl border min-h-[180px] p-2 flex flex-col gap-1.5 transition-all ${isToday ? "border-primary bg-primary/5 shadow-[0_0_20px_hsl(var(--primary)/0.15)]" : "border-border bg-card"}`}>
                  <div className="text-center pb-1.5 border-b border-border/50">
                    <p className="text-[10px] text-muted-foreground uppercase">{WEEK_DAYS[i]}</p>
                    <p className={`text-lg font-bold ${isToday ? "text-primary" : "text-foreground"}`}>{d.getDate()}</p>
                  </div>
                  <div className="flex-1 space-y-1 overflow-y-auto">
                    {items.map((it: any) => {
                      const mg = mgLabel(it.muscle_group);
                      return (
                          <div key={it.id} title={it.name}
                            className={`group rounded-lg border p-1.5 text-[11px] cursor-pointer transition-all ${it.completed ? "border-emerald-500/40 bg-emerald-500/10" : isPast ? "border-destructive/30 bg-destructive/5" : "border-primary/30 bg-primary/10 hover:bg-primary/20"}`}
                            onClick={() => handleMarkDone(it)}>
                            <div className="flex items-start gap-1">
                              <span className="text-base leading-none mt-0.5">{mg?.icon}</span>
                              <div className="flex-1 min-w-0">
                                <p className={`font-medium leading-tight break-words ${it.completed ? "line-through text-muted-foreground" : "text-foreground"}`}>{it.name}</p>
                                <p className="text-[10px] text-muted-foreground mt-0.5">{it.estimated_duration}min</p>
                              </div>
                              {it.completed && <Check className="h-3 w-3 text-emerald-500 shrink-0" />}
                            </div>
                            {!it.completed && (
                              <button onClick={(e) => { e.stopPropagation(); startScheduledWorkout(it); }}
                                className="mt-1 w-full flex items-center justify-center py-0.5 rounded bg-primary text-primary-foreground hover:bg-primary/95 text-[9px] font-semibold gap-0.5 transition-all shrink-0 shadow-sm">
                                <Play className="h-2 w-2 fill-current" /> Iniciar
                              </button>
                            )}
                            <button onClick={(e) => { e.stopPropagation(); removeSchedule(it.id); }}
                              className="opacity-0 group-hover:opacity-100 text-destructive text-[9px] mt-0.5 transition-opacity block">
                              remover
                            </button>
                          </div>
                      );
                    })}
                  </div>
                  <button onClick={() => openScheduleDialog(dStr)}
                    className="text-[10px] text-muted-foreground hover:text-primary hover:bg-primary/5 rounded-md py-1 transition-colors flex items-center justify-center gap-1">
                    <Plus className="h-3 w-3" /> agendar
                  </button>
                </motion.div>
              );
            })}
          </div>

          <p className="text-[11px] text-muted-foreground text-center">
            💡 Toque em um treino para marcar como concluído e ganhar XP
          </p>
        </TabsContent>

        {/* HISTORY */}
        <TabsContent value="history" className="mt-4">
          {workouts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Dumbbell className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Nenhum treino registrado ainda</p>
            </div>
          ) : (
            <div className="space-y-2">
              {workouts.slice(0, 30).map((w, i) => {
                const mg = mgLabel(w.muscle_group);
                const exList = (w.exercises as Exercise[]) || [];
                const isExpanded = expandedId === w.id;
                return (
                  <motion.div key={w.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                    className="rounded-xl border border-border bg-card overflow-hidden">
                    <button onClick={() => setExpandedId(isExpanded ? null : w.id)} className="w-full flex items-center gap-3 p-3 text-left hover:bg-secondary/30">
                      <span className="text-2xl">{mg?.icon || "🏋️"}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{w.name}</p>
                        <p className="text-[10px] text-muted-foreground">{mg?.label} · {w.duration_minutes}min · {exList.length} exercícios</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-primary">+{w.xp_earned} XP</span>
                        <span className="text-[10px] text-muted-foreground">{new Date(w.date).toLocaleDateString("pt-BR")}</span>
                        {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                      </div>
                    </button>
                    {isExpanded && (
                      <div className="border-t border-border px-3 py-2">
                        <div className="space-y-1.5 mb-2">
                          {exList.map((ex, j) => (
                            <div key={j} className="flex items-center justify-between text-xs bg-secondary/30 rounded-lg px-3 py-1.5">
                              <span className="text-foreground font-medium">{ex.name}</span>
                              <span className="text-muted-foreground">{ex.sets}x{ex.reps} · {ex.weight}kg</span>
                            </div>
                          ))}
                        </div>
                        {w.notes && <p className="text-[10px] text-muted-foreground italic mb-2">{w.notes}</p>}
                        <Button variant="ghost" size="sm" className="text-destructive text-xs h-7" onClick={() => removeWorkout(w.id)}>
                          <Trash2 className="h-3 w-3 mr-1" /> Remover
                        </Button>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* MUSCLE GROUPS */}
        <TabsContent value="muscles" className="mt-4 space-y-4">
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-foreground">Frequência da Semana</h3>
              <p className="text-[10px] text-muted-foreground">Toque para gerenciar exercícios</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {MUSCLE_GROUPS.map(g => {
                const count = thisWeek.filter(w => w.muscle_group === g.value).length;
                const customCount = (customExercises[g.value] || []).length;
                return (
                  <button
                    key={g.value}
                    onClick={() => { setManageGroup(g.value); setNewExerciseName(""); }}
                    className={`rounded-lg border p-3 text-center transition hover:border-primary/50 hover:bg-primary/5 ${count > 0 ? "border-primary/30 bg-primary/10" : "border-border bg-secondary/30"}`}
                  >
                    <span className="text-2xl">{g.icon}</span>
                    <p className="text-[11px] text-muted-foreground mt-1">{g.label}</p>
                    <p className={`text-base font-bold ${count > 0 ? "text-primary" : "text-muted-foreground"}`}>{count}x</p>
                    {customCount > 0 && (
                      <p className="text-[9px] text-primary/80 mt-0.5">+{customCount} personalizado{customCount > 1 ? "s" : ""}</p>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Manage Exercises Dialog */}
      <Dialog open={!!manageGroup} onOpenChange={(o) => { if (!o) setManageGroup(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <span>{MUSCLE_GROUPS.find(g => g.value === manageGroup)?.icon}</span>
              Exercícios · {MUSCLE_GROUPS.find(g => g.value === manageGroup)?.label}
            </DialogTitle>
            <DialogDescription>
              Adicione os exercícios que você faz para este grupo. Eles ficarão disponíveis ao registrar treinos.
            </DialogDescription>
          </DialogHeader>
          {manageGroup && (
            <div className="space-y-3 mt-2">
              <div className="flex gap-2">
                <Input
                  value={newExerciseName}
                  onChange={e => setNewExerciseName(e.target.value)}
                  placeholder="Ex: Supino Reto com halteres"
                  onKeyDown={e => { if (e.key === "Enter") addCustomExercise(manageGroup, newExerciseName); }}
                />
                <Button onClick={() => addCustomExercise(manageGroup, newExerciseName)} className="gap-1">
                  <Plus className="h-4 w-4" /> Add
                </Button>
              </div>

              {(customExercises[manageGroup] || []).length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Seus exercícios</p>
                  <div className="space-y-1.5">
                    {(customExercises[manageGroup] || []).map(name => (
                      <div key={name} className="flex items-center justify-between gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2">
                        <span className="text-sm text-foreground">{name}</span>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeCustomExercise(manageGroup!, name)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Sugestões (padrão)</p>
                <div className="flex flex-wrap gap-1.5">
                  {(EXERCISE_TEMPLATES[manageGroup] || []).map(n => (
                    <button
                      key={n}
                      onClick={() => addCustomExercise(manageGroup!, n)}
                      className="text-[11px] px-2 py-1 rounded-full border border-border bg-secondary/40 hover:border-primary/40 hover:bg-primary/10 transition"
                    >
                      + {n}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>


      {/* Schedule Dialog */}
      <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">📅 Agendar Treino</DialogTitle>
            <DialogDescription>
              {scheduleDate && new Date(scheduleDate + "T00:00:00").toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            {/* Auto-name preview */}
            <div className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 flex items-center gap-2">
              <span className="text-xl">{MUSCLE_GROUPS.find(g => g.value === sGroup)?.icon}</span>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Treino</p>
                <p className="text-sm font-semibold text-foreground">Treino {MUSCLE_GROUPS.find(g => g.value === sGroup)?.label}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Select value={sGroup} onValueChange={(v) => { setSGroup(v); setSExerciseCount(Math.min(sExerciseCount, (EXERCISE_TEMPLATES[v] || []).length || 6)); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{MUSCLE_GROUPS.map(g => <SelectItem key={g.value} value={g.value}>{g.icon} {g.label}</SelectItem>)}</SelectContent>
              </Select>
              <div className="space-y-1">
                <Input
                  type="number"
                  value={sExerciseCount}
                  onChange={e => setSExerciseCount(Math.max(1, Math.min(Number(e.target.value), (EXERCISE_TEMPLATES[sGroup] || []).length || 10)))}
                  min={1}
                  max={(EXERCISE_TEMPLATES[sGroup] || []).length || 10}
                  placeholder="Qtd. exercícios"
                />
                <p className="text-[10px] text-muted-foreground text-center">~{sExerciseCount * 8} min estimado</p>
              </div>
            </div>
            <Input value={sNotes} onChange={e => setSNotes(e.target.value)} placeholder="Notas (opcional)" />
            <Button onClick={handleSaveSchedule} className="w-full gap-2"><Save className="h-4 w-4" /> Agendar</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Register Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-display">🏋️ Registrar Treino</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <Input value={workoutName} onChange={e => setWorkoutName(e.target.value)} placeholder="Nome do treino" />
            <div className="grid grid-cols-2 gap-3">
              <Select value={muscleGroup} onValueChange={setMuscleGroup}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{MUSCLE_GROUPS.map(g => <SelectItem key={g.value} value={g.value}>{g.icon} {g.label}</SelectItem>)}</SelectContent>
              </Select>
              <Input type="number" value={duration} onChange={e => setDuration(Number(e.target.value))} min={5} />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium">Exercícios</label>
                <Button variant="ghost" size="sm" onClick={addExercise} className="h-7 text-xs gap-1"><Plus className="h-3 w-3" /> Adicionar</Button>
              </div>
              <div className="space-y-2">
                {exercises.map((ex, i) => (
                  <div key={i} className="rounded-lg border border-border bg-secondary/30 p-3 space-y-2">
                    <div className="flex gap-2">
                      <Select value={ex.name} onValueChange={v => updateExercise(i, "name", v)}>
                        <SelectTrigger className="flex-1"><SelectValue placeholder="Exercício" /></SelectTrigger>
                        <SelectContent>{getGroupExercises(muscleGroup).map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}</SelectContent>
                      </Select>
                      <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive" onClick={() => removeExercise(i)} disabled={exercises.length <= 1}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <Input type="number" value={ex.sets} onChange={e => updateExercise(i, "sets", Number(e.target.value))} min={1} className="h-8 text-sm" placeholder="Séries" />
                      <Input type="number" value={ex.reps} onChange={e => updateExercise(i, "reps", Number(e.target.value))} min={1} className="h-8 text-sm" placeholder="Reps" />
                      <Input type="number" value={ex.weight} onChange={e => updateExercise(i, "weight", Number(e.target.value))} min={0} className="h-8 text-sm" placeholder="kg" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notas (opcional)" />
            <div className="flex items-center justify-between p-3 rounded-lg bg-primary/10 border border-primary/20">
              <span className="text-sm font-medium">XP do Treino</span>
              <span className="text-lg font-bold text-primary">+{calcXp()} XP</span>
            </div>
            <Button onClick={handleSave} className="w-full gap-2"><Save className="h-4 w-4" /> Salvar Treino</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* AI Dialog */}
      <Dialog open={aiOpen} onOpenChange={(v) => { setAiOpen(v); if (!v) setAiPlan(null); }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" /> IA Coach RPG
            </DialogTitle>
            <DialogDescription>Gere um plano semanal personalizado com IA</DialogDescription>
          </DialogHeader>

          {!aiPlan ? (
            <div className="space-y-3 mt-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-muted-foreground">Objetivo</label>
                  <Select value={aiGoal} onValueChange={setAiGoal}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hipertrofia">💪 Hipertrofia</SelectItem>
                      <SelectItem value="emagrecimento">🔥 Emagrecimento</SelectItem>
                      <SelectItem value="forca">🏋️ Força</SelectItem>
                      <SelectItem value="resistencia">🏃 Resistência</SelectItem>
                      <SelectItem value="condicionamento">⚡ Condicionamento</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Nível</label>
                  <Select value={aiExperience} onValueChange={setAiExperience}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="iniciante">Iniciante</SelectItem>
                      <SelectItem value="intermediario">Intermediário</SelectItem>
                      <SelectItem value="avancado">Avançado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Dias/semana</label>
                  <Input type="number" value={aiDays} onChange={e => setAiDays(Number(e.target.value))} min={1} max={7} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Min/sessão</label>
                  <Input type="number" value={aiDuration} onChange={e => setAiDuration(Number(e.target.value))} min={20} max={180} />
                </div>
              </div>
              <Textarea value={aiPrefs} onChange={e => setAiPrefs(e.target.value)} placeholder="Preferências, equipamentos, limitações... (opcional)" rows={3} />
              <Button onClick={generateAiPlan} disabled={aiLoading} className="w-full gap-2">
                {aiLoading ? <><Loader2 className="h-4 w-4 animate-spin" /> Gerando plano...</> : <><Wand2 className="h-4 w-4" /> Gerar com IA</>}
              </Button>
            </div>
          ) : (
            <div className="space-y-3 mt-2">
              {aiPlan.summary && (
                <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 text-sm text-foreground">
                  {aiPlan.summary}
                </div>
              )}
              <div className="space-y-2">
                {(aiPlan.plan || []).map((it: any, i: number) => {
                  const mg = mgLabel(it.muscle_group);
                  return (
                    <div key={i} className="rounded-lg border border-border bg-card p-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{mg?.icon || "🏋️"}</span>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{it.name}</p>
                          <p className="text-[10px] text-muted-foreground">{WEEK_DAYS[it.dayOfWeek] || "Dia"} · {it.estimated_duration}min · {(it.exercises || []).length} exercícios</p>
                        </div>
                      </div>
                      {it.exercises && it.exercises.length > 0 && (
                        <div className="mt-2 pl-7 space-y-1">
                          {it.exercises.slice(0, 5).map((e: any, j: number) => (
                            <p key={j} className="text-[11px] text-muted-foreground">• {e.name} — {e.sets}x{e.reps}{e.weight ? ` · ${e.weight}kg` : ""}</p>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              {aiPlan.tips && aiPlan.tips.length > 0 && (
                <div className="p-3 rounded-lg border border-border bg-secondary/30">
                  <p className="text-xs font-medium mb-1">💡 Dicas</p>
                  {aiPlan.tips.map((t: string, i: number) => <p key={i} className="text-[11px] text-muted-foreground">• {t}</p>)}
                </div>
              )}
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setAiPlan(null)} className="flex-1 gap-1"><X className="h-4 w-4" /> Refazer</Button>
                <Button onClick={applyAiPlan} className="flex-1 gap-1"><Check className="h-4 w-4" /> Aplicar na Semana</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* RPG Workout Summary Dialog */}
      <Dialog open={showSummary} onOpenChange={setShowSummary}>
        <DialogContent className="max-w-md bg-card border-border shadow-[0_0_40px_rgba(255,215,0,0.15)] p-6 text-center">
          <DialogHeader className="items-center">
            <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center border border-primary/30 mb-2 shadow-[0_0_15px_rgba(255,215,0,0.2)]">
              <Award className="h-9 w-9 text-primary animate-bounce" />
            </div>
            <DialogTitle className="font-display text-2xl font-bold text-gradient-gold">Treino Concluído!</DialogTitle>
            <DialogDescription className="text-muted-foreground text-xs">
              Sua missão na academia foi completada com sucesso.
            </DialogDescription>
          </DialogHeader>

          {summaryData && (
            <div className="space-y-4 my-4">
              {/* Highlight Stats Grid */}
              <div className="grid grid-cols-2 gap-2 text-left">
                <div className="p-3 bg-secondary/30 rounded-xl border border-border">
                  <p className="text-[10px] text-muted-foreground uppercase font-bold">Carga Total</p>
                  <p className="text-lg font-bold text-foreground mt-0.5">{summaryData.volumeLifted.toLocaleString()} <span className="text-xs">kg</span></p>
                  <p className="text-[9px] text-muted-foreground">Volume total levantado</p>
                </div>
                <div className="p-3 bg-secondary/30 rounded-xl border border-border">
                  <p className="text-[10px] text-muted-foreground uppercase font-bold">Recompensa</p>
                  <p className="text-lg font-bold text-primary mt-0.5">+{summaryData.xpEarned} XP</p>
                  <p className="text-[9px] text-muted-foreground">Adicionado ao seu nível</p>
                </div>
                <div className="p-3 bg-secondary/30 rounded-xl border border-border">
                  <p className="text-[10px] text-muted-foreground uppercase font-bold">Duração Real</p>
                  <p className="text-lg font-bold text-foreground mt-0.5">{Math.floor(summaryData.elapsedSeconds / 60)} min</p>
                  <p className="text-[9px] text-muted-foreground">Tempo ativo rastreado</p>
                </div>
                <div className="p-3 bg-secondary/30 rounded-xl border border-border">
                  <p className="text-[10px] text-muted-foreground uppercase font-bold">Séries Concluídas</p>
                  <p className="text-lg font-bold text-foreground mt-0.5">{summaryData.setsCompleted} séries</p>
                  <p className="text-[9px] text-muted-foreground">{summaryData.exercisesCompleted} exercícios diferentes</p>
                </div>
              </div>

              {/* RPG Attributes Level-Up Indicators */}
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-3.5 space-y-2 text-left">
                <h4 className="text-xs font-bold text-primary uppercase tracking-widest flex items-center gap-1.5">
                  ✨ Atributos RPG Elevados
                </h4>
                <p className="text-[11px] text-muted-foreground leading-normal">
                  Sua consistência física refletiu no desenvolvimento dos seus atributos de personagem:
                </p>
                <div className="space-y-2 pt-1.5">
                  <div className="flex items-center justify-between text-xs font-medium">
                    <span className="flex items-center gap-1.5 text-foreground">
                      <Heart className="h-3.5 w-3.5 text-health" /> Saúde
                    </span>
                    <span className="text-health font-semibold">+8 pontos (Bônus Temporário)</span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-medium">
                    <span className="flex items-center gap-1.5 text-foreground">
                      <Flame className="h-3.5 w-3.5 text-destructive animate-pulse" /> Consistência
                    </span>
                    <span className="text-primary font-semibold">+5 pontos (Bônus de Frequência)</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <Button onClick={() => setShowSummary(false)} className="w-full font-bold gap-2">
            Continuar Aventura
          </Button>
        </DialogContent>
      </Dialog>
    </div>
    )
  );
}
