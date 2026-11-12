# 8.03-2: decisiones (2026-11-12)

Categorías de las guías y legales con el editor (parte 2 de 2 del 8.03: con ella el 8.03 queda completo).

- **D1 · Dos legales fijos**, `terminos` («Términos y condiciones») y `privacidad` («Política de privacidad»): los que la base admite. Sus títulos nacen con esos textos
  y se pueden editar (1–120). La recomendada de la fila.
- **D2 · Un solo formulario y un solo «Guardar» para los dos legales.** `ajustes_web.actualizado_en` es una versión para toda la fila: guardar un documento por separado
  cambiaría la `key` y descartaría lo escrito en el otro. Se manda `{ legales: { terminos?, privacidad? } }` con sólo los documentos que tienen texto; la base
  aplica encima de lo guardado y conserva lo que no llega. Un documento sin texto y sin guardar antes no se crea; uno ya guardado al que se le borra el texto da «Escribe
  el texto de …» junto al editor (quitar un legal no entra: la base lo permite con `null`, la pantalla no lo ofrece).
- **D3 · Conflicto de legales = el de «Ajustes»**: `PT409` → `<AvisoDeConflicto>` dentro del formulario y «Recargar» (borra el borrador y refresca); la versión es la `key`.
  Guardar legales y guardar «Ajustes» comparten versión.
- **D4 · Borrador de legales** con `useBorradorDeEstado` (clave `web-legales`): el título y el documento de cada uno son estado controlado.
- **D5 · Etiquetas fijas de los dos editores** («Texto de los términos», «Texto de la política»): con dos editores en la pantalla el nombre accesible `Texto` de las
  guías chocaría. La imagen va apagada (`imagenes={false}`) y, por defensa, la escritura quita cualquier nodo `image` de primer nivel (`sinImagenes`); la frontera es la base.
- **D6 · La tabla de categorías no tiene versión** (`id, slug, nombre, orden, activa`): la última escritura gana. Renombrar con cero filas es «Esta categoría ya no existe.».
  Sin RPC ni migración.
- **D7 · La dirección (`slug`) de una categoría sale del nombre al crearla** (`slugDe`, el de las guías) y **renombrar no la cambia**: la dirección del sitio no se
  mueve por un cambio de texto. Sin letras ni números: «Escribe un nombre con letras o números.». `23505` → «Ya hay una categoría con ese nombre.» junto al campo.
- **D8 · Ordenar reescribe `orden` 0..n−1** de todas, con **un** `upsert` de sólo las filas que cambian (con todas en `0` por defecto, intercambiar dos no ordenaría).
  Una carrera con un renombrar simultáneo es una ventana de milisegundos sobre una tabla de configuración: aceptada. Crear pone `orden` = el mayor + 1.
- **D9 · Tope de 100 categorías** (`TOPE_DE_CATEGORIAS`, igual que las opciones de la guía: el selector las muestra todas). La lista se lee con 101; la 101.ª no se crea.
  La tabla entra a `TABLAS_ACOTADAS` de la guarda de escala con ese motivo.
- **D10 · «Borrar sólo sin guías» es regla de la action**: `web_guias.categoria_id` es `on delete set null`, el borrado no falla solo. La action lee una guía de esa categoría
  (`limit 1`); si hay, rechaza y no borra. En la lista, «Eliminar» sale apagado con «Tiene guías: desactívala.».
- **D11 · «Con guías» / «Sin guías» sale de una sola lectura acotada** (`web_guias.categoria_id in (…) limit 1000`, por `web_guias_categoria_id_idx`), sin consulta por fila ni
  números. Si llega al tope, las que no aparecen dicen «Sin verificar» y «Eliminar» queda encendido (la action vuelve a revisar).
- **D12 · Desactivar sólo esconde la categoría del selector de la guía nueva**: la guía que ya la tiene la sigue mostrando («(desactivada)») y `web.guias` sigue sirviendo
  su nombre. Reversible, sin confirmación.
- **D13 · La lista de categorías se lee con la pestaña «Guías»** (en paralelo con las guías); el panel (`?panel=categorias`) y sus cinco actions viajan en su chunk
  diferido y el diálogo de eliminar tiene su URL (`?eliminar=categoria&categoria=<id>`). Tras cada cambio, `revalidatePath` en la action y ningún `router.refresh()`.
- **D14 · El selector de la guía dice** «Todavía no hay categorías. Se crean desde «Categorías» en Guías.» (lo anunció la D9 del 8.03-1).
- **D15 · Docs del paso en `docs/pasos/8.03-2/`** (como el 8.03-1 dejó `docs/pasos/8.03-1/`): con un carril con coordinador no se editan `ESTADO`, `PLAN`, `BITACORA` ni
  `DECISIONES`.
- **D16 · El pie del panel «Categorías» es «Listo»** (cierra). El nombre escrito sin agregar avisa con `<CambiosSinGuardar>` (la guarda de drawers lo exige) pero no
  hay borrador: es una sola línea.
