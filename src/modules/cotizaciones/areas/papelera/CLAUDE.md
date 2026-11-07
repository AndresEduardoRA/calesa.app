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
- `composicion.ts` (servidor): `repositorioDePapeleraDeCotizaciones.enviar`, `.restaurar` y `.purgar` (`cotizaciones_papelera_enviar|restaurar|purgar`, `infra/papelera/escribir.ts`), que usan
  la action `features/papelera/actions/enviar-a-papelera.ts` (4.24-3: sin `cotizaciones.editar`, `.moderar` ni `.final.gestionar` en algún origen,
  `puedeEnviarCotizacionesALaPapelera`, responde `sin_permiso` **sin llamar** a la base; cuál puede, lo decide la base por cotización), y
  las actions `features/papelera/actions/restaurar-de-papelera.ts` (la base decide quién restaura, como en leads) y `purgar-de-papelera.ts` (4.24-2b: sin
  `cotizaciones.papelera.purgar` responde `sin_permiso` **sin llamar** a la base, que la vuelve a pedir antes de mirar el lote); las dos con el mismo `esquemaSobreUnLote`
  y `revalidatePath('/cotizaciones', 'layout')` sólo si la base dijo que sí.
- `client.ts` sigue vacío: el área no suma JS a quien importa `@/modules/cotizaciones/client`.

## La pantalla

`/cotizaciones/papelera` (`src/app/(app)/cotizaciones/papelera/page.tsx`, con `<Suspense>` y `await connection()` como `/cotizaciones`): `pantallas/papelera.ts` da `<PapeleraDeCotizaciones>` (lotes de a
`LOTES_POR_PAGINA` con `<Paginacion>`, cada uno con sus primeras `PRIMEROS_DEL_LOTE` y «Mostrar los N»). «Restaurar» (una, o «Restaurar el lote» si quedan más de una) se hace sin preguntar y dice el
resultado entero (`resumenDeRestauracion`: lo pendiente, con su motivo, hasta tres y «Y N más.»); lo ven quien envió el lote y quien puede vaciar la papelera (`puedeRestaurarElLote`, P10). Debajo del
título, siempre, que las que se fueron con su vehículo no están aquí (P8 a), con el enlace a la papelera de vehículos que compone `src/app` sólo para quien puede abrirla.

Purgar (4.24-2b) sólo con `cotizaciones.papelera.purgar`: «Purgar» en cada cotización (después de «Restaurar») y «Purgar el lote» si quedan más de una (`<AccionesDePapelera>`). Abren
`<ConfirmarPurga>`, montado una vez en la pantalla, con su URL `?panel=purgar&lote=<id>[&cotizacion=<id>]` (`entities/papelera/url.ts`, `usePurgaPorUrl`, registrado en
`scripts/guardas/confirmar-con-url-papelera.ts`). Al llegar por la URL se revisa una vez (`motivoParaNoPurgar`): sin la clave, un lote que no está en la página o una
cotización de otro lote avisan y limpian la URL. El diálogo nombra lo que se borra (`textosDeLaPurga`: una por su título; un lote de N, hasta cinco títulos y «y K más», y
pide tipear «purgar N»); lo que la base rechaza se dice dentro (un conflicto apaga el botón y ofrece «Recargar») y el resultado va en el aviso (`resumenDePurga`: lo bloqueado,
como una final con comprobante, con su motivo).

## Lo que no se rompe

- El lote trae sólo número, título (o «Cotización #n»), clase, origen y fecha: nada que la RLS le esconda a quien tiene la clave y no ve la cotización. Sin total, sin
  cliente ni vehículo (P6 del 4.24-1a; P4 del 4.24-2).
- La pantalla no pide más que una página (`tamano + 1`) y «Mostrar los N» un lote (≤ 200): su documento no crece con el tamaño del lote (`e2e/cotizaciones-papelera.spec.ts`, E8).
- Purgar mira la clave dos veces en la app (la action, antes de llamar a la base, y la revisión de la URL, porque quien no purga ve sus propios lotes) y la base la vuelve
  a pedir antes de mirar el lote. El `<Confirmar>` es uno por pantalla y todo `<Confirmar>` nuevo del área va a `confirmar-con-url-papelera.ts`.
- Las RPC con tamaño están en `scripts/guardas/paginas-en-la-base-papelera.ts` (`p_tope` con `LOTES_POR_PAGINA + 1`, `p_primeros` con `PRIMEROS_DEL_LOTE`).
