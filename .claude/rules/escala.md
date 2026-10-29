---
paths:
  - 'src/**'
  - 'supabase/**'
  - 'e2e/**'
  - 'scripts/**'
---

# Escala

Toda lista se diseña para miles de filas, aunque la semilla tenga 20, y se verifica con volumen
sembrado, no a ojo (`pnpm db:sembrar-volumen`, `pnpm db:medir:volumen`). Cada superficie con su tope,
índice y presupuesto está en `docs/RENDIMIENTO.md`.

## Paginación y topes

- Una lista se lee por cursor (keyset), una página fija a la vez. Nunca `offset` ni `.range()`.
- El tamaño de página sale sólo de `src/shared/lib/paginacion.ts`; nunca escrito a mano en un
  componente, una consulta ni el SQL de una medición.
- Las listas con Anterior y Siguiente y filtros (leads, vehículos) ofrecen `TAMANOS_DE_PAGINA`
  (`listas.por_pagina`, `?por=`) y declaran su máximo (`MAXIMO_DE_PAGINA_DE_LEADS`,
  `MAXIMO_DE_PAGINA_DE_VEHICULOS`). Un máximo se gana midiendo con el valor más alto; si no cabe en
  presupuesto se declara uno menor y el motivo va a `docs/RENDIMIENTO.md`.
- «Ver más» usa `TAMANO_DE_VER_MAS` y `TOPE_DE_LO_CARGADO`; una columna del kanban,
  `TAMANO_DE_COLUMNA`; las papeleras, `LOTES_POR_PAGINA`. Ninguna lleva selector de tamaño.
- Toda RPC con parámetro de tamaño (`p_tamano`, `p_tope`…) lo pasa por
  `_acotar_pagina(parámetro, por_defecto, máximo)`, nunca `least(greatest(…))` a mano. Una RPC
  nueva con tamaño entra al registro de `scripts/guardas/paginas-en-la-base.ts` y su máximo no puede
  ser menor que el del código. Una lectura por PostgREST tiene su tope en `max_rows` de `config.toml`.
- Lo que se dibuja tiene tope. Al llegar se avisa con `<AvisoDeTope>` de `shared/ui`; la lectura
  pide uno de más y `cortarAlTope()` de `shared/lib/conteo` corta y dice si había más. Siempre hay un
  camino a lo antiguo («Ir a una fecha», un filtro, búsqueda por nombre).
- Un número que se muestra sale de `limit n + 1` o no se muestra. Nunca `count(*)` ni
  `count: 'exact'`. La consulta pide `tope + 1`, `conteoAcotado()` de `src/shared/lib/conteo.ts` la
  vuelve `{ n, hayMas }` y `conteoEnFrase()` («más de 50») o `conteoCorto()` («500+») la escriben.
  PostgREST corta en 1.000 filas: un tope mayor se lee por páginas.

## Consultas

- Cada consulta nombra en un comentario el índice que la sostiene y tiene su `EXPLAIN` en
  `pnpm db:medir:volumen`, sobre el plan genérico: con el índice, sin recorrer la tabla ni descartar
  filas que crezcan con la profundidad, y dentro de su presupuesto de tiempo.
- En plpgsql, con cursor y sin cursor son dos consultas: un `p_x is null or (…)` o un `coalesce` en
  el cursor dejan de ser condición de índice.
- Una función cara lleva su `COST` verdadero (`atributos_lead()`); con el barato Postgres lee todo y ordena.
- Un filtro de leads que no es una columna ni una marca de quien mira (`ilike` o `@>` sobre `leads`,
  etiqueta, campo público o privado) no se lee de la vista: va a `leads_candidatos()` con su índice.
  Contar también es leer: `contarPorCandidatos()`, con `tachados: true` para los ocultos.
- Un campo privado se filtra sólo sobre la cartera de quien filtra; el texto o rango de un campo
  público tiene tope de recorrido para quien ve «todos» (10.000 leads, con «Seguir buscando»).
- Un texto de búsqueda pide 3 letras o dígitos seguidos: `MINIMO_DE_BUSQUEDA`
  (equipo: `MINIMO_DE_BUSQUEDA_DEL_EQUIPO`, `equipo_lista()` ignora lo más corto).
- Una policy no arma un arreglo con toda la cartera de quien mira (`= any(…)`): pregunta por fila
  (`_lead_vivo_en_mi_cartera`).
