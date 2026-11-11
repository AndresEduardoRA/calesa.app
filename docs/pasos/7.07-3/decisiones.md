## 2026-11-11 — Paso 7.07-3: completar, reasignar, «Sin fecha», recordatorios y la bandeja

- **D1 · Completar es un botón en el pie del panel de la tarea** (`Marcar como hecha` / `Reabrir`), sólo para quien `puedeCompletarTarea`; poner, no alternar (`completada: true|false`).
- **D2 · Reasignar vive dentro del detalle, sin URL propia:** «Cambiar de responsable» despliega el selector de una persona (`agenda_quienes_reciben`) y «Reasignar»; no es otro drawer. El rechazo de la
  base (`hint responsable_id`) va junto al selector.
- **D3 · «Sin fecha» es una sección bajo el calendario,** cerrada al entrar, que se lee al abrirla y descarta lo cargado al cerrarla (una tarea completada o creada desde un panel no queda vieja).
  Sólo se dibuja si el filtro incluye tareas. Cada fila es un enlace a `?tarea=<id>`.
- **D4 · Tope de «Sin fecha»:** 500 (`TOPE_DE_LO_CARGADO`) con `<AvisoDeTope>`; son tareas mías y pocas, no hay otra pantalla donde ir.
- **D5 · El vencimiento de una tarea es opcional** (relaja la D8 de 7.07-2): vacío es «sin fecha»; con valor y cambiado, no puede quedar en el pasado. Una tarea sin fecha no sale en el calendario.
- **D6 · El panel del recordatorio lee por id en el servidor** (`recordatorios_vista`, bajo la RLS); lo que no existe, está eliminado o es ajeno dice «No encontramos este recordatorio.». Estado con texto
  (Pendiente, Completado, Vencido; completado gana sobre vencido). No se edita aquí: el pie dice «Edítalo desde el lead».
- **D7 · «Completar» el recordatorio usa la action de `leads` por su `client.ts`** (la RPC exige que sea de quien actúa); como esa action no revalida `/agenda`, el hook llama `router.refresh()`.
- **D8 · «Mis tareas»:** pendientes cuyo responsable soy yo (la RLS deja ver también las que di y, con `agenda.ver_todo`, todas: por eso el filtro), `vence_en` ascendente con las sin fecha al final
  (el orden de `tareas_responsable_idx`), `limit 6`; cada fila enlaza a `/agenda?tarea=<id>`.
- **D9 · «Ver todas» lo dibuja cada bloque** (`VerTodasDelBloque`) siempre que haya filas, hacia `/agenda?ver=tarea` o `/agenda?ver=recordatorio`; las filas de «Recordatorios de hoy» no cambian de destino.
- **D10 · El e2e prueba el camino de la fila y lo nuevo en dos pruebas** (escritorio, `@sin-celular` con motivo); nada de volumen ni de conflicto por interfaz.
- **D11 · «Sin fecha» es el nombre** en tipos, tablas y UI (`agenda_tareas_sin_fecha`, «Tareas sin fecha»); entró al glosario.
