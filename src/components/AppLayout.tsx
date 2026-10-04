import { useState, useEffect } from "react";
import { NavLink as RouterNavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Swords, Brain, Wallet, BookOpen, Briefcase, Trophy, Gift,
  Menu, X, Flame, Star, LogOut, Target, BookMarked, Dumbbell, Mountain,
  ShoppingBag, Compass, FolderKanban, Sun, Moon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useProfile } from "@/hooks/useGameData";
import { useAuth } from "@/hooks/useAuth";
import { getLevelTitle, calculateXpForLevel } from "@/lib/gameData";
import { getArchetype } from "@/lib/archetypes";
import defaultAvatar from "@/assets/default-avatar.png";

const navItems = [
  { path: "/app", label: "Meu Dia", icon: LayoutDashboard },
  { path: "/app/objectives", label: "Missões", icon: Compass },
  { path: "/app/projects", label: "Projetos", icon: FolderKanban },
  { path: "/app/tasks", label: "Tarefas", icon: Swords },
  { path: "/app/habits", label: "Hábitos", icon: Target },
  { path: "/app/workouts", label: "Treinos", icon: Dumbbell },
  { path: "/app/cave", label: "Modo Caverna", icon: Mountain },
  { path: "/app/mental", label: "Mente", icon: Brain },
  { path: "/app/finance", label: "Finanças", icon: Wallet },
  { path: "/app/shopping", label: "Compras", icon: ShoppingBag },
  { path: "/app/study", label: "Estudos", icon: BookOpen },
  { path: "/app/career", label: "Carreira", icon: Briefcase },
  { path: "/app/journal", label: "Diário", icon: BookMarked },
  { path: "/app/rewards", label: "Recompensas", icon: Gift },
  { path: "/app/achievements", label: "Conquistas", icon: Trophy },
];

function useTheme() {
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    const saved = localStorage.getItem("nexus_theme");
    return (saved === "light" ? "light" : "dark") as "dark" | "light";
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "light") {
      root.classList.add("light");
    } else {
      root.classList.remove("light");
    }
    localStorage.setItem("nexus_theme", theme);
  }, [theme]);

  const toggle = () => setTheme(t => (t === "dark" ? "light" : "dark"));
  return { theme, toggle };
}

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { profile } = useProfile();
  const { signOut } = useAuth();
  const { theme, toggle: toggleTheme } = useTheme();

  const level = profile?.level || 1;
  const xp = profile?.xp || 0;
  const xpToNext = calculateXpForLevel(level);
  const streak = profile?.streak || 0;
  const archetype = profile?.archetype ? getArchetype(profile.archetype) : null;

  return (
    <div className="flex min-h-screen bg-background bg-pattern">
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={() => setSidebarOpen(false)} />
        )}
      </AnimatePresence>

      <aside className={cn("fixed inset-y-0 left-0 z-50 w-64 flex flex-col border-r border-border bg-sidebar transition-transform duration-300 lg:static lg:translate-x-0", sidebarOpen ? "translate-x-0" : "-translate-x-full")}>
        <div className="flex items-center gap-3 px-6 py-5 border-b border-border">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
            <Star className="h-5 w-5 text-primary animate-pulse" />
          </div>
          <div className="flex-1">
            <h1 className="font-display text-lg font-bold text-gradient-gold">QuestLife</h1>
            <p className="text-[10px] text-muted-foreground tracking-widest uppercase">Sistema de Vida</p>
          </div>
          <button
            onClick={toggleTheme}
            title={theme === "dark" ? "Ativar modo claro" : "Ativar modo escuro"}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Profile mini card */}
        <button
          onClick={() => { navigate("/app/profile"); setSidebarOpen(false); }}
          className={cn(
            "mx-4 mt-4 rounded-lg border p-3 text-left transition-all hover:border-primary/20",
            location.pathname === "/app/profile" ? "border-primary/30 bg-primary/5" : "border-border bg-secondary/50"
          )}
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="h-9 w-9 rounded-full border border-primary/30 overflow-hidden bg-secondary">
              <img src={profile?.avatar_url || defaultAvatar} alt="" className="h-full w-full object-cover" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{profile?.display_name || "Aventureiro"}</p>
              <p className="text-[10px] text-primary font-medium">{archetype ? `${archetype.icon} ${archetype.name}` : getLevelTitle(level)} · Nv. {level}</p>
            </div>
          </div>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-primary font-medium">{xp}/{xpToNext} XP</span>
            <div className="flex items-center gap-1">
              <Flame className="h-3 w-3 text-destructive" />
              <span className="text-destructive font-medium">{streak}</span>
            </div>
          </div>
          <div className="stat-bar">
            <div className="stat-bar-fill xp-fill" style={{ width: `${(xp / xpToNext) * 100}%` }} />
          </div>
        </button>

        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto scrollbar-thin">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <RouterNavLink
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all",
                  isActive
                    ? "bg-primary/10 text-primary border border-primary/20 shadow-sm"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
              >
                <item.icon className={cn("h-4 w-4 shrink-0", isActive && "text-primary")} />
                <span className="font-medium">{item.label}</span>
              </RouterNavLink>
            );
          })}
        </nav>

        <div className="border-t border-border px-4 py-3">
          <button onClick={signOut} className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground w-full px-2 py-1.5 rounded-md hover:bg-secondary/50 transition-colors">
            <LogOut className="h-3.5 w-3.5" />
            Sair
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-background/80 backdrop-blur-sm px-4 py-3 lg:hidden">
          <button onClick={() => setSidebarOpen(true)} className="text-muted-foreground hover:text-foreground">
            <Menu className="h-5 w-5" />
          </button>
          <h1 className="font-display text-sm font-bold text-gradient-gold flex-1">QuestLife</h1>
          <button
            onClick={toggleTheme}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground transition-colors"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <button onClick={() => navigate("/app/profile")} className="h-7 w-7 rounded-full border border-primary/30 overflow-hidden bg-secondary">
            <img src={profile?.avatar_url || defaultAvatar} alt="" className="h-full w-full object-cover" />
          </button>
        </header>
        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
