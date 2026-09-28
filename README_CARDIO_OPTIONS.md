# Cardio flexible — 5 km o cuerda

Actualización de Operación Forja:

- Los días que antes pedían carrera de 5 km ahora permiten elegir entre **correr 5 km** o **saltar cuerda**.
- La cuerda usa una meta base de aproximadamente **25 minutos activos** (ajustada ligeramente por la semana del ciclo).
- La tarjeta de cuerda muestra referencias: suave 30–35 min, moderada ~25 min, intensa 20–25 min.
- Solo una opción cuenta para completar el cardio del día; al elegir una se desmarca automáticamente la otra.
- El cálculo energético usa la opción realmente completada.
- El progreso semanal separa kilómetros corridos y minutos de cuerda.
- Los días de circuito, caminata y recuperación conservan su cardio original.

Archivos principales modificados:

- `src/types/operationForja.ts`
- `src/data/operationForjaPlan.ts`
- `src/stores/operationForjaStore.ts`
- `src/utils/energyEstimate.ts`
- `src/pages/OperationForjaPage.tsx`
- `src/pages/OperationForjaPage.css`
