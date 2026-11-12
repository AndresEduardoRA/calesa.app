## 2026-11-12 · Paso 8.04-1: la base del tablero de la cola web, las solicitudes por cursor y el job (parte 1 de 3)

### Hecho

- `cola_web_tablero()` (`security definer`, `web.cola.gestionar`, `_acotar_pagina(p_tope, 100, 200)`): **todas** las habilitadas de `cola_web_asesores`
  con `en_la_rueda` (`puede_estar_en_la_rueda`) y `cuenta_activa` aparte, `falta_whatsapp` (sin el número), cupo heredado, abiertas, totales y tasa de
  contacto; `{filas, hay_mas}`. Es la lectura propia que pide 8-1, sin pasar por `estado_cola_web`.
- `cola_web_solicitudes(estado, cursor)` (igual de definidor, `_acotar_pagina(p_tamano, 20, 50)`): una página por `(creado_en, id)` sobre el índice nuevo
  `solicitudes_contacto_web_estado_creado_idx (estado, creado_en desc, id desc)`, título de `web.vehiculos`, sin token, UTM, lead ni WhatsApp.
- `aplicado_en` de `web.cola.gestionar` en la migración y en `seed.sql`.
- El job `web-expirar-solicitudes` cada 5 minutos (cierra el arrastrado «el job `web_expirar_solicitudes` se programa con esta fase»).
- Pruebas: `supabase/tests/areas/cola/tablero.sql` (T1–T5) y un caso en `supabase/tests/jobs.sql`. Tipos regenerados, ficha de `web` y `RENDIMIENTO.md`.
- Siguen la 8.04-2 (entidades, infra, registros de páginas, la pantalla de sólo lectura y las dos primeras pruebas de `e2e/cola-web-tablero.spec.ts`) y la
  8.04-3 (agregar, quitar con deshacer, la política y el aviso; cierra 8-1).

Commits: `ab5083c4`, `39877c21`, `d91b7f22` y el de docs.

### Verificación

- `pnpm db:probar` entero: 1301 ✓, 0 ✗ (`.piloto/salidas/8.04-1/db-probar.txt`); T5 después, aparte (`db-probar-t5.txt`).
- e2e dirigido `rueda-por-rol` en escritorio: 2 de 2 (`.piloto/salidas/8.04-1/e2e-rueda-por-rol.txt`).
- Guardas de páginas, migraciones y carriles: 94 de 94; `pnpm lint` exit 0; `mapa.sh --check` exit 0.
- e2e completo: no (8.04-1, Nivel 2: lo corre el CI del PR; dirigido rueda-por-rol en escritorio)
