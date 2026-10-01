# Actividad externa medida por reloj

La Forja ahora permite registrar entrenamientos realizados fuera de la rutina programada usando las métricas de un reloj o pulsera.

## Datos que se guardan

- Tipo de actividad.
- Duración.
- Calorías activas reportadas por el reloj.
- Distancia opcional.
- Frecuencia cardiaca promedio opcional.
- Si la actividad cubre el objetivo de cardio del día.
- Fecha, hora de registro y fuente (`watch_manual`).

> Usa **calorías activas** del entrenamiento, no las calorías totales del día. Las calorías totales suelen incluir gasto basal y se duplicarían con el balance estimado de La Forja.

## Cómo afecta a Operación Forja

- Las calorías activas se suman al gasto energético del día.
- No se marca falsamente una rutina de fuerza como completada.
- Si el usuario activa **“Esta actividad cubre mi cardio de hoy”**, el cumplimiento cardiovascular del día se considera satisfecho sin fingir que se corrieron 5 km o se hizo cuerda.
- La actividad aparece en calendario, progreso semanal y `Mi progreso`.

## Sincronización

Las actividades forman parte del dominio `operation` existente y se sincronizan con Supabase como JSONB junto con logs y comidas. No requiere una migración SQL adicional.
