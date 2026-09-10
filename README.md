# La Forja — fix lint RepDB visual v6.1

Corrige `react-hooks/set-state-in-effect` en `TrainingPage.tsx`.

## Cambio
Se eliminó el efecto que hacía `setFrameIndex(0)` y `setPaused(false)` sincrónicamente. El componente `RepDbMotionPreview` ahora recibe `key={exercisePreview.exercise.id}`, por lo que React reinicia su estado automáticamente al abrir otro ejercicio, sin necesitar ese efecto.

## Reemplazar
- `src/pages/TrainingPage.tsx`

`TrainingPage.css` no necesita cambios respecto a v6.
