# cotizaciones › comentarios

El área `comentarios` de `cotizaciones` (4.27): comentarios de una cotización con un nivel de respuestas; en el 4.27-3 los adjuntos y en el 4.27-4 favorita,
reportar y moderar. Ficha del módulo: `../../CLAUDE.md` › «Áreas».

## Qué es

La base lo decide todo (4.27-1, `supabase/tests/areas/comentarios/`): comentar pide ver la cotización; editar, ser el autor; borrar, el autor o
`cotizaciones.moderar`; cada edición y borrado lleva la versión (`actualizado_en`, el texto de la base, nunca por `Date`). Acá se lee y se dibuja.

## Entradas

- `composicion.client.ts` (navegador; sólo su feature, ningún barril): `leerComentarios({ cotizacionId, cursor })` y `leerRespuestas({ comentarioId, cursor })`
  (`cotizacion_comentarios`, `cotizacion_comentario_respuestas`; de a `TAMANO_DE_VER_MAS`, registradas en `scripts/guardas/areas-c/paginas-en-la-base.ts`). Una forma rota es
  un error, nunca una lista vacía. La lectura dice también `puedeModerar` (lo que dibuja «Borrar» en lo ajeno).
- `composicion.ts` (servidor): `repositorioDeComentarios.comentar|editar|borrar` (`infra/comentarios/escribir.ts`), que usan las actions de
  `features/comentarios/actions/` (sin `revalidatePath`: la sección lleva su propia lista).
- `index.ts` y `client.ts` siguen vacíos: el área no suma nada a quien importa la raíz.

## La pantalla

El hueco `Debajo` de `/cotizaciones/[id]` (`pantallas/comentarios-cotizacion.ts`): `<ComentariosDeLaGuardada>` (servidor) pasa sólo el id a `<SeccionDeComentarios>`, que
observa su nodo y, la primera vez que está a la vista (o con `?panel=borrar-comentario` en la URL), monta `<Comentarios>` por `diferido()`. La lista vive en
`entities/comentarios/lista.ts` (puro, con tests): sumar sin repetir, el orden de la base y borrar como la base. Borrar abre `<ConfirmarBorradoDeComentario>` por
`?panel=borrar-comentario&comentario=<id>` (`useBorradoPorUrl`, registrado en `scripts/guardas/areas-c/confirmar-con-url.ts`). Estados y textos: `docs/UX.md` ›
«Cotización: comentarios». e2e: `e2e/cotizaciones-comentarios.spec.ts`.

## No se rompe

- Los borradores de editar y responder viven en la sección por clave, aparte de la lista: «Recargar» vuelve a leer y los conserva (la versión nueva sale de la lista).
- Los cursores son los de la última fila que vino de la base; lo recién escrito no los mueve. «Ir a una fecha» usa `(inicio del día siguiente, uuid nulo)`.
- El JS en frío de la guardada está cerca de su tope (448 KB): lo que se sume a `<SeccionDeComentarios>` lo paga la página; lo demás va en `comentarios.tsx`.
