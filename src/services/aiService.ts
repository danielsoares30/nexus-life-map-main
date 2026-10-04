export type AIProvider = "builtin" | "gemini" | "openai" | "groq";

export interface AIConfig {
  provider: AIProvider;
  apiKey: string;
  model: string;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface GeneratedQuest {
  title: string;
  description: string;
  category: "work" | "study" | "health" | "personal" | "spiritual" | "projects";
  difficulty: "easy" | "medium" | "hard" | "epic";
  priority: "low" | "medium" | "high" | "urgent";
  xp_reward: number;
  subtasks: string[];
}

export interface FinanceAuditResult {
  score: number; // 0 a 100
  title: string;
  summary: string;
  strengths: string[];
  vulnerabilities: string[];
  actionSteps: { action: string; impact: string; priority: "alta" | "media" | "baixa" }[];
  emergencyFundAdvice: string;
  debtStrategy: string;
}

const STORAGE_KEY = "nexus_ai_config";

export function getAIConfig(): AIConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error("Error reading AI config:", e);
  }
  return {
    provider: "builtin",
    apiKey: "",
    model: "gemini-1.5-flash",
  };
}

export function saveAIConfig(config: AIConfig) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

// ----------------- BUILT-IN SMART HEURISTIC GENERATORS -----------------

function generateLocalMissions(goal: string, context?: any): GeneratedQuest[] {
  const cleanGoal = goal.trim() || "Meta Geral";
  const cat = (cleanGoal.toLowerCase().includes("dinheiro") || cleanGoal.toLowerCase().includes("econom"))
    ? "work"
    : (cleanGoal.toLowerCase().includes("estud") || cleanGoal.toLowerCase().includes("aprender"))
    ? "study"
    : (cleanGoal.toLowerCase().includes("trein") || cleanGoal.toLowerCase().includes("saud") || cleanGoal.toLowerCase().includes("peso"))
    ? "health"
    : "projects";

  return [
    {
      title: `Definir Fundamentos: ${cleanGoal.slice(0, 30)}`,
      description: `Mapear todos os recursos, etapas iniciais e cronograma semanal para alcançar "${cleanGoal}".`,
      category: cat,
      difficulty: "easy",
      priority: "high",
      xp_reward: 120,
      subtasks: [
        "Pesquisar as 3 melhores referências ou materiais de apoio",
        "Dividir a jornada em blocos diários de 30 a 45 minutos",
        "Eliminar as 2 maiores distrações que podem atrapalhar o objetivo"
      ]
    },
    {
      title: `Execução Tática: Primeiro Marco de ${cleanGoal.slice(0, 25)}`,
      description: `Colocar em prática o núcleo principal da meta com foco total de 3 dias consecutivos.`,
      category: cat,
      difficulty: "medium",
      priority: "urgent",
      xp_reward: 200,
      subtasks: [
        "Completar a primeira sessão prática profunda (Deep Work 45m)",
        "Documentar o progresso e lições aprendidas no Diário",
        "Ajustar a rota com base nas primeiras dificuldades encontradas"
      ]
    },
    {
      title: `Consolidação e Maestria Épica`,
      description: `Testar os resultados na prática, validar a consistência e estabelecer o novo padrão de excelência.`,
      category: cat,
      difficulty: "epic",
      priority: "medium",
      xp_reward: 400,
      subtasks: [
        "Revisar os resultados quantitativos alcançados",
        "Compartilhar aprendizado ou aplicar em um caso real",
        "Recompensar a si mesmo pela disciplina mantida"
      ]
    }
  ];
}

