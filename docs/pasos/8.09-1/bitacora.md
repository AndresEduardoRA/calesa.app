## 2026-11-12 · Paso 8.09-1: el listado `/repuestos` y «Nuevo proyecto» (parte 1 de 4 del 8.09)

### Hecho

- El estado derivado de un proyecto (`entities/proyectos/estado.ts`: cerrado, sin ítems, en curso, completo), el pedido y el cursor numérico del listado
  (`listado.ts`: `?q=`, `?estado=`, `?por=`, `?cursor=`, `MAXIMO_DE_PAGINA_DE_REPUESTOS` = 100), el borrador del formulario con su validación y el error de la base junto a
  su campo, con tests.
- `infra/proyectos/`: `leerProyectosDelListado` (`repuestos_proyectos_listar`, una sola llamada, la base suma la fila de más) y `crear` (`repuesto_proyecto_crear`,
  idempotente por id); la action `crearProyecto` (`repuestos.editar`).
- `/repuestos` (`repuestos.ver`; sin ella, «No tienes permiso»): tabla desde 768 px y tarjetas debajo sobre `ui/lista`, los cinco estados (esqueleto, vacío, vacío por
  filtro, página sin filas, error por `error.tsx`), «Siguiente» y «Volver al principio» sin «Anterior».
- «Nuevo proyecto» (`N`, `?panel=nuevo-proyecto`): de un vehículo o externo, con borrador en `sessionStorage`, avisos de conexión y `<PieDelPanel>`; un `?vehiculo=`
  válido lo abre vinculado. Los dos buscadores (vehículo y lead; combobox con teclado, cancelan la búsqueda vieja) los compone `src/app`.
- Registros de las guardas: `repuestos_proyectos_listar` en `paginas-en-la-base.ts` (cierra el abierto de 8.08-1) y el drawer en `drawers-con-salida.ts`.

### Commits

- `feat(repuestos): estado y pedido del listado de proyectos`
- `feat(repuestos): leer y crear proyectos`
- `feat(repuestos): listado de proyectos en /repuestos`
- `feat(repuestos): buscadores de vehículo y de lead para la página`
- `feat(repuestos): drawer nuevo proyecto con el atajo n`
- `test(repuestos): recorrido del listado y de crear un proyecto`

### Verificación

- `e2e/repuestos-listado.spec.ts`: 6 de 6, escritorio y celular (`.piloto/salidas/8.09-1/e2e-listado.txt`). Un primer intento cayó por un `getByLabel` ambiguo y
  por la carrera del atajo `N` antes de hidratar (el «Nuevo lead» de respaldo lo toma); ambos son del spec.
- `vitest` de `src/modules/repuestos`, `src/app/(app)/repuestos` y `scripts/guardas`: en verde. `typecheck` y `lint` sin avisos.
- 8.09 sigue: faltan las partes 2 a 4 (detalle, hoja de ítems, imágenes y `<ResumenRepuestos>`).
- e2e completo: no (8.09-1, Nivel 1: lo corre el CI del PR; dirigido repuestos-listado en verde)
