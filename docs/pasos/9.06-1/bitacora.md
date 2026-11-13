## Paso 9.06 · Datos: importar todo, parte 1 de 5: la base de la importación total (2026-11-12)

- **Migración `importaciones_crear`:** columnas en `importaciones` (`asignar_a`, `con_destino`, `origen_id`, `procesadas`, `ya_existian`,
  `rechazadas`, `avance_en`, con sus `check` e índices de fk); tabla `importaciones_filas` (lo que no entró: fila, `ya_existe`/`error`, campo y motivo;
  RLS de sólo lectura con la regla de `importaciones`); `importacion_crear()` (authenticated, idempotente por id): para otra persona pide
  `datos.importar.todo` y que el destino esté activo y tenga `leads.crear`; para sí misma, `leads.crear`; vehículos, un origen activo y `vehiculos.crear`;
  la ruta en la carpeta propia, `.csv` o `.txt`. `datos.importar.todo` con `aplicado_en` nuevo en la migración y en `seed.sql`.
- **Migración `importaciones_procesar`:** `importacion_empezar`, `importacion_procesar_lote` e `importacion_terminar`, sólo `service_role`. Actúan a
  nombre de quien importa (los leads, del destino) fijando `request.jwt.claim.*` locales y reponiéndolos en cada salida; vuelven a mirar los permisos en
  cada lote (perderlos deja la importación `fallida`); todo o nada por fila con `_lead_crear` (sin adoptar: «ya existe» sin nombre) o `vehiculo_crear`;
  idempotente por (importación, fila). Ayudantes `_importacion_*` sólo para su dueño.
- **Pruebas** (`supabase/tests/areas/datos/`): `importar.sql` (8 pruebas, los cinco casos del Assert de la fila: 42501 sin `datos.importar.todo`,
  `authenticated` no ejecuta `importacion_procesar_lote`, «ya existe» sin nombre y sin adoptar del limbo, permiso quitado a mitad, lote repetido) e
  `importar-lotes.sql` (6: el destino crea, la forma, vehículos, los claims en cinco salidas y tras un error, destino borrado, empezar y terminar). Una
  mutación (sin reponer los claims en la salida normal del lote) hizo caer la de los claims.
- **Partición del paso** (5 partes; `docs/PLAN.md` no se toca, cada una cierra sola):
  - **9.06-2, motor en la base:** `importaciones_pases` + `importacion_pase_emitir` (authenticated, la propia) e `importacion_abrir` (service_role, un uso,
    10 min); `importaciones_continuar_disparar(p_url)` y `_programar` (el patrón de `storage_gc_disparar`: `pg_cron` → `pg_net`, hasta 5 detenidas por
    corrida, sin avance en 24 h → `fallida`); purga de `importaciones_filas` a los 30 días por lotes; índices de la lista `(usuario_id, creado_en desc, id
desc)` y `(creado_en desc, id desc)` `where archivo_ruta is not null`; `leads_importar_lote` y `leads_importacion_terminar` rechazan una con
    `archivo_ruta` y `leads_importaciones_recientes` la excluye (hoy la aceptan si es propia); deshacer mide «intacto» contra `coalesce(asignar_a,
usuario_id)`. Pruebas en `importar-motor.sql`.
  - **9.06-3:** la función edge `supabase/functions/importar-csv` (canjea el pase, baja el archivo, parsea `;` o `,`, valida con
    `entities/plantillas.ts`, manda las inválidas como `rechazo`, `empezar` → `procesar_lote` × N → `terminar`, `p_error` si no se lee), Vitest de
    `plantillas.ts` y la carrera `scripts/carreras/importacion-total.mjs`; corrige
    `supabase/functions/README.md:13` (dice `crear_lead`). La función valida antes de mandar y **nunca copia el valor de una celda en el `motivo` de
    un `rechazo`**: la base guarda ese texto tal cual.
  - **9.06-4:** `infra/importar.ts`, acciones y el asistente de «Importar» (entidad → archivo → emparejar → vista previa de 500 → «Importar N filas»); prende la sección.
  - **9.06-5:** avance (se relee cada pocos segundos), resultado con «Descargar las rechazadas», la que se retoma, la lista «Importaciones» por cursor y
    `e2e/datos-importar.spec.ts`. Cierra el arrastrado «`datos` (importar de todo para el dueño con `importar-csv`)».
- **Riesgo conocido hasta el 9.06-2:** cuatro RPC de `/leads` no miran `archivo_ruta`. `leads_importar_lote` y `leads_importacion_terminar` aceptan una
  importación total propia; `leads_importacion_deshacer` puede marcarla deshecha y dejarla `terminada`, lo que corta el proceso (los leads del destino
  quedan a salvo, en `otra_persona`); `leads_importaciones_recientes` la muestra en `/leads`. Sólo afecta a quien la creó; lo arregla el 9.06-2.
- **Para el 9.06-2:** partir `importar.sql` y `importar-lotes.sql` (pasan de 300 líneas) y, si se toca `importacion_procesar_lote`, sacar el cuerpo
  del bucle a un ayudante (D11).
- **Cómo se anota en `docs/PLAN.md`:** la fila 9.06 sigue abierta (`parcial: true`).
- e2e completo: no (9.06-1, Nivel 2: RLS y estructura sin interfaz; el completo lo corre el CI del PR; dirigidos: ninguno)
