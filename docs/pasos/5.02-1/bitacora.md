## 2026-11-11 — Paso 5.02-1: la base del módulo `flujos` (parte 1 de 2 del 5.02)

- **Hecho:** `flujos` partido en un núcleo y siete áreas vacías (`fases`, `transiciones`, `requisitos`, `reglas`, `documentos`, `revisar`, `mover`) con sus tres
  entradas, sus lugares (`features|entities|infra/<área>/`) y su `pantallas/<área>.ts`; la raíz sólo hace `export *`; `scripts/guardas/areas-de-flujos.test.ts` lo
  vigila (un área no importa otra, el núcleo no importa áreas, nada de carpetas sin dueño). El núcleo lee el flujo entero para configurarlo
  (`entities/flujo.ts`: `FlujoParaConfigurar`, con la versión como texto; `leerFlujoParaConfigurar()` y `leerFlujosConfigurables(permisos)`, con tope por tabla y la
  bandera `truncado`). `equipo` suma `leerRolesParaElegir()`. Se cierran 4-102 (botones de `<Confirmar>` con `min-h-11 md:min-h-9`) y 4-48 (la línea de la ficha de xcell).
- **Commits:** `ac0b0e3f` (áreas y guarda), `3e01181a` (el flujo para configurar, con `flujo.test.ts`), `c9bb2503` (roles para elegir), `e96d0187` (4-102),
  `ca46ff94` (4-48).
- **Verificación** (`.piloto/salidas/5.02/`): `scripts/guardas` entero, 33 archivos y 1.043 pruebas en verde; `src/modules/flujos` y `equipo/entities` en verde; `tsc` y
  `eslint` sin avisos; e2e dirigidos a `<Confirmar>` (`e2e-dirigidos.txt`): tarjeta-descartar, fórmula-descartar y papelera-purgar, 19 ✓ en escritorio y celular.
- **5.02 sigue:** falta el **5.02-2** (C6 a C12 del plan: la ruta `/configuracion/flujos`, la sección, el paso «Flujo» de Orígenes con `?origen=`, el selector, la lista de
  fases de sólo lectura, el inspector `?fase=`, `useVersionDelFlujo()` y `e2e/configuracion-flujos.spec.ts`). Este PR no marca integrado el paso (`parcial: true`).
- e2e completo: no (5.02-1, Nivel 2 por `src/shared/ui/confirmar.tsx`: lo corre el CI del PR; sin pantalla nueva)
