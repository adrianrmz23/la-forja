const NUTRITION5K_INGREDIENTS =
  "https://storage.googleapis.com/nutrition5k_dataset/nutrition5k_dataset/metadata/ingredient_metadata.csv";

let nutritionCache = null;
let nutritionCacheAt = 0;

function normalize(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\b(cooked|raw|fresh|with|and|the|a|an|style)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function csvLine(line) {
  const cells = [];
  let current = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"' && quoted && next === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      cells.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  cells.push(current);
  return cells;
}

function findColumn(headers, candidates) {
  return headers.findIndex((header) =>
    candidates.some((candidate) => header === candidate || header.includes(candidate)),
  );
}

async function loadNutrition5k() {
  const now = Date.now();
  if (nutritionCache && now - nutritionCacheAt < 6 * 60 * 60 * 1000) {
    return nutritionCache;
  }

  try {
    const response = await fetch(NUTRITION5K_INGREDIENTS);
    if (!response.ok) throw new Error(`Nutrition5k ${response.status}`);
    const csv = await response.text();
    const lines = csv.split(/\r?\n/).filter(Boolean);
    if (lines.length < 2) return [];

    const headers = csvLine(lines[0]).map((value) => normalize(value).replace(/ /g, "_"));
    const nameIndex = findColumn(headers, ["ingredient_name", "ingr_name", "name"]);
    const caloriesIndex = findColumn(headers, ["calories_per_gram", "calorie_per_gram", "calories"]);
    const fatIndex = findColumn(headers, ["fat_per_gram", "fat"]);
    const carbIndex = findColumn(headers, ["carb_per_gram", "carbohydrate_per_gram", "carb"]);
    const proteinIndex = findColumn(headers, ["protein_per_gram", "protein"]);

    if (nameIndex < 0 || caloriesIndex < 0) return [];

    const entries = lines
      .slice(1)
      .map((line) => {
        const cells = csvLine(line);
        return {
          name: cells[nameIndex] || "",
          normalized: normalize(cells[nameIndex]),
          caloriesPerGram: Number(cells[caloriesIndex]) || 0,
          fatPerGram: fatIndex >= 0 ? Number(cells[fatIndex]) || 0 : 0,
          carbPerGram: carbIndex >= 0 ? Number(cells[carbIndex]) || 0 : 0,
          proteinPerGram: proteinIndex >= 0 ? Number(cells[proteinIndex]) || 0 : 0,
        };
      })
      .filter((entry) => entry.name && entry.caloriesPerGram >= 0);

    nutritionCache = entries;
    nutritionCacheAt = now;
    return entries;
  } catch {
    return [];
  }
}

function similarity(query, candidate) {
  const first = normalize(query);
  const second = normalize(candidate);
  if (!first || !second) return 0;
  if (first === second) return 1;
  if (first.includes(second) || second.includes(first)) return 0.86;

  const a = new Set(first.split(" ").filter((token) => token.length > 2));
  const b = new Set(second.split(" ").filter((token) => token.length > 2));
  if (!a.size || !b.size) return 0;
  const overlap = [...a].filter((token) => b.has(token)).length;
  return overlap / Math.max(a.size, b.size);
}

function findNutritionMatch(query, entries) {
  let best = null;
  let bestScore = 0;

  for (const entry of entries) {
    const score = similarity(query, entry.normalized);
    if (score > bestScore) {
      bestScore = score;
      best = entry;
    }
  }

  return bestScore >= 0.48 ? best : null;
}

function safeNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, number) : fallback;
}

function extractJson(content) {
  if (typeof content !== "string") return content;
  try {
    return JSON.parse(content);
  } catch {
    const first = content.indexOf("{");
    const last = content.lastIndexOf("}");
    if (first >= 0 && last > first) return JSON.parse(content.slice(first, last + 1));
    throw new Error("La respuesta de IA no llegó en JSON válido.");
  }
}