function generateLocalFinancialAudit(data: any): FinanceAuditResult {
  const balance = data.balance || 0;
  const totalIncome = data.totalIncome || 0;
  const totalExpenses = data.totalExpenses || 0;
  const savingsRate = totalIncome > 0 ? Math.max(0, Math.round(((totalIncome - totalExpenses) / totalIncome) * 100)) : 0;
  const debts = data.debts || [];
  const totalDebt = debts.reduce((acc: number, d: any) => acc + (d.remaining_amount ?? d.total_amount ?? 0), 0);
  const emergencyCurrent = data.emergencyFund || 0;
  const monthlyCost = totalExpenses > 0 ? totalExpenses : 2000;
  const emergencyTarget = monthlyCost * 6;
  const emergencyCoverageMonths = monthlyCost > 0 ? (emergencyCurrent / monthlyCost).toFixed(1) : "0";

  let score = 50;
  if (savingsRate >= 20) score += 20;
  else if (savingsRate > 5) score += 10;
  else score -= 15;

  if (totalDebt === 0) score += 20;
  else if (totalDebt > totalIncome * 3) score -= 20;
  else score -= 10;

  if (emergencyCurrent >= emergencyTarget * 0.5) score += 15;
  score = Math.min(100, Math.max(10, score));

  const strengths = [];
  const vulnerabilities = [];

  if (totalIncome > totalExpenses) {
    strengths.push(`Fluxo de caixa positivo de R$ ${(totalIncome - totalExpenses).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.`);
  } else {
    vulnerabilities.push("Despesas superando ou empatando com receitas no período.");
  }

  if (savingsRate >= 20) {
    strengths.push(`Excelente taxa de poupança (${savingsRate}% da renda retida).`);
  } else {
    vulnerabilities.push(`Taxa de poupança atual de ${savingsRate}%, recomendável buscar ao menos 20%.`);
  }

  if (totalDebt > 0) {
    vulnerabilities.push(`Existem dívidas ativas somando R$ ${totalDebt.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} gerando pressão de juros.`);
  } else {
    strengths.push("Sem endividamento pesado registrado! Liberdade de capital para investimentos.");
  }

  return {
    score,
    title: score >= 80 ? "Soberania Financeira em Construção" : score >= 60 ? "Estrutura Estável com Oportunidades" : "Atenção: Necessidade de Blindagem de Caixa",
    summary: `Seu diagnóstico aponta uma saúde financeira de nível ${score}/100. Você retém ${savingsRate}% da sua renda e possui ${emergencyCoverageMonths} meses de reserva de sobrevivência garantidos.`,
    strengths: strengths.length ? strengths : ["Registro e acompanhamento financeiro ativo no Nexus"],
    vulnerabilities: vulnerabilities.length ? vulnerabilities : ["Necessidade de diversificar aportes e acelerar reserva de emergência"],
    actionSteps: [
      {
        action: totalDebt > 0 ? "Adotar o Método Bola de Neve para aniquilar as dívidas menores primeiro" : "Automatizar aporte de pelo menos 15% logo no primeiro dia do mês",
        impact: "Alivia a carga psicológica e constrói capital de segurança rapidamente",
        priority: "alta"
      },
      {
        action: "Fazer uma auditoria nos últimos 30 dias de micro-gastos (assinaturas, delivery, impulsos)",
        impact: "Pode recuperar entre R$ 200 a R$ 600 por mês imediatamente",
        priority: "media"
      },
      {
        action: `Direcionar todo excedente para atingir R$ ${emergencyTarget.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} de reserva líquida em renda fixa segura`,
        impact: "Garante tranquilidade inabalável contra imprevistos de vida",
        priority: "alta"
      }
    ],
    emergencyFundAdvice: `Sua reserva cobre aproximadamente ${emergencyCoverageMonths} meses de custo de vida. O padrão ouro de estabilidade para um aventureiro é de 6 meses (R$ ${emergencyTarget.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}).`,
    debtStrategy: totalDebt > 0
      ? "Recomendação tática: Priorize liquidar dívidas com juros mais agressivos ou use o método avalanche para minimizar perdas financeiras."
      : "Parabéns! Mantenha o custo de vida abaixo da renda e canalize o excedente para multiplicação patrimonial."
  };
}

