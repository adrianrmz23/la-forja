# Balance acumulado y rangos

La sección **Mi progreso** ahora incluye un bloque de balance energético acumulado con tres vistas:

- **Semana**: desde el lunes de la semana actual hasta hoy.
- **Desde inicio**: desde el primer día con datos de Operación Forja/NutriVision/actividad externa.
- **Personalizado**: permite elegir fechas de inicio y fin.

## Qué suma

Por cada día con información registrada se calcula:

- calorías consumidas por NutriVision;
- metabolismo base estimado;
- gasto por pasos;
- gasto de la rutina programada marcada como completada;
- calorías activas registradas desde el reloj;
- calorías de Campaña y Entrenamiento libre.

El balance usa la convención:

`balance = calorías consumidas - calorías gastadas`

Por lo tanto:

- un número negativo representa déficit estimado;
- un número positivo representa superávit estimado.

## Equivalencia en peso

La app muestra una equivalencia teórica usando aproximadamente **7,700 kcal por kg**. Es únicamente una referencia energética y no una predicción exacta del peso en báscula, ya que agua, glucógeno, sodio, digestión y adaptación metabólica pueden producir diferencias importantes.

## Cobertura

Se muestran dos indicadores para ayudar a interpretar el resultado:

- cobertura de actividad/datos del rango;
- porcentaje de días con alimentos registrados.

Si faltan comidas por registrar, el déficit puede aparecer artificialmente mayor.

## Historial

Se retiraron los límites cortos que recortaban el historial de comidas, actividades externas y entrenamientos libres. De esta forma los rangos "Desde inicio" pueden utilizar el historial completo guardado y sincronizado con Supabase.
