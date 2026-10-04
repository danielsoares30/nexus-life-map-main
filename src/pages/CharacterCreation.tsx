import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, ArrowRight, ArrowLeft, Check, Swords } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ARCHETYPES, type Archetype } from "@/lib/archetypes";
import { AVATAR_OPTIONS, type AvatarOption } from "@/lib/avatars";
import { useProfile } from "@/hooks/useGameData";
import { cn } from "@/lib/utils";

export default function CharacterCreation() {
  const { update } = useProfile();
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState<AvatarOption | null>(null);
  const [selectedArchetype, setSelectedArchetype] = useState<Archetype | null>(null);
  const [saving, setSaving] = useState(false);

  const steps = ["Nome", "Avatar", "Arquétipo", "Confirmar"];

  const canProceed = () => {
    if (step === 0) return name.trim().length >= 2;
    if (step === 1) return !!selectedAvatar;
    if (step === 2) return !!selectedArchetype;
    return true;
  };

  const handleFinish = async () => {
    if (!selectedArchetype || !selectedAvatar) return;
    setSaving(true);
    await update({
      display_name: name.trim(),
      archetype: selectedArchetype.id,
      avatar_url: selectedAvatar.src,
      character_created: true,
    });
    setSaving(false);
  };

  return (
    <div className="min-h-screen bg-background bg-pattern flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-2xl"
      >
        {/* Header */}
        <div className="flex flex-col items-center mb-6">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 mb-3">
            <Star className="h-7 w-7 text-primary animate-pulse-glow" />
          </div>
          <h1 className="font-display text-2xl font-bold text-gradient-gold">Crie seu Personagem</h1>
          <p className="text-xs text-muted-foreground mt-1">Defina quem você será nesta jornada</p>
        </div>

        {/* Step indicator */}
        <div className="flex justify-center gap-2 mb-6">
          {steps.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={cn(
                "h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold border transition-all",
                i < step ? "bg-primary text-primary-foreground border-primary" :
                i === step ? "bg-primary/20 text-primary border-primary/50" :
                "bg-secondary text-muted-foreground border-border"
              )}>
                {i < step ? <Check className="h-4 w-4" /> : i + 1}
              </div>
              {i < steps.length - 1 && (
                <div className={cn("w-8 h-0.5", i < step ? "bg-primary" : "bg-border")} />
              )}
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="rounded-2xl border border-border bg-card p-6 card-glow min-h-[450px] flex flex-col">
          <AnimatePresence mode="wait">
            {step === 0 && (
              <motion.div key="name" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex-1 flex flex-col items-center justify-center gap-6">
                <div className="text-center">
                  <h2 className="font-display text-xl font-bold text-foreground mb-1">Como deseja ser chamado?</h2>
                  <p className="text-sm text-muted-foreground">Escolha o nome do seu herói</p>
                </div>
                <div className="w-full max-w-xs">
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Nome do personagem"
                    className="text-center text-lg font-display"
                    maxLength={20}
                  />
                  <p className="text-[10px] text-muted-foreground text-center mt-2">{name.length}/20 caracteres</p>
                </div>
              </motion.div>
            )}

            {step === 1 && (
              <motion.div key="avatar" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex-1 flex flex-col items-center gap-6">
                <div className="text-center">
                  <h2 className="font-display text-xl font-bold text-foreground mb-1">Escolha seu Avatar</h2>
                  <p className="text-sm text-muted-foreground">Selecione a aparência do seu personagem</p>
                </div>

                {/* Selected preview */}
                {selectedAvatar && (
                  <div className="flex flex-col items-center">
                    <div className="h-24 w-24 rounded-2xl border-2 border-primary overflow-hidden shadow-xl shadow-primary/20">
                      <img src={selectedAvatar.src} alt={selectedAvatar.name} className="h-full w-full object-cover" />
                    </div>
                    <p className="text-sm font-display font-bold text-primary mt-2">{selectedAvatar.name}</p>
                  </div>
                )}

                <div className="grid grid-cols-4 sm:grid-cols-6 gap-3 max-h-[250px] overflow-y-auto scrollbar-thin pr-1 w-full">
                  {AVATAR_OPTIONS.map((av) => (
                    <button
                      key={av.id}
                      onClick={() => setSelectedAvatar(av)}
                      className={cn(
                        "rounded-xl border-2 overflow-hidden transition-all hover:scale-105 aspect-square",
                        selectedAvatar?.id === av.id
                          ? "border-primary shadow-lg shadow-primary/20 ring-2 ring-primary/30"
                          : "border-border hover:border-primary/30"
                      )}
                    >
                      <img src={av.src} alt={av.name} className="h-full w-full object-cover" loading="lazy" />
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div key="archetype" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex-1 flex flex-col gap-4">
                <div className="text-center">
                  <h2 className="font-display text-xl font-bold text-foreground mb-1">Escolha seu Arquétipo</h2>
                  <p className="text-sm text-muted-foreground">Seu arquétipo define bônus de XP e sua trajetória</p>
                </div>
                <div className="grid grid-cols-2 gap-3 overflow-y-auto max-h-[350px] scrollbar-thin pr-1">
                  {ARCHETYPES.map((arch) => (
                    <button
                      key={arch.id}
                      onClick={() => setSelectedArchetype(arch)}
                      className={cn(
                        "rounded-xl border-2 p-3 text-left transition-all hover:scale-[1.02]",
                        selectedArchetype?.id === arch.id
                          ? "border-primary bg-primary/10 shadow-lg shadow-primary/10"
                          : "border-border bg-secondary/30 hover:border-primary/30"
                      )}
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-2xl">{arch.icon}</span>
                        <div>
                          <p className="font-display font-bold text-sm text-foreground">{arch.name}</p>
                          <p className="text-[10px] text-primary">{arch.title}</p>
                        </div>
                      </div>
                      <p className="text-[11px] text-muted-foreground mb-2 line-clamp-2">{arch.description}</p>
                      <div className="space-y-0.5">
                        {arch.bonuses.map((b, i) => (
                          <p key={i} className="text-[10px] text-primary font-medium">✦ {b.label}</p>
                        ))}
                      </div>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {step === 3 && selectedArchetype && selectedAvatar && (
              <motion.div key="confirm" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex-1 flex flex-col items-center justify-center gap-6">
                <div className="text-center">
                  <h2 className="font-display text-xl font-bold text-foreground mb-1">Pronto para a Jornada?</h2>
                  <p className="text-sm text-muted-foreground">Revise seu personagem</p>
                </div>
                <div className="rounded-2xl border border-primary/30 bg-primary/5 p-6 w-full max-w-sm text-center">
                  <div className="h-28 w-28 rounded-2xl border-2 border-primary overflow-hidden mx-auto mb-3 shadow-xl shadow-primary/20">
                    <img src={selectedAvatar.src} alt={selectedAvatar.name} className="h-full w-full object-cover" />
                  </div>
                  <h3 className="font-display text-2xl font-bold text-gradient-gold mb-1">{name}</h3>
                  <div className="flex items-center justify-center gap-2 mb-3">
                    <span className="text-xl">{selectedArchetype.icon}</span>
                    <span className="font-display text-sm text-primary font-bold">{selectedArchetype.name} — {selectedArchetype.title}</span>
                  </div>
                  <p className="text-xs text-muted-foreground italic mb-4">"{selectedArchetype.lore}"</p>
                  <div className="space-y-1">
                    {selectedArchetype.bonuses.map((b, i) => (
                      <p key={i} className="text-xs text-primary font-medium">✦ {b.label}</p>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Navigation */}
          <div className="flex justify-between mt-6 pt-4 border-t border-border">
            <Button
              variant="ghost"
              onClick={() => setStep((s) => s - 1)}
              disabled={step === 0}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" /> Voltar
            </Button>
            {step < 3 ? (
              <Button
                onClick={() => setStep((s) => s + 1)}
                disabled={!canProceed()}
                className="gap-2"
              >
                Próximo <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={handleFinish}
                disabled={saving}
                className="gap-2 bg-gradient-to-r from-primary to-primary/80"
              >
                {saving ? "Criando..." : "Iniciar Jornada"} <Swords className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
