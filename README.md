# La Forja · Rutina interactiva v3

Esta corrección rediseña la lista de ejercicios generados en `/training`, especialmente para móvil.

## Reemplazar

- `src/pages/TrainingPage.tsx`
- `src/pages/TrainingPage.css`

## Cambios

- Cada ejercicio ahora se presenta como una tarjeta clara.
- Nombre y repeticiones ya no compiten por el mismo espacio.
- Acciones `Ver` y `Cambiar` se muestran en una fila independiente en móvil.
- `Ver` abre una ficha interactiva tipo bottom-sheet con:
  - instrucciones;
  - objetivo/repeticiones;
  - MET;
  - mancuernas opcionales;
  - qué está buscando la cámara;
  - secuencia por fases para ejercicios del Movement Engine;
  - recordatorio de detección permisiva.
- El panel de reemplazo individual se conserva.
- No modifica generación local, AI Coach, RepDB, BattlePage ni detectores.

## Verificación

```bash
npm run lint
npm run build
```

Luego:

```bash
git add .
git commit -m "Mejorar lista interactiva de ejercicios"
git push origin main
```
