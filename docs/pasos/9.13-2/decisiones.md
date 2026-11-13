# 9.13-2 · Despliegue en seco: el guion (2026-11-13)

- **D17 · El guion corre entero dentro de un solo candado** (`pnpm despliegue:en-seco`; los `pnpm db:*` de adentro lo heredan): `db:reset` deja la
  base que leen `db:lint` y el revisor, y nadie la puede resetear en medio.
- **D18 · El CI y el guion usan la misma regla que `db:probar`:** `scripts/despliegue/revisar-base.mjs` corre `supabase/tests/advisors.sql` contra la
  base real, con splinter y `pgrst.db_schemas` = los `[api] schemas` de `config.toml`. Antes había dos reglas: la de PGlite y un `grep '|ERROR|'` que
  sólo miraba `public` y no veía las 6 vistas de `web`. Sigue habiendo una sola fuente de la regla (no hay copia en TypeScript).
- **D19 · El revisor es `.mjs` con `pg` (se corre con tsx) y la lógica es `.ts` pura y probada** (`extraer.ts`, `inventario.ts`, `avisos.ts`): no hay
  `psql` en la máquina, `pg` no tiene tipos instalados y no se suma ninguna dependencia.
- **D20 · `env:check produccion` corre sin entorno (`env -i`):** sin credenciales no lee nada, sale con 2 y el guion lo da por bueno y lo pasa a «Para
  la persona». Con credenciales lo corre la persona (la guía de la 9.13-3).
- **D21 · `next build` compila en `.next-e2e`:** ya está ignorado y en `tsconfig`, y no pisa el `.next/` de un `pnpm dev`. Riesgo aceptado: un
  `test:e2e` del mismo carril con `E2E_PROD` compila ahí fuera del candado, y con una sesión por carril los dos no coinciden. Si hay un
  `.env.production*`, el paso cae: el ensayo sólo compila con lo local.
- **D22 · Un paso que cae no corta los demás:** «termina con lo que falta» pide la lista entera. La excepción es que sin base se saltan `db:lint` y el
  revisor; `db:probar` es PGlite y corre igual.
- **D23 · El inventario cuenta lo que no entiende:** un `cron.schedule(` o un `Deno.env.get(` sin nombre literal, una lectura de Vault sin nombre o un
  `insert` en `storage.buckets` sin filas legibles son una falta. Así, una declaración con otra forma no desaparece del inventario sin aviso.
- **D24 · `url_proyecto` y los `integracion:*` van a «Para la persona», no a faltas:** en local los pone `supabase/seed.sql` o la app, y en producción
  los pone la persona. Lo mismo pasa con los secretos propios de cada función (los de `push`) y con la URL de `web_revalidar_correr()`.
- **D25 · La huella del cuerpo (`md5(prosrc)`) va sólo en las RPC de `anon` con motivo:** son la superficie pública con motivo escrito a mano. Las de
  `authenticated` van por comodín y las revisan sus pruebas de área.
- **D26 · Los motivos de las 9 funciones «IMMUTABLE sobre STABLE» se reescriben sin cambiar ninguna volatilidad:** se revisaron una por una y
  ninguna sostiene un índice, un default ni un check. Las dos que dependen de la sesión en teoría (`_lead_atributos_formato` con `DateStyle`,
  `_vehiculo_subasta_desde` con `TimeZone`) reciben ISO y fechas con zona en los caminos reales. No se propone ningún abierto.
- **D27 · El comodín de GraphQL se queda, medido:** `pg_graphql` no está instalado en la base local y el lint no puede dar avisos ahí. El sentido
  inverso lo exime sólo si la base no tiene la extensión; en una base con `pg_graphql`, un comodín sin avisos caería.
- **D28 · El revisor sólo se conecta a una base local, con campos explícitos:** rechaza una URL con parámetros (en `pg`, `?host=` pisa al host) y un
  host que no sea `127.0.0.1`, `localhost` o `[::1]`, y nunca usa `connectionString`. Lee `SUPABASE_DB_LOCAL` sólo con `CI=true`, y el guion la quita.
