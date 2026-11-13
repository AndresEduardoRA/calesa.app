# 9.06-3 · Datos: la función edge de la importación total (2026-11-12)

- **D22 · El bucket guarda el archivo normalizado, no el de la persona.** La pantalla (9.06-4) convierte cada fila en el navegador (para leads, con
  el conversor de `leads` que ya existe y está probado) y sube un CSV cuyas columnas son `rechazo_motivo`, `rechazo_campo` y las claves de `datos`
  de la entidad (`entities/plantillas.ts`). La función sólo valida la forma; la base valida el resto por fila. Así no se duplican en Deno
  ≈ 800 líneas de conversión que dependen de `@/shared`, y la vista previa y la importación usan la misma regla. Sigue siendo lo que dice la fila:
  la función baja un CSV, lo lee con `;` o `,` detectado y lo valida contra `plantillas.ts`. Reversible: el conversor se mueve y el formato no cambia.
- **D23 · Copias con guarda, no un import de Deno a `src/`.** No está verificado que `pnpm funciones` ni el despliegue incluyan archivos de
  fuera de `supabase/functions/`. La función lleva copias exactas de `leer.ts` y `plantillas.ts`; `papaparse` va en su `deno.json` como
  `npm:papaparse@5.7.0`, la versión del lock (no es una dependencia nueva). La guarda `scripts/guardas/areas-c/importar-csv-copias.test.ts` compara
  los dos pares y la versión.
- **D24 · Una invocación trabaja hasta 45 s** desde que llega el pedido (por debajo de los 60 s del `pg_net` del job) y responde, sin
  `EdgeRuntime.waitUntil` ni encadenar invocaciones: lo que falte lo retoma el job a los 2 min sin avance. Con ≈ 8 s cada 500 leads
  (`docs/RENDIMIENTO.md`), 20.000 filas son ≈ 320 s de trabajo: 7 u 8 invocaciones y más de 20 min de reloj. El avance de 9.06-5 lo dice.
- **D25 · La marca la dice la base.** Cada lote empieza en `procesadas + 1` de la respuesta anterior. Si un lote vuelve todo saltado, otra
  invocación va adelante y ésta se va sin terminar ni borrar. Un error de la base corta la invocación sin terminar: el job la retoma y, si en 24 h
  no avanza, queda `fallida` (D14). Un error que se repite siempre deja reintentos cada 2 min durante 24 h y el CSV sin borrar (va con el hueco de D26).
- **D26 · El CSV se borra cuando la importación llega a `terminada` o `fallida` en una invocación** (cierra D19). «Descargar las rechazadas»
  (9.06-5) lleva las celdas sólo mientras el navegador tenga el archivo de la persona; si no, Fila, Campo y Motivo de `importaciones_filas`, y la
  pantalla lo dice. Hueco: una importación que el job deja `fallida` por 24 h sin avance no se borra (el job no manda pase a una vencida). Para 9.13.
- **D27 · Topes del archivo normalizado: 10 MB y 20.000 filas,** exactamente las columnas de la plantilla y celdas de hasta 20.000 caracteres.
  La función lee el archivo entero en cada invocación y en la nube una función tiene ≈ 2 s de CPU por pedido (auditoría del plan): bajó de 20 a
  10 MB y se midió leer y validar 20.000 filas al tope, ≈ 140 ms en Node.
- **D28 · La función no relee `mapeo`:** es el registro de lo que emparejó la persona; el archivo trae exactamente los encabezados de la plantilla.
- **D29 · Respuesta:** 200 `{ok: true, data: {importacion, estado, procesadas, filas_total}}` (sólo cuentas); 401 `sin_pase`, 405 `metodo`, 500
  `inesperado`, como `storage-gc`. Sin CORS: no la llama el navegador. Un log de error dice sólo qué pedido respondió qué estado.