- Ninguna acción crece con lo cargado: recargar lee una página, buscar tiene tope de páginas, nada
  consulta por fila (N+1). Exportar, importar y los jobs van por lotes con tope por lote y por corrida.
- Las imágenes se piden por preset de tamaño (miniatura de 480 px en toda lista), nunca el original.

## Carga del cliente

- Las listas hijas se leen al abrir su pestaña o sección, nunca con la lectura del padre, y su código
  viaja con `diferido()`.
- Código diferido: `diferido()` de `src/shared/ui/diferido.tsx`, nunca `next/dynamic` (el lint lo
  prohíbe). Un modal o panel se monta con `useAbiertoAlgunaVez()`.
- Lo que importa `src/app/(app)/layout.tsx` viaja en toda pantalla: importa `@/modules/<x>/shell`
  (y `shell.client` en `_shell/`), nunca el `index.ts` del módulo.
- Toda lista nueva se prueba con volumen sembrado por SQL (`generate_series`, `e2e/soporte/sql.ts`):
  bytes de la primera respuesta, plan y nodos del DOM.

## Las guardas (qué falla si la próxima lista no cumple)

- `count:`, `head: true`, `.range(`, `.select('*')`, `.from()` sin `.limit(` → `scripts/guardas/escala.test.ts`, excepciones en `scripts/guardas/excepciones-de-escala.ts` (`pnpm test`)
- `next/dynamic` o un `diferidos.tsx` sin `diferido()` → `eslint.config.mjs` y `scripts/guardas/diferidos.test.ts` (`pnpm lint`, `pnpm test`)
- SQL con `offset` o `count(` sin `limit` y sin motivo → `supabase/tests/escala.sql` (`pnpm db:probar`)
- Función con tamaño de página sin `_acotar_pagina`; preferencia distinta de 10, 25, 50, 100 → `supabase/tests/escala.sql` (`pnpm db:probar`)
- RPC con tamaño fuera del registro, tamaño a mano, `check` distinto de `TAMANOS_DE_PAGINA`, `max_rows` corto → `scripts/guardas/paginas.test.ts` y `paginas-en-la-base.ts` (`pnpm test`)
- Plan o tiempo de leads, inventario, búsqueda, campos y kanban → `supabase/tests/medir-escala.sql` (`pnpm db:medir:volumen`)
- Búsqueda por candidatos distinta de la consulta de siempre → `supabase/tests/busqueda-volumen.sql`, `busqueda-leads.sql` en PGlite (`pnpm db:medir:volumen`)
- Jobs con 100.000 filas por purgar → `supabase/tests/medir-jobs.sql` (`pnpm db:medir:volumen`)
- `cotizacion_evaluar()` con volumen → `supabase/tests/medir-evaluar.sql` (`pnpm db:medir:volumen`)
- Lectura de cotizaciones con volumen → `supabase/tests/medir-cotizaciones-lectura.sql` (`pnpm db:medir:volumen`)
- Lectura de vehículos con volumen → `supabase/tests/medir-vehiculos-lectura.sql` (`pnpm db:medir:volumen`)
- Las listas del panel del vehículo con volumen → `supabase/tests/medir-panel-ultima-cotizacion.sql`, `medir-panel-cierre-subasta.sql`, `medir-historial-del-vehiculo.sql` (`pnpm db:medir:volumen`)
- `cotizacion_crear()` con volumen → `supabase/tests/medir-cotizacion-crear.sql` (`pnpm db:medir`)
- `cotizacion_guardar()` con volumen → `supabase/tests/medir-cotizacion-guardar.sql` (`pnpm db:medir`)
- Baja de una persona con 200.000 leads → `supabase/tests/medir-bajas.sql` (`pnpm db:medir:volumen`)
- JS en frío por ruta → `e2e/presupuesto-js.spec.ts`, `e2e/soporte/presupuestos.ts` (`pnpm test:e2e`)
- Nodos del DOM del drawer, listado y columna del kanban; una sola vista en el HTML → `e2e/leads-rapido-volumen.spec.ts`, `e2e/leads-escala.spec.ts`, `e2e/vehiculos-por-pagina.spec.ts` (`pnpm test:e2e`)
- Bytes, nodos, pedidos y página profunda con el máximo de cada lista → `e2e/listas-por-pagina-volumen.spec.ts` (`E2E_VOLUMEN=1 pnpm test:e2e`)
