## 2026-11-12 · Paso 8.09-4: resumen en la ficha del vehículo y eliminar proyecto (parte 4 de 4: cierra el 8.09)

### Hecho

- Antes de empezar, `git merge origin/main` (choques en dos registros de `scripts/guardas/areas-c/`, se conservaron ambos lados).
- Lectura: `proyectoDe(vehiculoId)` y `leerResumenDeVehiculo` (área `proyectos`), con `resumirItems` y `ofertaDelResumen` puros y su test.
- Pantalla: `<ResumenRepuestos>` y su esqueleto (`pantallas/proyectos-vehiculo.ts`) y la pestaña «Repuestos» de `/vehiculos/[id]`.
- «Eliminar proyecto» con «Deshacer»: dos actions, repositorio e infra sobre las RPC que ya existían. Sin migración.
- Los dos e2e que contaban las pestañas de la dueña (`vehiculos-cotizaciones`, `vehiculos-alta`) suman «Repuestos».

### Commits

- `feat(repuestos): leer el proyecto y el resumen de un vehículo`
- `feat(repuestos): resumen de repuestos para la ficha del vehículo`
- `feat(vehiculos): pestaña repuestos en la ficha del vehículo`
- `feat(repuestos): eliminar un proyecto vacío con deshacer`
- `fix(vehiculos): la barra de pestañas se desplaza sola en el celular`
- `test(repuestos): recorrido desde la ficha y eliminar un proyecto`

### Verificación

- `vitest` de `src/modules/repuestos`, `scripts/guardas` y `src/app/(app)/vehiculos`: en verde (1.203 en repuestos y guardas). `eslint --max-warnings 0` y `pnpm typecheck` sin avisos.
- e2e (escritorio y celular): `repuestos-proyecto-ficha`, `vehiculos-cotizaciones`, `vehiculos-fotos` y `vehiculos-alta`: 35 de 35 (`.piloto/salidas/8.09-4/e2e5.txt`); en la primera corrida `repuestos-proyecto`, `repuestos-listado` y `vehiculos-alta` pasaron y cayeron tres de `movil` por la barra de pestañas (D79), ya arreglada.

### Para copiar a `docs/PLAN.md` (la sesión de un carril no edita el PLAN)

- 8.09-4 hecha: `<ResumenRepuestos>` en la pestaña «Repuestos» de `/vehiculos/[id]` (`pantallas/proyectos-vehiculo.ts`), `proyectoDe`, eliminar un proyecto vacío con «Deshacer»; **8.09 completa**.

e2e completo: no (8.09-4, Nivel 2: lo corre el CI del PR; los dirigidos en verde)
