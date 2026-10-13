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
  existe. Las de crear no la llevan: no hay fila que versionar.
- Permiso nuevo = fila en `seed.sql` (`permisos`) **en la misma migración** que crea su punto de
  enforcement, con `aplicado_en` diciendo cuál. Sin enforcement no hay permiso.
- Clave de dato nueva para requisitos de fase = caso en `_requisito_dato_cumplido()` **y** en
  `claves_dato_requisito()`.
- Columna nueva que guarde una ruta de storage = sumarla a `storage_refcount()`.
- Después de cualquier cambio: `pnpm db:base` (si tocaste `schemas/`), `pnpm db:reset`, `pnpm db:types`,
  `pnpm db:probar`, y si tocaste policies agregá una prueba a `supabase/tests/humo.sql` con un usuario
  simulado.
- `migrations/20261011000000_esquema_base.sql` es la copia generada de `schemas/` (lo único que aplica
  `supabase db reset`): no se edita a mano, se regenera con `pnpm db:base`.
- `storage.objects` no es nuestra: se le crean policies, nunca `alter table` (falla en Postgres real y
  PGlite no lo detecta).
- Renombrar columnas o tablas: migración a mano con `alter … rename`; el diff lo ve como drop+add.
