import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Star, ArrowRight, Shield, Flame, BookOpen, Brain, Wallet, Swords,
  Trophy, Target, Dumbbell, Gift, Check, X, ChevronDown, Zap, Crown,
  Sparkles, Users, TrendingUp
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PLANS } from "@/lib/plans";
import { ARCHETYPES } from "@/lib/archetypes";
import heroShowcase from "@/assets/hero-showcase.jpg";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.6 } }),
};

const FEATURES = [
  { icon: Swords, title: "Missões Diárias", desc: "Transforme tarefas em quests épicas com XP e recompensas.", color: "text-health" },
  { icon: Target, title: "Hábitos & Streaks", desc: "Construa consistência e ganhe multiplicadores de XP.", color: "text-primary" },
  { icon: Dumbbell, title: "Treinos RPG", desc: "Registre exercícios e ganhe XP por cada série completada.", color: "text-strength" },
  { icon: Brain, title: "Saúde Mental", desc: "Monitore humor, energia e foco com check-ins diários.", color: "text-mana" },
  { icon: Wallet, title: "Finanças", desc: "Controle gastos, investimentos e metas financeiras.", color: "text-xp" },
  { icon: BookOpen, title: "Estudos", desc: "Sessões com Pomodoro integrado e progresso por matéria.", color: "text-wisdom" },
  { icon: Trophy, title: "Conquistas", desc: "Desbloqueie 28+ conquistas de Bronze a Lendário.", color: "text-charisma" },
  { icon: Gift, title: "Recompensas", desc: "Resgate prêmios reais com o XP que você ganha.", color: "text-destructive" },
];

const STATS = [
  { value: "100+", label: "Recompensas", icon: Gift },
  { value: "10", label: "Arquétipos", icon: Shield },
  { value: "28+", label: "Conquistas", icon: Trophy },
  { value: "100", label: "Níveis", icon: Crown },
];

const FAQ = [
  { q: "Como funciona o sistema de XP?", a: "Cada tarefa, hábito ou atividade completada gera XP. O XP é diário (reseta à meia-noite) e pode ser usado para resgatar recompensas. Seu nível sobe conforme acumula XP total." },
  { q: "Posso usar no celular?", a: "Sim! O QuestLife é totalmente responsivo e funciona perfeitamente em qualquer dispositivo." },
  { q: "O que são arquétipos?", a: "Arquétipos definem seu estilo de jogo. Cada um oferece bônus de XP em categorias específicas, como Guerreiro (+50% em Treinos) ou Mago (+50% em Estudos)." },
  { q: "Posso cancelar a qualquer momento?", a: "Sim! Você pode fazer downgrade para o plano gratuito quando quiser, sem perder seus dados." },
];

