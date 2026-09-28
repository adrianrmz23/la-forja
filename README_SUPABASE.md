# La Forja + Supabase

La Forja ahora funciona en modo **local-first**: Zustand/localStorage mantiene la interfaz rápida y Supabase guarda una copia persistente por usuario. Al iniciar sesión por primera vez, el progreso local existente se migra automáticamente a la nube.

## Qué se sincroniza

- Perfil completo y configuración de entrenamiento.
- Historial de peso.
- XP, monedas, racha, misiones, repeticiones e historial de sesiones de campaña.
- Operación Forja: pasos, tareas, cardio (5 km/cuerda), fuerza, hábitos, notas y días completados.
- Comidas y análisis nutricional.
- Niveles generados y progreso de campaña.
- Entrenamientos libres, preferencias e historial.
- Estadísticas de detección, Movement Lab y recetas personalizadas.

Las imágenes de cámara de ejercicio y las fotos originales de comida **no se guardan**. Solo se conserva el resultado funcional necesario.

## 1. Crear el esquema

En Supabase > SQL Editor, ejecuta:

`supabase/migrations/001_la_forja_cloud_sync.sql`

La tabla usa RLS para que cada usuario solo pueda leer y escribir sus propios datos.

## 2. Configurar variables

Copia `.env.example` a `.env.local` y agrega:

```env
VITE_SUPABASE_URL=https://TU-PROYECTO.supabase.co
VITE_SUPABASE_ANON_KEY=TU_ANON_KEY
```

En Vercel agrega las mismas dos variables al proyecto y vuelve a desplegar.

## 3. OTP de 6 dígitos

En Supabase > Authentication > Email Templates, en la plantilla de Magic Link / OTP incluye el token con:

```html
<h2>Tu código para La Forja</h2>
<p>{{ .Token }}</p>
```

La app llama al endpoint OTP de Supabase y después verifica el código escrito por el usuario.

## 4. Primera migración

La primera vez que un usuario entra después de configurar Supabase:

1. La app lee el localStorage actual.
2. Descarga los datos existentes de la cuenta, si los hay.
3. Si es la primera migración, combina ambos sin perder historial.
4. Guarda los seis dominios en `user_state_domains`.
5. A partir de ese momento Supabase se considera la fuente persistente y localStorage queda como caché/offline.

## 5. Sincronización

- Los cambios se envían aproximadamente 700 ms después de modificar un módulo.
- La app revisa cambios remotos cada minuto y al volver a enfocar la ventana.
- Si no hay Internet, el cambio queda en Zustand/localStorage.
- Al volver la conexión, los dominios pendientes se suben antes de descargar cambios remotos.
- En `/account` existe un botón **Sincronizar ahora**.

## 6. Mi progreso

La nueva ruta `/progress` concentra:

- peso y gráfica histórica;
- kilómetros corridos y minutos de cuerda;
- pasos;
- gasto de actividad estimado;
- sesiones de campaña, entrenamiento libre y Operación Forja;
- alimentación registrada;
- cumplimiento de cardio, fuerza, hábitos y pasos en 28 días;
- registro manual de peso que se sincroniza automáticamente.

