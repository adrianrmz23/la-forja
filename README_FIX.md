# La Forja · Fix lint RepDB

Reemplaza solamente:

- `src/pages/MovementLabPage.tsx`
- `src/services/aiWorkoutService.ts`

Cambios:

1. Se elimina el `setState` síncrono dentro de un `useEffect`. El límite visible de RepDB ahora se reinicia directamente al cambiar búsqueda o filtro.
2. Se elimina la asignación inicial inútil de `repDbEntries`; ahora la carga usa una expresión asíncrona que devuelve el arreglo final.

Prueba:

```bash
npm run lint
npm run build
```
