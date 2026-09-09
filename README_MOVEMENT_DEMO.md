# La Forja · Movement Demo Engine

Esta actualización añade demostraciones animadas de movimientos sin cambiar la sensibilidad de los detectores.

## Incluye

- `Ver movimiento` en cada ejercicio de Entrenamiento libre.
- Modal con animación, instrucciones paso a paso, pausa, repetición y velocidad 0.5x / 1x.
- Demostración completa en Movement Lab antes de realizar las 5 repeticiones de prueba.
- Botón `Ver` en la biblioteca RepDB.
- Inferencia visual por familia para movimientos RepDB reconocibles (sentadilla, desplante, curl, press, elevaciones, etc.).
- Demostración automática del siguiente ejercicio durante los descansos de BattlePage.
- Animaciones generadas con SVG; no dependen de imágenes externas.
- Las recetas creadas por AI Coach pueden animarse a partir de sus primitivas del Movement Engine.

## Archivos nuevos

- `src/components/MovementDemo.tsx`
- `src/components/MovementDemo.css`
- `src/utils/movementDemo.ts`

## Archivos reemplazados

- `src/pages/TrainingPage.tsx`
- `src/pages/TrainingPage.css`
- `src/pages/MovementLabPage.tsx`
- `src/pages/MovementLabPage.css`
- `src/pages/BattlePage.tsx`
- `src/index.css`

## Instalación

Extrae el ZIP en la raíz del proyecto y permite reemplazar los archivos existentes.

Después ejecuta:

```bash
npm run lint
npm run build
```

Si ambos pasan:

```bash
git add .
git commit -m "Agregar demostraciones animadas de ejercicios"
git push origin main
```

## Nota de funcionamiento

La animación enseña una forma recomendada del movimiento. No cambia los umbrales de MediaPipe ni hace más estricto el conteo. La cámara continúa validando rangos tolerantes.

Los ejercicios RepDB sin una familia visual reconocible muestran una guía genérica hasta que exista una receta/detector específico. No se utilizan las imágenes de RepDB para generar estas animaciones.
