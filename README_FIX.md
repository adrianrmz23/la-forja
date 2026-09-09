# Fix build TS2554

Reemplaza:
- `src/pages/BattlePage.tsx`

Motivo:
`resolveCalorieGoal` ya no recibe argumentos desde que se eliminó la sobrecarga automática por calorías, pero `BattlePage.tsx` todavía enviaba `estimatedCalories >= calorieGoal`.

Cambio aplicado:
```ts
resolveCalorieGoal();
```

Prueba después:
```bash
npm run lint
npm run build
```
