# NutriVision — foto, galería y descripción

La Forja permite registrar desayuno, comida, cena o snack de tres formas:

1. **Tomar foto**: abre la cámara trasera en dispositivos compatibles.
2. **Subir foto**: abre el selector de archivos/galería sin forzar la cámara.
3. **Describir lo consumido**: envía texto a CheaperInference y estima alimentos, porciones, calorías y macros.

La ruta `api/ai/meal.js` acepta tanto imágenes como descripciones. Para texto usa `CHEAPER_INFERENCE_MODEL`; para imágenes usa `CHEAPER_INFERENCE_VISION_MODEL` con fallback al modelo general. Las coincidencias se calibran con Nutrition5k/USDA cuando están disponibles.

Los registros guardan también el origen (`camera`, `upload` o `text`) y, para entradas de texto, la descripción original. Como `operation` se sincroniza completo a Supabase, estos campos viajan automáticamente con la sincronización existente.
