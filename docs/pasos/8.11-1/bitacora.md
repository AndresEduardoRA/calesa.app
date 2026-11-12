## 2026-11-12 · Paso 8.11-1: la base de compras y margen de repuestos (parte 1 de 3)

### Hecho

- Migración `repuestos_compras_guardar`: `tipo_cambio_id` (con índice) y la versión propia (`trg_compra_version`); `repuesto_compra_guardar` (la esperada nula crea,
  idempotente por id; puesta, edita con `PT409`), `repuesto_compra_eliminar` y `repuesto_compra_restaurar`, con `repuestos.costos.editar` y `repuestos.ver`. La base
  pone `monto_base` y la tasa con el tipo de cambio por defecto vigente y los congela al editar el monto; la lista de datos es cerrada (mandar `monto_base` da 22023).
  Sin las policies de crear y editar ni INSERT, UPDATE o DELETE para `authenticated`.
- Migración `repuestos_compras_margen`: `repuestos_proyecto_margen` por moneda; nulo, no 0, con un ítem vivo sin precio o sin moneda; `sin_precio` hasta 201.
- `entities/compras/margen.ts` (`leerMargen`, `textoSinPrecio`) con su test.
- `aplicado_en` de `repuestos.costos.ver` y `repuestos.costos.editar` en la migración y en `seed.sql`; las cuatro RPC en `auditoria-leads.sql`; «Margen del proyecto»
  en el GLOSARIO; la ficha del módulo.

### Verificación

- `SOLO=areas/repuestos/{compras,compras-version,compras-margen}.sql pnpm db:probar`: B1–B8 y M1–M4 en verde (`.piloto/salidas/8.11-1/compras-partido.log`).
- `pnpm db:probar` completo dos veces: 1.352 y 1.358 en verde, 0 caídas (`.piloto/salidas/8.11-1/db-probar-{1,2}.log`). `pnpm db:lint`: nada en las funciones nuevas.
- Mutaciones de dinero (10): M1–M4, M3b, M5, M5b y M6–M8 hacen caer su prueba (`.piloto/salidas/8.11-1/mutaciones.log`).
- `vitest` de `scripts/guardas` y `entities/compras`: 1.128 en verde (`.piloto/salidas/8.11-1/vitest-guardas.log`). `pnpm typecheck` limpio.
- e2e dirigido `repuestos-proyecto` en escritorio: 6 de 6 (`.piloto/salidas/8.11-1/e2e-repuestos-proyecto.log`).

### Para copiar a `docs/PLAN.md` (la sesión de un carril no edita el PLAN)

- 8.11-1 hecha: la base de compras (`repuesto_compra_guardar`, `_eliminar`, `_restaurar`, `repuestos_proyecto_margen`), sin escritura directa en
  `repuestos_compras`, y `entities/compras/margen.ts`. **8.11 sigue:** 8.11-2 (pestaña «Compras», lista y margen) y 8.11-3 (Drawer, comprobante y e2e del registro).
- Abierto para «Pulido para la Fase 9» › seguridad: los pagos de un proyecto de repuestos (8.13; ver `docs/pasos/8.11-1/decisiones.md`).

e2e completo: no (8.11-1, Nivel 2: lo corre el CI del PR; dirigido repuestos-proyecto en escritorio)
