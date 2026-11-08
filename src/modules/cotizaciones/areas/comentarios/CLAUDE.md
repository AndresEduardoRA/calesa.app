# cotizaciones › comentarios

El área `comentarios` de `cotizaciones` (4.27): comentarios de una cotización con un nivel de respuestas; en el 4.27-3 los adjuntos y en el 4.27-4 favorita,
reportar y moderar (en la cabecera). Ficha del módulo: `../../CLAUDE.md` › «Áreas».

## Qué es

La base lo decide todo (4.27-1, `supabase/tests/areas/comentarios/`): comentar pide ver la cotización; editar, ser el autor; borrar, el autor o
`cotizaciones.moderar`; cada edición y borrado lleva la versión (`actualizado_en`, el texto de la base, nunca por `Date`). Acá se lee y se dibuja.

## Entradas

- `composicion.client.ts` (navegador; sólo su feature, ningún barril): `leerComentarios({ cotizacionId, cursor })` y `leerRespuestas({ comentarioId, cursor })`
  (`cotizacion_comentarios`, `cotizacion_comentario_respuestas`; de a `TAMANO_DE_VER_MAS`, registradas en `scripts/guardas/areas-c/paginas-en-la-base.ts`). Una forma rota es
  un error, nunca una lista vacía. La lectura dice también `puedeModerar` (lo que dibuja «Borrar» en lo ajeno).
  También `leerAdjuntos(cotizacionId)` (PostgREST, `limit 21`, con `mio` por el `sub` de `getClaims()` del navegador), `subirAdjunto(cotizacionId, archivo)` (al bucket
  privado por hash; `subirPorHash` no admite un bucket privado) y `urlDeDescarga(adjunto)` (URL firmada de 60 s, por clic) (`infra/comentarios/adjuntos.client.ts`, 4.27-3).
- `composicion.ts` (servidor): `repositorioDeComentarios.comentar|editar|borrar` (`infra/comentarios/escribir.ts`) y `repositorioDeAdjuntos.adjuntar|quitar`
  (`infra/comentarios/adjuntos.ts`, 4.27-3), que usan las actions de `features/comentarios/actions/` (sin `revalidatePath`: la sección lleva su propia lista).
  También (4.27-4) `repositorioDeMarcas.ponerFavorita|reportar|retirarReporte|moderar` y `leerMarcasDeLaCotizacion(id)` (`infra/comentarios/marcas.ts`: la
  fila, la favorita propia y el reporte propio, tres lecturas por clave primaria con `cache()`; el reporte se filtra por el `sub` de `getClaims()` porque quien
  modera lee todos). En `composicion.client.ts`, `leerReportes(id)` (hasta 21, para el Confirmar de moderar).
- `index.ts` y `client.ts` siguen vacíos: el área no suma nada a quien importa la raíz.

## La pantalla

El hueco `Debajo` de `/cotizaciones/[id]` (`pantallas/comentarios-cotizacion.ts`): `<ComentariosDeLaGuardada>` (servidor) pasa sólo el id a `<SeccionDeComentarios>`, que
observa su nodo y, la primera vez que está a la vista (o con `?panel=borrar-comentario` en la URL), monta `<Comentarios>` por `diferido()`. La lista vive en
`entities/comentarios/lista.ts` (puro, con tests): sumar sin repetir, el orden de la base y borrar como la base. Borrar abre `<ConfirmarBorradoDeComentario>` por
`?panel=borrar-comentario&comentario=<id>` (`useBorradoPorUrl`, registrado en `scripts/guardas/areas-c/confirmar-con-url.ts`). Estados y textos: `docs/UX.md` ›
«Cotización: comentarios». e2e: `e2e/cotizaciones-comentarios.spec.ts`.

Los adjuntos (4.27-3): `<Adjuntos>` arriba del campo, dentro de `<Comentarios>`. El hueco pasa `puedeGuardar` como `puedeAdjuntar` (la misma regla que
`cotizacion_puede_adjuntar`); `puedeModerar` sale de la lectura de comentarios. Las reglas puras están en `entities/comentarios/adjunto.ts` (tipos, tope, nombre,
`puedeQuitarAdjunto`, con tests); las constantes de la URL, en `quitado.ts`, sin imports. Quitar abre `<ConfirmarQuitadoDeAdjunto>` por
`?panel=quitar-adjunto&adjunto=<id>` (`useQuitadoPorUrl`, registrado en `scripts/guardas/areas-c/confirmar-con-url.ts`). e2e: `e2e/cotizaciones-adjuntos.spec.ts`.

Favorita, reportar y moderar (4.27-4), en la cabecera: el hueco `Acciones` (`<MarcasDeLaGuardada>`, servidor tras `<Suspense>`) decide quién ve qué con
`entities/comentarios/moderacion.ts` (espejo de `cotizacion_moderar`, con tests) y pasa al navegador sólo el id, la versión, la marca propia y las acciones ya
calculadas; el hueco `Insignias` (`<InsigniaDeLaGuardada>`, sin JS) dibuja «Inválida» para todos y «Reportada» sólo para quien modera. `<BotonFavorita>` cambia al
tocar; «Reportar…» abre `?panel=reportar` (`<ModalDeReportar>`, diferido) y moderar, `?panel=moderar&accion=invalidar|descartar|reactivar`
(`useModeracionPorUrl`, `<ConfirmarModeracion>`, diferido, registrado en `confirmar-con-url.ts`). El Zod de la lectura vive en `moderacion-lectura.ts`, que no
viaja en frío. e2e: `e2e/cotizaciones-moderar.spec.ts`.

## No se rompe

- El bucket se nombra sólo con `BUCKET_DE_ADJUNTOS`: un `.from('cotizaciones')` literal lo marca la guarda de escala. El objeto se sube antes que la fila y, si
  el registro falla, queda en el bucket (sin barrer, como en vehículos).

- Los borradores de editar y responder viven en la sección por clave, aparte de la lista: «Recargar» vuelve a leer y los conserva (la versión nueva sale de la lista).
- Los cursores son los de la última fila que vino de la base; lo recién escrito no los mueve. «Ir a una fecha» usa `(inicio del día siguiente, uuid nulo)`.
- El JS en frío de la guardada está cerca de su tope (448 KB): lo que se sume a `<SeccionDeComentarios>` lo paga la página; lo demás va en `comentarios.tsx`.
