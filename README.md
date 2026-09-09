# La Forja · Popup animado v4

Reemplaza únicamente:

- `src/pages/TrainingPage.tsx`
- `src/pages/TrainingPage.css`

## Qué cambia

- El popup **Ver** ahora incluye una animación orientativa del ejercicio.
- Las animaciones se adaptan al detector: marcha, sentadilla, desplante, jacks, curl, press, elevaciones y compuestos.
- Las recetas del Movement Engine intentan combinar sus primitivas para mostrar el movimiento compuesto correspondiente.
- Botón reproducir/pausar.
- Selector velocidad normal/lenta.
- Etiqueta del origen técnico del ejercicio: detector nativo, Movement Engine, RepDB o movimiento creado por IA.
- La animación es visual/orientativa y no modifica los umbrales de MediaPipe.

## Verificación

```bash
npm run lint
npm run build
```
