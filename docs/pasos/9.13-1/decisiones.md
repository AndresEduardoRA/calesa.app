# 9.13-1 · Despliegue en seco: la base limpia (2026-11-13)

- **D1 · «En cero» = cero ERROR y cero WARN sin motivo escrito** (duda 1 del PLAN, la recomendada). Los avisos de `db:lint` se quedan con su motivo.
- **D2 · La guía sirve para la demo y para un cliente** en un solo documento (duda 2, la recomendada); la escribe la 9.13-3.
- **D3 · Una sola lista en JSON** (`supabase/tests/advisors-con-motivo.json`) para PGlite y la base real, por el `cache_key` de splinter: lo mismo que
  muestra el panel de advisors de Supabase.
- **D4 · Comodín sólo para dos lints de `authenticated`** (las RPC definer, con grant explícito y pruebas de permisos por área; la introspección de
  GraphQL, con RLS en toda tabla). Los de `anon` van uno por uno.
- **D5 · Fuera de la comparación sólo lo que depende de estadísticas o de la imagen** (`table_bloat`, `unused_index`, `extension_versions_outdated`).
- **D6 · `storage_refcount()` sigue con `execute` para `authenticated`:** la llama `quitarSiHuerfano()` desde el navegador; cerrarla es mover ese
  borrado a una Server Action. Reversible con un `revoke` cuando eso pase.
- **D7 · `limpieza_el` sigue `security definer`:** sus auxiliares sólo las ejecuta `service_role` y acotarla relee la fila bajo RLS (descartado en
  «P-limpieza: no releer la fila»). Revela un bit por id de vehículo conocido (anclado o no); los ids son uuid.
- **D8 · Las 8 funciones `sql` con `search_path` abierto se quedan así, con motivo:** las ocho se inlinean (EXPLAIN medido) y un `SET` lo impediría;
  `_lead_visible_para` va en una policy y `_motor_*` en el camino rápido del motor de la fórmula.
- **D15 · «Cero ERROR» admite una sola excepción, escrita en `advisors.sql` y no en el JSON:** `security_definer_view` de una vista del esquema `web`
  con su clave exacta (la frontera pública, `src/modules/web/CLAUDE.md` › «No se rompe»). Cualquier otro ERROR cae.
- **D16 · `db:probar` corre splinter con `pgrst.db_schemas` = los `[api] schemas` de `config.toml`:** sin la variable splinter sólo mira `public` y
  no ve `web`, la superficie de `anon`. El CI todavía no lo hace (lo lleva la 9.13-2).
- **Para `docs/ESTADO.md` › «Deuda aceptada»** (la lleva el coordinador): «`storage_refcount()` y `limpieza_el` con su motivo en
  `supabase/tests/advisors-con-motivo.json`; `db:lint`: 133 avisos en 37 funciones, cada una con su motivo (`db_lint`)».
