## 2026-11-11 — Paso 5.02-2: la pantalla `/configuracion/flujos` (parte 2 de 2: el 5.02 queda completo)

- **Hecho:** la ruta `/configuracion/flujos` con su sección en el hub, el selector (un origen por pestaña y «Repuestos»; `?origen=`, `?ambito=repuestos`), la lista de fases de sólo lectura
  (en el orden de la base, con «Inicial», «Final» y «Jubilada»), el inspector `?fase=<id>` con tres bloques de lectura y sus huecos, `useVersionDelFlujo()` con el aviso de conflicto,
  los huecos de cada área y sus carpetas en `src/app`; el paso «Flujo» de Orígenes enlaza con `?origen=<id>`. Docs: UX (fila y estados), GLOSARIO (versión del flujo, inspector de fase) y ficha.
- **Encontrado al correr el e2e:** la lectura de 5.02-1 caía en la base real: `fases_requisitos` apunta dos veces a `fases` y PostgREST responde ambiguo. Se nombró la FK
  (`fases!fases_requisitos_fase_id_fkey!inner`). Los tests de 5.02-1 usaban filas de mentira: una lectura nueva con embebidos se prueba contra la base.
- **Commits:** `5959eebd` (selector y textos), `03b54158` (pantalla del módulo), `417441ac` (ruta y enlace de Orígenes), `e3be4bbe` (fix de la lectura), `9861b1a7` (docs de la pantalla), `69aa8737` (e2e).
- **Verificación** (`.piloto/salidas/5.02/`): `scripts/guardas`, `src/app` y `src/modules/flujos` en verde (53 archivos, 1.173 pruebas); `tsc` y `eslint` sin avisos;
  e2e `escritorio`: `configuracion-flujos.spec.ts` 3 ✓ y `origenes.spec.ts` ✓ (el paso «Flujo» ahora tiene enlace: 2 «Abrir» y 1 «próxima etapa»).
- **Para 5.04:** pasar `inspector-de-fase.tsx` de `sinFormulario` a `formulario` en `drawers-con-salida.ts` (D13); llenar `huecos.ts` y las pestañas de su área.
- **Pendiente de la ruta:** `/configuracion/flujos` no está en `e2e/soporte/presupuestos.ts`; si el CI mide su JS en frío puede pedir una línea en `docs/RENDIMIENTO.md`.
- e2e completo: no (5.02-2, Nivel 2 por src/shared/lib/rutas.ts: lo corre el CI del PR; un solo e2e de la pantalla nueva)
