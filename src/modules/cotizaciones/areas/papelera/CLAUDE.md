# cotizaciones › papelera

El área `papelera` de `cotizaciones` (carril C, 4.24): la papelera propia de cotizaciones, por lote. Ficha del módulo: `../../CLAUDE.md` › «Áreas».

## Qué es

Lo que se envía a la papelera de cotizaciones es un lote (`lotes_papelera`, `tipo = 'cotizaciones'`, de 1 a 200) que se restaura o se purga. La base lo decide todo
(`cotizaciones_papelera_enviar|listar|lote|restaurar|purgar`, 4.24-1a y 4.24-1b): quién ve qué lote (los suyos o, con `cotizaciones.papelera.purgar`, todos), quién
restaura y qué queda pendiente. Acá se lee y se dibuja.

## Entradas

- `index.ts` (servidor): `leerPapeleraDeCotizaciones({ cursor, tamano })`, una página de lotes por cursor `(creado_en, id)`: pide `tamano + 1` y de cada lote las
  primeras `PRIMEROS_DEL_LOTE` (`infra/papelera/listar.ts`, índice `lotes_papelera_tipo_idx`). Una forma rota de la respuesta es un error, nunca una papelera vacía.
- `composicion.client.ts` (navegador; sólo su feature, ningún barril): `leerLoteDePapeleraDeCotizaciones(loteId)`, el lote entero para «Mostrar los N»; `no_encontrado`
  si ya no está.
- `index.ts` también da `puedeAbrirLaPapeleraDeCotizaciones(permisos)` (quien puede enviar —`cotizaciones.editar`, `.moderar` o `.final.gestionar`— o vaciar —`cotizaciones.papelera.purgar`—; P2 a) y
  `puedePurgarLaPapeleraDeCotizaciones(permisos)`. Quien no la abre ve «sin permiso», sin consulta; ningún `if (rol …)`.
- `composicion.ts` (servidor): `repositorioDePapeleraDeCotizaciones.restaurar` y `.purgar` (`cotizaciones_papelera_restaurar|purgar`, `infra/papelera/escribir.ts`), que usan
  las actions `features/papelera/actions/restaurar-de-papelera.ts` (la base decide quién restaura, como en leads) y `purgar-de-papelera.ts` (4.24-2b: sin
  `cotizaciones.papelera.purgar` responde `sin_permiso` **sin llamar** a la base, que la vuelve a pedir antes de mirar el lote); las dos con el mismo `esquemaSobreUnLote`
  y `revalidatePath('/cotizaciones', 'layout')` sólo si la base dijo que sí.
- `client.ts` sigue vacío: el área no suma JS a quien importa `@/modules/cotizaciones/client`.

## La pantalla

`/cotizaciones/papelera` (`src/app/(app)/cotizaciones/papelera/page.tsx`, con `<Suspense>` y `await connection()` como `/cotizaciones`): `pantallas/papelera.ts` da `<PapeleraDeCotizaciones>` (lotes de a
`LOTES_POR_PAGINA` con `<Paginacion>`, cada uno con sus primeras `PRIMEROS_DEL_LOTE` y «Mostrar los N»). «Restaurar» (una, o «Restaurar el lote» si quedan más de una) se hace sin preguntar y dice el
resultado entero (`resumenDeRestauracion`: lo pendiente, con su motivo, hasta tres y «Y N más.»); lo ven quien envió el lote y quien puede vaciar la papelera (`puedeRestaurarElLote`, P10). Debajo del
título, siempre, que las que se fueron con su vehículo no están aquí (P8 a), con el enlace a la papelera de vehículos que compone `src/app` sólo para quien puede abrirla. Purgar es del 4.24-2b.

## Lo que no se rompe

- El lote trae sólo número, título (o «Cotización #n»), clase, origen y fecha: nada que la RLS le esconda a quien tiene la clave y no ve la cotización. Sin total, sin
  cliente ni vehículo (P6 del 4.24-1a; P4 del 4.24-2).
- La pantalla no pide más que una página (`tamano + 1`) y «Mostrar los N» un lote (≤ 200): su documento no crece con el tamaño del lote (`e2e/cotizaciones-papelera.spec.ts`, E8).
- Las RPC con tamaño están en `scripts/guardas/paginas-en-la-base-papelera.ts` (`p_tope` con `LOTES_POR_PAGINA + 1`, `p_primeros` con `PRIMEROS_DEL_LOTE`).
