## 2026-11-12 — Paso 6.08-4: «Editar grupo» y cierre (parte 4 de 4)

- **Hecho:** «Editar grupo» sobre `transporte_grupo_aplicar`, sin migración:
  - `entities/transporte/edicion-del-grupo.ts` (+ test): `valoresComunes` («Varios»), `cambiosDelGrupo` (sólo lo tocado; un «Varios» vacío no se toca), `esperadasDelGrupo`, `puedeEditarElGrupo`, textos del pie y del rechazo; `paneles.ts` suma `PANEL_EDITAR_GRUPO`.
  - `infra/transporte/guardar.ts` (`aplicarAlGrupo`), `features/transporte/{schemas/grupo,actions/aplicar-al-grupo}.ts` (esquema estricto, sin `notas`).
  - `features/transporte/`: `use-formulario-del-grupo`, `use-panel-del-grupo`, `campos-del-grupo`, `bloques-del-grupo`, `formulario-del-grupo`, `drawer-de-edicion-del-grupo` (diferido, registrado con su formulario), `boton-editar-el-grupo`; el resumen dibuja el botón.
  - `src/app/(app)/logistica/embarques/`: `page.tsx` (el panel tapa al resumen), `grupo-en-edicion.tsx`, `puedeEditarTransporte`.
  - `e2e/logistica-transporte.spec.ts` (escritorio): «Editar grupo» cambia el ETA de las 3 unidades de un contenedor; `soporte/transporte.ts`, `agregarUnidadAlContenedor`.
  - Docs: ficha de `logistica` y `docs/UX.md`.
- **Verificación** (`.piloto/salidas/6.08/`): vitest de `src/modules/logistica`, `src/app/(app)/logistica` y `scripts/guardas` (94 archivos, 1535 ✓); typecheck y eslint limpios; e2e escritorio `e2e-8.txt`: `logistica-transporte` 7 ✓ (el primer intento, `e2e-7.txt`, cayó por un supuesto del plan: ver D46).
- e2e completo: no (6.08-4, Nivel 1: lo prueba el CI del PR; dirigidos: logistica-transporte)

## Para el coordinador (cierre de la fila 6.08)

1. Mover la fila **6.08** de `docs/PLAN.md` (renglón de la tabla y su párrafo) a `docs/archivo/PLAN.md`.
2. `docs/ESTADO.md` por sustitución (≤ 60 líneas): 6.08 hecha en 4 partes; `/logistica/embarques` con «Editar grupo» y los catálogos de puertos y navieras en Configuración.
3. Ya estaban: GLOSARIO «Grupo (de transporte)» (6.08-3) y el e2e de la naviera en `configuracion-logistica` (6.08-1).
4. `docs/MAPA.md` no se versiona.
