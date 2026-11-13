## 2026-11-12 · Paso 8.13-1: el motor de mover acepta un ítem y `repuestos` cuenta las esperas (parte 1 de 5)

### Hecho

- `flujos` (área `mover`): `leerParaMover`, `previsualizarCambio` y `cambiarFase` aceptan `vehiculo` **o** `repuesto` (`entities/mover/unidad-a-mover.ts`, esquemas con `unidad` y `origenId` nulo
  para el ítem). Un ítem se mueve con `repuestos.mover` (`puedeMoverUnRepuesto`); su unidad se lee de `repuestos_items` bajo la RLS y sus destinos salen del flujo de repuestos. El lote no cambia.
- `repuestos` (área `flujo`): `esperasQueDestraban(vehiculoId)` sobre `repuestos_pendientes_de_vehiculo` (`p_tope` 50, la base devuelve una fila más): una fila por ítem con sus esperas y `hayMas`.
  Registrada en `scripts/guardas/areas-c/paginas-en-la-base.ts`.
- Fichas de `flujos` y `repuestos`. Sin migración ni pantalla.
- **La fila 8.13 pasa a 5 partes** (eran 4: el pago del proyecto exige una RPC): 8.13-2 panel del ítem, 8.13-3 «Cadena», hueco del vehículo y el assert, 8.13-4 bloques de Inicio y enlace,
  8.13-5 pagos del proyecto (Nivel 2, auditoría). Lo anota el carril `a` en `docs/PLAN.md`.

### Verificación

- Nivel 1: `para-mover.test`, `mover.test` (esquemas) y `esperas.test`; vitest de `scripts/guardas`, `flujos` y `repuestos/entities/flujo`: 1508 en verde.
- e2e completo: no (8.13-1, Nivel 1: lo prueba el CI del PR; dirigidos: ver informe)
