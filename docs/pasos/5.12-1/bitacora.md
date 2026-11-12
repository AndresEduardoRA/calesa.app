## 5.12-1 · «Revisar»: la base de `revisar_flujo()` (2026-11-12)

Parte 1 de 2 (`parcial: true`). Migración `20261112044537_revisar_flujo_avisos.sql`: `create or replace revisar_flujo()` desde la base, misma firma, ahora
plpgsql. Sólo responde a quien configura el flujo (antes cualquier `authenticated` leía los nombres de fases de cualquier flujo) y suma `rol_sin_personas`
(fase y salida), `entrada_no_automatica` (info, vehículos), `tipo_documento_inactivo` y `salida_a_jubilada`; los ocho códigos de antes, iguales. Grants
reescritos (`revoke … from public, anon`, `execute` a `authenticated` y `service_role`). Sin tabla, policy ni permiso nuevo; `database.types.ts` sin cambio.

Pruebas: `supabase/tests/flujos-revisar.sql` (R1–R7, por `codigo` y `fase_id`), en la lista fija de `probar-schema.mjs`. Contra la función vieja caen R1, R3,
R4, R5 y R6. `db:probar` completo y `db:lint` en verde. Compuerta de datos (toca `security definer` y un permiso): la cubre la decisión vigente «aprobar»
(`PILOTO_AUTO=todo`); el informe pasó por el auditor.

Sigue **5.12-2** (servida en `.piloto/planes/5.12-1.md` › «5.12-2 servida»): `entities/revisar/avisos.ts` con test, la lectura, la franja en el hueco
`franjaDeRevisar` y `e2e/configuracion-flujos-revisar.spec.ts`.

- e2e completo: no (5.12-1, Nivel 1, sólo base: sin e2e dirigido; lo prueba el CI del PR)
