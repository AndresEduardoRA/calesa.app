## 2026-11-11 — Paso 6.10-1: gastos y pagos en la base (parte 1 de 2 del 6.10)

- **Hecho:** gastos y pagos se escriben sólo por RPC `security definer`, y el monto en moneda base lo calcula la base.
  - `gasto_registrar`, `gasto_guardar`, `gasto_eliminar` y `gastos_prorratear` (por lote, `gastos.lote_id`).
  - `pago_registrar`, `pago_guardar`, `pago_eliminar` y `pago_confirmar`.
  - El tipo de cambio elegido vale en los dos sentidos: moneda → base multiplica y base → moneda divide. Se guardan su valor y su id (`tipo_cambio_id`,
    `restrict`).
  - Los montos llevan dos decimales y cada fila tiene su versión propia.
  - No se quita el último gasto de tributos que pide la fase actual: los tributos del vehículo se toman `for update` en orden de id.
  - El sello de un pago confirmado (quién y cuándo) lo ponen triggers. Un pago confirmado no cambia, salvo `eliminado_en` y `lead_id` → nulo.
  - Sin policies de crear ni editar, y sin insert, update ni delete (de tabla ni de columna) para `authenticated`.
  - `logistica.pagos.confirmar` sale de las excepciones de `supabase/tests/permisos-enforcement.sql`.
  - `matriz-leads.sql` prueba `trg_lead_visible` como dueño de la base.
- **Commits:**
  - `c9f8b421`: registrar gastos.
  - `967b1d5f`: guardar y eliminar gastos, con el tributo.
  - `c43b18dd`: prorratear, con las carreras K2 y K3.
  - `a50a672c`: pagos sin confirmar.
  - `ee735c99`: confirmar sellado, con K1.
  - `12c128a9`: sin escritura directa.
  - `e3a53c1e`: la prueba de `lead_id` que pidió la auditoría del informe.
- **Verificación** (`.piloto/salidas/6.10/`):
  - `db:probar` entero en el hook: 778 ✓ y 0 ✗.
  - `areas/dinero/*.sql` en PGlite y contra el Postgres 17 local.
  - `pnpm db:carreras`: todas en verde, con K1, K2 y K3.
  - `db:lint`: sin avisos en las funciones nuevas.
  - `scripts/guardas`: 1.044 ✓. `typecheck` en verde.
  - Mutaciones M1–M8 de dinero, sello y candados: cada una cae con su prueba.
  - Plan auditado (bloquea, corregido sin 2.ª ronda) e informe auditado (observaciones, atendidas).
- **Para PLAN (coordinador):**
  - Fila 6.10: «Partes: 2 (era 4). **6.10-1** hecho: registrar, guardar, eliminar y prorratear gastos; registrar, guardar, eliminar y confirmar pagos;
    sin escritura directa. **6.10-2**: storage de `comprobantes` por carpeta de unidad, `gastos_listar` y `pagos_listar` por cursor,
    `margen_vehiculo.por_categoria` con sus tres asserts y el del comprobante de otro origen, y `pago_anular` (si no cabe, el abierto 6-3)».
  - En el Assert, `scripts/carreras/pagos-confirmar.mjs` pasa a `supabase/tests/areas/dinero/carreras.mjs`. La carrera vive en el área y
    `scripts/carreras.mjs` la engancha (D15).
  - 4-64: `scripts/carreras.mjs` pasa de 371 a 374 líneas.
- **Para ESTADO:**
  - `logistica.pagos.confirmar` sale de «Deuda aceptada» (permisos sin enforcement): ya lo exige `pago_confirmar()`.
  - Los pagos de un proyecto de repuestos no se registran hasta el paso de repuestos (D9).
- **Para 6.10-2:** `pago_anular` decide si `eliminado_en` de un pago confirmado sólo va de nulo a no nulo. Hoy el trigger lo deja volver a nulo, aunque sólo
  pueden hacerlo el dueño de la base o `service_role`.
- **6.10 sigue:** falta el **6.10-2**. Este PR no marca integrado el paso (`parcial: true`).
- e2e completo: no (6.10-1, Nivel 2 por rls y estructura: lo corre el CI del PR; sin interfaz)
