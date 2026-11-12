## 2026-11-12 — Paso 6.07-1: la escritura del transporte en la base (parte 1 de 3 del 6.07)

- **Hecho:** `transportes` se escribe sólo por RPC `security definer`, con versión, permiso por origen y lo que la fase exige.
  - `transporte_guardar(vehículo, repuesto, versión, cambios)`: la fila 1:1 de una unidad. Esperada nula = crear; si ya existe, PT409. Lista cerrada de
    cambios; contenedor y booking en mayúsculas y sin espacios; las reglas `transporte` y `contenedor`, `permite_contenedor` y la oferta del flujo frenan
    sólo lo nuevo.
  - Trigger `trg_transporte_exigido`: no se vacía un dato que la fase actual exige como bloqueante (23514 con la columna en `hint`), por ningún camino.
  - `transporte_grupo(tipo, clave)` y `transporte_grupo_aplicar(tipo, clave, versiones, cambios)`: leer y editar un embarque (booking) o contenedor,
    todo o nada, hasta 200 unidades.
  - Candados en un orden fijo: guardar toma la unidad y después la fila; aplicar, las filas por id y después todas las unidades de una pasada, por id.
  - Sin policies de crear ni editar y sin insert, update ni delete para `authenticated`. El comentario de la tabla ya no nombra la vista `embarques`.
- **Commits:**
  - `668706f8`: guardar el transporte de una unidad.
  - `5a05dd37`: lo que la fase exige.
  - `a7b032f2`: sin escritura directa.
  - `0d53cf11`: leer y aplicar a un grupo.
  - `b3b83655`: las carreras K1–K4.
- **Verificación** (`.piloto/salidas/6.07-1/`):
  - `db:probar` entero en PGlite: 1.118 ✓ y 0 ✗ (16 del transporte: T1–T5, X1–X4, E1, G1–G6).
  - Carreras del transporte contra el Postgres local: 6 ✓. Con las unidades tomadas en el orden de `transportes.id` (a mano, sin versionar), K3 cae.
  - `db:lint` sin errores; `scripts/guardas` 1.073 ✓; `typecheck` limpio.
  - Plan auditado (bloquea, corregido sin 2.ª ronda) e informe auditado (bloquea: permiso antes del candado en aplicar y la papelera, corregidos).
- e2e completo: no (6.07-1, Nivel 2: lo corre el CI del PR; sin interfaz, sin dirigidos)
- **Sigue:** 6.07-2 (la escritura de aduana) y 6.07-3 (las lecturas paginadas), servidas en el plan del paso.
- **Para PLAN (coordinador):** 6.08 debe mostrar con un mensaje humano el 23514 al borrar una naviera exigida (D17).
