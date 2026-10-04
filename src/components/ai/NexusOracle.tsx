import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles, Bot, X, Send, Settings, Trash2, Copy, Check,
  Flame, Shield, Zap, ChevronDown, Compass, RefreshCw, Key, HelpCircle, ExternalLink
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useProfile, useTasks } from "@/hooks/useGameData";
import {
  askOracle, getAIConfig, saveAIConfig, AIConfig, ChatMessage
} from "@/services/aiService";
import { toast } from "@/hooks/use-toast";

declare global {
  interface Window {
    openNexusOracle?: (prompt?: string) => void;
  }
}

export default function NexusOracle() {
  const { profile } = useProfile();
  const { tasks } = useTasks();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem("nexus_oracle_chat_history");
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      {
        role: "assistant",
        content: `🔮 **Saudações, ${profile?.display_name || "Aventureiro"}!**\n\nEu sou o **Oráculo Nexus**, seu mentor e estrategista de inteligência artificial.\n\nPosso te ajudar a planejar seu dia, analisar seu progresso, desmembrar objetivos difíceis ou dar conselhos táticos contra a procrastinação. O que faremos hoje?`
      }
    ];
  });
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  // AI Configuration Modal
  const [configOpen, setConfigOpen] = useState(false);
  const [aiConfig, setAiConfig] = useState<AIConfig>(getAIConfig);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem("nexus_oracle_chat_history", JSON.stringify(messages));
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Expose global opener
  useEffect(() => {
    window.openNexusOracle = (prompt?: string) => {
      setIsOpen(true);
      if (prompt) {
        handleSendPrompt(prompt);
      }
    };
    return () => {
      delete window.openNexusOracle;
    };
  }, [messages, profile, tasks]);

  const userContext = {
    displayName: profile?.display_name || "Aventureiro",
    level: profile?.level || 1,
    archetype: profile?.archetype || "Guerreiro",
    streak: profile?.streak || 0,
    pendingTasksCount: tasks.filter(t => !t.completed).length,
  };

  const handleSendPrompt = async (textToSend: string) => {
    if (!textToSend.trim() || loading) return;
    const userMsg: ChatMessage = { role: "user", content: textToSend.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const replyText = await askOracle(newMessages, userContext);
      setMessages([...newMessages, { role: "assistant", content: replyText }]);
    } catch (err: any) {
      toast({
        title: "Erro no Oráculo",
        description: err.message || "Não foi possível obter resposta.",
        variant: "destructive"
      });
      setMessages([
        ...newMessages,
        {
          role: "assistant",
          content: "⚠️ *Não consegui me conectar com a sabedoria cósmica no momento. Verifique sua chave de API nas configurações ou continue usando o Nexus Smart Core.*"
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleClearHistory = () => {
    const initial: ChatMessage[] = [
      {
        role: "assistant",
        content: `🔮 Histórico limpo! Como posso te apoiar nesta etapa da sua jornada, **${profile?.display_name || "Aventureiro"}**?`
      }
    ];
    setMessages(initial);
    localStorage.removeItem("nexus_oracle_chat_history");
    toast({ title: "Histórico reiniciado" });
  };

  const copyToClipboard = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
    toast({ title: "Copiado para a área de transferência!" });
  };

  const handleSaveConfig = () => {
    saveAIConfig(aiConfig);
    setConfigOpen(false);
    toast({
      title: "Configurações de IA salvas!",
      description: aiConfig.provider === "builtin"
        ? "Modo inteligente local Nexus Core ativo (100% gratuito)."
        : `Conectado ao provedor ${aiConfig.provider.toUpperCase()}.`
    });
  };

  const quickPrompts = [
    { label: "🧭 Diagnosticar meu dia", prompt: "Faça um diagnóstico do meu estado atual no jogo e me diga em qual missão devo focar com prioridade hoje." },
    { label: "🔥 Vencer a procrastinação", prompt: "Estou me sentindo desmotivado e com vontade de adiar minhas tarefas. Me dê uma ordem tática imediata de 5 minutos para agir agora." },
    { label: "💰 Estratégia de Dinheiro", prompt: "Me dê 3 regras de ouro imediatas para manter minha disciplina financeira e poupar mais este mês." },
    { label: "⚔️ Plano Semanal", prompt: "Como devo estruturar meus blocos de foco para a semana ter o maior rendimento possível?" }
  ];

  return (
    <>
      {/* Floating Action Button */}
      <div className="fixed bottom-6 right-6 z-40">
        <motion.button
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.94 }}
          onClick={() => setIsOpen(!isOpen)}
          className="relative group flex items-center gap-2.5 px-4 py-3 rounded-full bg-gradient-to-r from-amber-500 via-primary to-cyan-500 text-white shadow-lg shadow-primary/25 hover:shadow-primary/40 border border-white/20 backdrop-blur-md transition-all"
        >
          <div className="relative">
            <Bot className="h-5 w-5" />
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500"></span>
            </span>
          </div>
          <span className="font-semibold text-sm tracking-wide hidden sm:inline-block">
            Oráculo IA
          </span>
          <Sparkles className="h-4 w-4 text-amber-200 group-hover:rotate-12 transition-transform" />
        </motion.button>
      </div>

      {/* Slide-over or Modal Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            transition={{ duration: 0.22 }}
            className="fixed bottom-20 right-4 sm:right-6 z-50 w-[calc(100vw-2rem)] sm:w-[460px] h-[640px] max-h-[85vh] flex flex-col rounded-2xl border border-primary/30 bg-background/95 backdrop-blur-xl shadow-2xl shadow-black/60 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-border bg-gradient-to-r from-primary/10 via-background to-secondary/30">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-amber-500/20 to-primary/30 border border-primary/40 flex items-center justify-center text-primary shadow-inner">
                  <Sparkles className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-display font-bold text-sm text-foreground">Oráculo Nexus</h3>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/20 font-medium">
                      {aiConfig.provider === "builtin" ? "Nexus Core" : aiConfig.provider.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">Mentor Estratégico & Coach de Vida</p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setConfigOpen(true)}
                  title="Configurar Provedor / Chave de API"
                  className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                >
                  <Settings className="h-4 w-4" />
                </button>
                <button
                  onClick={handleClearHistory}
                  title="Limpar Conversa"
                  className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Quick Action Chips */}
            <div className="px-3 py-2 border-b border-border/50 bg-secondary/30 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
              {quickPrompts.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendPrompt(q.prompt)}
                  disabled={loading}
                  className="shrink-0 text-[11px] px-2.5 py-1 rounded-full border border-border/80 bg-background/60 hover:bg-primary/10 hover:border-primary/40 text-muted-foreground hover:text-foreground transition-all flex items-center gap-1"
                >
                  {q.label}
                </button>
              ))}
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 text-sm scrollbar-thin">
              {messages.map((m, idx) => {
                const isUser = m.role === "user";
                return (
                  <div
                    key={idx}
                    className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}
                  >
                    <div
                      className={`relative group max-w-[88%] rounded-2xl px-4 py-3 leading-relaxed ${
                        isUser
                          ? "bg-primary text-primary-foreground rounded-tr-sm shadow-md"
                          : "bg-secondary/70 border border-border/70 text-foreground rounded-tl-sm shadow-sm"
                      }`}
                    >
                      <div className="whitespace-pre-wrap font-sans text-[13px] leading-relaxed select-text">
                        {m.content}
                      </div>

                      {!isUser && (
                        <button
                          onClick={() => copyToClipboard(m.content, idx)}
                          title="Copiar texto"
                          className="absolute -bottom-2.5 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md bg-background border border-border text-muted-foreground hover:text-foreground shadow"
                        >
                          {copiedIdx === idx ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                        </button>
                      )}
                    </div>
                    <span className="text-[9px] text-muted-foreground mt-1 px-1">
                      {isUser ? "Você" : "Oráculo"}
                    </span>
                  </div>
                );
              })}

              {loading && (
                <div className="flex items-center gap-2 text-muted-foreground text-xs p-2">
                  <div className="flex space-x-1">
                    <span className="h-2 w-2 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                    <span className="h-2 w-2 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                    <span className="h-2 w-2 bg-primary rounded-full animate-bounce"></span>
                  </div>
                  <span>Consultando os astros do Nexus...</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Bar */}
            <div className="p-3 border-t border-border bg-background/80 backdrop-blur-md">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendPrompt(input);
                }}
                className="flex items-center gap-2"
              >
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Pergunte ao Oráculo sobre metas, foco ou finanças..."
                  disabled={loading}
                  className="flex-1 text-xs sm:text-sm bg-secondary/50 border-border focus-visible:ring-primary h-10"
                />
                <Button
                  type="submit"
                  size="sm"
                  disabled={!input.trim() || loading}
                  className="h-10 px-3.5 bg-primary hover:bg-primary/90 text-primary-foreground shrink-0 shadow-sm"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </form>
              <div className="mt-1 flex items-center justify-between text-[10px] text-muted-foreground px-1">
                <span>Modo: {aiConfig.provider === "builtin" ? "Gratuito (Nexus Core)" : aiConfig.provider}</span>
                <button
                  type="button"
                  onClick={() => setConfigOpen(true)}
                  className="hover:underline flex items-center gap-1 text-primary/80 hover:text-primary"
                >
                  <Key className="h-2.5 w-2.5" /> Trocar Chave / Provedor
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI Configuration Dialog */}
      <Dialog open={configOpen} onOpenChange={setConfigOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Configurar Inteligência Artificial
            </DialogTitle>
            <DialogDescription>
              Escolha como deseja alimentar o Oráculo Nexus. Você pode usar o motor inteligente nativo gratuito ou conectar sua própria chave (Gemini grátis, OpenAI ou Groq).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs font-medium text-foreground mb-1 block">Provedor de IA</label>
              <Select
                value={aiConfig.provider}
                onValueChange={(val: any) => setAiConfig({ ...aiConfig, provider: val })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="builtin">Nexus Smart Core (Nativo • Sem Chave • Grátis)</SelectItem>
                  <SelectItem value="gemini">Google Gemini (Grátis via Google AI Studio)</SelectItem>
                  <SelectItem value="openai">OpenAI (GPT-4o Mini / ChatGPT)</SelectItem>
                  <SelectItem value="groq">Groq (Llama-3.3 Ultra-rápido)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {aiConfig.provider !== "builtin" && (
              <div className="space-y-2">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-medium text-foreground">Chave de API ({aiConfig.provider.toUpperCase()})</label>
                    {aiConfig.provider === "gemini" && (
                      <a
                        href="https://aistudio.google.com/app/apikey"
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-primary hover:underline flex items-center gap-1"
                      >
                        Obter chave gratuita <ExternalLink className="h-2.5 w-2.5" />
                      </a>
                    )}
                  </div>
                  <Input
                    type="password"
                    placeholder={`Cole sua chave ${aiConfig.provider}...`}
                    value={aiConfig.apiKey}
                    onChange={(e) => setAiConfig({ ...aiConfig, apiKey: e.target.value })}
                  />
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Sua chave fica salva apenas no seu navegador (localStorage) e nunca é enviada para servidores de terceiros.
                  </p>
                </div>

                <div>
                  <label className="text-xs font-medium text-foreground mb-1 block">Modelo</label>
                  <Input
                    placeholder={
                      aiConfig.provider === "gemini"
                        ? "gemini-1.5-flash"
                        : aiConfig.provider === "openai"
                        ? "gpt-4o-mini"
                        : "llama-3.3-70b-versatile"
                    }
                    value={aiConfig.model}
                    onChange={(e) => setAiConfig({ ...aiConfig, model: e.target.value })}
                  />
                </div>
              </div>
            )}

            {aiConfig.provider === "builtin" && (
              <div className="rounded-lg bg-primary/10 border border-primary/20 p-3 text-xs text-muted-foreground space-y-1">
                <p className="font-semibold text-primary">✨ Modo Nexus Smart Core Ativo</p>
                <p>
                  Gera diagnósticos avançados, planos de ação, auditoria financeira e conselhos táticos automaticamente usando a base de conhecimento de alta performance do Nexus, sem precisar de cartão ou chaves externas.
                </p>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 mt-2">
            <Button variant="outline" onClick={() => setConfigOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveConfig} className="bg-primary text-primary-foreground">
              Salvar Preferências
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
