export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.status(405).json({ error: "Method not allowed" });
    return;
  }

  const apiKey = process.env.CHEAPER_INFERENCE_API_KEY;
  const baseURL = (process.env.CHEAPER_INFERENCE_BASE_URL || "https://api.cheaperinference.com/v1").replace(/\/$/, "");
  const model = process.env.CHEAPER_INFERENCE_MODEL || "gpt-5.6-luna";

  if (!apiKey) {
    response.status(503).json({ error: "AI Coach no está configurado todavía." });
    return;
  }

  const { preferences, exercises } = request.body || {};
  if (!preferences || !Array.isArray(exercises) || exercises.length < 3) {
    response.status(400).json({ error: "Datos insuficientes para generar la rutina." });
    return;
  }

  const safeExercises = exercises
    .filter((item) => item && typeof item.key === "string" && typeof item.name === "string")
    .slice(0, 80);

  const schemaPrompt = `Devuelve SOLO JSON válido con esta forma exacta:\n{\n  "name": "string",\n  "description": "string",\n  "rationale": "string breve",\n  "blocks": [{"id":"string","name":"string","rounds":1,"exerciseKeys":["key"]}]\n}\nReglas: 4-5 bloques, calentamiento primero, cuerpo completo salvo que el enfoque pida otra cosa, no inventes keys, no incluyas boxeo, prioriza reliability alta, usa movimientos compuestos sin exigir técnica perfecta, respeta mancuernas e impacto, y diseña el volumen pensando en ${preferences.targetMinutes} minutos. Las repeticiones y ajuste fino los calcula La Forja localmente.`;

  try {
    const upstream = await fetch(`${baseURL}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "X-CI-Concise": "1",
      },
      body: JSON.stringify({
        model,
        temperature: 0.35,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: "Eres el entrenador de La Forja. Planificas rutinas seguras y detectables con cámara usando exclusivamente el catálogo permitido. No diagnosticas ni sustituyes consejo médico.",
          },
          {
            role: "user",
            content: `${schemaPrompt}\n\nPreferencias:\n${JSON.stringify(preferences)}\n\nCatálogo permitido:\n${JSON.stringify(safeExercises)}`,
          },
        ],
      }),
    });

    const data = await upstream.json();
    if (!upstream.ok) {
      response.status(502).json({ error: data?.error?.message || "CheaperInference rechazó la solicitud." });
      return;
    }

    const text = data?.choices?.[0]?.message?.content;
    if (typeof text !== "string") {
      response.status(502).json({ error: "La IA no devolvió contenido utilizable." });
      return;
    }

    const blueprint = JSON.parse(text);
    if (!Array.isArray(blueprint.blocks) || blueprint.blocks.length < 3) {
      response.status(502).json({ error: "La rutina de IA no pasó la validación." });
      return;
    }

    const allowedKeys = new Set(safeExercises.map((item) => item.key));
    blueprint.blocks = blueprint.blocks.slice(0, 6).map((block, index) => ({
      id: typeof block.id === "string" ? block.id : `ai-block-${index + 1}`,
      name: typeof block.name === "string" ? block.name : `Bloque ${index + 1}`,
      rounds: Math.max(1, Math.min(4, Math.round(Number(block.rounds) || 1))),
      exerciseKeys: Array.isArray(block.exerciseKeys)
        ? block.exerciseKeys.filter((key) => allowedKeys.has(key)).slice(0, 6)
        : [],
    })).filter((block) => block.exerciseKeys.length > 0);

    if (blueprint.blocks.length < 3) {
      response.status(502).json({ error: "La IA eligió ejercicios no permitidos." });
      return;
    }

    response.status(200).json({ blueprint });
  } catch (error) {
    response.status(500).json({ error: error instanceof Error ? error.message : "No fue posible ejecutar AI Coach." });
  }
}
