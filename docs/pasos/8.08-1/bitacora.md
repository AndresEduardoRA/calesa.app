## 2026-11-12 · Paso 8.08-1: la base de repuestos (parte 1 de 3 del 8.08)

- **Hecho:**
  - **Proyectos por RPC.** `repuesto_proyecto_crear` (de un vehículo que se ve o externo; uno por vehículo), `_cerrar`, `_reabrir`, `_eliminar` (sólo vacío)
    y `_restaurar` (el «Deshacer»). Toda RPC que escribe pide `repuestos.editar`. Sin INSERT directo ni UPDATE de `cerrado_en`, `eliminado_en` o
    `vehiculo_id`; un `check` impide etiqueta o VIN propios en un proyecto con vehículo.
  - **Ítems por RPC.** `repuesto_item_crear` nace el ítem en la única inicial activa del flujo de repuestos con su fila de historial (sin fase si hay que
    decidir); `repuesto_item_eliminar` sólo borra uno sin otra fase, documentos, compras, gastos ni stock. Sin INSERT directo de `repuestos_items`.
  - **Lista.** `repuestos_proyectos_listar` por cursor sobre `numero desc`, sólo vivos, con cuentas de hasta 201 ítems por proyecto.
  - **Esperas.** `evaluar_requisitos` (rama `hijos`): un ítem que terminó sin llegar («Perdido») ya no frena al vehículo; el `detalle` suma `sin_llegar`.
    `repuestos_pendientes_de_vehiculo` dice qué ítems esperan las fases siguientes de un vehículo.
  - **Catálogos.** Un valor en uso (ítem, aun eliminado, o línea de cotización) no se borra: 23514 hint `en_uso`.
  - Decisiones en `decisiones.md` (D1–D18). La auditoría del plan bloqueó (eliminar y restaurar sin permiso explícito) y se resolvió en el plan; la del
    informe dejó observaciones (esta bitácora, D17 y D18).
- **Commits:** `0a203175` (proyectos), `97e3d3d5` (ítems), `1ce1baa4` (lista), `b54ac02a` (esperas), `4c9d411a` (pendientes), `6f561aca` (catálogos) y
  el de docs.
- **Falta (8.08-2 y 8.08-3):**
  - 8.08-2: el esqueleto por áreas del módulo, `RUTAS.repuestos` y `RUTAS.configuracionDeRepuestos`, la lectura y las acciones de catálogos sin pantalla.
  - 8.08-3: `/configuracion/repuestos` con la pestaña «Catálogos» y el hueco «Cotizador», y `e2e/configuracion-repuestos-catalogos.spec.ts`.
- **Abiertos de `docs/PLAN.md` que cierra:** la contradicción 3 («Esperas», `:1813`); «el flujo de repuestos sólo nace en `seed.sql`» (sin una sola
  inicial el ítem nace sin fase); «quitar escrituras directas» de proyectos e ítems (queda `UPDATE(en_stock_desde)`, que quita 8.10).
- **Pedidos al coordinador:**
  - Una línea en `src/modules/flujos/CLAUDE.md`: «`evaluar_requisitos` (rama `hijos`) cuenta `sin_llegar` con `_repuesto_ante_espera` de repuestos (8.08-1);
    si se recrea, conservarla».
  - Sumar la carrera «eliminar un proyecto mientras se crea un ítem» a `scripts/carreras/repuestos-stock.mjs` en el 8.10 (D10).
- **Verificación** (`.piloto/salidas/8.08/`):
  - `db:probar` completo tras el último commit de SQL: 1.123 ✓, ningún ✗ (`probar-2.txt`).
  - `esperas.sql` contra HEAD: E3 y E5 caían por la regla (`probar-esperas-contra-head.txt`).
  - `db:lint`: sin errores; ningún aviso de las funciones nuevas. `scripts/guardas`: 1.073 ✓. `typecheck` ✓. `mapa.sh --check` ✓.
- e2e completo: no (8.08-1, Nivel 2 por rls: lo corre el CI del PR)
