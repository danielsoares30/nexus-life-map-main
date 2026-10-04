import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useGameData";
import AppLayout from "@/components/AppLayout";
import Landing from "./pages/Landing";
import Index from "./pages/Index";
import Tasks from "./pages/Tasks";
import Mental from "./pages/Mental";
import Finance from "./pages/Finance";
import Study from "./pages/Study";
import Career from "./pages/Career";
import Achievements from "./pages/Achievements";
import Rewards from "./pages/Rewards";
import Habits from "./pages/Habits";
import Journal from "./pages/Journal";
import Profile from "./pages/Profile";
import Workouts from "./pages/Workouts";
import CaveMode from "./pages/CaveMode";
import Shopping from "./pages/Shopping";
import CharacterCreation from "./pages/CharacterCreation";
import Objectives from "./pages/Objectives";
import Projects from "./pages/Projects";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoutes() {
  const { user, loading } = useAuth();
  const { profile, loading: profileLoading } = useProfile();

  if (loading || profileLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) return <Navigate to="/" replace />;

  if (profile && !profile.character_created) {
    return <CharacterCreation />;
  }

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Index />} />
        <Route path="/tasks" element={<Tasks />} />
        <Route path="/mental" element={<Mental />} />
        <Route path="/finance" element={<Finance />} />
        <Route path="/study" element={<Study />} />
        <Route path="/career" element={<Career />} />
        <Route path="/achievements" element={<Achievements />} />
        <Route path="/rewards" element={<Rewards />} />
        <Route path="/habits" element={<Habits />} />
        <Route path="/journal" element={<Journal />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/workouts" element={<Workouts />} />
        <Route path="/cave" element={<CaveMode />} />
        <Route path="/shopping" element={<Shopping />} />
        <Route path="/objectives" element={<Objectives />} />
        <Route path="/projects" element={<Projects />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

function AuthRoute() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/app" replace />;
  return <Auth />;
}

function LandingRoute() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/app" replace />;
  return <Landing />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<LandingRoute />} />
            <Route path="/auth" element={<AuthRoute />} />
            <Route path="/app/*" element={<ProtectedRoutes />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
