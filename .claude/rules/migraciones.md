---
paths:
  - 'supabase/**/*.sql'
  - 'supabase/config.toml'
---

# Base de datos

## Una sola fuente: las migraciones

- `supabase/migrations/<versión>_base.sql` es la base: el volcado de todas las migraciones anteriores al último aplastado. **No se
  edita** (`scripts/guardas/orden-de-migraciones.test.ts` fija su sha256). Una cita a una migración vieja por su nombre en un
  comentario es historia: está en git (`git log --diff-filter=D -- supabase/migrations`).
- Todo cambio es una migración nueva: `pnpm exec supabase migration new <nombre>` (fecha y hora reales, UTC), con el nombre de su
  dominio al principio (`formula_…`, `papelera_…`, `leads_…`). Si otro PR integró antes una posterior, se crea de nuevo con otra
  fecha: lo exige la misma guarda, contra `main` en el CI del PR.
- **Aplastar** (`pnpm db:aplastar`, `scripts/db/aplastar.sh`): funde todas en una base nueva con la versión de la última y comprueba
  que deja la misma base (`scripts/db/huella-de-la-base.sh`). Va solo en su PR, cuando pasan de unas cuarenta o antes de un despliegue
  grande. Una **migración de datos** (la que transforma filas que ya existen: conceder una clave nueva a quien tenía otra) desaparece
  al aplastar, con su prueba: todo proyecto remoto tiene que haberla aplicado antes (`docs/DESPLIEGUE.md` › «Tras aplastar las migraciones»).
- Una prueba o un comentario **nunca nombra un archivo de migración**: la definición vigente de una función o tabla se lee con
  `definicionSql()`, `tablaSql()` o `migracionesEnOrden()` (`scripts/lib/definicion-sql.ts`), que sobreviven a un aplastado.
- Cambiar una función: `create or replace` en la migración nueva, partiendo de su definición vigente (la última entre la base y las
  que siguen: `definicionSql()` de `scripts/lib/definicion-sql.ts`). Renombrar es `alter … rename`.
- Un dato de catálogo (permiso, tono, nivel, bucket, job) va en su migración con `insert … on conflict`: la nube no vuelve a correr
  el seed. `seed.sql` es lo configurable por empresa y los ejemplos.
- Después de cualquier cambio: `pnpm db:reset`, `pnpm db:types` y `pnpm db:probar:rapido` (el completo, `pnpm db:probar`, lo corre el
  CI: suma los 7 bloques `[lento]` de la búsqueda de leads, ≈ 4 min; córrelo tú si tocaste `leads_candidatos`, la vista de leads o la
  cartera); si tocaste policies, un caso en `supabase/tests/humo.sql` con un usuario simulado.
- Las pruebas SQL nuevas van en `supabase/tests/areas/<área>/`: `db:probar` las corre después de su lista fija, sin editarla
  (`SOLO=areas/<área>/x.sql` corre una; `PROBAR_TIEMPOS=1` dice cuánto tarda cada bloque). Cada bloque, su transacción revertida, sin
  depender del estado de otro archivo. Un bloque que pasa de ≈ 10 s se nombra `-- @test [lento] …`.

## Privilegios

- **Una tabla, vista, secuencia o función nueva de `public` nace con todo para `authenticated` y `service_role`, y la función además con
  EXECUTE para PUBLIC** (privilegios por defecto; desde 4-40 nada para `anon`). Todo objeto nuevo quita lo que no corresponde:
  `revoke all … from anon, authenticated` (y `public` en una función), y da explícito lo que sí. Una función que recrea una vista
  (`_leads_vista_crear()`) lo repite cada vez. `supabase/tests/privilegios-de-anon.sql` cae si `anon` o PUBLIC quedan con algo en `public`.
- Toda tabla nueva en `public`: `enable row level security`, el revoke, grants explícitos y una policy por operación `to authenticated`.
  `anon` sólo toca el esquema `web`. `supabase/tests/rls-en-todo.sql` falla si una tabla de `public` queda sin RLS.
