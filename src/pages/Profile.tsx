import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Mail, Calendar, Shield, Flame, Star, Sparkles, Swords, BookOpen, Brain, Edit3, Save, TrendingUp, Crown, Zap, Camera } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useProfile, useTasks, useMoodEntries, useStudySessions, useAchievements, useCareerSkills, useWorkouts } from "@/hooks/useGameData";
import { useAuth } from "@/hooks/useAuth";
import { getLevelTitle, calculateXpForLevel, detectClass, computePowerScore, getPowerRank, getStreakMultiplier } from "@/lib/gameData";
import { computeAttributes } from "@/components/CharacterPanel";
import { AVATAR_OPTIONS } from "@/lib/avatars";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import defaultAvatar from "@/assets/default-avatar.png";

export default function Profile() {
  const { user } = useAuth();
  const { profile, update, loading } = useProfile();
  const { tasks } = useTasks();
  const { entries: moodEntries } = useMoodEntries();
  const { sessions: studySessions } = useStudySessions();
  const { unlockedKeys: _unlockedKeys } = useAchievements();
  const { skills: careerSkills } = useCareerSkills();
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [avatarDialogOpen, setAvatarDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || "");
    }
  }, [profile]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "Arquivo muito grande", description: "O tamanho máximo é 2MB.", variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/avatar.${ext}`;

      const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
      const avatarUrl = urlData.publicUrl + "?t=" + Date.now();

      await update({ avatar_url: avatarUrl });
      toast({ title: "Avatar atualizado! 🎨" });
    } catch (err: any) {
      console.error("Avatar upload error:", err);
      toast({ title: "Erro ao enviar avatar", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleSelectAvatar = async (avatarSrc: string) => {
    setUploading(true);
    await update({ avatar_url: avatarSrc });
    toast({ title: "Avatar atualizado! 🎨" });
    setUploading(false);
    setAvatarDialogOpen(false);
  };

  const handleSave = async () => {
    setSaving(true);
    await update({ display_name: displayName.trim() || "Aventureiro" });
    toast({ title: "Perfil atualizado! ✨", description: "Suas alterações foram salvas." });
    setEditing(false);
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto flex items-center justify-center py-20">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const level = profile?.level || 1;
  const xp = profile?.xp || 0;
  const totalXp = profile?.total_xp || 0;
  const streak = profile?.streak || 0;
  const xpToNext = calculateXpForLevel(level);
  const completedTasks = tasks.filter(t => t.completed).length;
  const totalStudyHours = studySessions.reduce((s, session) => s + Number(session.hours), 0);
  const joinDate = profile?.created_at ? new Date(profile.created_at).toLocaleDateString("pt-BR", { year: "numeric", month: "long", day: "numeric" }) : "-";
  const multiplier = getStreakMultiplier(streak);

  // Daily XP
  const today = new Date().toISOString().split("T")[0];
  const dailyXp = tasks.filter(t => t.completed && t.completed_at?.startsWith(today)).reduce((sum, t) => sum + (t.xp_reward || 0), 0);

  const { workouts } = useWorkouts();

  const attrs = computeAttributes({ tasks, moodEntries, studySessions, careerSkills, workouts, streak, level });
  const rpgClass = detectClass(attrs);
  const powerScore = computePowerScore(attrs);
  const powerRank = getPowerRank(powerScore);

  // Weekly activity
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().split("T")[0];
  });
  const weeklyActivity = last7Days.map(date => ({
    date,
    day: new Date(date + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "short" }).slice(0, 3),
    tasks: tasks.filter(t => t.completed && t.completed_at?.startsWith(date)).length,
    mood: moodEntries.find(e => e.date === date),
    study: studySessions.filter(s => s.date === date).reduce((sum, s) => sum + Number(s.hours), 0),
  }));

  // Evolution journey up to level 100
  const journeyMilestones = [
    { title: "Aprendiz", level: 1, icon: "🌱" },
    { title: "Aventureiro", level: 5, icon: "⚔️" },
    { title: "Guerreiro", level: 10, icon: "🛡️" },
    { title: "Cavaleiro", level: 20, icon: "🏰" },
    { title: "Mestre", level: 30, icon: "👑" },
    { title: "Campeão", level: 40, icon: "🏆" },
    { title: "Lenda", level: 50, icon: "🌟" },
    { title: "Imortal", level: 60, icon: "⚡" },
    { title: "Divino", level: 75, icon: "🔱" },
    { title: "Transcendente", level: 100, icon: "🌌" },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <h2 className="font-display text-2xl md:text-3xl font-bold text-gradient-gold">Meu Perfil</h2>
        <p className="text-sm text-muted-foreground mt-1">Gerencie seu personagem e acompanhe sua evolução.</p>
      </motion.div>

      {/* Hero Card */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-border bg-card overflow-hidden relative">
        <div className="h-32 bg-gradient-to-r from-primary/20 via-mana/10 to-health/10 relative">
          <div className="absolute inset-0 bg-pattern opacity-50" />
          <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-card to-transparent" />
        </div>

        <div className="px-6 pb-6 -mt-12 relative z-10">
          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
            <div className="relative group">
              <div className="h-24 w-24 rounded-2xl border-4 border-card overflow-hidden bg-secondary shadow-xl">
                <img src={profile?.avatar_url || defaultAvatar} alt="Avatar" className="h-full w-full object-cover" />
              </div>
              <button
                onClick={() => setAvatarDialogOpen(true)}
                disabled={uploading}
                className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              >
                <Camera className="h-6 w-6 text-white" />
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
              <div className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold shadow-lg border-2 border-card">
                {level}
              </div>
              {uploading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-2xl">
                  <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
                </div>
              )}
            </div>

            {/* Avatar Selection Dialog */}
            <Dialog open={avatarDialogOpen} onOpenChange={setAvatarDialogOpen}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle className="font-display text-gradient-gold">Trocar Avatar</DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-4 gap-3 max-h-[300px] overflow-y-auto scrollbar-thin pr-1">
                  {AVATAR_OPTIONS.map((av) => (
                    <button
                      key={av.id}
                      onClick={() => handleSelectAvatar(av.src)}
                      className="rounded-xl border-2 border-border overflow-hidden aspect-square hover:border-primary hover:scale-105 transition-all"
                    >
                      <img src={av.src} alt={av.name} className="h-full w-full object-cover" loading="lazy" />
                    </button>
                  ))}
                </div>
                <div className="text-center pt-2 border-t border-border">
                  <button onClick={() => fileInputRef.current?.click()} className="text-xs text-primary hover:underline">
                    Ou envie uma imagem personalizada
                  </button>
                </div>
              </DialogContent>
            </Dialog>

            <div className="flex-1 min-w-0">
              {editing ? (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Nome do Personagem</label>
                    <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Seu nome..." className="max-w-xs" />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleSave} size="sm" className="gap-1.5" disabled={saving}>
                      <Save className="h-3.5 w-3.5" /> {saving ? "Salvando..." : "Salvar"}
                    </Button>
                    <Button onClick={() => setEditing(false)} size="sm" variant="outline">Cancelar</Button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <h3 className="font-display text-xl font-bold text-foreground">{profile?.display_name || "Aventureiro"}</h3>
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                      {getLevelTitle(level)}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-secondary border border-border">
                      {rpgClass.icon} {rpgClass.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 mt-1.5 flex-wrap">
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Mail className="h-3 w-3" /> {user?.email}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" /> Desde {joinDate}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {!editing && (
              <Button onClick={() => setEditing(true)} size="sm" variant="outline" className="gap-1.5 shrink-0">
                <Edit3 className="h-3.5 w-3.5" /> Editar Perfil
              </Button>
            )}
          </div>

          {/* XP Progress */}
          <div className="mt-6">
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-muted-foreground">Progresso para Nível {level + 1}</span>
              <span className="text-primary font-medium">{xp} / {xpToNext} XP</span>
            </div>
            <div className="stat-bar h-3 rounded-lg">
              <motion.div className="stat-bar-fill xp-fill rounded-lg" initial={{ width: 0 }} animate={{ width: `${Math.min((xp / xpToNext) * 100, 100)}%` }} transition={{ duration: 1.2, ease: "easeOut" }} />
            </div>
          </div>
        </div>
      </motion.div>

      {/* Power & Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-center">
          <Crown className="h-5 w-5 text-primary mx-auto mb-1" />
          <p className="text-2xl font-bold font-display text-gradient-gold">{powerScore}</p>
          <p className="text-[10px] text-primary font-medium">{powerRank.icon} {powerRank.rank}</p>
          <p className="text-[9px] text-muted-foreground">Poder Total</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="rounded-xl border border-xp/20 bg-xp/5 p-4 text-center">
          <Zap className="h-5 w-5 text-xp mx-auto mb-1" />
          <p className="text-2xl font-bold font-display text-foreground">+{dailyXp}</p>
          <p className="text-[10px] text-xp font-medium">XP Hoje</p>
          <p className="text-[9px] text-muted-foreground">Total: {totalXp.toLocaleString()}</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-center">
          <Flame className="h-5 w-5 text-destructive mx-auto mb-1" />
          <p className="text-2xl font-bold font-display text-foreground">{streak}</p>
          <p className="text-[10px] text-destructive font-medium">x{multiplier} bônus</p>
          <p className="text-[9px] text-muted-foreground">Streak</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
          className="rounded-xl border border-border bg-card p-4 text-center">
          <span className="text-2xl">{rpgClass.icon}</span>
          <p className="text-sm font-bold font-display text-foreground">{rpgClass.name}</p>
          <p className="text-[9px] text-muted-foreground line-clamp-2">{rpgClass.description}</p>
        </motion.div>
      </div>

      {/* Weekly Activity Heatmap */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="h-4 w-4 text-primary" />
          <h3 className="font-display text-base font-semibold text-foreground">Atividade Semanal</h3>
        </div>
        <div className="grid grid-cols-7 gap-2">
          {weeklyActivity.map((day) => {
            const intensity = Math.min(day.tasks * 20 + (day.mood ? 20 : 0) + day.study * 10, 100);
            return (
              <div key={day.date} className="text-center">
                <p className="text-[10px] text-muted-foreground mb-1">{day.day}</p>
                <div className={`rounded-lg border p-2 transition-all ${intensity > 60 ? "border-primary/30 bg-primary/10" : intensity > 20 ? "border-border bg-secondary/50" : "border-border/50 bg-muted/30"}`}>
                  <p className="text-sm font-bold text-foreground">{day.tasks}</p>
                  <p className="text-[8px] text-muted-foreground">missões</p>
                  {day.mood && <p className="text-[9px] mt-0.5">{['😞','😐','🙂','😊','😄'][Math.max(0, Math.min((day.mood.mood || 3) - 1, 4))]}</p>}
                  {day.study > 0 && <p className="text-[8px] text-mana">{day.study}h</p>}
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Activity Overview */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Star className="h-4 w-4 text-primary" />
          <h3 className="font-display text-base font-semibold text-foreground">Resumo de Atividades</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Missões Concluídas", value: completedTasks, icon: Swords, color: "text-health" },
            { label: "Total de Missões", value: tasks.length, icon: Shield, color: "text-mana" },
            { label: "Horas de Estudo", value: `${totalStudyHours.toFixed(1)}h`, icon: BookOpen, color: "text-wisdom" },
            { label: "Check-ins Mentais", value: moodEntries.length, icon: Brain, color: "text-primary" },
          ].map((stat) => (
            <div key={stat.label} className="rounded-lg bg-secondary/50 border border-border p-4 text-center">
              <stat.icon className={`h-5 w-5 ${stat.color} mx-auto mb-2`} />
              <p className="text-lg font-bold font-display text-foreground">{stat.value}</p>
              <p className="text-[10px] text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Level Progression - up to 100 */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="rounded-xl border border-primary/20 bg-primary/5 p-5">
        <h3 className="font-display text-base font-semibold text-foreground mb-4 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" /> Jornada de Evolução (até Nv. 100)
        </h3>
        <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-thin">
          {journeyMilestones.map((milestone) => {
            const isActive = level >= milestone.level;
            const isCurrent = level >= milestone.level && (journeyMilestones.find(m => m.level > milestone.level && level < m.level) || milestone.level === 100);
            return (
              <div key={milestone.title} className={`flex flex-col items-center gap-1.5 min-w-[80px] rounded-lg p-3 border transition-all ${isCurrent ? "border-primary/40 bg-primary/10 scale-105" : isActive ? "border-border bg-card" : "border-border/50 bg-secondary/30 opacity-40"}`}>
                <span className="text-lg">{milestone.icon}</span>
                <span className="text-[10px] font-medium text-foreground">{milestone.title}</span>
                <span className="text-[9px] text-muted-foreground">Nv. {milestone.level}+</span>
              </div>
            );
          })}
        </div>
        <div className="mt-3">
          <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
            <span>Progresso Geral</span>
            <span>Nv. {level} / 100</span>
          </div>
          <div className="stat-bar h-2">
            <motion.div className="stat-bar-fill xp-fill" initial={{ width: 0 }} animate={{ width: `${Math.min(level, 100)}%` }} transition={{ duration: 1.5 }} />
          </div>
        </div>
      </motion.div>
    </div>
  );
}
