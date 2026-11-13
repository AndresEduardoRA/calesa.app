# cotizaciones › comentarios

El área `comentarios` de `cotizaciones`: comentarios de una cotización con un nivel de respuestas, adjuntos, y en la cabecera favorita, reportar y moderar. Ficha del módulo: `../../CLAUDE.md` › «Áreas».

## Qué es

La base lo decide todo (`supabase/tests/areas/comentarios/`): comentar pide ver la cotización; editar, ser el autor; borrar, el autor o
`cotizaciones.moderar`; cada edición y borrado lleva la versión (`actualizado_en`, el texto de la base, nunca por `Date`). Acá se lee y se dibuja.

## Entradas

- `composicion.client.ts` (navegador; sólo su feature, ningún barril): `leerComentarios({ cotizacionId, cursor })` y
  `leerRespuestas({ comentarioId, cursor })` (`cotizacion_comentarios`, `cotizacion_comentario_respuestas`; de a `TAMANO_DE_VER_MAS`, registradas en
  `scripts/guardas/areas-c/paginas-en-la-base.ts`); una forma rota es un error, nunca una lista vacía; la lectura dice también `puedeModerar`.
  `leerReportes(id)` (hasta 21, para el Confirmar de moderar). Por `infra/comentarios/adjuntos.client.ts`: `leerAdjuntos(cotizacionId)` (PostgREST,
  `limit 21`, con `mio` por el `sub` de `getClaims()`), `subirAdjunto(cotizacionId, archivo)` (al bucket privado por hash; `subirPorHash` no admite uno
  privado) y `urlDeDescarga(adjunto)` (URL firmada de 60 s, por clic).
- `composicion.ts` (servidor): `repositorioDeComentarios.comentar|editar|borrar` (`infra/comentarios/escribir.ts`), `repositorioDeAdjuntos.adjuntar|quitar`
  (`infra/comentarios/adjuntos.ts`) y `repositorioDeMarcas.ponerFavorita|reportar|retirarReporte|moderar`, que usan las actions de
  `features/comentarios/actions/` (sin `revalidatePath`: la sección lleva su lista). `leerMarcasDeLaCotizacion(id)` (`infra/comentarios/marcas.ts`: la
  fila, la favorita y el reporte propios, tres lecturas por clave primaria con `cache()`; el reporte se filtra por el `sub` porque quien modera lee todos).
- `index.ts` y `client.ts` vacíos: el área no suma nada a quien importa la raíz.

## La pantalla

Hueco `Debajo` de `/cotizaciones/[id]` (`pantallas/comentarios-cotizacion.ts`): `<ComentariosDeLaGuardada>` (servidor) pasa sólo el id a
`<SeccionDeComentarios>`, que monta `<Comentarios>` por `diferido()` la primera vez que está a la vista (o con `?panel=borrar-comentario`). La lista vive en
`entities/comentarios/lista.ts` (puro: sumar sin repetir, el orden y borrar como la base). Borrar: `<ConfirmarBorradoDeComentario>` en
`?panel=borrar-comentario&comentario=<id>` (`useBorradoPorUrl`). Estados y textos: `docs/UX.md` › «Cotización: comentarios». e2e:
`e2e/cotizaciones-comentarios.spec.ts`.

Adjuntos: `<Adjuntos>` arriba del campo, dentro de `<Comentarios>`. El hueco pasa `puedeGuardar` como `puedeAdjuntar` (la regla de
`cotizacion_puede_adjuntar`). Reglas puras en `entities/comentarios/adjunto.ts` (tipos, tope, nombre, `puedeQuitarAdjunto`); las constantes de la URL, en
`quitado.ts`, sin imports. Quitar: `<ConfirmarQuitadoDeAdjunto>` en `?panel=quitar-adjunto&adjunto=<id>` (`useQuitadoPorUrl`). e2e:
`e2e/cotizaciones-adjuntos.spec.ts`.

Favorita, reportar y moderar: el hueco `Acciones` (`<MarcasDeLaGuardada>`, servidor tras `<Suspense>`) decide quién ve qué con
`entities/comentarios/moderacion.ts` (espejo de `cotizacion_moderar`) y pasa al navegador sólo el id, la versión, la marca propia y las acciones ya
calculadas; el hueco `Insignias` (`<InsigniaDeLaGuardada>`, sin JS) dibuja «Inválida» para todos y «Reportada» sólo para quien modera. «Reportar…» abre
`?panel=reportar` (`<ModalDeReportar>`, diferido); moderar, `?panel=moderar&accion=invalidar|descartar|reactivar` (`useModeracionPorUrl`,
`<ConfirmarModeracion>`, diferido). El Zod de la lectura vive en `moderacion-lectura.ts`, que no viaja en frío. e2e: `e2e/cotizaciones-moderar.spec.ts`.

Los tres `<Confirmar>` están registrados en `scripts/guardas/areas-c/confirmar-con-url.ts`.

## No se rompe

- El bucket se nombra sólo con `BUCKET_DE_ADJUNTOS`: un `.from('cotizaciones')` literal lo marca la guarda de escala. El objeto se sube antes que la fila y,
  si el registro falla, queda en el bucket (sin barrer, como en vehículos).
- Los borradores de editar y responder viven en la sección por clave, aparte de la lista: «Recargar» los conserva (la versión nueva sale de la lista).
- Los cursores son los de la última fila que vino de la base; lo recién escrito no los mueve. «Ir a una fecha» usa `(inicio del día siguiente, uuid nulo)`.
- El JS en frío de la guardada está cerca de su tope (`e2e/soporte/presupuestos.ts`): lo que se sume a `<SeccionDeComentarios>` lo paga la página; lo demás va en `comentarios.tsx`.