- `security definer` = `set search_path = ''`, todo calificado con esquema, `revoke all … from public, anon` y `grant execute` explícito.
- `(select auth.uid())`, nunca suelto; `(select public.tiene_permiso(...))` envuelto. Es InitPlan sólo si no nombra una columna de la
  fila: para acotar por origen, `origen_id = any ((select origenes_con_alcance('x', 'todos'))::uuid[])`. Se comprueba con `EXPLAIN`
  como `authenticated`.
- Un dato que sólo algunos leen **por fila** va en su tabla con la policy como regla (`leads_numeros_globales`) y la columna original
  pierde su grant. Una tabla con columnas que no lee todo el que lee la fila pierde el `select` de tabla y da `select (columnas)`
  (sale de `pg_attribute`: una columna nueva nace sin grant): `leads`, `cotizaciones`, `cotizaciones_revisiones`.
- `cotizaciones` y `cotizaciones_revisiones` se escriben sólo por RPC `security definer` (`cotizacion_crear`, `cotizacion_guardar`);
  `supabase/tests/cotizaciones-visibilidad.sql` falla si alguien concede escritura o una función nueva que devuelve lo oculto no figura.
- Permiso nuevo = su fila en `permisos` con `aplicado_en` en la migración que crea su punto de enforcement; sin enforcement no hay
  permiso. Los de un nivel (`cotizaciones.nivel.<clave>.*`) los genera `nivel_crear()`.

## Forma

- Índice en toda FK y en toda columna de una policy. Bajo RLS un operador no `leakproof` (`@>`, `ilike`) no usa su índice: un
  listado filtrado se apoya en un btree de su orden.
- Policies de la fila propia (`vehiculos`, `leads`, `cotizaciones`) inline sobre columnas; `puede_*(id)` para tablas hijas. Una
  función STABLE no ve la fila recién insertada en `INSERT … RETURNING`.
- Conflicto de edición: `raise exception … using errcode = 'PT409'` (o `_conflicto_de_edicion()`), jamás `40001`. Un error de
  validación lleva en `hint` el campo.
- Toda RPC de edición nace con `p_actualizado_en_esperado timestamptz` sin default y lo pasa por `_exigir_version()`; las de crear
  no. Una RPC que guarda la única fila de su clase (`plantilla_guardar_borrador`: el borrador del origen) toma la esperada nula como crear: si la fila ya existe,
  PT409; nunca pisa. Una que publica sobre una versión (`formula_publicar()`, `formula_cambiar_constante()`) lleva `p_publicada_esperada uuid default null` (una
  versión, no una hora). Una de lote, por elemento. Excepciones: `leads_papelera_enviar` (todo o nada,
  idempotente por lote) y las del chat, idempotentes y que no pisan nada: `chat_grupo_miembros`, `chat_leer`, `chat_silenciar` y
  `mensaje_eliminar`. Una versión que debe moverse dos veces en una transacción no usa el trigger genérico:
  `greatest(clock_timestamp(), anterior + 1 µs)`; la de una cotización la sella `cotizacion_version()`.
- Un `if` de plpgsql termina en el primer `then`, también el de un `case`: esa condición va a una variable antes.
- Clave nueva de requisito de fase = caso en `_requisito_dato_cumplido()` y en `claves_dato_requisito()`.
- Columna nueva con una ruta de storage = sumarla a `storage_refcount()`; si sus objetos se borran por la cola, un trigger
  `before insert` llama `storage_gc_rescatar()` y quien borra la fila encola la ruta. Nunca `delete` sobre `storage.objects`, y a
  esa tabla sólo se le crean policies (nunca `alter table`).
- Una prueba de la base compara claves exactas y hojas (`jsonb_path_query`), nunca texto suelto en una respuesta con uuids o fechas.
