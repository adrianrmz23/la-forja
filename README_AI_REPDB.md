# La Forja · RepDB + Compatibility Engine + Movement Lab + AI Coach + Movement Engine

## Incluido

1. **RepDB Catalog**
   - `/api/repdb` consulta el dataset público de RepDB a través del servidor de Hugging Face.
   - La UI usa un fallback pequeño si la API no está disponible.
   - No se incluyen ni se envían imágenes de RepDB a modelos generativos.

2. **Compatibility Engine**
   - Puntúa ejercicios según postura de pie, cámara frontal, equipo y dificultad.
   - Estados: approved, needs-test, experimental y blocked.

3. **Movement Lab**
   - Ruta `/movement-lab`.
   - Prueba 5 repeticiones con la cámara.
   - Aprobar/descartar queda persistido en Zustand/localStorage.

4. **AI Coach**
   - Disponible desde `/training`.
   - Endpoint `/api/ai/workout` utiliza CheaperInference mediante Chat Completions compatible con OpenAI.
   - La clave vive únicamente en servidor.
   - Si falla la IA, usa automáticamente el generador local.
   - La IA solo puede elegir keys del catálogo detectable entregado por La Forja.

5. **Movement Engine**
   - Detector genérico `movement-recipe` construido con primitivas corporales.
   - Recetas iniciales: desplante + curl, sentadilla + curl, marcha + elevación lateral, paso lateral + curl y rodilla + press.
   - La sensibilidad es deliberadamente tolerante y el detector exige atravesar fases antes de contar otra repetición.

## Variables de entorno

Copia `.env.example` y configura en Vercel:

```env
CHEAPER_INFERENCE_API_KEY=...
CHEAPER_INFERENCE_BASE_URL=https://api.cheaperinference.com/v1
CHEAPER_INFERENCE_MODEL=<modelo exacto del catálogo de CheaperInference>
```

No agregues la key como `VITE_*`.

## Desarrollo local

La parte React funciona con `npm run dev`. Los endpoints `/api/*` son funciones de Vercel; para probar AI Coach/RepDB remoto localmente usa Vercel Dev o prueba el despliegue. Si el endpoint de IA no está disponible, la app cae al generador local sin bloquear el entrenamiento.

## Verificación

```bash
npm install
npx tsc -b
npm run lint
npm run build
```
