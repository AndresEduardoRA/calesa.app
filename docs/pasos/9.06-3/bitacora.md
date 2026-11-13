## Paso 9.06 · Datos: importar todo, parte 3 de 5: la función edge `importar-csv` (2026-11-12)

- **`entities/plantillas.ts` de `datos`:** el archivo normalizado de la importación total (D22): columnas por entidad (las claves de `datos` que
  admite la base, en su orden), validadores de forma por celda (texto, uuid, entero, número, sí/no, objeto JSON; un motivo nunca repite la celda),
  `validarEncabezados`, `filaDelLote` (la fila rechazada por la pantalla gana; la primera columna inválida da su clave como `campo`),
  `escribirArchivo` y `LIMITES_DEL_ARCHIVO` (10 MB, 20.000 filas, D27). Sin imports: la función lleva una copia exacta.
- **La función `supabase/functions/importar-csv`** (`index.ts`, `procesar.ts`, `base.ts`, copias de `leer.ts` y `plantillas.ts`, `deno.json` con
  `npm:papaparse@5.7.0`; `verify_jwt = false` en `config.toml`): canjea el pase con `importacion_abrir` (sin pase con forma de uuid, 401 sin
  tocar la base), lee la fila de `importaciones`, baja el archivo, lo lee y valida, `importacion_empezar` y lotes de 50 a
  `importacion_procesar_lote` hasta 45 s (D24), siempre desde la marca que devuelve la base (D25); termina y borra el CSV al llegar a `terminada`
  o `fallida` (D26, cierra D19 del 9.06-2). Logs y respuestas sin datos de nadie (D29). La sección `importar-csv` del README de funciones.
- **La guarda de las copias** (`scripts/guardas/areas-c/importar-csv-copias.test.ts`): los dos pares idénticos y la versión de `papaparse`.
- **La carrera** (`scripts/carreras/importacion-total.mjs`): dos llamadas concurrentes a `importacion_procesar_lote` como `service_role` sobre la
  misma importación (el mismo lote: la segunda vuelve con 50 saltadas y sin crear nada; dos lotes seguidos: la segunda espera y entra sin el «Falta
  procesar»). Así se lee el Assert de «dos invocaciones de la función»: el candado está en la base, y lo que la función hace con la respuesta (irse
  si todo vino saltado) lo cubre su prueba de contrato.
- **`infra/importar.ts` y `dispararImportacion`** en `composicion.ts`: el pase con la sesión de quien creó la importación y la llamada a la función,
  sin ninguna clave. Hoy no lo llama nadie: lo llama la acción de 9.06-4.
- **El e2e de la función real** (`e2e/datos-importar-funcion.spec.ts`, con `pnpm funciones`): la dueña importa 3 leads para una asesora, uno con
  el teléfono de un lead de otra persona → 2 en la cartera de la asesora, 1 «ya existe», el archivo fuera del bucket, el mismo pase da 401.
  `importar-csv` se suma a la guardia de los e2e y a la espera de funciones de `ci.yml` (lo pidió `scripts/guardas/workflows.test.ts`).
- **Duración** (auditoría del plan): leer y validar 20.000 filas al tope de 10 MB, ≈ 140 ms en Node. Procesarlas, ≈ 320 s de trabajo: 7 u 8
  invocaciones y más de 20 min de reloj, porque el job despierta la siguiente a los 2 min sin avance (D24, `docs/RENDIMIENTO.md`).
- **Para 9.13:** una importación que el job deja `fallida` por 24 h sin avance no borra su CSV, y un error que se repite siempre deja reintentos
  cada 2 min durante esas 24 h (D25, D26).
- **Lo que sigue:**
  - **9.06-4:** la conversión en el navegador (leads con `prepararFilas` de `leads`, que hay que sacar por `leads/client.ts`; vehículos con un
    conversor nuevo de `datos`) → `escribirArchivo`; el asistente: entidad → archivo → emparejar → vista previa de 500 → «Importar N filas» sube el
    archivo normalizado a `importaciones/<uid>/<uuid>.csv`, `importacion_crear` y `dispararImportacion` dentro de `after()`. Si no cabe, 4a (la
    conversión, sólo `entities/`) y 4b (el asistente).
  - **9.06-5:** avance, resultado, «Descargar las rechazadas» (con las celdas sólo si el navegador todavía tiene el archivo, D26, y la pantalla lo
    dice), la lista «Importaciones» y `e2e/datos-importar.spec.ts`.
- **Cómo se anota en `docs/PLAN.md`:** la fila 9.06 sigue abierta (`parcial: true`); el arrastrado «`datos` (importar de todo…)» lo cierra 9.06-5.
- e2e completo: no (9.06-3, Nivel 2 del paso, esta parte sin disparadores: el completo lo corre el CI del PR; dirigidos: datos-importar-funcion y perfil-avatar en escritorio)
