import CharacterPanel from "@/components/CharacterPanel";
import TodayFocus from "@/components/TodayFocus";
import {
  StatsRow,
  QuickActions,
  DailyChallengesWidget,
  WeeklyInsightsWidget,
  CategoryProgress,
  MoodWidget,
  FinanceWidget,
  AchievementsWidget,
  DailyBossBattleWidget,
  ConsolidatedQuestBoard,
} from "@/components/DashboardWidgets";
import { motion } from "framer-motion";
import { useProfile } from "@/hooks/useGameData";
import { getStreakMultiplier } from "@/lib/gameData";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Swords, BarChart2 } from "lucide-react";

const Dashboard = () => {
  const { profile } = useProfile();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
  const streak = profile?.streak || 0;
  const multiplier = getStreakMultiplier(streak);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl md:text-3xl font-bold text-gradient-gold">
            {greeting}, {profile?.display_name || "Aventureiro"}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Sua jornada épica continua. Mantenha o foco e conquiste mais um dia.
          </p>
        </div>
        {multiplier > 1 && (
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl bg-xp/10 border border-xp/20">
            <span className="text-lg">🔥</span>
            <div>
              <p className="text-xs font-bold text-xp">x{multiplier}</p>
              <p className="text-[9px] text-muted-foreground">Bônus XP</p>
            </div>
          </motion.div>
        )}
      </motion.div>

      <TodayFocus />
      <StatsRow />
      <QuickActions />

      {/* Tabs Container */}
      <Tabs defaultValue="adventure" className="w-full space-y-6">
        <div className="flex justify-start border-b border-border/40 pb-2">
          <TabsList className="bg-secondary/40 border border-border p-1 rounded-xl">
            <TabsTrigger 
              value="adventure" 
              className="flex items-center gap-2 rounded-lg text-xs md:text-sm font-medium px-4 py-1.5 transition-all"
            >
              <Swords className="h-4 w-4" />
              Aventura Diária
            </TabsTrigger>
            <TabsTrigger 
              value="life-status" 
              className="flex items-center gap-2 rounded-lg text-xs md:text-sm font-medium px-4 py-1.5 transition-all"
            >
              <BarChart2 className="h-4 w-4" />
              Status da Vida
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Tab 1: Adventure (Actionable RPG View) */}
        <TabsContent value="adventure" className="mt-0 focus-visible:outline-none">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Column 1: Hero Profile */}
            <div className="space-y-6 lg:col-span-1">
              <CharacterPanel />
            </div>

            {/* Column 2 & 3: Daily Quests & Boss */}
            <div className="space-y-6 lg:col-span-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <DailyBossBattleWidget />
                <DailyChallengesWidget />
              </div>
              <ConsolidatedQuestBoard />
            </div>
          </div>
        </TabsContent>

        {/* Tab 2: Life Status (Analytics and Stats) */}
        <TabsContent value="life-status" className="mt-0 focus-visible:outline-none">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-6">
              <MoodWidget />
              <FinanceWidget />
            </div>
            
            <div className="space-y-6">
              <WeeklyInsightsWidget />
              <CategoryProgress />
            </div>

            <div className="space-y-6">
              <AchievementsWidget />
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Dashboard;

