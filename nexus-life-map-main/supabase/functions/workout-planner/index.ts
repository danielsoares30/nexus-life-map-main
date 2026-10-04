// AI Workout Planner - uses Lovable AI Gateway to suggest weekly workout plans
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "Missing LOVABLE_API_KEY" }), {
        status: 500,
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const {
      goal = "hipertrofia",
      experience = "intermediario",
      daysPerWeek = 4,
      durationMinutes = 60,
      archetype = "warrior",
      preferences = "",
    } = body;

    const systemPrompt = `Você é um personal trainer RPG, treinador especialista em fitness gamificado.
Gere um plano semanal de treino em JSON estrito (sem markdown, sem texto extra). Responda APENAS o JSON.

Formato exigido:
{
  "summary": "string curta motivacional (max 200 chars)",
  "plan": [
    {
      "dayOfWeek": 1, // 0=Dom, 1=Seg ... 6=Sab
      "name": "string",
      "muscle_group": "chest|back|shoulders|arms|legs|core|cardio|full_body",
      "estimated_duration": number_in_minutes,
      "exercises": [{"name":"string","sets":number,"reps":number,"weight":number}]
    }
  ],
  "tips": ["dica 1", "dica 2", "dica 3"]
}`;

    const userPrompt = `Crie um plano de ${daysPerWeek} treinos por semana.
Objetivo: ${goal}
Experiência: ${experience}
Duração desejada: ${durationMinutes} minutos por sessão
Arquétipo RPG: ${archetype}
Preferências: ${preferences || "nenhuma"}

Distribua os treinos ao longo da semana com descanso adequado. Use exercícios reais e populares.`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!aiResp.ok) {
      const txt = await aiResp.text();
      console.error("AI error:", aiResp.status, txt);
      if (aiResp.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de uso da IA atingido. Tente novamente em alguns minutos." }), {
          status: 429, headers: { ...CORS, "Content-Type": "application/json" },
        });
      }
      if (aiResp.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA esgotados. Adicione créditos para continuar." }), {
          status: 402, headers: { ...CORS, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "Falha ao gerar plano de treino" }), {
        status: 500, headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    const data = await aiResp.json();
    const content = data?.choices?.[0]?.message?.content || "{}";
    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch {
      const m = content.match(/\{[\s\S]*\}/);
      parsed = m ? JSON.parse(m[0]) : { summary: "", plan: [], tips: [] };
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("workout-planner error:", err);
    return new Response(JSON.stringify({ error: err.message || "erro interno" }), {
      status: 500,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
});
