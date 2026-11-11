## 2026-11-11 — Paso 7.08-2: mensajes del chat (parte 2 de 3 del 7.08)

- **D1** · 7.08-2 lleva todo lo de mensajes (cabe en 5 commits); 7.08-3 no cambia.
- **D2** · El cuerpo guarda cada mención como `#[<tipo>:<uuid>]` y la RPC exige que el conjunto de tokens del texto sea igual al de `p_menciones`: la referencia, nunca el
  nombre. El parser de 7.10 escribe y lee ese formato.
- **D3** · Mencionar o mandar en ficha un vehículo, lead o cotización exige verlo (lo mismo para los dos caminos); a una persona se la puede mencionar
  siempre.
- **D4** · El aviso `mencion` va sólo a miembros vigentes, no a quien envía, aunque esté silenciada (recomendada de 7.10); sin cuerpo (no copia el texto
  a `notificaciones`), referencia `mensaje`, ruta `/chat?c=`. Al editar, los repetidos los absorbe `notificaciones_antispam`.
- **D5** · Un mensaje admite hasta 4.000 caracteres; con ficha, el texto es opcional.
- **D6** · Ventana de 15 minutos, constante en la RPC (duda 1). Editar pide `chat.participar` y versión `coalesce(editado_en, creado_en)` (regla de
  `.claude/rules/migraciones.md`: toda RPC de edición lleva versión).
- **D7** · Editar reemplaza el conjunto de menciones.
- **D8** · Borra el autor o quien tiene `chat.moderar`, siempre siendo miembro (la dueña sin atajo, D18 de 7.08-1); sin ventana; sin versión (idempotente,
  como `leads_papelera_enviar`): va a las excepciones. El cuerpo se vacía y las menciones se borran (duda 2); la ficha queda y el aviso ya dado queda
  (no tiene contenido).
- **D9** · El borrado sin cuerpo es un check, no sólo la RPC; un borrado previo con cuerpo se vacía en la migración (sin prueba de datos previos: PGlite
  arranca vacío, lo dice la bitácora).
- **D10** · `mensaje_editar_validar` se conserva como defensa (autor y `editado_en`) y deja pasar el borrado del moderador.
- **D11** · El id del mensaje viene del navegador; el de la tarea o el evento lo genera el servidor. Un candado consultivo por id hace idempotente el par sin
  dejar una tarea huérfana si chocan dos reintentos.
- **D12** · Primero la RPC de agenda con sus reglas y después la del chat (miembro vigente), todo en una transacción: un error deshace la tarea o el evento.
- **D13** · El evento sigue la visibilidad de 7.06 (privado por defecto): los demás miembros ven la ficha como placeholder salvo que lo publique quien puede.
- **D14** · `tarea_crear` y `agenda_quienes_reciben` (carril b) no se tocan: `mensaje_tarea_crear` es más estricto; aviso al carril b.
- **D15** · El índice del hilo reemplaza a `mensajes_conversacion_fecha_idx`; `mensajes_conversacion_id_idx` queda (reversible, sin medir hoy).
- **D16** · `mensaje_enviar` no crea fichas de tarea ni de evento.
- **D17** · `p_responde_a` es de la misma conversación; puede estar borrado.
- **D18** · Sin prueba de carreras (duda 4).
- **D19** · Docs en `docs/pasos/7.08-2/`; la partición la anota el coordinador.
- **D20** · `creado_en` lo fija el servidor con `clock_timestamp()`.
- **D21** · Una ficha de vehículo, lead o cotización puede quedar sin su referencia: sus FK son `on delete set null` y las papeleras borran de verdad;
  exigirla frenaba la purga. Tarea y evento la siguen exigiendo (sus FK son `restrict`).
