---
paths:
  - 'supabase/**/*.sql'
  - 'supabase/config.toml'
---

# Base de datos

- Estructura (tablas, columnas, índices de unicidad, comentarios) en `supabase/schemas/<dominio>/`.
  RLS, grants, triggers, RPC, vistas `web`, storage y cron en `supabase/migrations/`, a mano.
  El diff declarativo (`pnpm db:diff <nombre>`) no trackea policies ni grants: nunca los pongas en `schemas/`.
- Toda tabla nueva en `public`: `alter table … enable row level security`, `revoke all … from
anon, authenticated`, grants explícitos y una policy por operación con `to authenticated`.
  `anon` sólo toca el esquema `web`.
- `(select auth.uid())`, nunca `auth.uid()` suelto. `(select public.tiene_permiso(...))` envuelto.
  Sólo es InitPlan (una evaluación por sentencia) si la llamada **no nombra una columna de la fila**:
  `(select alcance_de('x', origen_id))` corre por fila. Para acotar por origen, comparar la columna
  con un arreglo ya calculado: `origen_id = any ((select origenes_con_alcance('x', 'todos'))::uuid[])`.
  Compruébalo con `EXPLAIN` como `authenticated` (como dueño de la tabla la RLS no aplica).
- Función `security definer` = `set search_path = ''` + todo calificado con schema + `revoke all
… from public, anon` + `grant execute` explícito.
- Índice en toda FK y en toda columna que aparece en una policy.
- Policies de la fila propia (`vehiculos`, `leads`, `cotizaciones`) se escriben inline sobre las
  columnas; `puede_*(id)` es para tablas hijas. Una función STABLE no ve la fila recién insertada
  en `INSERT … RETURNING`.
- Conflictos de edición: `raise exception … using errcode = 'PT409'`. Jamás `40001`.
  Si la fila tiene auditoría, `_conflicto_de_edicion(tabla, id, cuando, 'este vehículo')` lo levanta
  diciendo quién y cuándo. Un error de validación lleva en `hint` el campo que lo causó.
- Bajo RLS un operador que no es `leakproof` (`@>`, `ilike`) no se evalúa antes que la policy: su
  índice (GIN, trigram) no se usa. Un listado filtrado se apoya en un btree de su orden.
- Toda RPC de edición nace con `p_actualizado_en_esperado timestamptz` **sin default** (va antes de los
  parámetros con default) y rechaza un nulo con un mensaje legible: `_exigir_version()` hace las dos
  cosas. El seed y `humo.sql` pasan la versión real; un nulo «para las pruebas» es un control que no
  existe. Las de crear no la llevan: no hay fila que versionar. Una RPC de lote la lleva por
  elemento, dentro de su arreglo, y rechaza el elemento que no la trae. Excepción hasta el 4.20: `formula_guardar_borrador` (y con él el ⚙, `docs/PLAN.md`, 4-8).
  Excepción decidida: enviar leads
  a la papelera (`leads_papelera_enviar`) es todo o nada, sin versión por lead, e idempotente por el id de
  lote que genera el cliente (`docs/DECISIONES.md`, 2026-10-15).
- Una versión que tiene que moverse en cada operación (también dos en la misma transacción) no usa
  el trigger genérico (`now()` es la hora de inicio): se quita `trg_actualizado_en` de esa tabla y
  la RPC sella con `greatest(clock_timestamp(), anterior + 1 µs)` (fotos, lotes de papelera).
- Permiso nuevo = fila en `seed.sql` (`permisos`) **en la misma migración** que crea su punto de
  enforcement, con `aplicado_en` diciendo cuál. Sin enforcement no hay permiso. Única excepción: los `cotizaciones.nivel.<clave>.ver|editar`
  los genera `nivel_crear()` (D7, paso 4.09); su enforcement es estructural (`_nodos_visibles()` recorre `cotizaciones_niveles`, y un check, una FK
  y un trigger diferido atan permisos y niveles) y `permisos-enforcement.sql` lo prueba con un caso genérico por cada nivel de la tabla.
- Clave de dato nueva para requisitos de fase = caso en `_requisito_dato_cumplido()` **y** en
  `claves_dato_requisito()`.
- Columna nueva que guarde una ruta de storage = sumarla a `storage_refcount()`. Si sus objetos
  se borran por la cola (`cola_gc_storage`): un trigger `before insert` llama
  `storage_gc_rescatar(bucket, ruta)` (toma el candado del objeto y se niega si la limpieza ya lo
  reclamó), y quien borra la fila encola la ruta. Nunca `delete` sobre `storage.objects`.
- Un dato que sólo algunas personas pueden leer **por fila** (no por columna: un grant de columna no mira la fila) va en una
  tabla de lectura cuya policy es la regla (`leads_numeros_globales`), y la columna original pierde su grant
  (`revoke select (numero)`). Lo que la lee con los derechos de la base (`definer`) calcula el permiso una vez por consulta; lo
  que la lee como quien mira se apoya en la policy, con subconsultas en la lista de columnas y no uniones. `numero-global.sql`
  falla si `authenticated`, `anon` o PUBLIC pueden leer la columna, o si la tabla entra a una publicación de Realtime.
- Tabla nueva en `schemas/` = su `_rls(...)` en `…000200_rls_y_grants.sql`: ese archivo termina
  comprobando que ninguna tabla de `public` quede sin RLS.
- Después de cualquier cambio: `pnpm db:base` (si tocaste `schemas/`), `pnpm db:reset`, `pnpm db:types`,
  `pnpm db:probar`, y si tocaste policies agregá una prueba a `supabase/tests/humo.sql` con un usuario
  simulado.
- `migrations/20261011000000_esquema_base.sql` es la copia generada de `schemas/` (lo único que aplica
  `supabase db reset`): no se edita a mano, se regenera con `pnpm db:base`.
- `storage.objects` no es nuestra: se le crean policies, nunca `alter table` (falla en Postgres real y
  PGlite no lo detecta). El `storage.objects` de `db:probar` es un doble con RLS encendida: sirve
  para probar las policies en humo, y `db:reset` confirma que aplican en el real. La carpeta de una
  ruta se lee con una función que niegue lo que no es uuid (`puede_objeto_de_vehiculo`), no con un
  cast suelto.
- Renombrar columnas o tablas: migración a mano con `alter … rename`; el diff lo ve como drop+add.
- **El nombre de una migración nueva lleva un prefijo mayor al de la última** (`ls supabase/migrations | tail -1`: hoy
  `20261019003300`, y la siguiente `20261019003400`), no la fecha de hoy: los prefijos van por delante de la fecha real y
  `supabase migration new` la dejaría antes de las que ya la necesitan (`db reset` aplica por orden de nombre). Una guarda de
  `pnpm test` (`scripts/guardas/orden-de-migraciones.test.ts`) lo exige a toda migración que HEAD no tiene. Las que ya están no se renombran.