function generateLocalOracleReply(userMessage: string, context?: any): string {
  const msg = userMessage.toLowerCase();
  const userName = context?.displayName || "Aventureiro";
  const archetype = context?.archetype || "Guerreiro";
  const level = context?.level || 1;

  if (msg.includes("desmotivado") || msg.includes("procrastin") || msg.includes("cansado") || msg.includes("preguiça")) {
    return `⚔️ **Oráculo Nexus:** Ouça com atenção, ${userName}.\n\nA motivação é uma visitante inconstante, mas a **disciplina** é sua companheira inabalável. Como um ${archetype} de Nível ${level}, você não precisa de empolgação para agir — você só precisa do **próximo passo de 5 minutos**.\n\n### 🛡️ O que fazer agora mesmo:
1. **Regra dos 5 Minutos:** Escolha a menor missão pendente hoje e prometa a si mesmo fazer apenas 5 minutos com cronômetro. Se quiser parar depois, você tem permissão. Na maioria das vezes, o atrito inicial é a única barreira.
2. **Ambiente Blindado:** Afaste o smartphone e feche abas desnecessárias. O cansaço muitas vezes é apenas sobrecarga sensorial.
3. **Respire e Lembre-se:** Seu "Eu do Futuro" colherá exatamente o que você plantar hoje na Caverna da vida. Erga a guarda e vença o dia de hoje!`;
  }

  if (msg.includes("finan") || msg.includes("dinheiro") || msg.includes("gasto") || msg.includes("invest")) {
    return `💰 **Oráculo Nexus (Conselheiro Financeiro):** Salve, ${userName}!\n\nA riqueza no Nexus não se mede apenas pelo que entra, mas pelo que **permanece sob seu domínio**.\n\n### 🎯 Diretrizes Estratégicas:
- **Pague a Si Mesmo Primeiro:** No momento em que qualquer recurso financeiro entrar, separe a sua cota de investimento antes de pagar qualquer outra despesa.
- **Reserva de Emergência:** Seu escudo sagrado deve cobrir de 3 a 6 meses de despesas básicas em liquidez diária.
- **Ataque às Dívidas:** Juros passivos são como sangramento contínuo de HP. Se houver dívidas caras, use o método avalanche para erradicá-las.`;
  }

  if (msg.includes("treino") || msg.includes("saude") || msg.includes("físico") || msg.includes("exercício")) {
    return `🏋️ **Oráculo Nexus (Mentor Físico):** O corpo é o templo e a arma principal de um ${archetype}!\n\nLembre-se: consistência supera intensidade extrema isolada. 30 minutos de treino bem executados com progressão de carga valem 10x mais do que treinar 2 horas e desistir por duas semanas.\n\nGaranta hidratação, 7 a 8 horas de sono restaurador e atinja sua meta proteica hoje!`;
  }

  if (msg.includes("semana") || msg.includes("plano") || msg.includes("planej") || msg.includes("meta")) {
    return `🧭 **Oráculo Nexus (Estrategista):** Vamos organizar seu campo de batalha, ${userName}.\n\nPara ter uma semana épica:\n1. **A Regra dos 3 Grandes Objetivos:** Defina apenas 3 marcos críticos que farão sua semana ter valido a pena.\n2. **Blocos de Foco Profundo:** Reserve 90 minutos por dia sem nenhuma notificação para trabalhar na sua missão mais desafiadora.\n3. **Revisão Noturna:** Reserve 3 minutos antes de dormir para registrar suas vitórias no Diário do Nexus e carimbar seu streak.\n\nQual é a missão prioritária número 1 da sua lista agora?`;
  }

  return `🔮 **Oráculo Nexus:** Saudações, ${userName} (Nv. ${level} ${archetype}).\n\nEstou sintonizado com sua jornada de evolução pessoal. Como sua Inteligência Artificial companheira, posso te ajudar a:\n- **Quebrar objetivos complexos** em missões táticas diárias com XP.\n- **Auditar suas finanças** e apontar pontos de fuga de capital.\n- **Superar a procrastinação** com mentalidade estoica e foco absoluto.\n- **Ajustar sua rotina de hábitos** para garantir consistência.\n\nQual desafio ou dúvida você quer destravar agora?`;
}

