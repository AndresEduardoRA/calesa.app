## 2026-11-11 — Paso 7.07-2: los paneles de evento y de tarea de `/agenda`

- **D1 · El selector de destinatarios lee `perfiles` desde el navegador** (`id` y `nombre`, activas y sin bloqueo, desde 3 letras, 21 filas y 20 mostradas): `perfiles: leer`
  lo deja a toda persona activa y la base vuelve a exigir activos y sin bloqueo al guardar. `equipo_lista` no sirve (pide `equipo.usuarios.ver`). Descartada: una RPC nueva.
- **D2 · El responsable de una tarea usa `agenda_quienes_reciben`** y sólo con `agenda.tareas.asignar`; sin él, el texto dice «Será tu tarea.».
- **D3 · Los chips de evento y tarea son enlaces** a `?evento=` / `?tarea=` que conservan `vista`, `fecha`, `ver` y `de` (`entradasDeAgenda(…, rutaDe)`).
- **D4 · Ver y editar comparten la URL:** `?evento=<id>` ve; `&editar=1` cambia el cuerpo (dos `<Drawer>`, el de detalle y el de formulario, ambos registrados). Cerrar vuelve a pedir
  la página sin esas claves (`shallow: false`); entrar y salir de «editar» no pide nada.
- **D5 · «Nuevo evento» y «Nueva tarea» son `?panel=nuevo-evento|nueva-tarea`** (shallow); `N` abre «Nuevo evento». Tras crear, se cierra el alta y se abre el detalle por
  `usePanelDeDetalle().abrirEvento(id)` (nuqs): un `router.replace` dejaba el estado de nuqs con `panel` abierto y el alta seguía a la vista.
- **D6 · Valores de partida en la zona de la empresa:** el evento, a las 09:00 del día de la vista (hoy si ya pasó); la tarea, a las 18:00 y, si ya pasaron, mañana.
- **D7 · Los vínculos (lead, vehículo, cotización) se muestran como enlace y no se editan;** los formularios no mandan esas claves, así que la base las conserva.
- **D8 · El vencimiento de una tarea es obligatorio en la interfaz** mientras no exista «Sin fecha» (7.07-3): una tarea sin fecha no saldría en el calendario.
- **D9 · Quién ve a quién:** la lista de destinatarios la ve sólo quien creó el evento; «Editar» y «Eliminar» no se dibujan para quien no puede (`puedeEditarEvento`, `puedeEditarTarea`);
  sólo las opciones «Público» y «Seleccionados» se deshabilitan con motivo.
- **D10 · El detalle se lee en el servidor por id** (`leerEvento`, `leerTarea`); lo que no se ve, no existe o está eliminado dice lo mismo: «No encontramos este evento/esta tarea».
- **D11 · Errores:** el `hint` de la base va junto a su campo; `PT409` → `<AvisoDeConflicto>` con «Recargar»; eliminar es un `<Confirmar>` que nombra el objeto.
- **D12 · `evento_guardar` recibe siempre la lista de destinatarios** (`[]` si no es «seleccionados»): el tipo generado no admite nulo. `tarea_guardar` nunca manda `responsable_id`.
- **D13 · «Destinatario» es el término** (tabla `eventos_destinatarios`, pantalla «Destinatarios»), no «invitado»; entró al glosario.
- **D14 · La asesora del terreno del e2e no recibía tareas:** el spec le agrega `agenda.tareas.recibir` a su rol (lo borra `limpiarListado` con el rol).
