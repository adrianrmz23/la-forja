import type {
  WorkoutRoutine,
} from "../types/routine.ts";

export const ashAssaultRoutine: WorkoutRoutine = {
  id: "ash-assault",

  name: "Asalto de las Cenizas",

  description:
    "Rutina de cuerpo completo con fuerza, cardio y shadowboxing. Cada ejercicio avanza únicamente mediante movimientos válidos detectados por la cámara.",

  minimumCalories: 180,

  plannedCalories: 210,

  estimatedMinutes: 35,

  blocks: [
    /*
     * =====================================================
     * BLOQUE 1: CALENTAMIENTO
     * =====================================================
     */
    {
      id: "warmup",

      name: "Activación de la Forja",

      rounds: 1,

      exercises: [
        {
          id: "warmup-march",

          exerciseId:
            "active-march",

          name:
            "Marcha activa",

          instructions:
            "Marcha elevando ligeramente las rodillas. Alterna las piernas y acompaña cada paso con el movimiento natural de los brazos.",

          mode:
            "repetitions",

          target: 40,

          countUnit: "step",

          restSeconds: 10,

          met: 3.5,

          detector: "march",

          estimatedSecondsPerRep: 1,
        },

        {
          id:
            "warmup-high-knees",

          exerciseId:
            "high-knees",

          name:
            "Rodillas altas de calentamiento",

          instructions:
            "Eleva las rodillas de forma alternada con ritmo moderado y mantén el torso estable.",

          mode:
            "repetitions",

          target: 20,

          countUnit: "step",

          restSeconds: 15,

          met: 5,

          detector:
            "high-knees",

          estimatedSecondsPerRep: 1,
        },

        {
          id:
            "warmup-squats",

          exerciseId:
            "squat",

          name:
            "Sentadillas de calentamiento",

          instructions:
            "Desciende lentamente, mantén el control y regresa completamente a la posición de pie.",

          mode:
            "repetitions",

          target: 10,

          countUnit:
            "repetition",

          restSeconds: 25,

          met: 5,

          detector: "squat",

          estimatedSecondsPerRep: 3,
        },
      ],
    },

    /*
     * =====================================================
     * BLOQUE 2: FUERZA Y CARDIO
     * =====================================================
     */
    {
      id: "strength",

      name: "Muralla de Hierro",

      rounds: 3,

      exercises: [
        {
          id:
            "strength-squats",

          exerciseId:
            "squat",

          name: "Sentadillas",

          instructions:
            "Lleva la cadera hacia atrás, desciende con control y vuelve completamente a la posición inicial.",

          mode:
            "repetitions",

          target: 15,

          countUnit:
            "repetition",

          restSeconds: 15,

          met: 6,

          detector: "squat",

          estimatedSecondsPerRep: 3,
        },

        {
          id:
            "strength-lunges",

          exerciseId:
            "reverse-lunge",

          name:
            "Desplantes alternados",

          instructions:
            "Lleva una pierna hacia atrás, baja con control y regresa al centro antes de alternar con la otra pierna.",

          mode:
            "repetitions",

          target: 16,

          countUnit:
            "repetition",

          restSeconds: 15,

          met: 6,

          detector: "lunge",

          estimatedSecondsPerRep: 3,
        },

        {
          id:
            "strength-high-knees",

          exerciseId:
            "high-knees",

          name: "Rodillas altas",

          instructions:
            "Eleva las rodillas de manera alternada. Mantén el abdomen firme y un ritmo constante.",

          mode:
            "repetitions",

          target: 40,

          countUnit: "step",

          restSeconds: 40,

          met: 8,

          detector:
            "high-knees",

          estimatedSecondsPerRep: 0.8,
        },
      ],
    },

    /*
     * =====================================================
     * BLOQUE 3: BOXEO
     * =====================================================
     */
    {
      id: "boxing",

      name: "Asalto del Guerrero",

      rounds: 3,

      exercises: [
        {
          id: "boxing-jabs",

          exerciseId: "jab",

          name: "Jabs",

          instructions:
            "Extiende completamente el brazo delantero y vuelve rápidamente a la posición de guardia.",

          mode:
            "repetitions",

          target: 24,

          countUnit: "punch",

          restSeconds: 15,

          met: 7,

          detector: "jab",

          estimatedSecondsPerRep: 1.2,
        },

        {
          id:
            "boxing-crosses",

          exerciseId: "cross",

          name: "Cross",

          instructions:
            "Extiende el brazo posterior, acompaña el golpe con una ligera rotación del torso y regresa a guardia.",

          mode:
            "repetitions",

          target: 24,

          countUnit: "punch",

          restSeconds: 15,

          met: 7.5,

          detector: "cross",

          estimatedSecondsPerRep: 1.2,
        },

        {
          id:
            "boxing-jab-cross",

          exerciseId:
            "jab-cross",

          name: "Jab–cross",

          instructions:
            "Ejecuta primero un jab y después un cross. La combinación contará únicamente cuando completes ambos golpes en orden.",

          /*
           * Aunque no se llame repetitions,
           * continúa siendo un objetivo
           * contable y no depende del tiempo.
           */
          mode:
            "combinations",

          target: 16,

          countUnit:
            "combination",

          restSeconds: 15,

          met: 8.5,

          detector:
            "boxing-combination",

          estimatedSecondsPerRep: 2.3,
        },

        {
          id:
            "boxing-hooks",

          exerciseId: "hooks",

          name:
            "Ganchos alternados",

          instructions:
            "Alterna ganchos de izquierda y derecha. Mantén el codo flexionado y acompaña cada golpe con el torso.",

          mode:
            "repetitions",

          target: 20,

          countUnit: "punch",

          restSeconds: 15,

          met: 8,

          detector: "hooks",

          estimatedSecondsPerRep: 1.5,
        },

        {
          id:
            "boxing-full-combination",

          exerciseId:
            "boxing-combination",

          name:
            "Jab–cross–gancho",

          instructions:
            "Completa la secuencia jab, cross y gancho antes de regresar completamente a guardia.",

          mode:
            "combinations",

          target: 12,

          countUnit:
            "combination",

          restSeconds: 45,

          met: 9,

          detector:
            "boxing-combination",

          estimatedSecondsPerRep: 3,
        },
      ],
    },

    /*
     * =====================================================
     * BLOQUE 4: JEFE FINAL
     * =====================================================
     */
    {
      id: "boss",

      name:
        "Combate contra el Guardián",

      rounds: 3,

      exercises: [
        {
          id:
            "boss-jab-cross",

          exerciseId:
            "jab-cross",

          name:
            "Ataque del Guardián",

          instructions:
            "Completa la combinación jab–cross con velocidad, precisión y regreso a guardia.",

          mode:
            "combinations",

          target: 15,

          countUnit:
            "combination",

          restSeconds: 20,

          met: 9,

          detector:
            "boxing-combination",

          estimatedSecondsPerRep: 2.3,
        },

        {
          id:
            "boss-full-combination",

          exerciseId:
            "boxing-combination",

          name:
            "Combinación del Guardián",

          instructions:
            "Realiza jab, cross y gancho en ese orden. La secuencia solo contará cuando los tres golpes sean detectados.",

          mode:
            "combinations",

          target: 12,

          countUnit:
            "combination",

          restSeconds: 45,

          met: 9.3,

          detector:
            "boxing-combination",

          estimatedSecondsPerRep: 3,
        },
      ],
    },
  ],
};