// ----------------- EXTERNAL API CALLERS -----------------

async function callGemini(apiKey: string, model: string, prompt: string, systemInstruction?: string): Promise<string> {
  const modelName = model || "gemini-1.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

  const contents: any[] = [];
  if (systemInstruction) {
    contents.push({ role: "user", parts: [{ text: `[INSTRUÇÃO DO SISTEMA]: ${systemInstruction}\n\n[MENSAGEM]: ${prompt}` }] });
  } else {
    contents.push({ role: "user", parts: [{ text: prompt }] });
  }

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2048,
      },
    }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData?.error?.message || `Erro Gemini API: ${res.statusText}`);
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Resposta vazia da API do Gemini.");
  return text;
}

async function callOpenAICompatible(url: string, apiKey: string, model: string, messages: ChatMessage[]): Promise<string> {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: model || "gpt-4o-mini",
      messages,
      temperature: 0.7,
    }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData?.error?.message || `Erro API: ${res.statusText}`);
  }

  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content;
  if (!text) throw new Error("Resposta vazia da API.");
  return text;
}

// ----------------- PUBLIC API METHODS -----------------

export async function askOracle(messages: ChatMessage[], userContext?: any): Promise<string> {
  const config = getAIConfig();

  const systemPrompt = `Você é o "Oráculo Nexus", o Mentor de Inteligência Artificial e Coach Supremo de Vida do aplicativo "Nexus Life Map" (QuestLife).
O usuário é um jogador da própria vida com arquétipo RPG, XP, níveis, hábitos, treinos e finanças.
Perfil do Usuário:
- Nome: ${userContext?.displayName || "Aventureiro"}
- Nível: ${userContext?.level || 1}
- Arquétipo: ${userContext?.archetype || "Guerreiro"}
- Streak de Dias: ${userContext?.streak || 0} dias consecutivos
- Tarefas Pendentes: ${userContext?.pendingTasksCount ?? "várias"}
- Saldo Financeiro Atual: R$ ${userContext?.balance ?? 0}

Seu tom é motivador, estoico, estratégico, perspicaz e empático (estilo mestre sábio e estrategista de alto desempenho).
Você usa formatação rica em Markdown (tópicos, negrito, emojis elegantes).
Seja prático e direto, sempre terminando com uma chamada clara para a ação. Responda em Português do Brasil.`;

  if (config.provider === "builtin" || !config.apiKey) {
    // Built-in intelligent generative simulation
    const lastUserMsg = messages.filter(m => m.role === "user").pop()?.content || "";
    await new Promise(r => setTimeout(r, 600)); // natural typing delay
    return generateLocalOracleReply(lastUserMsg, userContext);
  }

  try {
    if (config.provider === "gemini") {
      const lastUserMsg = messages[messages.length - 1].content;
      return await callGemini(config.apiKey, config.model || "gemini-1.5-flash", lastUserMsg, systemPrompt);
    } else if (config.provider === "openai") {
      const fullMessages: ChatMessage[] = [
        { role: "system", content: systemPrompt },
        ...messages
      ];
      return await callOpenAICompatible("https://api.openai.com/v1/chat/completions", config.apiKey, config.model || "gpt-4o-mini", fullMessages);
    } else if (config.provider === "groq") {
      const fullMessages: ChatMessage[] = [
        { role: "system", content: systemPrompt },
        ...messages
      ];
      return await callOpenAICompatible("https://api.groq.com/openai/v1/chat/completions", config.apiKey, config.model || "llama-3.3-70b-versatile", fullMessages);
    }
  } catch (err: any) {
    console.warn("External AI call failed, falling back to Nexus Smart Core:", err);
    const lastUserMsg = messages.filter(m => m.role === "user").pop()?.content || "";
    const localReply = generateLocalOracleReply(lastUserMsg, userContext);
    return `*(Nota: Houve uma instabilidade na chave externa de IA, respondendo via Nexus Smart Core)*\n\n${localReply}`;
  }

  return generateLocalOracleReply(messages[messages.length - 1]?.content || "", userContext);
}

