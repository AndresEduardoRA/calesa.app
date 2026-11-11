## 2026-11-11 — Paso 5.01-2: mover, eliminar con versión, reactivar, impacto y el flujo de repuestos

- **Hecho:** cierra el 5.01. `fase_mover()` renumera todo el flujo de 10 en 10 sin `orden` repetido; `_fase_uso()` es la única regla de lo que usa una fase (conteos con
  tope 50, lee 51) y la leen `fase_impacto()` (lectura con permiso, sin candado) y `fase_eliminar(p_fase, p_actualizado_en_esperado)`, que reemplaza a la vieja (se borra
  su firma), toma la fase `for update` antes de contar y devuelve `{accion, version}`; `fase_reactivar()` valida las reglas del flujo. Las cuatro son `security definer`
  con el contrato `_flujo_para_editar`/`_flujo_tocar`. El flujo de repuestos lo garantiza una migración (7 reglas, sin fases) y la semilla siembra sus fases si no tiene.
  `escala.sql` pierde la excepción de `fase_eliminar`.
- **Verificación** (`.piloto/salidas/5.01-2/`): `db:reset`, `db:types` y `db:probar` completo en cada commit de migración (0 ✗); las pruebas nuevas
  (`supabase/tests/areas/flujos/fases-mover.sql`, `fases-impacto.sql`, `fases-eliminar.sql`, `fases-reactivar.sql`, 12 bloques) en verde, con 42501 para el asesor y
  para `flujos.configurar` de otro origen en las cuatro RPC nuevas (crear y guardar ya lo probaba el 5.01-1: «las seis»); `db:carreras` en verde con K4 (eliminar espera
  al cambio de fase que entra y jubila; sin el `for update` cae con el `23503` crudo, medido); `db:lint` sin errores (avisos «never read variable» en `fase_mover` y
  `fase_eliminar`); `scripts/guardas` (1.044) en verde; el e2e `configuracion-flujos` en escritorio (3 en verde). `nivel.mjs` con los archivos de esta parte: Nivel 1;
  el PR lleva el `rls` del 5.01-1.
  e2e completo: no (5.01-2, Nivel 2 por el rls del 5.01-1 en el mismo PR: el completo lo corre el CI; cuenta 0 de 3)
- **Abiertos:** ninguno nuevo. `supabase/tests/areas/flujos/carreras.mjs` 153 → 209 líneas.
- **Commits:** `c0c2b69d` feat(db): mover una fase con la versión del flujo · `03720119` feat(db): leer el impacto de jubilar o eliminar una fase · `d9e0f70f` feat(db):
  eliminar una fase con la versión del flujo · `d4bf3e5a` feat(db): reactivar una fase jubilada con la versión del flujo · `09e31da9` feat(db): garantizar el flujo de
  repuestos por migración · `7cba0c86` test(db): carrera de eliminar una fase mientras entra un cambio · y el de docs.
