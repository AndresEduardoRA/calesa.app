## 2026-11-08 — Paso 4.27-1

- **Lo que contestó la persona:** la compuerta `datos` del plan, «aprobar», con las recomendadas de P1 a P11:
  - P1 comenta quien ve la cotización.
  - P2 adjunta quien puede guardarla: preventa, ver y editar; final, ver y `final.gestionar` del origen.
  - P3 un solo nivel de respuestas.
  - P4 raíces de la más nueva a la más vieja, de a 20, con sus primeras 20 respuestas.
  - P5 el autor edita y borra; quien modera borra lo ajeno y no lo edita.
  - P6 reportar no cambia el estado ni la versión; moderar es invalidar o descartar los reportes.
  - P7 moderar una final pide `final.gestionar`.
  - P8 los tipos del bucket, hasta 20 por cotización, sin repetir el archivo.
  - P9 todo por RPC, con las escrituras directas revocadas.
  - P10 «los niveles» del terminado son los permisos de la cotización.
  - P11 la favorita es una marca privada; el filtro del listado no entra.
- **Lo que se aprobó en permisos (la base):**
  - Policies de `storage.objects` («cotizaciones: leer», «subir») y de `cotizaciones_adjuntos` («crear», «borrar») con ver y la regla de guardar (4-69).
  - «cotizaciones_reportes: leer» pide moderar y ver.
  - Sin insert, update ni delete para `authenticated` en comentarios, adjuntos, reportes y favoritos.
  - Doce funciones `security definer` (`cotizacion_puede_adjuntar` y las once RPC), todas con `search_path = ''` y sólo de `authenticated` y `service_role`; `_comentario_item` y
    el trigger, de nadie; `_cotizacion_de_objeto`, inmutable de invocador.
  - `cotizacion_moderar` cambia de firma: `(uuid, timestamptz, estado_cotizacion)`.
  - Sin permisos nuevos; el catálogo dice que comentar es de `ver` (antes decía `editar`).
- **Lo no obvio:**
  - **Borrar quita la fila salvo en una raíz con respuestas**, y la última respuesta se lleva la raíz eliminada: así `cotizacion_comentarios` lee sin descartar
    filas que crecen con la profundidad (`.claude/rules/escala.md`), y un `check` impide una respuesta eliminada. La migración normaliza antes lo que hubiera entrado por
    PostgREST (re-cuelga respuestas anidadas, quita respuestas eliminadas y raíces eliminadas sin respuestas) y crea los `check` `not valid` + `validate`.
  - **Reportar no mueve la versión** (los contadores no la mueven): quien tiene la cotización abierta no recibe un conflicto porque otra persona la reportó.
    «Descartar los reportes» es moderar a `activa` una que ya está activa: borra los reportes y, como el estado no cambia, la versión tampoco. `sin_cambios` sólo
    con el mismo estado y, si es `activa`, sin reportes.
  - **Orden de candados:** raíz → respuesta (comentar toma la raíz `for share`; borrar una respuesta, la raíz y la respuesta `for update`); cotización → reportes (moderar
    la toma `for no key update` y borra los reportes; retirar la toma antes de borrar el suyo, porque el trigger de contadores la toma después y se cruzaba con
    moderar: 40P01). Moderar mira el permiso global antes de tomar la fila.
  - **La carpeta y el objeto se comprueban en `cotizacion_adjuntar`, no en un trigger:** es la única que escribe, y las pruebas de la purga y `medir-jobs.sql`
    insertan adjuntos sin objeto. El trigger sólo rescata la ruta de la cola de limpieza. Tipo y tamaño salen de la metadata de storage cuando está.
  - El tope de 20 adjuntos se mira sin candado: dos a la vez pueden dejar 21 (aceptado).

## 2026-11-08 — Paso 4.27-2

- **Lo que contestó la persona** (compuerta `producto`, recomendadas): P1 a, la sección «Comentarios» siempre bajo la hoja, que lee al llegar a la vista; P2 a, al tope de 500
  «Ir a una fecha».
- **Sin `revalidatePath`** en comentar, editar y borrar: la sección lleva su propia lista y refrescar la página volvería a dibujar la hoja (y su recálculo).
- **«Ir a una fecha» sin migración:** el cursor `(inicio del día siguiente en la zona, 00000000-0000-0000-0000-000000000000)` trae ese día y lo anterior, porque ningún uuid es
  menor que el nulo y la RPC compara `(creado_en, id) <`.
- **`puedeModerar` lo dice la lectura**, no la sesión: el hueco sólo cruza el id al navegador y la base contesta con el mismo `tiene_permiso` que mira al borrar.
- **«Cancelar» de editar descarta sin preguntar:** lo original sigue en la base. Los borradores de editar y responder viven en la sección por clave, aparte de la lista, para
  que «Recargar» tras un conflicto los conserve y «Guardar» mande la versión nueva.
- **Se responde también a una raíz eliminada** que sigue con respuestas (la base lo admite).

## 2026-11-08 — Paso 4.27-3

- **Lo que contestó la persona** (compuerta `datos` del plan, «aprobar»): P1 a, el bloque «Adjuntos» dentro de la sección «Comentarios», arriba del campo, leído con la
  primera página y en el mismo `diferido()`; P2 a, quitar con `<Confirmar>` por URL (deshacer cambiaría el autor); P3 a, `mio` por el `sub` de `getClaims()` del navegador
  (tras la auditoría: el hueco sigue síncrono y sin depender de `equipo`); P4 a, sin miniaturas (bajarían el original de 1600 px por imagen en una lista).
- **Subida propia al bucket privado:** `subirPorHash` sólo admite buckets públicos y `src/shared` no es del C; `infra/comentarios/adjuntos.client.ts` copia su forma (hash,
  `upsert: false`, «ya existe» no es error). Se pide al A unificarla.
- **El bucket por constante** (`BUCKET_DE_ADJUNTOS`): un `.from('cotizaciones')` literal lo marca la guarda de escala como consulta sin tope.
- **`puedeModerar` de la lectura de comentarios**, como borrar un comentario: una sola fuente en la sección y, con «Ver como», la base usa los permisos reales.
- **«Tú» para lo propio** y la URL firmada pedida por clic (60 s), nunca al leer la lista. El e2e no borra la cola de limpieza: `storage-gc` barre el PDF quitado.
