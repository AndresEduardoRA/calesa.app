## 2026-11-11 — Paso 7.03-1: push web, la base (parte 1 de 2 del 7.03)

- **Hecho:** `suscripciones_push` se escribe sólo por `push_suscribir` (exige `notificaciones.push`, endpoint de un servicio de push, claves en base64url,
  un endpoint que existe pasa a quien suscribe, tope de 10) y `push_desuscribir`; sin `insert`/`update` directo. `notificaciones.push` gana enforcement
  (`aplicado_en` en la migración y en el seed; sale de las excepciones de `permisos-enforcement.sql`). El disparo: `trg_notificaciones_push` (`after
insert`) → `push_disparar()` con un pase de un uso (`push_pases`) por `pg_net` a `/functions/v1/push`, sólo con `push_web` activa, el permiso, el tipo
  encendido en la preferencia `notificaciones.push`, una suscripción y `url_proyecto`; nunca rompe el aviso. `push_abrir` y `push_resultado` (sólo
  `service_role`) para la función. Ficha de `notificaciones` y GLOSARIO («Pase»).
- **Verificación** (`.piloto/salidas/7.03/`): `supabase/tests/areas/push/push.sql` (S1–S5) y `disparo.sql` (D1–D6), 11 ✓ (`probar-push-4.txt`);
  `db:probar` entero en verde (`db-probar-2.txt`); `db:lint` sin avisos en `push_*`; stack local: el `POST` real en `net.http_request_queue`
  (`recorrido-stack-2.txt`); `scripts/guardas` 1.058 ✓; `nivel.mjs`: Nivel 2 (rls, estructura).
- **Sigue en la 7.03-2:** la función edge `supabase/functions/push/` (adaptador RFC 8291/8292 con `fetch` inyectado, `sin_claves`), `config.toml`, el README
  de funciones, `docs/ENTORNOS.md` y `supabase/tests/push-contrato.test.ts` (ver `.piloto/planes/7.03.md` › Partición).
- **Para el coordinador:** `docs/ESTADO.md` (líneas 59-60) y la fila de inventario de `docs/PLAN.md` (línea 1494) todavía cuentan `notificaciones.push`
  sin enforcement y con escritura directa: ya no.
- e2e completo: no (7.03-1, Nivel 2 por rls y estructura: lo corre el CI del PR; sin interfaz)
