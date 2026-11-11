## 2026-11-11 — Paso 7.06-1: escribir eventos y tareas por RPC

- **D1 · Un evento puede llevar una cotización:** `eventos.cotizacion_id`, FK `on delete set null`, con índice. Las tareas ya la tenían.
- **D2 · Quién cambia una tarea:**
  - El creador la edita, la elimina y la reasigna (reasignar, con `agenda.tareas.asignar`).
  - El responsable sólo la completa y la reabre.
  - Se aparta de antes, cuando el responsable con `asignar` también reasignaba: sigue la recomendada de la fila.
- **D3 · Una tarea nacida en una conversación** sólo se da o se reasigna a un miembro de esa conversación.
- **D4 · La conversación de la tarea es una columna,** `tareas.conversacion_id`, que fija `tarea_crear` y no cambia. No se deduce de
  `mensajes.tarea_id`: una ficha compartida después en otro chat no amplía quién la ve.
- **D5 · La versión de `eventos` y `tareas` la mueve `agenda_version()`,** con `greatest(clock_timestamp(), anterior + 1 µs)`. Reemplaza a
  `trg_actualizado_en`, que no se movía dos veces en una transacción.
- **D6 · `aplicado_en` de los permisos de agenda no se toca:** vive en `seed.sql` (carril a), y el seed lo pisaría.
- **D7 · El registro de `paginas-en-la-base.ts`** llega con la primera llamada de su RPC (7.07). La guarda falla con una entrada que nadie llama.
- **D8 · Las pruebas con usuario simulado** van en `supabase/tests/areas/agenda/`, no en `humo.sql`.
- **D9 · Un evento puede empezar en el pasado** (para registrar una reunión hecha). Sólo la tarea no vence en el pasado.
- **D10 · Avisos de evento:** `evento_invitacion` no pide acción y quitar a alguien no avisa. Un evento privado o público no lleva destinatarios.
- **D11 · Completar, eliminar o reasignar** accionan la `tarea_asignada` abierta del responsable (al reasignar, la del anterior).
- **D12 · `reasignar_tarea` cambia de firma** a `(p_tarea, p_actualizado_en_esperado, p_responsable)`. La vieja se borra con `drop`, sin dejar sobrecarga.
- **D13 · Las RPC de escritura responden `{resultado, id, actualizado_en}`.** La cotización se comprueba con `puede_cotizacion()`, nunca leyendo `public.cotizaciones`.
- **D14 · Los docs van por parte,** en `docs/pasos/7.06-1/`.
- **D15 · `p_datos` al guardar:**
  - Una clave presente es un cambio, una ausente no toca nada y un nulo quita el valor.
  - Una clave desconocida da 22023 con la clave en el hint.
  - `p_destinatarios` nulo deja la lista como está.
- **D16 · Eliminar un evento público o «seleccionados»** exige `agenda.eventos.publicar`.
- **D17 · Orden en toda RPC que edita:**
  - `assert_activo()`, luego la fila `for update`.
  - Si no la ve, 42501 «No encontramos…». Si no le toca, 42501.
  - Después `sin_cambios`, luego la versión (PT409) y al final el cambio.
  - `reasignar_tarea` pide `asignar` antes de tomar la fila: a una persona bloqueada le llega «No tienes el permiso», y escribir no puede igual.
- **D18 · Publicar también para despublicar:** `evento_guardar` exige `agenda.eventos.publicar` si el evento era o queda público o «seleccionados».
  Es coherente con D16: sin esto, quien perdió el permiso podría volverlo privado y después eliminarlo.
- **D19 · A quien ya estaba no se le revalida:** al guardar, sólo a quien se suma como destinatario se le pide estar activo y sin bloqueo. Una baja
  posterior no impide editar el título.