async function callModel({ baseUrl, apiKey, model, imageDataUrl, description, mealType, useJsonMode }) {
  const isText = typeof description === "string" && description.trim();
  const sharedInstruction =
    'Devuelve únicamente JSON con esta forma: {mealName:string, items:[{name:string,datasetQuery:string,estimatedGrams:number,caloriesPer100g:number,proteinPer100g:number,carbsPer100g:number,fatPer100g:number,confidence:"low"|"medium"|"high"}], notes:string[]}. Los nombres datasetQuery deben estar en inglés simple para compararlos con Nutrition5k/USDA.';

  const userContent = isText
    ? `Tipo de comida: ${mealType}. La persona escribió: "${description.trim()}". Interpreta esa descripción tal cual, separa los alimentos y estima porciones razonables. Si faltan cantidades, usa una porción típica y baja la confianza; no inventes alimentos que no estén mencionados. ${sharedInstruction}`
    : [
        {
          type: "text",
          text: `Tipo de comida: ${mealType}. Analiza la imagen y estima alimentos y porciones. Incluye aceites/salsas solo cuando sean visualmente probables y márcalos con confianza baja. No finjas precisión: una foto no revela aceite, receta ni peso exacto. ${sharedInstruction}`,
        },
        {
          type: "image_url",
          image_url: { url: imageDataUrl },
        },
      ];

  const body = {
    model,
    temperature: 0.1,
    max_tokens: 1600,
    messages: [
      {
        role: "system",
        content:
          "Eres NutriVision, un analizador nutricional dentro de una app fitness. Entiendes descripciones en español y fotografías de comida. Estima de forma conservadora y expresa incertidumbre cuando falten cantidades, receta o peso exacto.",
      },
      { role: "user", content: userContent },
    ],
  };

  if (useJsonMode) body.response_format = { type: "json_object" };

  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`CheaperInference ${response.status}: ${message.slice(0, 220)}`);
  }

  const payload = await response.json();
  return extractJson(payload?.choices?.[0]?.message?.content);
}

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({ error: "Método no permitido." });
  }

  const apiKey = process.env.CHEAPER_INFERENCE_API_KEY;
  const baseUrl = process.env.CHEAPER_INFERENCE_BASE_URL || "https://api.cheaperinference.com/v1";
  const imageDataUrl = request.body?.imageDataUrl;
  const description = typeof request.body?.description === "string" ? request.body.description.trim() : "";
  const mealType = request.body?.mealType || "meal";
  const requestedMode = request.body?.mode;
  const isText = requestedMode === "text" || (!imageDataUrl && Boolean(description));
  const model = isText
    ? process.env.CHEAPER_INFERENCE_MODEL || "gpt-5.6-luna"
    : process.env.CHEAPER_INFERENCE_VISION_MODEL || process.env.CHEAPER_INFERENCE_MODEL || "gpt-5.6-luna";

  if (!apiKey) {
    return response.status(500).json({ error: "Falta CHEAPER_INFERENCE_API_KEY en Vercel." });
  }

  if (isText) {
    if (description.length < 3) {
      return response.status(400).json({ error: "Describe lo que consumiste con un poco más de detalle." });
    }
    if (description.length > 2200) {
      return response.status(413).json({ error: "La descripción es demasiado larga. Resúmela a menos de 2200 caracteres." });
    }
  } else {
    if (typeof imageDataUrl !== "string" || !imageDataUrl.startsWith("data:image/")) {
      return response.status(400).json({ error: "La imagen no es válida." });
    }
    if (imageDataUrl.length > 4_200_000) {
      return response.status(413).json({ error: "La foto es demasiado grande. Usa una imagen más pequeña." });
    }
  }

  try {
    let analysis;
    try {
      analysis = await callModel({
        baseUrl,
        apiKey,
        model,
        imageDataUrl,
        description,
        mealType,
        useJsonMode: true,
      });
    } catch {
      // Algunos modelos/proveedores no aceptan response_format.
      analysis = await callModel({
        baseUrl,
        apiKey,
        model,
        imageDataUrl,
        description,
        mealType,
        useJsonMode: false,
      });
    }

    const dataset = await loadNutrition5k();
    const rawItems = Array.isArray(analysis?.items) ? analysis.items.slice(0, 12) : [];

    if (!rawItems.length) {
      return response.status(422).json({
        error: isText
          ? "No pude separar alimentos de esa descripción. Prueba indicando cantidades o porciones."
          : "No pude identificar alimentos con suficiente claridad.",
      });
    }

    let datasetMatchedItems = 0;
    const items = rawItems.map((item, index) => {
      const grams = Math.min(1000, Math.max(1, safeNumber(item.estimatedGrams, 100)));
      const query = item.datasetQuery || item.name;
      const match = findNutritionMatch(query, dataset);

      let calories;
      let protein;
      let carbs;
      let fat;
      let nutritionSource = isText ? "text-estimate" : "vision-estimate";

      if (match) {
        datasetMatchedItems += 1;
        calories = match.caloriesPerGram * grams;
        protein = match.proteinPerGram * grams;
        carbs = match.carbPerGram * grams;
        fat = match.fatPerGram * grams;
        nutritionSource = "nutrition5k";
      } else {
        calories = (safeNumber(item.caloriesPer100g, 120) * grams) / 100;
        protein = (safeNumber(item.proteinPer100g) * grams) / 100;
        carbs = (safeNumber(item.carbsPer100g) * grams) / 100;
        fat = (safeNumber(item.fatPer100g) * grams) / 100;
      }

      return {
        id: `food-${Date.now()}-${index}`,
        name: String(item.name || query || `Alimento ${index + 1}`),
        estimatedGrams: Math.round(grams),
        calories: Math.round(calories),
        protein: Math.round(protein * 10) / 10,
        carbs: Math.round(carbs * 10) / 10,
        fat: Math.round(fat * 10) / 10,
        confidence:
          item.confidence === "high" || item.confidence === "low" ? item.confidence : "medium",
        nutritionSource,
        matchedIngredient: match?.name,
      };
    });

    const totalCalories = items.reduce((sum, item) => sum + item.calories, 0);
    const totalProtein = items.reduce((sum, item) => sum + item.protein, 0);
    const totalCarbs = items.reduce((sum, item) => sum + item.carbs, 0);
    const totalFat = items.reduce((sum, item) => sum + item.fat, 0);

    const lowConfidence = items.some((item) => item.confidence === "low");
    const uncertainty = lowConfidence ? 0.28 : isText ? 0.23 : 0.2;
    const sourceFallback = isText
      ? "Sin coincidencia Nutrition5k suficiente; se usó la estimación del modelo a partir de tu descripción."
      : "Sin coincidencia Nutrition5k suficiente; se usó la estimación visual del modelo.";

    response.setHeader("Cache-Control", "no-store");
    return response.status(200).json({
      mealName: String(analysis?.mealName || "Comida analizada"),
      items,
      totalCalories: Math.round(totalCalories),
      calorieRangeLow: Math.max(0, Math.round(totalCalories * (1 - uncertainty))),
      calorieRangeHigh: Math.round(totalCalories * (1 + uncertainty)),
      totalProtein: Math.round(totalProtein * 10) / 10,
      totalCarbs: Math.round(totalCarbs * 10) / 10,
      totalFat: Math.round(totalFat * 10) / 10,
      datasetMatchedItems,
      notes: [
        ...(Array.isArray(analysis?.notes) ? analysis.notes.slice(0, 3) : []),
        datasetMatchedItems
          ? `${datasetMatchedItems} alimento(s) calibrados con metadatos Nutrition5k/USDA.`
          : sourceFallback,
        isText
          ? "Si no indicaste cantidad, la IA usó una porción típica. Puedes ajustar la porción antes de tomar el dato como referencia."
          : "La porción y los ingredientes ocultos pueden mover mucho el resultado; usa el rango, no una cifra exacta.",
      ],
    });
  } catch (error) {
    return response.status(500).json({
      error: error instanceof Error ? error.message : "No fue posible analizar la comida.",
    });
  }
}
