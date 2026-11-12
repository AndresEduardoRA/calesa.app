# 8.11-3 · Compras y margen: escribir (2026-11-12)

- **D1 · Tipo de esta parte.** Datos y dinero (pantalla sobre las RPC de 8.11-1 y la policy de comprobantes de 6.10-2, sin migración): se verificó que la base trae
  guardar, eliminar, restaurar, la lista cerrada, el comprobante en la carpeta del proyecto y `storage_refcount`. El informe se audita: lo de riesgo es qué viaja y
  quién escribe (el esquema estricto y las actions) y que `monto_base` lo pone la base.
- **D2 · La URL del Drawer.** `?panel=compra&compra=<id|nueva>`, el patrón de `?panel=gasto&gasto=<id|nuevo>`, con `nueva` en femenino. Convive con `?pestana=compras`.
- **D3 · Refrescar tras escribir.** La action hace `revalidatePath` de `/repuestos/<id>` (`.claude/rules/datos.md`), no `router.refresh()` como decía el plan de
  8.11-2. La ruta se arma con `RUTAS.repuestos` porque `rutaDelProyecto` es del área `proyectos` y un área no importa otra. `router.refresh()` queda sólo para
  «Recargar» tras un conflicto.
- **D4 · Las opciones de «Ítem».** Los ítems vivos de la hoja que ya leyó la página (≤ 200, sin otra lectura) más «Sin ítem». Si la compra que se edita tiene un ítem
  fuera de esa lista, se suma con su descripción para no perderlo; si se elige otro, la base mira que sea del proyecto.
- **D5 · Las opciones de «Moneda».** Las activas y, al editar, también la de la compra aunque se haya desactivado: si no se cambia, no viaja y la base conserva la
  tasa. Sin selector de tipo de cambio: lo pone la base con el por defecto vigente (D1 de 8.11-1), y el Drawer lo dice en su descripción.
- **D6 · Un solo «Registrar compra».** Arriba de la lista, también cuando está vacía; el estado vacío no lleva botón. Sin `repuestos.costos.editar` o con el
  proyecto cerrado, se ve apagado con su motivo escrito al lado, y la fila no ofrece «⋯». El pie del Drawer repite «Registrar compra» a propósito (está dentro del
  diálogo).
- **D7 · Eliminar no pregunta.** Se hace y deja un toast con «Deshacer» (`ui.md`: lo reversible se hace y ofrece «Deshacer»). Gastos usa `<Confirmar>`, pero allí
  no hay restaurar. Si el ítem se eliminó entretanto, «Deshacer» dice el texto de la base.
- **D8 · El e2e no sube un comprobante.** Subir es la copia del flujo de logística (su storage se probó en 6.11) y la ruta la valida la base. El caso clave es el
  dinero: registrar suma al margen y `monto_base` lo pone la base.
