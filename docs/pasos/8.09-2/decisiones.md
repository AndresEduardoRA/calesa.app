# 8.09-2: decisiones (2026-11-12)

- **D48 · Sólo cantidad y precio son `XCell`.** Es numérica (`format: numero | monto | porcentaje`): no tiene texto ni selección. Descripción, tracking, notas y los cuatro catálogos son celdas
  propias de `features/items/` (entrada de texto y `<select>` nativo) con el mismo teclado básico (Enter guarda y baja a la misma columna de la fila siguiente; Esc vuelve a lo guardado). No se
  ensanchó `shared/ui/xcell` (duda 1 de la fila). La `XCell` muestra su etiqueta en cada celda: la densidad compacta va a «Pulido para la Fase 9».
- **D49 · Un proyecto que no existe, está eliminado o no se ve da el mismo mensaje** («Este proyecto ya no está disponible: no existe o ya no tienes acceso.», con «Volver a Repuestos»); sin `notFound()`.
- **D50 · La cabecera no muestra el teléfono ni el lead del cliente:** sólo el nombre (la lista tampoco). Reversible.
- **D51 · Los pendientes del estado derivado se cuentan sobre las filas leídas** (≤ 200): sin stock y sin fase o en una fase no final (la misma cuenta de `repuestos_proyectos_listar`).
- **D52 · La moneda por defecto de un precio es la primera de las activas** (la lista de `leerMonedasYTiposCambio` no trae un orden propio). Va en el mismo `update` cuando el ítem no tenía moneda;
  vaciar el precio no borra la moneda.
- **D53 · El conflicto no nombra a quién cambió el ítem** (el `update` directo no lo dice): «Otra persona cambió este ítem. Recarga para ver lo nuevo.» con `<AvisoDeConflicto>`.
- **D54 · Con 200 ítems no se dibuja la fila nueva** y `<AvisoDeTope>` dice por qué; la hoja no pagina.
- **D55 · Eliminar un proyecto vacío (y su «Deshacer») pasa a 8.09-4:** la fila del PLAN no lo pide.
- **D56 · «Cerrar proyecto» no pide confirmación** (se deshace con «Reabrir»): toast con «Deshacer», que llama a la acción contraria con la versión que devolvió la primera.
- **D57 · La hoja no se pide con `diferido()`:** es el contenido de la pantalla, no un panel que se abre; sólo el `<Confirmar>` de eliminar va diferido (`useAbiertoAlgunaVez`).
- **D58 · Sólo lectura = texto plano**, no 200 `XCell` con candado (sin `repuestos.editar` o con el proyecto cerrado). El aviso del proyecto cerrado va arriba de la hoja.
- **D59 · La fila nueva lleva sólo la descripción:** la cantidad (1 por defecto), el precio y lo demás se llenan después con el teclado. La action `crearItem` acepta cantidad, precio y moneda (validados con las
  mismas reglas) por si la fila crece, pero la hoja hoy no los manda.
- **D60 · Guardar una celda, agregar y eliminar un ítem no llaman a `revalidatePath`:** la hoja ya tiene la fila nueva (la action la devuelve entera) y recargar lee de la base; un `revalidatePath` volvería a
  mandar las filas y pisaría lo que se está tecleando en otra celda. Cerrar y reabrir sí revalidan el detalle y el listado.
- **D61 · «Nuevo proyecto» ya no cierra el panel antes de ir al detalle:** nuqs escribe `?panel=` de forma asíncrona y pisaba el destino de `router.push`. Ir al detalle saca el panel de la pantalla.
- **D62 · Un guardado por celda va por una cola por fila** (`colaPorClave`): el segundo parte de la versión que dejó el primero. Cada guardado lee la versión de la fila al correr, no al encolarse.
- **Hueco que queda para 8.10** (la base no lo frena hoy): el `update` por columna de un ítem **no mira si el proyecto está cerrado** ni valida que un `tipo_pieza_id` sea de su catálogo (sólo
  `repuesto_item_crear` lo hace). La pantalla vuelve la hoja de lectura al cerrar; 8.10, que ya revisa los `grant` de `repuestos_items` (quita `UPDATE(en_stock_desde)`), decide si lo cierra con una RPC.
