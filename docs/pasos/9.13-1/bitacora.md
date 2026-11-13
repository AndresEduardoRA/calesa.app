## Paso 9.13-1 · Despliegue en seco: la base limpia, splinter y advisors con su motivo (2026-11-13)

- **Medido antes (C0)**, splinter sobre la base del carril con `pgrst.db_schemas = public,graphql_public,web` (lo que expone `[api]`): 6 ERROR
  `security_definer_view` (las vistas `web.*`, la frontera pública por diseño), 4 WARN `duplicate_index`, 8 `function_search_path_mutable`, 3
  `anon_security_definer_function_executable`, 360 `authenticated_security_definer_function_executable`; INFO: 14 `rls_enabled_no_policy`, 1
  `no_primary_key`, 305 `unused_index`. **Ni una FK sin índice, ni `auth_rls_initplan`, ni `multiple_permissive_policies`.** PGlite da los mismos
  avisos (sólo cambia `unused_index`). El CI no veía los 6 ERROR: corre splinter sin `pgrst.db_schemas` y así sólo mira `public`.
- **Arreglado:** los 4 índices duplicados (migración `advisors_indices_duplicados`; se queda el que nombran las consultas y las mediciones).
- **Con motivo** en `supabase/tests/advisors-con-motivo.json`: las 6 vistas de `web`; las 3 RPC de `anon` (`web.ajustes_acceso`,
  `web.registrar_evento`, `web.solicitar_asesor`); las 8 funciones SQL que Postgres inlinea (`_motor_*`, `_lead_visible_para`,
  `leads_vista_por_ids`, `datos_exportar_leads`: EXPLAIN en `.piloto/salidas/9.13/inlinea.txt`); `storage_refcount()` y `limpieza_el` con su
  entrada exacta; comodín para las RPC definer de `authenticated` y la introspección de GraphQL; fuera de la comparación `table_bloat`,
  `unused_index` y `extension_versions_outdated`. Los 133 avisos de `db:lint` en 37 funciones, cada función con su motivo (`db_lint`).
- **La prueba:** `db:probar` corre splinter en PGlite (clase de dato `consulta` en `scripts/lib/datos-de-prueba.mjs`) y `supabase/tests/advisors.sql`
  cae ante un ERROR (salvo las vistas de `web` con su clave), un WARN o una FK sin índice sin motivo, un comodín o un excluido fuera de la regla, una
  entrada repetida o un lint inventado; un bloque con avisos sintéticos demuestra que cae.
- **Cómo se anota en `docs/PLAN.md`:** la fila 9.13 se parte; la 9.13-1 queda hecha con «splinter con cero avisos sin motivo en `db:probar`».
- **Lo que sigue: 9.13-2** — el guion en seco (alcance, archivos y precondiciones en `.piloto/planes/9.13.md` › «Partición»); trae además llevar el
  splinter del CI a `pgrst.db_schemas` con la misma regla, comparar `db_lint` contra la salida de `db:lint`, y lo que dejó la auditoría del
  informe: fijar el `md5(prosrc)` de las 3 RPC de `anon` (su clave de splinter no lleva el cuerpo y un cambio no vuelve a pedir el motivo); confirmar
  sobre la base real el comodín `pg_graphql_authenticated_table_exposed` (ni PGlite ni la base local lo dan) o quitarlo; revisar una por una las 9
  funciones «IMMUTABLE sobre STABLE» de `db_lint`. Para la guía (9.13-3): `web.registrar_evento` no acota `p_utm` ni la frecuencia, y
  `web.solicitar_asesor` devuelve el WhatsApp de la web de quien tenga una solicitud abierta aunque ya no pueda estar en la rueda.
- e2e completo: no (9.13-1, Nivel 2: un índice borrado, sin policies ni interfaz; lo prueba el CI del PR; dirigidos: ninguno)
