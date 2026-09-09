# La Forja — RepDB completo + AI Coach con variantes

Esta actualización corrige dos cosas detectadas en producción:

1. El laboratorio mostraba `muestra local`, lo que significaba que la carga remota de RepDB había fallado y la app estaba usando únicamente el fallback de 5 ejercicios.
2. AI Coach recibía únicamente `exerciseCatalog` + recetas IA aprobadas; los ejercicios de RepDB no entraban realmente al catálogo permitido de la IA.

## Reemplazar

- `src/types/exerciseIntelligence.ts`
- `src/intelligence/exerciseCompatibility.ts`
- `src/services/repdbService.ts`
- `src/services/aiWorkoutService.ts`
- `src/pages/MovementLabPage.tsx`
- `src/pages/MovementLabPage.css`
- `api/ai/workout.js`

## Qué cambia

### Biblioteca RepDB
- La app carga directamente el JSON oficial recomendado por RepDB: `https://exercise-dataset.com/exercises.json`.
- Debería mostrar `601 ejercicios cargados` cuando la fuente remota funcione.
- Buscador por nombre, zona corporal, equipo y categoría.
- Filtros: todos, detectables, compatibles, necesitan prueba, experimentales y no compatibles.
- Se muestran 40 registros inicialmente y se pueden cargar 40 más hasta recorrer todo el catálogo.

### AI Coach
- RepDB ahora participa realmente en el catálogo permitido de AI Coach.
- Solo se envían variantes que La Forja puede asociar a un detector existente y que son compatibles con cámara/equipo.
- Se incluyen heurísticas para familias como sentadillas, zancadas, curls, press, elevaciones, gemelos, rodillas altas y jumping jacks.
- CheaperInference recibe espacio explícito para variantes RepDB y se le pide utilizar aproximadamente 30–50% de ellas cuando sean adecuadas.
- El modelo por defecto sigue siendo `gpt-5.6-luna`.

## Importante

No significa que los 601 ejercicios ya sean detectables. Los 601 son visibles y clasificables, pero AI Coach solo puede usar automáticamente los que tienen un detector compatible. Los demás quedan como candidatos para ampliar el Movement Engine/Laboratorio.

## Prueba recomendada

1. Despliega.
2. Abre `/movement-lab`.
3. Confirma que diga `601 ejercicios cargados`, no `muestra local de respaldo`.
4. Busca `curl`, `sentadilla`, `press` y `zancada`.
5. En `/training`, genera varias rutinas con `AI Coach`.
6. El mensaje de AI Coach indicará cuando haya utilizado selecciones RepDB compatibles.

## Verificación

```bash
npm run lint
npm run build
```
