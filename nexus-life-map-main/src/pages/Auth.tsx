import { useState } from "react";
import { motion } from "framer-motion";
import { Star, Mail, Lock, User, ArrowRight, Shield, Flame, BookOpen } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

const features = [
  { icon: Shield, label: "Gamifique sua vida com XP e níveis" },
  { icon: Flame, label: "Mantenha streaks de produtividade" },
  { icon: BookOpen, label: "Acompanhe estudos, finanças e humor" },
];

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (isLogin) {
      const { error } = await signIn(email, password);
      if (error) {
        toast({ title: "Erro ao entrar", description: error.message, variant: "destructive" });
      }
    } else {
      if (password.length < 6) {
        toast({ title: "Senha fraca", description: "A senha deve ter pelo menos 6 caracteres.", variant: "destructive" });
        setLoading(false);
        return;
      }
      const { error } = await signUp(email, password, displayName || "Aventureiro");
      if (error) {
        toast({ title: "Erro ao criar conta", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Conta criada!", description: "Verifique seu email para confirmar o cadastro." });
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background bg-pattern flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 mb-4 shadow-lg">
            <Star className="h-8 w-8 text-primary animate-pulse-glow" />
          </div>
          <h1 className="font-display text-3xl font-bold text-gradient-gold">QuestLife</h1>
          <p className="text-sm text-muted-foreground mt-1">Seu sistema operacional da vida</p>
        </div>

        {/* Features */}
        <div className="flex justify-center gap-6 mb-8">
          {features.map((f, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.1 }}
              className="flex flex-col items-center gap-1.5 text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary border border-border">
                <f.icon className="h-4 w-4 text-primary" />
              </div>
              <span className="text-[10px] text-muted-foreground max-w-[100px] leading-tight">{f.label}</span>
            </motion.div>
          ))}
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-border bg-card p-6 card-glow">
          <h2 className="font-display text-lg font-bold text-foreground mb-1">
            {isLogin ? "Entrar na Jornada" : "Criar Personagem"}
          </h2>
          <p className="text-xs text-muted-foreground mb-6">
            {isLogin ? "Continue sua aventura épica." : "Comece sua jornada de evolução."}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Nome do personagem"
                  className="pl-10"
                />
              </div>
            )}

            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                className="pl-10"
                required
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Senha"
                className="pl-10"
                required
                minLength={6}
              />
            </div>

            <Button type="submit" className="w-full gap-2" disabled={loading}>
              {loading ? "Carregando..." : isLogin ? "Entrar" : "Criar Conta"}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>

          <div className="mt-5 text-center">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-xs text-primary hover:underline"
            >
              {isLogin ? "Não tem conta? Crie seu personagem" : "Já tem conta? Entre na jornada"}
            </button>
          </div>
        </div>

        <p className="text-[10px] text-muted-foreground text-center mt-4">
          Ao criar uma conta, você concorda com nossos termos de uso.
        </p>
      </motion.div>
    </div>
  );
}