export default function Landing() {
  const navigate = useNavigate();
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
              <Star className="h-5 w-5 text-primary" />
            </div>
            <span className="font-display text-xl font-bold text-gradient-gold">QuestLife</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <a href="#archetypes" className="hover:text-foreground transition-colors">Arquétipos</a>
            <a href="#pricing" className="hover:text-foreground transition-colors">Planos</a>
            <a href="#faq" className="hover:text-foreground transition-colors">FAQ</a>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/auth")}>Entrar</Button>
            <Button size="sm" onClick={() => navigate("/auth")} className="gap-1.5">
              Começar <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-pattern opacity-30" />
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-background" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-32 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div initial="hidden" animate="visible" className="space-y-8">
              <motion.div variants={fadeUp} custom={0}>
                <Badge className="bg-primary/10 text-primary border-primary/20 mb-4">
                  <Sparkles className="h-3 w-3 mr-1" /> Sistema RPG de Produtividade
                </Badge>
                <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
                  <span className="text-gradient-gold">Transforme sua vida</span>
                  <br />
                  <span className="text-foreground">em uma jornada épica</span>
                </h1>
              </motion.div>
              <motion.p variants={fadeUp} custom={1} className="text-lg text-muted-foreground max-w-lg">
                QuestLife gamifica sua rotina com XP, níveis, conquistas e arquétipos RPG.
                Gerencie tarefas, finanças, treinos, estudos e saúde mental — tudo em uma plataforma.
              </motion.p>
              <motion.div variants={fadeUp} custom={2} className="flex flex-wrap gap-4">
                <Button size="lg" onClick={() => navigate("/auth")} className="gap-2 text-base px-8">
                  Criar Personagem <Swords className="h-5 w-5" />
                </Button>
                <Button size="lg" variant="outline" onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })} className="gap-2 text-base">
                  Ver Features <ChevronDown className="h-4 w-4" />
                </Button>
              </motion.div>
              <motion.div variants={fadeUp} custom={3} className="flex items-center gap-6 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5"><Check className="h-4 w-4 text-primary" /> Grátis para sempre</span>
                <span className="flex items-center gap-1.5"><Check className="h-4 w-4 text-primary" /> Sem cartão de crédito</span>
                <span className="flex items-center gap-1.5"><Check className="h-4 w-4 text-primary" /> Dados seguros</span>
              </motion.div>
            </motion.div>

            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3, duration: 0.8 }}
              className="relative hidden lg:block">
              <div className="rounded-2xl overflow-hidden border border-primary/20 shadow-2xl shadow-primary/10">
                <img src={heroShowcase} alt="QuestLife Dashboard" width={1920} height={768} className="w-full h-auto" />
              </div>
              <div className="absolute -bottom-4 -left-4 rounded-xl border border-primary/30 bg-card p-4 shadow-xl card-glow">
                <div className="flex items-center gap-2">
                  <Flame className="h-5 w-5 text-destructive" />
                  <div>
                    <p className="text-sm font-bold text-foreground">Streak: 30 dias</p>
                    <p className="text-[10px] text-primary">x2.0 XP Bônus</p>
                  </div>
                </div>
              </div>
              <div className="absolute -top-4 -right-4 rounded-xl border border-xp/30 bg-card p-4 shadow-xl">
                <div className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-xp" />
                  <div>
                    <p className="text-sm font-bold text-foreground">+150 XP</p>
                    <p className="text-[10px] text-muted-foreground">Missão Completa!</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="border-y border-border bg-card/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {STATS.map((stat, i) => (
              <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                className="text-center">
                <stat.icon className="h-6 w-6 text-primary mx-auto mb-2" />
                <p className="text-3xl font-bold font-display text-gradient-gold">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="text-center mb-16">
            <Badge className="bg-primary/10 text-primary border-primary/20 mb-4">
              <Shield className="h-3 w-3 mr-1" /> Funcionalidades
            </Badge>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
              Tudo que você precisa em <span className="text-gradient-gold">uma plataforma</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Cada aspecto da sua vida vira uma quest. Complete, ganhe XP e evolua.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {FEATURES.map((f, i) => (
              <motion.div key={f.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }}
                className="rounded-xl border border-border bg-card p-6 hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5 transition-all group">
                <f.icon className={`h-8 w-8 ${f.color} mb-4 group-hover:scale-110 transition-transform`} />
                <h3 className="font-display text-lg font-semibold text-foreground mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Archetypes */}
      <section id="archetypes" className="py-20 md:py-28 bg-card/30 border-y border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="text-center mb-16">
            <Badge className="bg-primary/10 text-primary border-primary/20 mb-4">
              <Users className="h-3 w-3 mr-1" /> Arquétipos
            </Badge>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
              Escolha seu <span className="text-gradient-gold">destino</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Cada arquétipo oferece bônus únicos que moldam sua jornada.
            </p>
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {ARCHETYPES.map((arch, i) => (
              <motion.div key={arch.id} initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }}
                className="rounded-xl border border-border bg-card p-4 text-center hover:border-primary/30 hover:shadow-lg transition-all group">
                <span className="text-3xl group-hover:scale-125 transition-transform inline-block">{arch.icon}</span>
                <p className="font-display text-sm font-bold text-foreground mt-2">{arch.name}</p>
                <p className="text-[10px] text-primary">{arch.title}</p>
                <div className="mt-2 space-y-0.5">
                  {arch.bonuses.map((b, j) => (
                    <p key={j} className="text-[9px] text-muted-foreground">✦ {b.label}</p>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="text-center mb-16">
            <Badge className="bg-primary/10 text-primary border-primary/20 mb-4">
              <TrendingUp className="h-3 w-3 mr-1" /> Como Funciona
            </Badge>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
              3 passos para <span className="text-gradient-gold">evoluir</span>
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: "01", title: "Crie seu Personagem", desc: "Escolha um nome, avatar e arquétipo. Seu personagem define seus bônus e trajetória.", icon: "🎭" },
              { step: "02", title: "Complete Missões", desc: "Tarefas, hábitos, treinos e estudos viram quests. Cada uma gera XP e progresso.", icon: "⚔️" },
              { step: "03", title: "Evolua & Resgate", desc: "Suba de nível, desbloqueie conquistas e use seu XP para resgatar recompensas reais.", icon: "🏆" },
            ].map((s, i) => (
              <motion.div key={s.step} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.15 }}
                className="text-center relative">
                <div className="text-5xl mb-4">{s.icon}</div>
                <div className="text-xs font-bold text-primary mb-2">PASSO {s.step}</div>
                <h3 className="font-display text-xl font-bold text-foreground mb-2">{s.title}</h3>
                <p className="text-sm text-muted-foreground">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 md:py-28 bg-card/30 border-y border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="text-center mb-16">
            <Badge className="bg-primary/10 text-primary border-primary/20 mb-4">
              <Crown className="h-3 w-3 mr-1" /> Planos
            </Badge>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
              Escolha seu <span className="text-gradient-gold">nível de poder</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Comece grátis e evolua quando estiver pronto.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {PLANS.map((plan, i) => (
              <motion.div key={plan.id} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                className={`rounded-2xl border p-6 relative transition-all hover:shadow-xl ${
                  plan.popular
                    ? "border-primary/40 bg-primary/5 shadow-lg shadow-primary/10 scale-105"
                    : "border-border bg-card hover:border-primary/20"
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground shadow-lg">
                      <Flame className="h-3 w-3 mr-1" /> Mais Popular
                    </Badge>
                  </div>
                )}
                <div className="text-center mb-6">
                  <span className="text-4xl">{plan.icon}</span>
                  <h3 className="font-display text-xl font-bold text-foreground mt-2">{plan.name}</h3>
                  <p className="text-xs text-muted-foreground mt-1">{plan.description}</p>
                  <div className="mt-4">
                    <span className="font-display text-3xl font-bold text-gradient-gold">{plan.price}</span>
                    <span className="text-sm text-muted-foreground">{plan.priceLabel}</span>
                  </div>
                </div>

                <div className="space-y-3 mb-6">
                  {plan.features.map((f, j) => (
                    <div key={j} className="flex items-start gap-2">
                      {f.included ? (
                        <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      ) : (
                        <X className="h-4 w-4 text-muted-foreground/40 mt-0.5 shrink-0" />
                      )}
                      <span className={`text-sm ${f.included ? "text-foreground" : "text-muted-foreground/40"}`}>{f.text}</span>
                    </div>
                  ))}
                </div>

                <Button
                  onClick={() => navigate("/auth")}
                  className={`w-full gap-2 ${plan.popular ? "" : "variant-outline"}`}
                  variant={plan.popular ? "default" : "outline"}
                >
                  {plan.cta} <ArrowRight className="h-4 w-4" />
                </Button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-20 md:py-28">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="text-center mb-12">
            <h2 className="font-display text-3xl font-bold text-foreground mb-4">Perguntas Frequentes</h2>
          </motion.div>

          <div className="space-y-3">
            {FAQ.map((item, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }}
                className="rounded-xl border border-border bg-card overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between p-4 text-left"
                >
                  <span className="text-sm font-medium text-foreground">{item.q}</span>
                  <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${openFaq === i ? "rotate-180" : ""}`} />
                </button>
                {openFaq === i && (
                  <div className="px-4 pb-4">
                    <p className="text-sm text-muted-foreground">{item.a}</p>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 md:py-28 border-t border-border bg-gradient-to-b from-primary/5 to-background">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}>
            <span className="text-6xl mb-6 inline-block">⚔️</span>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
              Pronto para começar sua <span className="text-gradient-gold">jornada</span>?
            </h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
              Crie seu personagem agora e transforme cada dia em uma aventura épica.
            </p>
            <Button size="lg" onClick={() => navigate("/auth")} className="gap-2 text-lg px-10 py-6">
              Começar Aventura <Swords className="h-5 w-5" />
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Star className="h-4 w-4 text-primary" />
            <span className="font-display text-sm font-bold text-gradient-gold">QuestLife</span>
          </div>
          <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} QuestLife. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
