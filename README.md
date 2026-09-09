# La Forja — RepDB visual v5

## Qué cambia
- El popup **Ver** dentro de la rutina ahora intenta usar la referencia visual real de **RepDB**.
- Si RepDB tiene imágenes `image_flat_start`, `image_flat_peak` o `image_flat_main`, el popup muestra una **secuencia visual automática** (Inicio ↔ Pico/Referencia).
- Si el ejercicio no tiene referencia visual compatible en RepDB, la app conserva la animación local SVG como respaldo.
- Mantiene los botones para ver/cambiar ejercicio y no toca `BattlePage.tsx`.

## Archivos a reemplazar
- `src/pages/TrainingPage.tsx`
- `src/pages/TrainingPage.css`

## Notas
- RepDB no trae GIFs; la app alterna automáticamente las imágenes reales de inicio y pico para dar sensación de animación.
- Esto es compatible con AI Coach: que una rutina sea generada por IA **no significa** que todos los ejercicios deban ser nuevos. AI Coach sigue usando muchos ejercicios locales porque son los más fiables y detectables. Conforme apruebes más ejercicios en Movement Lab, entrará más variedad.
