## 2026-11-12 · Paso 8.10-3: reasignar, la vista «Stock» de `/repuestos` y el e2e del assert (parte 3 de 3)

### Hecho

- Reasignar del lado servidor: la respuesta de `repuesto_stock_reasignar` (`respuestaDeReasignarDesde`, con test), el método `reasignar` del repositorio, su infra y
  la action `reasignarStock` (`repuestos.editar` con `puede()` antes; el `id` del ítem nuevo lo crea el navegador y la RPC es idempotente por él). Sin SQL nuevo.
- El buscador de proyecto destino: la action `buscarProyectosAbiertos` del área `proyectos` (`repuestos.editar`; una página de `TAMANO_DE_VER_MAS` de abiertos por el
  repositorio, sin el de origen, devuelve sólo `{ id, titulo, apoyo }`), el ayudante `buscarProyectoAbierto` por `pantallas/proyectos.ts` y
  `src/app/(app)/repuestos/buscador-de-proyecto-destino.tsx` sobre `BuscadorConLista`.
- La vista «Stock» de `/repuestos` (`?vista=stock`, enlaces «Proyectos» y «Stock» arriba): ítem, proyecto de origen (con «Cerrado»), cantidad y desde cuándo, por
  cursor sin filtros; la fila abre el ítem en la hoja de su proyecto con su panel de stock. `pantallas/stock-vista.ts`.
- En el «⋯» de la fila (sólo con `repuestos.editar`): «Reasignar a un proyecto», «Vender suelto» y «Devolver al proveedor», cada uno un drawer con URL
  (`?panel=reasignar-stock|vender-stock|devolver-stock&item=<id>`), registrados en `scripts/guardas/areas-c/drawers-con-salida.ts`.
- `e2e/repuestos-stock.spec.ts` con el assert completo: pasar 2 → aparecen en «Stock» → reasignar 1 → queda 1 y hay un ítem nuevo allá; al final vende suelto lo que queda.

Commits: `b1e6e8f9`, `799e5fc6`, `ed24bcd8`, `9be2c3db`, `15731d48`, `093e6099` y el de docs.

### Verificación

- e2e dirigidos `repuestos-stock` y `repuestos-listado` en escritorio y movil, con `E2E_SIN_FUNCIONES=1`: 10 de 10 (`.piloto/salidas/8.10-3/e2e-dirigidos.txt`).
- `e2e/presupuesto-js.spec.ts` sobre el mismo build: 10 en verde (`/repuestos` no tiene presupuesto propio) (`.piloto/salidas/8.10-3/presupuesto-js.txt`).
- `vitest` de `scripts/guardas` y `src/modules/repuestos`: 1.273 en verde (`.piloto/salidas/8.10-3/vitest.txt`); `pnpm typecheck` limpio y `eslint` sin avisos
  (`.piloto/salidas/8.10-3/verif-c5.txt`); `lint` en cada commit (hook).
- Sin SQL: no corre `db:*` (la base del assert, `stock.sql`, `stock-reasignar.sql`, `stock-listar.sql` y `scripts/carreras/repuestos-stock.mjs`, es de 8.10-1).

### Para copiar a `docs/PLAN.md` (la sesión de un carril no edita el PLAN)

- 8.10 hecho (3 de 3): reasignar del lado servidor, la vista «Stock» de `/repuestos` con «Reasignar a un proyecto», «Vender suelto» y «Devolver al proveedor», y el
  e2e del assert completo (`e2e/repuestos-stock.spec.ts`).

e2e completo: no (8.10-3, Nivel 1: lo corre el CI del PR; dirigidos repuestos-stock y repuestos-listado en escritorio y movil)
