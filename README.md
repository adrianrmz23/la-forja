# La Forja — Operación Forja 365 + NutriVision

Nueva sección independiente de Campaña, Entrenamiento libre y Movement Lab.

## Incluye

1. **Operación Forja 365**
   - Ruta: `/operation-forja`
   - Semana fija: torso / pierna / recuperación / torso / pierna / full body / recuperación.
   - Fase especial **Traje · 17 OCT** desde el 28/09/2026 hasta el 17/10/2026.
   - Después continúa automáticamente con ciclos de 4 semanas: base, volumen, semana fuerte y descarga.
   - Mancuernas + peso corporal + ligas.
   - No usa cámara ni detector para completar ejercicios.

2. **Registro sin peso**
   - Pasos diarios.
   - Checklist de alimentación.
   - Entrenamientos completados.
   - Calendario mensual.
   - Ajuste del traje: Muy apretado → Cómodo.
   - Insights semanales basados en adherencia, pasos y hábitos.
   - No hay gráfica ni registro de peso corporal.

3. **RepDB dentro del plan**
   - Botón `Ver` en cada ejercicio.
   - Consulta `/api/repdb` ya existente.
   - Usa las imágenes reales `image_flat_start`, `image_flat_peak` e `image_flat_main` de RepDB cuando existen.
   - No depende del detector de cámara.

4. **NutriVision**
   - Foto desde cámara/galería.
   - La imagen se comprime en el navegador antes de subirla.
   - `/api/ai/meal.js` usa CheaperInference con un modelo multimodal.
   - Identifica alimentos y estima porciones.
   - Intenta calibrar cada alimento contra `Nutrition5k metadata/ingredient_metadata.csv`, cuyos valores nutricionales proceden de USDA.
   - Si no hay coincidencia suficiente o el dataset no responde, usa la estimación visual como fallback.
   - Guarda calorías como un **rango**, además de macros.
   - Permite corregir la porción: menor / estimada / mayor / mucho mayor.
   - Las fotos NO se guardan en localStorage; solo se guarda el resultado nutricional.

5. **Balance energético aproximado**
   - Ingesta estimada a partir de las comidas registradas.
   - Gasto base aproximado interno usando datos existentes del perfil.
   - Pasos + entrenamiento marcado.
   - El peso del perfil se usa solamente para cálculos y no se muestra como métrica de progreso.
   - Muestra rango de incertidumbre para evitar falsa precisión.

## Archivos nuevos

- `src/pages/OperationForjaPage.tsx`
- `src/pages/OperationForjaPage.css`
- `src/stores/operationForjaStore.ts`
- `src/data/operationForjaPlan.ts`
- `src/types/operationForja.ts`
- `src/services/mealVisionService.ts`
- `src/utils/energyEstimate.ts`
- `src/utils/operationInsights.ts`
- `src/utils/imageCompression.ts`
- `src/components/RepDbExerciseGuide.tsx`
- `src/components/RepDbExerciseGuide.css`
- `api/ai/meal.js`

## Archivos a reemplazar

- `src/App.tsx`
- `src/pages/HomePage.tsx`

Los reemplazos conservan las rutas existentes y añaden `/operation-forja` + un acceso desde Home.

## Variables de Vercel

Ya debes tener las tres primeras por AI Coach. Añade la cuarta:

```env
CHEAPER_INFERENCE_API_KEY=TU_KEY
CHEAPER_INFERENCE_BASE_URL=https://api.cheaperinference.com/v1
CHEAPER_INFERENCE_MODEL=gpt-5.6-luna
CHEAPER_INFERENCE_VISION_MODEL=gpt-5.6-luna
```

La API key sigue siendo server-side. **No uses `VITE_` para la key.**

Si el modelo elegido no admite imágenes en el catálogo de CheaperInference, configura `CHEAPER_INFERENCE_VISION_MODEL` con un modelo que tenga capacidad `vision`.

## Pruebas

```bash
npm run lint
npm run build
```

Después:

```bash
git add .
git commit -m "Agregar Operacion Forja 365 y NutriVision"
git push origin main
```

## Nota sobre precisión

NutriVision y el balance energético son estimaciones. Una sola foto no revela con precisión el peso de la comida, aceite, aderezos o ingredientes ocultos. La interfaz usa rangos y está diseñada para observar tendencias, no para presentar un número exacto como si fuera una medición clínica.
