const ALLOWED = new Set([
  "standing",
  "squat_down",
  "lunge_down",
  "knee_lift",
  "step_wide",
  "elbows_flexed",
  "arms_overhead",
  "arms_lateral",
  "arms_down",
]);

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

  const body = request.body || {};
  const allowedPrimitives = Array.isArray(body.allowedPrimitives)
    ? body.allowedPrimitives.filter((item) => ALLOWED.has(item))
    : [...ALLOWED];

  const instructions = `Propón UN ejercicio compuesto de pie, amigable para cámara frontal y no demasiado exigente. Usa solo estas primitivas: ${allowedPrimitives.join(", ")}. Debe comenzar y terminar en standing o arms_down para evitar doble conteo. Evita saltos si preferredImpact es low. Devuelve SOLO JSON: {"id":"slug","name":"Nombre español","description":"instrucción breve","sequence":["primitive"],"equipment":"none|optional-dumbbells","met":6.2,"estimatedSecondsPerRep":3.8,"minimumHoldFrames":2}. No inventes primitivas.`;

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
        temperature: 0.65,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: "Diseñas movimientos simples para un laboratorio de pose estimation. Priorizas detectabilidad y tolerancia, no perfección biomecánica." },
          { role: "user", content: `${instructions}\nContexto: ${JSON.stringify({ hasDumbbells: body.hasDumbbells, preferredImpact: body.preferredImpact, avoidNames: body.avoidNames || [] })}` },
        ],
      }),
    });

    const data = await upstream.json();
    if (!upstream.ok) {
      response.status(502).json({ error: data?.error?.message || "CheaperInference rechazó la propuesta." });
      return;
    }

    const text = data?.choices?.[0]?.message?.content;
    const recipe = JSON.parse(text || "{}");
    if (!Array.isArray(recipe.sequence) || recipe.sequence.some((item) => !ALLOWED.has(item))) {
      response.status(502).json({ error: "La propuesta usó primitivas no permitidas." });
      return;
    }

    recipe.id = `ai-${String(recipe.id || "movement").replace(/[^a-z0-9-]/gi, "-").toLowerCase()}-${Date.now().toString(36)}`;
    recipe.met = Math.max(3, Math.min(9, Number(recipe.met) || 6));
    recipe.estimatedSecondsPerRep = Math.max(2, Math.min(7, Number(recipe.estimatedSecondsPerRep) || 4));
    recipe.minimumHoldFrames = 2;
    recipe.equipment = recipe.equipment === "none" ? "none" : "optional-dumbbells";
    response.status(200).json({ recipe });
  } catch (error) {
    response.status(500).json({ error: error instanceof Error ? error.message : "No fue posible crear el movimiento." });
  }
}
