## 2026-11-11 — Paso 6.10-2: comprobantes, listas, margen por categoría y anular un pago (parte 2 de 2 del 6.10)

- **Hecho:**
  - El bucket `comprobantes` se lee por la fila que nombra el objeto (`comprobante_puede`): un gasto pide `logistica.gastos.ver` de su unidad, un pago lo
    que pide «pagos: leer» y una compra `repuestos.costos.ver`. Un objeto que ninguna fila nombra lo lee quien puede subir a esa carpeta. Subir pide editar
    gastos o pagos de la unidad viva, con la forma `<unidad>/<sha-256>.<ext>` (nunca 22P02). Índices parciales sobre `comprobante_ruta`.
  - `gastos_listar` y `pagos_listar`: por cursor `(fecha desc, id desc)` sobre `gastos_fecha_idx` y `pagos_fecha_idx`, tope
    `_acotar_pagina(p_tope, 50, 100) + 1`, alcance resuelto una vez, sin total. Filtros cerrados en `_dinero_filtros` (22023 con la clave en el hint).
  - `margen_vehiculo` suma `por_categoria`. Un vehículo inexistente o en la papelera da 42501 en vez de ceros.
  - `pago_anular`: confirmado, de vehículo, con motivo. Toma en orden de id los confirmados del vehículo y no deja sin cumplir `pagos.confirmado` ni
    `pagos.umbral_pct` de la fase actual. Deja `pago.anulado` en `actividad`. Un anulado no vuelve (`pago_sellado`).
  - `aplicado_en` de `logistica.gastos.ver`, `logistica.pagos.ver` y `logistica.pagos.confirmar`, en las migraciones y en `seed.sql`.
- **Commits:**
  - `c0263b69`: comprobantes por la fila que los nombra.
  - `58c3c911`: `gastos_listar`.
  - `8eb8bab7`: `pagos_listar`.
  - `f3fa5603`: margen por categoría.
  - `86ab1d2e`: `pago_anular`, con K4.
  - `fix(db)`: las listas, con cursor y sin cursor en dos consultas (lo pidió la auditoría del informe).
- **Verificación** (`.piloto/salidas/6.10-2/`):
  - `db:probar` entero en el hook de cada commit, el último con 802 ✓ y 0 ✗.
  - Contra el Postgres 17 local (psql, `ON_ERROR_STOP`): `comprobantes.sql` (el storage real admite el insert como `authenticated`), `listar.sql`,
    `margen.sql` y `anular.sql`, todos con exit 0.
  - `pnpm db:carreras`: todas en verde, con K1–K4.
  - `db:lint`: sin avisos en las funciones nuevas (`_dinero_filtros` pasó a `stable` por el cast a fecha).
  - `scripts/guardas`: 1.044 ✓. `typecheck` en verde.
  - Mutaciones M1–M5 (margen, anular, candado y sello): cada una cae con su prueba.
  - `nivel.mjs` sobre el diff: Nivel 2 (rls y estructura), sin interfaz.
- **Para PLAN (coordinador):**
  - Fila 6.10: «Partes: 2. **6.10-1** hecho (…). **6.10-2** hecho: comprobantes leídos por la fila que los nombra y subidos a la carpeta de su unidad;
    `gastos_listar` y `pagos_listar` por cursor; `margen_vehiculo.por_categoria`; `pago_anular`.» El Assert «ni su comprobante» lo cubre
    `supabase/tests/areas/dinero/comprobantes.sql`.
  - El abierto **6-3** (`pago_anular`) se cierra.
  - Abierto nuevo: anular un pago a la vez que el vehículo entra a una fase que pide `pagos.confirmado` no toma candado del vehículo (el mismo hueco que los
    tributos de 6.10-1, C7).
  - A **6.11** (fila y `terminado` en `docs/plan.yaml`): registra `gastos_listar` y `pagos_listar` en `scripts/guardas/areas-c/paginas-en-la-base.ts` con
    `pideElCodigo: TAMANO_DE_PAGINA_POR_DEFECTO`, al llamarlas desde `infra/` (hoy `paginas.test.ts` rompe con una entrada que nadie llama). Subir un
    comprobante no usa `upsert` (no hay policy de update), y «ya existe» al resubir el mismo hash cuenta como éxito.
- **Para ESTADO:**
  - 6.10 completo.
  - Los gastos y pagos viejos sin `tipo_cambio_id` no se migran: al corregirlos, la base pide el tipo (23502, hint `tipo_cambio`). En local no hay ninguno.
- **Para RENDIMIENTO:**
  - `gastos_listar`: tope 100 + 1, `gastos_fecha_idx`, sin medición (tabla fuera de la lista de las que crecen).
  - `pagos_listar`: tope 100 + 1, `pagos_fecha_idx`, sin medición.
- e2e completo: no (6.10-2, Nivel 2 por rls y estructura: lo corre el CI del PR; sin interfaz)
