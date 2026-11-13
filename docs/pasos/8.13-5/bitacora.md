## 2026-11-12 · Paso 8.13-5: los pagos del cliente del proyecto de repuestos (parte 5 de 5, la última)

### Hecho

- **Base:** `pago_registrar_proyecto` (migración `20261113024244_repuestos_pagos_registrar.sql`), gemela de `pago_registrar` para el proyecto: `repuestos.costos.editar` y
  `repuestos.ver`, el proyecto `for share`, crear sólo con el proyecto abierto, idempotente por id, sin lead, NaN y tres decimales rechazados. `aplicado_en` de
  `repuestos.costos.editar` en la migración y en `seed.sql` (escrito entero, idéntico al del seed: ninguna migración anterior lo fijaba). Prueba
  `supabase/tests/areas/repuestos/pagos.sql` (P1–P7) y carreras K5/K6 en `supabase/tests/areas/dinero/carreras-proyecto.mjs`.
- **Logística:** el hueco de pagos se parte en `CuerpoDePagos` (el del vehículo no cambia) y `PagosDelProyecto` (ámbito `proyecto` por contexto), por
  `pantallas/dinero-proyecto.ts` con `diferido()`; sin «Anular» en la lista ni por `?panel=anular-pago`.
- **Repuestos:** pestaña «Pagos» de `/repuestos/[id]` con `repuestos.costos.ver`, tras «Compras». La sección quedó en línea en `page.tsx` (175 líneas), sin el
  `seccion-pagos.tsx` que nombraba el plan: no lee nada en el servidor.
- **Para `docs/PLAN.md` (lo anota el carril `a`):** la fila 8.13 queda **hecha, en 5 partes**. Abiertos nuevos: **8-13d** (anular un pago confirmado de un proyecto), **8-13e**
  (eliminar el último pago vivo que sostiene `proyecto.pago_cliente` de la fase actual de un ítem), **8-13f** (`pago_registrar` de vehículo acepta NaN). 8-13a, 8-13b y 8-13c siguen.
- **Para `docs/UX.md` › «Repuestos: proyecto»:** pestaña «Pagos»: vacío «Este proyecto no tiene pagos registrados.»; «Registrar pago» siempre a la vista, apagado con su motivo
  («Necesitas el permiso de editar costos para registrar pagos.» o «El proyecto está cerrado: reábrelo para registrar pagos.»); confirmar dice que queda sellado «ni anular por ahora».

### Puntos del `security definer` (para el auditor)

`set search_path = ''` y todo calificado; `assert_activo` → `assert_permiso('repuestos.costos.editar')` → `assert_permiso('repuestos.ver')`; `revoke … from public, anon`,
`grant … to authenticated, service_role`; candado `for share` del proyecto (K6); idempotencia `on conflict do nothing` + relectura (K5); comprobante en la carpeta del proyecto
(`_pago_validar`); el monto en base, la tasa y `creado_por` los pone la base.

### Verificación

- `db:reset`, `db:types`, `db:probar` completo (1392 ✓, 0 ✗; la primera corrida dio 8 ✗ y dejó `probar-todo.fin` = 1; la segunda, cuyo log es el que queda, salió con 0
  según la consola de la sesión, sin `.fin` propio), `db:carreras` en verde. Mutaciones a mano: permiso (P1), `on conflict` (K5), cerrado (P4), NaN (P3).
- vitest related y `scripts/guardas` (1139) en verde; e2e dirigidos `repuestos-pagos` (escritorio y movil), `logistica-gastos-y-pagos`, `repuestos-compras`,
  `repuestos-proyecto`, `repuestos-item-panel`: 29 en verde. Salidas en `.piloto/salidas/8.13-5/`.
- Nivel 1 (no Nivel 2 como decía la partición: `nivel.mjs` sin disparadores). Plan e informe auditados (`observaciones`, atendidas).
- e2e completo: no (8.13-5, Nivel 1: lo prueba el CI del PR; dirigidos: repuestos-pagos, logistica-gastos-y-pagos, repuestos-compras, repuestos-proyecto, repuestos-item-panel)
