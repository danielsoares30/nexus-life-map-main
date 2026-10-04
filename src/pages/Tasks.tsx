import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, CheckCircle2, Circle, Filter, Clock, Sparkles, Trash2, Edit3, Lightbulb, Crown, Flame, Zap, Swords, ShieldAlert, Heart, Trophy, RefreshCw, Star, Play, Pause, ChevronDown, ChevronUp, PlusCircle, Trash, X, Volume2, VolumeX } from "lucide-react";
import { CATEGORY_CONFIG, DIFFICULTY_LABELS, DIFFICULTY_XP, type TaskCategory, getStreakMultiplier } from "@/lib/gameData";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useTasks, useProfile, useAchievementChecker } from "@/hooks/useGameData";
import { toast } from "@/hooks/use-toast";
import ConfirmDialog from "@/components/ConfirmDialog";
import AiQuestGeneratorModal from "@/components/ai/AiQuestGeneratorModal";

const categories: (TaskCategory | "all")[] = ["all", "work", "study", "health", "personal", "spiritual", "projects"];

export default function Tasks() {
  const { tasks, loading, create, update, remove, toggle } = useTasks();
  const { profile, addXp } = useProfile();
  const { checkAndUnlock } = useAchievementChecker();
  const [filter, setFilter] = useState<TaskCategory | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"created" | "xp" | "priority" | "due_date">("created");
  const [xpGain, setXpGain] = useState<{ id: string; xp: number } | null>(null);
  const [dailyQuotaClaimed, setDailyQuotaClaimed] = useState<string>(() => {
    return localStorage.getItem("nexus_daily_quota_claimed") || "";
  });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", category: "work", difficulty: "medium", priority: "medium", recurring: "", due_date: "" });

  const [subtasks, setSubtasks] = useState<Record<string, { id: string; text: string; done: boolean }[]>>(() => {
    try {
      const saved = localStorage.getItem("nexus_quest_subtasks");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [newSubtaskText, setNewSubtaskText] = useState("");

  // Dungeon Mode states
  const [activeDungeonTask, setActiveDungeonTask] = useState<any | null>(null);
  const [bossHp, setBossHp] = useState(100);
  const [bossMaxHp, setBossMaxHp] = useState(100);
  const [timerSeconds, setTimerSeconds] = useState(25 * 60);
  const [timerDuration, setTimerDuration] = useState(25 * 60);
  const [timerIsActive, setTimerIsActive] = useState(false);
  const [damageIndicators, setDamageIndicators] = useState<{ id: string; text: string; x: number; y: number }[]>([]);
  const [showWinDialog, setShowWinDialog] = useState(false);
  const [winData, setWinData] = useState<any | null>(null);
  const [dungeonMute, setDungeonMute] = useState(false);
  const [dungeonShieldActive, setDungeonShieldActive] = useState(false);

  useEffect(() => {
    localStorage.setItem("nexus_quest_subtasks", JSON.stringify(subtasks));
  }, [subtasks]);

  // Synthesize sounds for retro RPG vibe
  const playDungeonSound = (type: "hit" | "win" | "potion" | "shield" | "click") => {
    if (dungeonMute) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      
      if (type === "click") {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(600, ctx.currentTime);
        gain.gain.setValueAtTime(0.05, ctx.currentTime);
        osc.start();
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
        osc.stop(ctx.currentTime + 0.1);
      } else if (type === "hit") {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(300, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.25);
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        osc.start();
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
        osc.stop(ctx.currentTime + 0.25);
      } else if (type === "potion") {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = "sine";
        osc.frequency.setValueAtTime(300, ctx.currentTime);
        osc.frequency.setValueAtTime(450, ctx.currentTime + 0.08);
        osc.frequency.setValueAtTime(600, ctx.currentTime + 0.16);
        osc.frequency.setValueAtTime(900, ctx.currentTime + 0.24);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        osc.start();
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
        osc.stop(ctx.currentTime + 0.35);
      } else if (type === "shield") {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = "triangle";
        osc.frequency.setValueAtTime(150, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(250, ctx.currentTime + 0.4);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        osc.start();
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
        osc.stop(ctx.currentTime + 0.5);
      } else if (type === "win") {
        const notes = [261.63, 329.63, 392.00, 523.25, 392.00, 523.25];
        const durs = [0.1, 0.1, 0.1, 0.15, 0.1, 0.4];
        let timeOffset = 0;
        
        notes.forEach((freq, idx) => {
          setTimeout(() => {
            try {
              const subCtx = new AudioCtx();
              const osc = subCtx.createOscillator();
              const gain = subCtx.createGain();
              osc.connect(gain);
              gain.connect(subCtx.destination);
              osc.type = "square";
              osc.frequency.setValueAtTime(freq, subCtx.currentTime);
              gain.gain.setValueAtTime(0.07, subCtx.currentTime);
              osc.start();
              gain.gain.exponentialRampToValueAtTime(0.001, subCtx.currentTime + durs[idx]);
              osc.stop(subCtx.currentTime + durs[idx]);
            } catch (err) {}
          }, timeOffset);
          timeOffset += durs[idx] * 1000;
        });
      }
    } catch (e) {
      console.warn("Audio Context blocked", e);
    }
  };

  // Pomodoro interval effect
  useEffect(() => {
    let interval: any;
    if (timerIsActive && timerSeconds > 0 && activeDungeonTask) {
      interval = setInterval(() => {
        setTimerSeconds(prev => {
          if (prev <= 1) {
            setTimerIsActive(false);
            handleDungeonVictory();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timerIsActive, timerSeconds, activeDungeonTask === null]);

  const enterDungeonMode = (task: any) => {
    setActiveDungeonTask(task);
    let hp = 60;
    if (task.difficulty === "easy") hp = 30;
    else if (task.difficulty === "medium") hp = 60;
    else if (task.difficulty === "hard") hp = 100;
    else if (task.difficulty === "critical") hp = 150;
    
    setBossHp(hp);
    setBossMaxHp(hp);
    setTimerSeconds(25 * 60);
    setTimerDuration(25 * 60);
    setTimerIsActive(true);
    setDungeonShieldActive(false);
    playDungeonSound("shield");
  };

  const handleUseFocusPotion = () => {
    playDungeonSound("potion");
    setTimerSeconds(prev => prev + 5 * 60);
    setTimerDuration(prev => prev + 5 * 60);
    
    const newIndicator = {
      id: `potion-${Date.now()}-${Math.random()}`,
      text: "+5m Foco!",
      x: 15,
      y: 40
    };
    setDamageIndicators(prev => [...prev, newIndicator]);
    setTimeout(() => {
      setDamageIndicators(prev => prev.filter(i => i.id !== newIndicator.id));
    }, 1000);
  };

  const handleUseShield = () => {
    playDungeonSound("shield");
    setDungeonShieldActive(true);
    setTimeout(() => setDungeonShieldActive(false), 15000);

    const newIndicator = {
      id: `shield-${Date.now()}-${Math.random()}`,
      text: "Defesa Ativa!",
      x: 15,
      y: 30
    };
    setDamageIndicators(prev => [...prev, newIndicator]);
    setTimeout(() => {
      setDamageIndicators(prev => prev.filter(i => i.id !== newIndicator.id));
    }, 1000);
  };

  const triggerDungeonDamage = (isDone: boolean) => {
    if (!activeDungeonTask) return;
    
    const taskSubs = subtasks[activeDungeonTask.id] || [];
    const damage = taskSubs.length > 0 ? Math.ceil(bossMaxHp / taskSubs.length) : bossMaxHp;
    
    setBossHp(prev => {
      const nextHp = isDone ? Math.max(0, prev - damage) : Math.min(bossMaxHp, prev + damage);
      if (nextHp <= 0) {
        setTimeout(() => handleDungeonVictory(), 600);
      }
      return nextHp;
    });

    if (isDone) {
      playDungeonSound("hit");
    }

    const newIndicator = {
      id: `dmg-${Date.now()}-${Math.random()}`,
      text: isDone ? `-${damage} HP` : `+${damage} HP`,
      x: Math.random() * 30 + 55,
      y: Math.random() * 30 + 30
    };
    setDamageIndicators(prev => [...prev, newIndicator]);
    setTimeout(() => {
      setDamageIndicators(prev => prev.filter(i => i.id !== newIndicator.id));
    }, 1000);
  };

  const handleDungeonVictory = async () => {
    if (!activeDungeonTask) return;
    playDungeonSound("win");
    
    const task = activeDungeonTask;
    const effectiveXp = Math.round(task.xp_reward * multiplier);

    await toggle(task.id);
    await addXp(task.xp_reward);

    setWinData({
      title: task.title,
      difficulty: task.difficulty,
      xpEarned: effectiveXp,
      timeElapsed: timerDuration - timerSeconds
    });

    setShowWinDialog(true);
    setActiveDungeonTask(null);
    setTimerIsActive(false);
  };

  const formatTimerTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const addSubtask = (taskId: string, text: string) => {
    if (!text.trim()) return;
    const newSub = { id: `sub-${Date.now()}-${Math.random()}`, text: text.trim(), done: false };
    setSubtasks(prev => ({
      ...prev,
      [taskId]: [...(prev[taskId] || []), newSub]
    }));
  };

  const toggleSubtask = (taskId: string, subId: string) => {
    setSubtasks(prev => {
      const list = prev[taskId] || [];
      const updated = list.map(s => {
        if (s.id === subId) {
          const nextDone = !s.done;
          if (activeDungeonTask && activeDungeonTask.id === taskId) {
            triggerDungeonDamage(nextDone);
          }
          return { ...s, done: nextDone };
        }
        return s;
      });
      return { ...prev, [taskId]: updated };
    });
  };

  const removeSubtask = (taskId: string, subId: string) => {
    setSubtasks(prev => ({
      ...prev,
      [taskId]: (prev[taskId] || []).filter(s => s.id !== subId)
    }));
  };

  const streak = profile?.streak || 0;
  const multiplier = getStreakMultiplier(streak);

  // Combo counter: tasks completed in a row today
  const today = new Date().toISOString().split("T")[0];
  const completedToday = tasks.filter(t => t.completed && t.completed_at?.startsWith(today)).length;
  const comboLevel = completedToday >= 10 ? 'legendary' : completedToday >= 7 ? 'epic' : completedToday >= 5 ? 'rare' : completedToday >= 3 ? 'uncommon' : 'common';

  // Daily goals quota
  const xpEarnedToday = tasks
    .filter(t => t.completed && t.completed_at?.startsWith(today))
    .reduce((sum, t) => sum + Math.round(t.xp_reward * multiplier), 0);

  useEffect(() => {
    if (completedToday >= 3 && xpEarnedToday >= 100 && dailyQuotaClaimed !== today) {
      setDailyQuotaClaimed(today);
      localStorage.setItem("nexus_daily_quota_claimed", today);
      addXp(30);
      toast({
        title: "🏆 Meta Diária Concluída!",
        description: "Você completou a cota de hoje! Bônus de +30 XP concedido.",
      });
      playDungeonSound("win");
    }
  }, [completedToday, xpEarnedToday, dailyQuotaClaimed, today, addXp]);

  const generateMagicSubtasks = (taskId: string, title: string) => {
    const text = title.toLowerCase();
    let suggestions: string[] = [];

    if (text.includes("estudar") || text.includes("ler") || text.includes("aprender") || text.includes("revisar") || text.includes("aula") || text.includes("prova")) {
      suggestions = [
        "Revisar o material e fazer anotações básicas",
        "Ler os capítulos ou assistir às aulas selecionadas",
        "Fazer exercícios práticos ou de fixação",
        "Criar um resumo mental ou mapa mental dos conceitos",
        "Revisar os tópicos mais difíceis por 5 minutos"
      ];
    } else if (text.includes("escrever") || text.includes("programar") || text.includes("dev") || text.includes("código") || text.includes("criar") || text.includes("projeto") || text.includes("desenvolver")) {
      suggestions = [
        "Definir a arquitetura ou rascunho inicial",
        "Escrever as funções ou parágrafos principais",
        "Testar bugs ou fazer revisão gramatical",
        "Refatorar o código ou polir o estilo do texto",
        "Realizar a entrega ou deploy final"
      ];
    } else if (text.includes("limpar") || text.includes("arrumar") || text.includes("organizar") || text.includes("casa") || text.includes("quarto")) {
      suggestions = [
        "Recolher o lixo e objetos espalhados",
        "Organizar a mesa, gavetas ou armários",
        "Limpar a poeira das superfícies principais",
        "Passar pano ou aspirar o chão",
        "Polir e dar o toque final de organização"
      ];
    } else if (text.includes("academia") || text.includes("treino") || text.includes("correr") || text.includes("saúde") || text.includes("exercício")) {
      suggestions = [
        "Fazer aquecimento leve de 5 a 10 minutos",
        "Executar as séries e exercícios programados com foco",
        "Registrar as cargas levantadas ou distância percorrida",
        "Fazer alongamento relaxante pós-esforço",
        "Hidratar-se e consumir refeição pós-treino"
      ];
    } else if (text.includes("comprar") || text.includes("mercado") || text.includes("compras")) {
      suggestions = [
        "Elaborar a lista de itens necessários",
        "Pesquisar preços online ou escolher o local",
        "Separar sacolas ecológicas ou carteira",
        "Comprar os produtos da lista com foco",
        "Organizar as compras compradas nos devidos lugares"
      ];
    } else if (text.includes("finanças") || text.includes("dinheiro") || text.includes("planilha") || text.includes("pagar") || text.includes("contas")) {
      suggestions = [
        "Levantar todos os boletos e despesas do período",
        "Registrar as movimentações na planilha ou app financeiro",
        "Efetuar os pagamentos pendentes",
        "Destinar o valor planejado para reserva / investimentos",
        "Revisar o saldo restante para a semana"
      ];
    } else {
      suggestions = [
        "Fase de planejamento e rascunho",
        "Execução focada da atividade principal",
        "Revisão final e polimento dos detalhes"
      ];
    }

    const currentSubs = subtasks[taskId] || [];
    const formatted = suggestions.map((s, idx) => ({
      id: `sub-magic-${Date.now()}-${idx}`,
      text: s,
      done: false
    }));

    setSubtasks(prev => ({
      ...prev,
      [taskId]: [...currentSubs, ...formatted]
    }));

    toast({
      title: "🪄 Destrinchado com Magia!",
      description: `Geramos ${suggestions.length} etapas para ajudar você a começar.`
    });
    playDungeonSound("potion");
  };

  const handleClearCompleted = async () => {
    const completedTasks = tasks.filter(t => t.completed);
    if (completedTasks.length === 0) return;
    
    if (confirm(`Deseja limpar ${completedTasks.length} missões concluídas do seu Grimório ativo?`)) {
      for (const t of completedTasks) {
        await remove(t.id);
      }
      toast({
        title: "🧹 Grimório Limpo!",
        description: `${completedTasks.length} missões concluídas foram removidas.`
      });
    }
  };

  useEffect(() => {
    if (tasks.length > 0) checkAndUnlock();
  }, [tasks.filter(t => t.completed).length]);

  const getLowestCategory = () => {
    const counts = categories.filter(c => c !== "all").map(cat => {
      const catTasks = tasks.filter(t => t.category === cat);
      const done = catTasks.filter(t => t.completed).length;
      const ratio = catTasks.length === 0 ? 0 : done / catTasks.length;
      return { cat, ratio, total: catTasks.length };
    });
    counts.sort((a, b) => a.ratio - b.ratio || a.total - b.total);
    return counts[0]?.cat || "health";
  };

  const generateSuggestions = () => {
    const lowest = getLowestCategory();
    const suggestions: Record<string, any[]> = {
      health: [
        { title: "Caminhar 30 minutos", category: "health", difficulty: "medium", priority: "medium" },
        { title: "Beber 2 litros de água", category: "health", difficulty: "easy", priority: "high" },
        { title: "Treino de força - 45min", category: "health", difficulty: "hard", priority: "medium" },
      ],
      study: [
        { title: "Ler 20 páginas de um livro", category: "study", difficulty: "easy", priority: "medium" },
        { title: "Assistir 1 aula de especialização", category: "study", difficulty: "medium", priority: "high" },
        { title: "Praticar coding por 1h", category: "study", difficulty: "hard", priority: "medium" },
      ],
      work: [
        { title: "Organizar o e-mail (Inbox Zero)", category: "work", difficulty: "medium", priority: "medium" },
        { title: "Planejar as tarefas da semana", category: "work", difficulty: "easy", priority: "high" },
        { title: "Entregar relatório pendente", category: "work", difficulty: "hard", priority: "critical" },
      ],
      personal: [
        { title: "Arrumar o quarto/mesa de trabalho", category: "personal", difficulty: "easy", priority: "medium" },
        { title: "Planejar finanças do mês", category: "personal", difficulty: "medium", priority: "high" },
      ],
      spiritual: [
        { title: "Meditar por 10 minutos", category: "spiritual", difficulty: "easy", priority: "medium" },
        { title: "Fazer o diário de gratidão", category: "spiritual", difficulty: "easy", priority: "medium" },
      ],
      projects: [
        { title: "Avançar 1h no projeto pessoal", category: "projects", difficulty: "hard", priority: "medium" },
        { title: "Fazer brainstorm de novas ideias", category: "projects", difficulty: "medium", priority: "low" },
      ]
    };
    return { category: lowest, items: suggestions[lowest as string] || suggestions.health };
  };

  const acceptSuggestion = async (s: any) => {
    await create({ ...s, xp_reward: DIFFICULTY_XP[s.difficulty], recurring: null, due_date: null });
    setSuggestionsOpen(false);
    toast({ title: "Missão Aceita! ⚔️", description: `"${s.title}" adicionada ao seu grimório.` });
  };

  const filtered = tasks
    .filter((t) => {
      const matchCategory = filter === "all" || t.category === filter;
      const matchSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCategory && matchSearch;
    })
    .sort((a, b) => {
      if (sortBy === "xp") {
        return b.xp_reward - a.xp_reward;
      }
      if (sortBy === "priority") {
        const priorityWeight = { critical: 4, high: 3, medium: 2, low: 1 };
        const weightA = priorityWeight[a.priority as keyof typeof priorityWeight] || 0;
        const weightB = priorityWeight[b.priority as keyof typeof priorityWeight] || 0;
        return weightB - weightA;
      }
      if (sortBy === "due_date") {
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
      }
      return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
    });

  const completed = filtered.filter((t) => t.completed).length;

  const handleToggle = async (task: any) => {
    const result = await toggle(task.id);
    if (result && result.completed && !task.completed) {
      const effectiveXp = Math.round(task.xp_reward * multiplier);
      setXpGain({ id: task.id, xp: effectiveXp });
      setTimeout(() => setXpGain(null), 1200);
      await addXp(task.xp_reward);
      toast({
        title: `⚔️ +${effectiveXp} XP!`,
        description: multiplier > 1 ? `Missão completa! (x${multiplier} streak bônus)` : `Missão "${task.title}" completa!`
      });
    }
  };

  const handleDelete = async () => {
    if (deleteTarget) {
      await remove(deleteTarget);
      setDeleteTarget(null);
      toast({ title: "Missão removida", description: "A missão foi excluída do grimório." });
    }
  };

  const openCreate = () => {
    setEditingTask(null);
    setForm({ title: "", category: "work", difficulty: "medium", priority: "medium", recurring: "", due_date: "" });
    setDialogOpen(true);
  };

  const openEdit = (task: any) => {
    setEditingTask(task);
    setForm({ title: task.title, category: task.category, difficulty: task.difficulty, priority: task.priority, recurring: task.recurring || "", due_date: task.due_date || "" });
    setDialogOpen(true);
  };

  const saveTask = async () => {
    if (!form.title.trim()) {
      toast({ title: "Título obrigatório", description: "Por favor, insira um nome para a missão.", variant: "destructive" });
      return;
    }
    const data = {
      title: form.title.trim(),
      category: form.category,
      difficulty: form.difficulty,
      priority: form.priority,
      xp_reward: DIFFICULTY_XP[form.difficulty],
      recurring: form.recurring || null,
      due_date: form.due_date || null,
    };
    if (editingTask) {
      await update(editingTask.id, data);
      toast({ title: "Missão atualizada! 📜", description: `"${data.title}" foi salva.` });
    } else {
      await create(data);
      toast({ title: "Nova Missão! ⚔️", description: `"${data.title}" adicionada ao grimório.` });
    }
    setDialogOpen(false);
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto flex items-center justify-center py-20">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  // Grimoire rescheduler
  const overdueTasks = tasks.filter(t => !t.completed && t.due_date && new Date(t.due_date + "T23:59:59") < new Date());
  
  const handleAutoReschedule = async () => {
    if (overdueTasks.length === 0) return;
    const todayStr = new Date().toISOString().split("T")[0];
    let count = 0;
    for (const t of overdueTasks) {
      await update(t.id, { due_date: todayStr });
      count++;
    }
    toast({
      title: "🧙‍♂️ Grimório Reorganizado!",
      description: `${count} missões atrasadas foram reagendadas para hoje.`
    });
  };

  return (
    activeDungeonTask ? (
      <div className="fixed inset-0 z-50 bg-background/98 backdrop-blur-xl overflow-y-auto p-4 md:p-6 flex items-center justify-center animate-in fade-in duration-300">
        <div className="w-full max-w-4xl bg-card border-2 border-primary/20 shadow-[0_0_50px_rgba(255,215,0,0.15)] rounded-2xl p-4 md:p-6 flex flex-col md:flex-row gap-6 relative overflow-hidden bg-pattern">
          {/* Glowing particle damage indicators */}
          {damageIndicators.map(ind => (
            <motion.div
              key={ind.id}
              initial={{ opacity: 1, scale: 0.8, y: 0 }}
              animate={{ opacity: 0, scale: 1.5, y: -60 }}
              transition={{ duration: 0.9, ease: "easeOut" }}
              className={`absolute font-display font-black text-xl z-30 pointer-events-none ${
                ind.text.startsWith("-") ? "text-destructive" : "text-emerald-400"
              }`}
              style={{ left: `${ind.x}%`, top: `${ind.y}%` }}
            >
              {ind.text}
            </motion.div>
          ))}

          {/* Main Battle Panel */}
          <div className="flex-1 flex flex-col justify-between space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Swords className="h-5 w-5 text-primary animate-pulse" />
                <span className="text-[10px] text-primary uppercase font-bold tracking-widest">
                  Combate de Foco Ativo
                </span>
              </div>
              <button
                onClick={() => setDungeonMute(!dungeonMute)}
                className="text-muted-foreground hover:text-primary p-1"
              >
                {dungeonMute ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </button>
            </div>

            {/* Battle Arena visual */}
            <div className="grid grid-cols-5 gap-3 items-center justify-center py-4 bg-secondary/15 rounded-xl border border-border/40 p-4 relative overflow-hidden">
              {/* Hero (Left) */}
              <div className="col-span-2 text-center space-y-2 relative">
                <div className={`h-16 w-16 mx-auto rounded-full border-2 border-primary/50 bg-secondary flex items-center justify-center text-2xl shadow-md transition-all ${
                  dungeonShieldActive ? "ring-4 ring-primary animate-pulse shadow-[0_0_15px_rgba(255,215,0,0.5)]" : ""
                }`}>
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt="Avatar" className="h-full w-full rounded-full object-cover" />
                  ) : (
                    "🧙‍♂️"
                  )}
                </div>
                <div>
                  <p className="text-xs font-bold text-foreground truncate">{profile?.display_name || "Herói"}</p>
                  <p className="text-[9px] text-primary font-medium">Lvl {profile?.level || 1} Aventureiro</p>
                </div>
                {/* Hero HP bar (Focus status) */}
                <div className="w-full max-w-[100px] mx-auto mt-1">
                  <div className="stat-bar h-1.5 rounded-full">
                    <div className="stat-bar-fill health-fill rounded-full" style={{ width: "100%" }} />
                  </div>
                </div>
              </div>

              {/* VS (Center) */}
              <div className="col-span-1 text-center font-display font-black text-lg text-primary/40 animate-pulse">
                VS
              </div>

              {/* Boss (Right) */}
              <div className="col-span-2 text-center space-y-2">
                <motion.div 
                  animate={bossHp < bossMaxHp ? { x: [0, -6, 6, -4, 4, 0] } : {}}
                  transition={{ duration: 0.4 }}
                  className={`h-16 w-16 mx-auto rounded-xl border-2 flex items-center justify-center text-3xl shadow-md ${
                    bossHp <= 0 
                      ? "bg-secondary border-muted opacity-30 line-through" 
                      : activeDungeonTask.difficulty === "critical"
                        ? "bg-destructive/10 border-destructive shadow-[0_0_15px_rgba(239,68,68,0.2)]"
                        : "bg-secondary border-primary/30"
                  }`}
                >
                  {bossHp <= 0 ? "💀" : activeDungeonTask.difficulty === "easy" ? "👺" : activeDungeonTask.difficulty === "medium" ? "👹" : activeDungeonTask.difficulty === "hard" ? "🗿" : "🐉"}
                </motion.div>
                <div>
                  <p className="text-xs font-bold text-foreground truncate">{activeDungeonTask.title}</p>
                  <p className={`text-[9px] font-bold uppercase ${
                    activeDungeonTask.difficulty === "critical" ? "text-destructive" : activeDungeonTask.difficulty === "hard" ? "text-wisdom" : "text-primary"
                  }`}>
                    HP: {bossHp} / {bossMaxHp}
                  </p>
                </div>
                {/* Boss Health Bar */}
                <div className="w-full max-w-[100px] mx-auto mt-1">
                  <div className="stat-bar h-1.5 rounded-full bg-secondary">
                    <div 
                      className="stat-bar-fill rounded-full bg-destructive transition-all duration-300"
                      style={{ width: `${(bossHp / bossMaxHp) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Pomodoro Timer Center */}
            <div className="flex flex-col items-center justify-center p-4 bg-secondary/10 border border-border/50 rounded-xl space-y-2 relative">
              <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Foco Concentrado</span>
              
              <div className="relative h-28 w-28 flex items-center justify-center">
                {/* Circular Countdown Ring */}
                <svg className="absolute transform -rotate-90 w-full h-full" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="45" stroke="hsl(var(--border))" strokeWidth="2.5" fill="transparent" />
                  <circle cx="50" cy="50" r="45" stroke="hsl(var(--primary))" strokeWidth="3" fill="transparent"
                    strokeDasharray="282.6"
                    strokeDashoffset={282.6 - (282.6 * (timerSeconds / timerDuration)) || 0}
                    className="transition-all duration-1000 ease-linear"
                  />
                </svg>
                <div className="text-center z-10">
                  <p className="text-2xl font-mono font-bold tracking-wider">{formatTimerTime(timerSeconds)}</p>
                  <p className="text-[8px] text-muted-foreground uppercase mt-0.5">{timerIsActive ? "Concentrado" : "Pausado"}</p>
                </div>
              </div>

              {/* Timer Controls */}
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-7 w-7 p-0 rounded-full"
                  onClick={() => {
                    playDungeonSound("click");
                    setTimerIsActive(!timerIsActive);
                  }}
                >
                  {timerIsActive ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 fill-current" />}
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 text-[10px]"
                  onClick={() => {
                    playDungeonSound("click");
                    setTimerIsActive(false);
                    setTimerSeconds(25 * 60);
                    setTimerDuration(25 * 60);
                  }}
                >
                  Reset
                </Button>
              </div>

              {/* Quick time change presets */}
              <div className="flex gap-1">
                {[10, 25, 50].map(mins => (
                  <button
                    key={mins}
                    onClick={() => {
                      playDungeonSound("click");
                      setTimerIsActive(false);
                      setTimerSeconds(mins * 60);
                      setTimerDuration(mins * 60);
                    }}
                    className={`text-[9px] px-2 py-0.5 rounded border transition-colors ${
                      timerDuration === mins * 60 
                        ? "bg-primary/20 text-primary border-primary/50 font-bold" 
                        : "bg-secondary text-muted-foreground border-border hover:bg-secondary/80"
                    }`}
                  >
                    {mins}m
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Side Subtasks Checklist / Focus Skills */}
          <div className="w-full md:w-72 bg-secondary/20 rounded-xl p-4 border border-border flex flex-col justify-between space-y-4">
            <div className="space-y-4 flex-1 flex flex-col min-h-0">
              {/* Spells/Skills */}
              <div className="space-y-2">
                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Habilidades de Foco</p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={handleUseFocusPotion}
                    className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-[10px] font-bold text-emerald-400 transition-colors"
                  >
                    🧪 Poção Foco (+5m)
                  </button>
                  <button
                    onClick={handleUseShield}
                    className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-[10px] font-bold text-amber-400 transition-colors"
                  >
                    🛡️ Escudo (+XP)
                  </button>
                </div>
              </div>

              {/* Checklist list */}
              <div className="space-y-2 flex-1 flex flex-col min-h-0 pt-2 border-t border-border/40">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Etapas de Combate</p>
                  <button
                    onClick={() => generateMagicSubtasks(activeDungeonTask.id, activeDungeonTask.title)}
                    className="text-[8px] text-primary hover:text-primary/80 font-bold bg-primary/5 hover:bg-primary/10 border border-primary/20 rounded px-1.5 py-0.5 flex items-center gap-0.5"
                    title="Destrinchar missão em etapas usando magia de palavras-chave"
                    type="button"
                  >
                    🪄 Mágica
                  </button>
                </div>
                
                {/* Subtask list wrapper */}
                <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 max-h-[200px] scrollbar-thin">
                  {(subtasks[activeDungeonTask.id] || []).map(sub => (
                    <div 
                      key={sub.id} 
                      className={`flex items-center justify-between p-1.5 rounded-lg border text-xs transition-colors ${
                        sub.done 
                          ? "bg-emerald-500/5 border-emerald-500/20 text-muted-foreground line-through" 
                          : "bg-card border-border hover:bg-secondary/40"
                      }`}
                    >
                      <button 
                        onClick={() => toggleSubtask(activeDungeonTask.id, sub.id)}
                        className="flex items-center gap-2 text-left flex-1 min-w-0"
                      >
                        {sub.done ? <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" /> : <Circle className="h-4 w-4 text-muted-foreground shrink-0" />}
                        <span className="truncate">{sub.text}</span>
                      </button>
                      <button 
                        onClick={() => removeSubtask(activeDungeonTask.id, sub.id)}
                        className="text-destructive/40 hover:text-destructive p-0.5 ml-1 shrink-0"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}

                  {(subtasks[activeDungeonTask.id] || []).length === 0 && (
                    <p className="text-[10px] text-muted-foreground italic text-center py-4">
                      Divida esta missão em etapas menores para causar danos específicos no monstro.
                    </p>
                  )}
                </div>

                {/* Subtask input creator */}
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    addSubtask(activeDungeonTask.id, newSubtaskText);
                    setNewSubtaskText("");
                  }}
                  className="flex gap-1 mt-auto pt-2 border-t border-border/30"
                >
                  <Input
                    placeholder="Adicionar etapa..."
                    value={newSubtaskText}
                    onChange={(e) => setNewSubtaskText(e.target.value)}
                    className="h-8 text-xs bg-card"
                  />
                  <Button type="submit" size="sm" className="h-8 px-2.5">
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </form>
              </div>
            </div>

            {/* Escape / Win blow button */}
            <div className="space-y-2 pt-4 border-t border-border/50">
              <Button 
                onClick={handleDungeonVictory}
                className="w-full h-10 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs tracking-wider gap-2 shadow-[0_0_15px_rgba(255,215,0,0.15)] rounded-xl"
              >
                ⚔️ Golpe Final (Completar)
              </Button>
              
              <Button 
                variant="ghost" 
                onClick={() => {
                  if (confirm("Tem certeza que deseja fugir da batalha de foco? O monstro recuperará a vida.")) {
                    setActiveDungeonTask(null);
                    setTimerIsActive(false);
                  }
                }}
                className="w-full h-8 hover:bg-destructive/10 text-destructive hover:text-destructive text-[10px] font-bold tracking-wider gap-1 rounded-xl"
              >
                🏳️ Recuar da Masmorra
              </Button>
            </div>
          </div>
        </div>
      </div>
    ) : (
      <div className="max-w-4xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl md:text-3xl font-bold text-gradient-gold">Missões</h2>
          <p className="text-sm text-muted-foreground mt-1">Complete missões para ganhar XP e evoluir seus atributos.</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setAiModalOpen(true)} size="sm" className="gap-1.5 bg-gradient-to-r from-amber-500 to-primary text-primary-foreground hover:opacity-90 shadow-sm border border-amber-400/30">
            <Sparkles className="h-4 w-4" /> Gerar com IA
          </Button>
          <Button onClick={() => setSuggestionsOpen(true)} size="sm" variant="outline" className="gap-1.5 border-primary/50 text-primary hover:bg-primary/10">
            <Lightbulb className="h-4 w-4" /> Sugestões
          </Button>
          <Button onClick={openCreate} size="sm" className="gap-1.5">
            <Plus className="h-4 w-4" /> Nova Missão
          </Button>
        </div>
      </motion.div>

      {/* Adventurer Daily Goals (Metas Diárias) */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-secondary/10 border border-border/80 rounded-xl p-4 shadow-sm"
      >
        <div className="md:col-span-1 flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
              🏆 Cotas Diárias de Aventureiro
            </h3>
            <p className="text-[10px] text-muted-foreground mt-1 leading-normal">
              Cumpra as duas cotas diárias de foco para ganhar um bônus especial de <span className="text-primary font-bold">+30 XP</span> no grimório.
            </p>
          </div>
          <div className="mt-2 flex items-center gap-1">
            {completedToday >= 3 && xpEarnedToday >= 100 ? (
              <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                ⭐ Concluído Hoje!
              </span>
            ) : (
              <span className="text-[10px] bg-secondary text-muted-foreground border border-border px-2 py-0.5 rounded-full font-bold">
                Em andamento
              </span>
            )}
          </div>
        </div>

        {/* Quota 1 Progress */}
        <div className="p-3 bg-card rounded-lg border border-border/60 flex flex-col justify-between">
          <div className="flex justify-between items-center text-xs">
            <span className="font-semibold text-foreground">Completar 3 Missões</span>
            <span className="text-muted-foreground font-mono">{Math.min(completedToday, 3)}/3</span>
          </div>
          <div className="stat-bar h-2 mt-2">
            <div 
              className="stat-bar-fill xp-fill" 
              style={{ width: `${Math.min((completedToday / 3) * 100, 100)}%` }} 
            />
          </div>
        </div>

        {/* Quota 2 Progress */}
        <div className="p-3 bg-card rounded-lg border border-border/60 flex flex-col justify-between">
          <div className="flex justify-between items-center text-xs">
            <span className="font-semibold text-foreground">Acumular 100 XP</span>
            <span className="text-muted-foreground font-mono">{Math.min(xpEarnedToday, 100)}/100</span>
          </div>
          <div className="stat-bar h-2 mt-2">
            <div 
              className="stat-bar-fill health-fill" 
              style={{ width: `${Math.min((xpEarnedToday / 100) * 100, 100)}%` }} 
            />
          </div>
        </div>
      </motion.div>

      {/* Streak & Combo Banner */}
      {(multiplier > 1 || completedToday >= 3) && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
          {multiplier > 1 && (
            <div className="flex items-center gap-2">
              <Flame className="h-4 w-4 text-destructive" />
              <span className="text-xs font-bold text-foreground">x{multiplier} Streak Bônus</span>
              <span className="text-[10px] text-muted-foreground">({streak} dias)</span>
            </div>
          )}
          {completedToday >= 3 && (
            <div className="flex items-center gap-2 ml-auto">
              <Zap className="h-4 w-4 text-xp" />
              <span className="text-xs font-bold text-xp">Combo x{completedToday}</span>
              <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full rarity-${comboLevel} border bg-card`}>
                {comboLevel === 'legendary' ? '🔥 Lendário' : comboLevel === 'epic' ? '💎 Épico' : comboLevel === 'rare' ? '💙 Raro' : '💚 Incomum'}
              </span>
            </div>
          )}
        </motion.div>
      )}

      {/* Overdue Grimoire auto-rescheduler */}
      {overdueTasks.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }} 
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between gap-4 rounded-xl border border-destructive/30 bg-destructive/5 p-4 shadow-sm"
        >
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 bg-destructive/10 rounded-full flex items-center justify-center border border-destructive/20 text-destructive shrink-0">
              <ShieldAlert className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <p className="text-xs font-bold text-foreground">Grimório Desatualizado</p>
              <p className="text-[10px] text-muted-foreground">Você tem <span className="text-destructive font-bold">{overdueTasks.length}</span> missões com prazos expirados no passado.</p>
            </div>
          </div>
          <Button 
            size="sm" 
            variant="outline" 
            onClick={handleAutoReschedule}
            className="border-destructive/40 text-destructive hover:bg-destructive/10 text-[10px] font-bold h-8 shrink-0 gap-1.5"
          >
            <RefreshCw className="h-3 w-3" /> Reorganizar Grimório
          </Button>
        </motion.div>
      )}

      {/* Sugestões Dialog */}
      <Dialog open={suggestionsOpen} onOpenChange={setSuggestionsOpen}>
        <DialogContent className="sm:max-w-md border-primary/30">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2 text-primary">
              <Lightbulb className="h-5 w-5" /> Coach Inteligente
            </DialogTitle>
          </DialogHeader>
          <div className="pt-2">
            <p className="text-sm text-foreground mb-4">
              Notei que a área <strong>{CATEGORY_CONFIG[generateSuggestions().category as TaskCategory]?.label}</strong> está precisando de atenção. Que tal uma destas missões?
            </p>
            <div className="space-y-3">
              {generateSuggestions().items.map((s, i) => {
                const diff = DIFFICULTY_LABELS[s.difficulty];
                return (
                  <div key={i} className={`flex flex-col gap-2 p-3 rounded-lg border rarity-${diff.rarity} bg-card hover:bg-primary/5 transition-colors`}>
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium text-sm">{s.title}</h4>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          <span className={diff.color}>{diff.label}</span> • +{DIFFICULTY_XP[s.difficulty]} XP
                        </p>
                      </div>
                      <Button onClick={() => acceptSuggestion(s)} size="sm" variant="secondary" className="h-7 text-xs">Aceitar</Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Search, Sort and Actions Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-2">
        {/* Search Input */}
        <div className="relative flex-1">
          <Input
            placeholder="Buscar missões pelo título..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 bg-card border-border/80 text-xs h-9 focus-visible:ring-primary/50"
          />
          <Filter className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground text-xs font-bold"
            >
              Limpar
            </button>
          )}
        </div>

        {/* Sort Select & Batch Actions */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider whitespace-nowrap">Ordenar por:</span>
          <select 
            value={sortBy} 
            onChange={(e: any) => setSortBy(e.target.value)} 
            className="rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs text-foreground font-medium outline-none focus:ring-1 focus:ring-primary/50"
          >
            <option value="created">Data de Criação</option>
            <option value="xp">Recompensa (XP)</option>
            <option value="priority">Prioridade</option>
            <option value="due_date">Prazo Limite</option>
          </select>

          {tasks.some(t => t.completed) && (
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={handleClearCompleted}
              className="text-destructive hover:bg-destructive/10 text-xs font-semibold gap-1 py-1.5 h-9 border border-destructive/20"
            >
              🧹 Limpar Grimório
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
        {categories.map((cat) => {
          const isAll = cat === "all";
          const config = isAll ? null : CATEGORY_CONFIG[cat];
          return (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-xs font-medium border transition-all ${filter === cat ? "border-primary/30 bg-primary/10 text-primary" : "border-border bg-secondary/50 text-muted-foreground hover:text-foreground hover:border-border"}`}
            >
              {isAll ? <Filter className="h-3.5 w-3.5" /> : <span>{config!.icon}</span>}
              {isAll ? "Todas" : config!.label}
            </button>
          );
        })}
      </div>

      {/* Progress */}
      <div className="flex items-center gap-4">
        <div className="flex-1 stat-bar h-2.5">
          <motion.div className="stat-bar-fill xp-fill" animate={{ width: `${filtered.length ? (completed / filtered.length) * 100 : 0}%` }} transition={{ duration: 0.5 }} />
        </div>
        <span className="text-xs text-muted-foreground">{completed}/{filtered.length} completas</span>
      </div>

      {/* Task list */}
      <div className="space-y-2">
        <AnimatePresence>
          {filtered.map((task) => {
            const cat = CATEGORY_CONFIG[task.category as TaskCategory] || { icon: "📋", label: task.category };
            const diff = DIFFICULTY_LABELS[task.difficulty] || { label: task.difficulty, color: "text-muted-foreground", rarity: "common" };
            const isOverdue = !task.completed && task.due_date && new Date(task.due_date + "T23:59:59") < new Date();
            const effectiveXp = Math.round(task.xp_reward * multiplier);

            const isExpanded = expandedTaskId === task.id;
            const taskSubs = subtasks[task.id] || [];
            const doneSubs = taskSubs.filter(s => s.done).length;
            const totalSubs = taskSubs.length;

            return (
              <motion.div
                key={task.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className={`relative flex flex-col rounded-xl border transition-all overflow-hidden group ${
                  task.completed
                    ? "border-border/50 bg-secondary/20 opacity-50"
                    : `rarity-${diff.rarity} bg-card shadow-[0_4px_20px_-10px_rgba(0,0,0,0.3)] hover:shadow-lg hover:scale-[1.005]`
                } ${isOverdue ? "border-destructive/40" : ""}`}
              >
                {/* Main Card Content */}
                <div className="flex items-center gap-3 p-4">
                  <button className="shrink-0" onClick={() => handleToggle(task)}>
                    {task.completed ? <CheckCircle2 className="h-5 w-5 text-health" /> : <Circle className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />}
                  </button>
                  
                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setExpandedTaskId(isExpanded ? null : task.id)}>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs">{cat.icon}</span>
                      <span className={`text-sm font-medium ${task.completed ? "line-through text-muted-foreground" : "text-foreground"}`}>{task.title}</span>
                      {totalSubs > 0 && (
                        <span className="text-[9px] font-bold px-1.5 py-0.2 bg-secondary text-muted-foreground rounded border border-border">
                          {doneSubs}/{totalSubs} etapas
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[10px] font-medium ${diff.color}`}>{diff.label}</span>
                      {task.recurring && (
                        <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                          <Clock className="h-2.5 w-2.5" />
                          {task.recurring === "daily" ? "Diária" : task.recurring === "weekly" ? "Semanal" : "Mensal"}
                        </span>
                      )}
                      {task.due_date && (
                        <span className={`text-[10px] ${isOverdue ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                          📅 {new Date(task.due_date + "T12:00:00").toLocaleDateString("pt-BR")}
                          {isOverdue && " ⚠️"}
                        </span>
                      )}
                      {task.priority === "critical" && <span className="text-[10px] text-destructive font-medium">⚡ Crítica</span>}
                      {task.priority === "high" && <span className="text-[10px] text-xp font-medium">🔸 Alta</span>}
                    </div>
                  </div>

                  {/* Actions & Rewards */}
                  <div className="shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {!task.completed && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); enterDungeonMode(task); }} 
                        className="p-1.5 rounded hover:bg-primary/20 text-primary border border-primary/20 bg-primary/5 transition-colors"
                        title="Entrar na Masmorra de Foco"
                      >
                        <Swords className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <button onClick={() => openEdit(task)} className="p-1.5 rounded hover:bg-secondary border border-border bg-secondary/30"><Edit3 className="h-3.5 w-3.5 text-muted-foreground" /></button>
                    <button onClick={() => setDeleteTarget(task.id)} className="p-1.5 rounded hover:bg-destructive/20 border border-destructive/20 bg-destructive/5"><Trash2 className="h-3.5 w-3.5 text-destructive" /></button>
                  </div>
                  
                  <div className="shrink-0 flex items-center gap-1.5 pl-2 border-l border-border/50">
                    <Sparkles className="h-3.5 w-3.5 text-xp animate-pulse" />
                    <span className="text-xs text-xp font-bold">+{effectiveXp}</span>
                    {multiplier > 1 && !task.completed && <span className="text-[8px] text-muted-foreground">(x{multiplier})</span>}
                  </div>
                </div>

                {/* Expanded Subtasks details */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-border bg-secondary/15 px-4 py-3 space-y-2.5 overflow-hidden"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Etapas da Missão</span>
                          {!task.completed && (
                            <button
                              onClick={() => generateMagicSubtasks(task.id, task.title)}
                              className="text-[9px] text-primary hover:text-primary/80 font-bold bg-primary/5 hover:bg-primary/10 border border-primary/20 rounded px-1.5 py-0.5 flex items-center gap-0.5"
                              title="Destrinchar missão em etapas usando magia de palavras-chave"
                              type="button"
                            >
                              🪄 Mágica
                            </button>
                          )}
                        </div>
                        {totalSubs > 0 && (
                          <span className="text-[10px] text-muted-foreground">{Math.round((doneSubs / totalSubs) * 100)}% concluído</span>
                        )}
                      </div>

                      {/* List subtasks */}
                      <div className="space-y-1.5">
                        {taskSubs.map(sub => (
                          <div key={sub.id} className="flex items-center justify-between text-xs py-1 px-2 bg-card rounded-md border border-border/60 hover:bg-secondary/40">
                            <button 
                              onClick={() => toggleSubtask(task.id, sub.id)}
                              className="flex items-center gap-2 text-left flex-1 min-w-0"
                            >
                              {sub.done ? <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" /> : <Circle className="h-4 w-4 text-muted-foreground shrink-0" />}
                              <span className={sub.done ? "line-through text-muted-foreground" : "text-foreground"}>{sub.text}</span>
                            </button>
                            <button 
                              onClick={() => removeSubtask(task.id, sub.id)}
                              className="text-destructive/40 hover:text-destructive p-0.5 ml-1"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>

                      {/* Add subtask input */}
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          addSubtask(task.id, newSubtaskText);
                          setNewSubtaskText("");
                        }}
                        className="flex gap-1.5 pt-1.5"
                      >
                        <Input
                          placeholder="Adicionar etapa para esta missão..."
                          value={newSubtaskText}
                          onChange={(e) => setNewSubtaskText(e.target.value)}
                          className="h-8 text-xs bg-card"
                        />
                        <Button type="submit" size="sm" className="h-8 text-xs font-semibold px-3">
                          Adicionar
                        </Button>
                      </form>
                    </motion.div>
                  )}
                </AnimatePresence>

                <AnimatePresence>
                  {xpGain?.id === task.id && (
                    <motion.div initial={{ opacity: 1, y: 0, scale: 1 }} animate={{ opacity: 0, y: -40, scale: 1.5 }} exit={{ opacity: 0 }} transition={{ duration: 1 }} className="absolute right-4 top-0 text-xp font-bold text-lg font-display">
                      +{xpGain.xp} XP!
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </AnimatePresence>
        {filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-sm">Nenhuma missão encontrada.</p>
            <p className="text-xs mt-1">Crie sua primeira missão e comece a ganhar XP!</p>
          </div>
        )}
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">{editingTask ? "Editar Missão" : "Nova Missão"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Título</label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Nome da missão..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Categoria</label>
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  {Object.entries(CATEGORY_CONFIG).map(([key, cfg]) => (<option key={key} value={key}>{cfg.icon} {cfg.label}</option>))}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Dificuldade</label>
                <select value={form.difficulty} onChange={(e) => setForm({ ...form, difficulty: e.target.value })} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  {Object.entries(DIFFICULTY_LABELS).map(([key, cfg]) => (<option key={key} value={key}>{cfg.label} (+{DIFFICULTY_XP[key]} XP)</option>))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Prioridade</label>
                <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="low">Baixa</option>
                  <option value="medium">Média</option>
                  <option value="high">Alta</option>
                  <option value="critical">Crítica</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Recorrência</label>
                <select value={form.recurring} onChange={(e) => setForm({ ...form, recurring: e.target.value })} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="">Nenhuma</option>
                  <option value="daily">Diária</option>
                  <option value="weekly">Semanal</option>
                  <option value="monthly">Mensal</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Prazo (opcional)</label>
              <Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
            </div>
            <div className="rounded-lg bg-secondary/50 border border-border p-3 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Recompensa</span>
              <span className="text-sm font-bold text-xp">+{DIFFICULTY_XP[form.difficulty]} XP {multiplier > 1 ? `(x${multiplier} = ${Math.round(DIFFICULTY_XP[form.difficulty] * multiplier)})` : ""}</span>
            </div>
            <Button onClick={saveTask} className="w-full">{editingTask ? "Salvar Alterações" : "Criar Missão"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        title="Excluir Missão"
        description="Tem certeza que deseja excluir esta missão? Esta ação não pode ser desfeita."
        onConfirm={handleDelete}
        confirmLabel="Excluir"
      />

      {/* Masmorra Victory Dialog */}
      <Dialog open={showWinDialog} onOpenChange={setShowWinDialog}>
        <DialogContent className="sm:max-w-md border-primary/30 text-center p-6 bg-card">
          <DialogHeader className="items-center">
            <div className="h-14 w-14 bg-primary/10 rounded-full flex items-center justify-center border border-primary/20 mb-2 shadow-[0_0_15px_rgba(255,215,0,0.2)]">
              <Trophy className="h-7 w-7 text-primary animate-bounce" />
            </div>
            <DialogTitle className="font-display text-2xl font-bold text-gradient-gold">VITÓRIA!</DialogTitle>
            <DialogDescription className="text-muted-foreground text-xs">
              Você derrotou o monstro e completou sua missão.
            </DialogDescription>
          </DialogHeader>
          
          {winData && (
            <div className="space-y-3.5 my-4">
              <div className="p-3 bg-secondary/30 rounded-xl border border-border">
                <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Missão Concluída</p>
                <p className="text-sm font-bold text-foreground mt-0.5">{winData.title}</p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 bg-secondary/30 rounded-xl border border-border text-center">
                  <p className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wider">Espólios (XP)</p>
                  <p className="text-lg font-bold text-primary mt-0.5">+{winData.xpEarned} XP</p>
                </div>
                <div className="p-3 bg-secondary/30 rounded-xl border border-border text-center">
                  <p className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wider">Tempo Gasto</p>
                  <p className="text-lg font-bold text-foreground mt-0.5">
                    {Math.floor(winData.timeElapsed / 60)}m {winData.timeElapsed % 60}s
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-left">
                <p className="text-[10px] font-bold text-primary uppercase tracking-widest flex items-center gap-1">
                  ✨ Conquistas do Combate
                </p>
                <p className="text-[10px] text-muted-foreground mt-1 leading-normal">
                  Sua disciplina nesta masmorra aumentou seus pontos de experiência e o manteve produtivo! Continue o bom trabalho para fortalecer o herói.
                </p>
              </div>
            </div>
          )}

          <Button onClick={() => setShowWinDialog(false)} className="w-full font-bold">
            Coletar Recompensas
          </Button>
        </DialogContent>
      </Dialog>

      {/* AI Quest Generator Modal */}
      <AiQuestGeneratorModal open={aiModalOpen} onOpenChange={setAiModalOpen} />
    </div>
    )
  );
}