export async function generateQuestsFromGoal(goal: string, userContext?: any): Promise<GeneratedQuest[]> {
  const config = getAIConfig();

  if (config.provider === "builtin" || !config.apiKey) {
    await new Promise(r => setTimeout(r, 800));
    return generateLocalMissions(goal, userContext);
  }

  const prompt = `Como um estrategista do Nexus Life Map, divida o seguinte objetivo do usuário em exatamente 3 a 4 missões gamificadas executáveis:
Objetivo: "${goal}"
Arquétipo do Usuário: ${userContext?.archetype || "Guerreiro"}, Nível: ${userContext?.level || 1}.

Retorne ESTRITAMENTE um JSON no seguinte formato (sem markdown codeblocks, apenas o json cru):
[
  {
    "title": "Título épico e claro da missão",
    "description": "Explicação concisa do que fazer e porque é importante",
    "category": "work" | "study" | "health" | "personal" | "spiritual" | "projects",
    "difficulty": "easy" | "medium" | "hard" | "epic",
    "priority": "low" | "medium" | "high" | "urgent",
    "xp_reward": 150,
    "subtasks": ["Passo 1", "Passo 2", "Passo 3"]
  }
]`;

  try {
    let rawText = "";
    if (config.provider === "gemini") {
      rawText = await callGemini(config.apiKey, config.model || "gemini-1.5-flash", prompt);
    } else if (config.provider === "openai" || config.provider === "groq") {
      const url = config.provider === "openai" ? "https://api.openai.com/v1/chat/completions" : "https://api.groq.com/openai/v1/chat/completions";
      const model = config.provider === "openai" ? (config.model || "gpt-4o-mini") : "llama-3.3-70b-versatile";
      rawText = await callOpenAICompatible(url, config.apiKey, model, [{ role: "user", content: prompt }]);
    }

    const cleanJson = rawText.replace(/```json/gi, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(cleanJson);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
  } catch (err) {
    console.warn("AI quests generation failed, falling back to local:", err);
  }

  return generateLocalMissions(goal, userContext);
}

export async function generateFinancialDiagnosis(financeData: any): Promise<FinanceAuditResult> {
  const config = getAIConfig();

  if (config.provider === "builtin" || !config.apiKey) {
    await new Promise(r => setTimeout(r, 700));
    return generateLocalFinancialAudit(financeData);
  }

  const prompt = `Analise os dados financeiros do usuário do Nexus Life Map e forneça um diagnóstico inteligente completo.
Dados Financeiros:
- Saldo em Caixa: R$ ${financeData.balance}
- Receitas Totais: R$ ${financeData.totalIncome}
- Despesas Totais: R$ ${financeData.totalExpenses}
- Reserva de Emergência Atual: R$ ${financeData.emergencyFund}
- Dívidas Ativas: ${JSON.stringify(financeData.debts || [])}

Retorne ESTRITAMENTE um JSON com este formato (sem markdown codeblocks, apenas o json cru):
{
  "score": 75,
  "title": "Título conciso da situação",
  "summary": "Resumo analítico de 2 a 3 frases",
  "strengths": ["Ponto forte 1", "Ponto forte 2"],
  "vulnerabilities": ["Ponto fraco ou fuga de dinheiro 1", "Ponto fraco 2"],
  "actionSteps": [
    { "action": "O que fazer exatamente", "impact": "Qual o benefício real", "priority": "alta" }
  ],
  "emergencyFundAdvice": "Recomendação específica para a reserva de emergência",
  "debtStrategy": "Estratégia para amortização de dívidas ou investimento do excedente"
}`;

  try {
    let rawText = "";
    if (config.provider === "gemini") {
      rawText = await callGemini(config.apiKey, config.model || "gemini-1.5-flash", prompt);
    } else if (config.provider === "openai" || config.provider === "groq") {
      const url = config.provider === "openai" ? "https://api.openai.com/v1/chat/completions" : "https://api.groq.com/openai/v1/chat/completions";
      const model = config.provider === "openai" ? (config.model || "gpt-4o-mini") : "llama-3.3-70b-versatile";
      rawText = await callOpenAICompatible(url, config.apiKey, model, [{ role: "user", content: prompt }]);
    }

    const cleanJson = rawText.replace(/```json/gi, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(cleanJson);
    if (parsed && typeof parsed.score === "number") {
      return parsed;
    }
  } catch (err) {
    console.warn("AI finance diagnosis failed, falling back to local:", err);
  }

  return generateLocalFinancialAudit(financeData);
}

export async function generateCaveWarriorAdvice(dayNumber: number, archetype: string, obstacle?: string): Promise<string> {
  const config = getAIConfig();
  const prompt = `Você é o Guardião da Caverna, o mentor espartano e estoico do Modo Caverna do Nexus Life Map.
O guerreiro (${archetype}) está no Dia ${dayNumber} do desafio de isolamento e foco total.
${obstacle ? `Obstáculo relatado pelo guerreiro: "${obstacle}"` : "O guerreiro precisa da diretriz tática e mental do dia."}

Dê um conselho curto (3 a 4 parágrafos impactantes), extremamente vigoroso, estoico e motivador. Use estilo Marco Aurélio / David Goggins / Sun Tzu. Sem enrolação. Responda em Português do Brasil.`;

  if (config.provider === "builtin" || !config.apiKey) {
    await new Promise(r => setTimeout(r, 600));
    return `🛡️ **Diretriz Tática do Dia ${dayNumber} — Guardião da Caverna:**\n\nNenhum guerreiro forjou honra em mares calmos. Você está no **Dia ${dayNumber}**. O entusiasmo inicial já se dissipou e agora restou apenas a sua verdadeira substância: sua determinação contra seus velhos impulsos.\n\n${obstacle ? `Você mencionou enfrentar: *"${obstacle}"*. Entenda isso não como um impedimento, mas como o combustível exato para sua evolução. O obstáculo É o caminho.` : "Seu cérebro tentará negociar o descanso que você não merece ainda. Não negocie com a sua mediocridade."}\n\nRespire fundo, feche a porta para o mundo exterior e termine o que se propôs a fazer. **A Caverna não perdoa hesitação — ataque o dia!**`;
  }

  try {
    if (config.provider === "gemini") {
      return await callGemini(config.apiKey, config.model || "gemini-1.5-flash", prompt);
    } else if (config.provider === "openai" || config.provider === "groq") {
      const url = config.provider === "openai" ? "https://api.openai.com/v1/chat/completions" : "https://api.groq.com/openai/v1/chat/completions";
      const model = config.provider === "openai" ? (config.model || "gpt-4o-mini") : "llama-3.3-70b-versatile";
      return await callOpenAICompatible(url, config.apiKey, model, [{ role: "user", content: prompt }]);
    }
  } catch (err) {
    console.warn("Cave warrior advice failed:", err);
  }

  return `🛡️ **Diretriz Tática do Dia ${dayNumber} — Guardião da Caverna:**\n\nO cansaço é real, mas sua palavra vale mais que o conforto passageiro. Elimine qualquer distração restante nas próximas 4 horas e cumpra seus protocolos inegociáveis. Você não entrou na Caverna para ser comum.`;
}
