## 2026-11-06 — Paso 4.24-2: la pantalla de la papelera de cotizaciones, con restaurar, y su enlace junto a «Nueva cotización»

- **Hecho:** pantalla pura, tres commits. `/cotizaciones/papelera`: los lotes por cursor (5 por página, con las primeras 20 de cada uno y «Mostrar los N» desde el
  navegador), cada cotización con su número, clase, origen y fecha (nada de total, cliente ni vehículo: P4 a); «Restaurar» una por una o «Restaurar el lote»
  (si quedan más de una), sin preguntar, y el aviso dice el resultado entero (lo pendiente con su motivo, hasta tres y «Y N más.»: P3 a). La abre quien puede
  enviar a la papelera (`cotizaciones.editar|moderar|final.gestionar`) o vaciarla (`cotizaciones.papelera.purgar`: P2 a); restaura quien envió el lote o quien
  puede vaciarla (P10 del 1b). Debajo del título dice, siempre, que las cotizaciones que se fueron con su vehículo vuelven al restaurar el vehículo, con el
  enlace a la papelera de vehículos sólo para quien puede abrirla. El enlace «Papelera» antes de «Nueva cotización» en `/cotizaciones` (hueco `Junto`; Server
  Component: ningún JS de más). **Sin purgar**: es el 4.24-2b. P2–P4 con las recomendadas; compuerta `datos`, «aprobar».
- **Verificación** (`.piloto/salidas/4.24-2/`): rojos contra HEAD del módulo `lotes` y de los de `resultados`, `purga` y `acceso` (el módulo no existe:
  `rojo-head-entities.txt`, `rojo-head-entities-2.txt`), del componente (`rojo-head-componentes.txt`), del registro de páginas con `listar.ts` y sin sus dos
  entradas (`rojo-sin-registro.txt`: «agrégalas a scripts/guardas/paginas-en-la-base.ts»), del enlace (`rojo-head-enlace.txt`: `Junto` no está) y del e2e (`rojo-head-e2e.txt`:
  E1 no halla el título, la ruta no existe). Verde: 37 de Vitest en `entities/papelera` y `features/papelera`, y las guardas de `scripts/guardas` **salvo un caso**: `paginas-en-la-base.test.ts` › «sin nada de la papelera, es el núcleo» cae desde el commit 1 (el registro de la papelera ya no está vacío) y lo arregla el A (`decisiones.md` › «Necesita del carril A», 0). e2e dirigidos en
  `escritorio` y `movil` (`verde-e2e-6.txt`, 47 en verde): `cotizaciones-papelera.spec.ts` (E1 a E8), `cotizaciones-listado.spec.ts` y `presupuesto-js.spec.ts`. Medido
  (E8): JS en frío de `/cotizaciones/papelera` 417,9 KB en 23 chunks (`/perfil` mide 417,2: casi todo es el marco); la página 1 con 5 lotes × 20 filas, 1.119 nodos
  y 342.488 B con lotes de 21 y 1.119 nodos y 342.808 B con lotes de 200 (escritorio; en movil 341.956 y 342.296): no crece con el lote. Con la papelera vacía el
  documento mide 91.005 B. `lint` y `typecheck` los corrió el hook de cada commit.
  e2e completo: no (4.24-2, pantalla, Nivel 1: lo dirigido en escritorio y movil)
- **Abiertos:** ninguno cierra. Nuevos, en `decisiones.md` › «Necesita del carril A»: **0 (bloqueante)** `paginas-en-la-base.test.ts` falla desde el commit 1
  («sin nada de la papelera, es el núcleo»); el registro de `<Confirmar>` para el 4.24-2b; la ficha del módulo; el presupuesto de JS de la ruta; los textos
  de purga repetidos; `RUTAS`. Para un paso de base del C, si la persona lo pide: P3 (el motivo de lo pendiente en el lote) y P4 (los ids del cliente y del vehículo).
- **Commits:** `8a90385e` feat(cotizaciones): leer por cursor la papelera de cotizaciones · `d348c9c7` feat(cotizaciones): dibujar la papelera de cotizaciones con
  restaurar · `ea6cca4c` feat(cotizaciones): enlazar la papelera desde el listado · y el de docs.
