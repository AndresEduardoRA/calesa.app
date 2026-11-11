## 2026-11-11 — Paso 5.01-1: la versión del flujo, crear y guardar una fase, sin escritura directa

- **Hecho:** el 5.01 se partió en dos (5.01-2: mover, eliminar con versión, reactivar, impacto, el flujo de repuestos por migración). La versión de toda la configuración de
  un flujo es `flujos.actualizado_en`, que mueve siempre hacia adelante `flujo_version()` (reemplaza al trigger genérico, que daba la misma hora dos veces en una transacción).
  `_flujo_para_editar()` (inexistente → PT409; sin permiso → 42501 antes del candado; `for update`; versión → PT409) y `_flujo_tocar()` son el contrato, con firma estable.
  `fase_crear()` y `fase_guardar()` (`security definer`): lista cerrada (22023 con la clave en `hint`), tipos, validaciones con el campo en `hint` sobre la fila mezclada (los
  topes nuevos sólo sobre las claves que llegan), reglas del flujo (23514) y únicos humanos (23505). `authenticated` ya no escribe directo `fases` ni `flujos`: se borran
  «fases: crear», «fases: editar» y «flujos: editar» y sus grants. El candado es `for no key update` (el `fix` de la auditoría del informe: `for update` frenaba los
  cambios de fase por el `key share` de sus FK).
- **Verificación** (`.piloto/salidas/5.01/`): `db:reset`, `db:types` y `db:probar` en cada commit; las pruebas nuevas (`supabase/tests/areas/flujos/fases.sql` y
  `fases-guardar.sql`, 19 bloques) en verde; `db:carreras` en verde con K1 (dos guardados con la misma versión: B espera y recibe PT409) y K2 (quien no puede no espera el
  candado: 42501, no 55P03) y, tras el `fix`, K3 (el `key share` de las FK pasa con la fase y el flujo tomados; sin el `fix` caía con 55P03); `db:lint` sin avisos en las funciones nuevas; `scripts/guardas` (1.031) en verde; los e2e `origenes` y `vehiculos-vitrina` en escritorio (14 en
  verde). `nivel.mjs` con los archivos escritos: Nivel 2 por el disparador `rls`.
  e2e completo: no (5.01-1, Nivel 2: el completo lo corre el CI del PR por el disparador rls; cuenta 0 de 3)
- **Abiertos:** ninguno nuevo. 4-64: `scripts/carreras.mjs` 371 → 373. Seis commits de código y no cinco: `f2ffb5aa` dejó `fases.sql` en 317 líneas y `674bab7c` lo partió.
- **Commits:** `92a0d73c` feat(db): fijar la versión del flujo y el contrato para editarlo · `8fc121e1` feat(db): crear una fase por rpc con la versión del flujo ·
  `fa7db2d6` feat(db): guardar una fase por rpc con una lista cerrada de cambios · `f2ffb5aa` feat(db): quitar la escritura directa de fases y flujos · `fb163f03` test(db):
  carrera de dos guardados de fase con la misma versión · `674bab7c` test(db): llevar la prueba sin escritura directa a fases-guardar · `c65b38ef` fix(db): tomar el flujo sin frenar el key share de los cambios de fase (auditoría del informe) · y el de docs.
