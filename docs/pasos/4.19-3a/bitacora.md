## 2026-11-07 — Paso 4.19-3a: lo que lee y escribe la plantilla de la tarjeta (sin pantalla)

- **Hecho:** el 4.19-3 (el editor) se partió en tres y esta es la primera: el servidor. **Lectura** (`leerPlantillaDelOrigen(origenId)`, con la sesión de quien mira; `leerPlantillaSobre(cliente, origenId)`
  sin `server-only`): el borrador y la publicada del origen (`VersionDePlantilla`: las horas como el texto de la base, la `plantilla` ya leída con `formaDePlantilla()` o nula con su
  `motivo`), la fórmula publicada con lo que mira el validador y el catálogo de tonos (tope 24); `contexto` es lo que se le pasa tal cual a `validarPlantilla()`. **Escritura**
  (`RepositorioDeLaPlantilla`, `plantillaSobre(cliente)`): `guardar` (la esperada siempre explícita, `null` para crear, sin `p_nota`), `publicar` y `descartar`; un 22023 de
  `validar_plantilla()` va a `porCampo[donde]` con el mensaje de la base tal cual, «Publicar pide una nota.» a `porCampo.nota`, el PT409 es `conflicto` sin quién (P1).
  **Las tres Server Actions** (`guardarBorrador`, `publicarBorrador`, `descartarBorrador`): Zod → `puede(…, 'cotizaciones.configurar', origenId)` → el repositorio → `revalidatePath`
  sólo si entró. **`revisarTextoParaLaBase()`** ataja antes de la base un `\u0000`, un surrogate suelto, una clave mala, un valor que no es JSON y lo de más de 8 niveles
  (`profundo`: protege el `JSON.stringify` recursivo de supabase-js); recorre con una pila, y con 100.000 niveles da `porCampo` sin `RangeError`. Cierra la nota de ESTADO del 4.19-2.
- **Lo que midió el e2e contra PostgREST** (`e2e/plantilla-postgrest.spec.ts`, E1 a E6, sin navegador): supabase-js manda el `null` explícito de la esperada y PostgREST lo toma como
  nulo (la suposición del plan); la hora que da `guardar` es la que lee la lectura, con sus 6 decimales; guardar **sólo valida la forma** (sin contexto): un grupo ajeno se guarda y
  lo rechaza publicar (`grupo_inexistente`); una persona que no configura el origen lee `null` y recibe `sin_permiso`; sin la guarda, un surrogate suelto y un `\u0000` llegan a la base
  y vuelven «inesperado».
- **La fórmula se lee con lo que mira el validador, no con `esquemaDefinicion`:** la «mini» del juego común no pasa el Zod estricto de la fórmula (el primer e2e cayó con «No pudimos
  leer la fórmula») y atar la plantilla al esquema entero de la fórmula la rompería con cada cambio de ésta. Ver decisiones.
- **Verificación** (`.piloto/salidas/4.19-3a/`): `rojo-head-lectura.txt`, `rojo-head-escritura.txt`, `rojo-head-e2e.txt` y `rojo-head-actions.txt` (los módulos no existen:
  «Failed to resolve import»); `e2e-plantilla-postgrest.txt` (6 de 6); `vitest-cotizaciones-guardas.txt` (230 archivos, 3.407 pruebas, `src/modules/cotizaciones` y `scripts/guardas`);
  `sondas.txt` (S1 sin mirar las claves, S2b sin tope de profundidad —cae por memoria: los caminos crecen con el cuadrado de la profundidad—, S3 sin el `null` explícito, S4 la
  action llama al repositorio antes de `puede()` y S5 la hora por `Date`: todas cayeron; S2, el recorrido recursivo, no se corrió: la prueba de 100.000 niveles ya exige el recorrido
  iterativo y S2b muestra qué pasa sin el tope). Lint y `typecheck` en el hook de cada commit; `mapa.sh --check` en verde. No es de rigor máximo (sin dinero, RLS ni migración: la
  base vuelve a decidir permisos y reglas): sin mutaciones formales.
  e2e completo: no (4.19-3a, servidor, Nivel 1)
- **No hecho / desvíos:** el peso de JS no se mide (no hay JS nuevo en ninguna ruta: 4-73 no se toca). La fila de `docs/RENDIMIENTO.md` de la pestaña «Tarjeta» la escribe el 4.19-3b.
  El tope de 2.000 caracteres de la nota se repite de `entities/formula/publicacion.ts` (4-74 se aplica: se cuentan caracteres).
- **Abiertos:** ninguno nuevo. Sigue el **4.19-3b** (la pestaña «Tarjeta» y el editor que guarda) y el **4.19-3c** (publicar con nota y descartar); la cuenta de e2e sigue en 1 de 3.
- **Commits:** `9b77f082` feat(cotizaciones): leer la plantilla de la tarjeta de un origen · `c5b33601` feat(cotizaciones): escribir la plantilla de la tarjeta en la base ·
  `4ad7eb43` feat(cotizaciones): guardar, publicar y descartar la plantilla · y el de docs.
