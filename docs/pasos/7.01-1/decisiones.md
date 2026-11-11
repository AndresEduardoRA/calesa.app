## 2026-11-11 — Paso 7.01-1: notificaciones, la base (la puerta, la lista, realtime y los jobs)

- **D1 · Las preferencias no apagan la campana** (la recomendada de la fila): la puerta mira sólo baja y bloqueo; la campana es el registro y las preferencias
  gobiernan sólo el push (7.03). Así no cambian las filas que insertan otras fases.
- **D2 · La limpieza avisa al creador del vehículo, 3 días antes** (la recomendada de la fila; se hace en la 7.01-2): es quien tiene «Conservar».
- **D3 · `actividad_purgar()` no se programa** (la recomendada de la fila): borra auditoría y es de la Fase 9. Esta fase purga lo suyo con
  `notificaciones_purgar()`; que las dos borren lo mismo cuando la Fase 9 la programe no hace daño.
- **D4 · Cambiar la hora de un recordatorio reemplaza su aviso abierto:** antes de avisar, `recordatorios_notificar()` borra la notificación del mismo
  recordatorio que sigue sin accionar. Si quedara, el antispam se tragaría el aviso nuevo y `notificado_en` quedaría sellado sin aviso. Se puede revertir
  cambiándolo por sellar `accionada_en`.
- **D5 · Un recordatorio eliminado se sella sin avisar:** si sólo se filtrara, quedaría al frente de `recordatorios_pendientes_idx` y cada corrida lo volvería a
  recorrer. Conducta aceptada (auditoría del plan, obs. 4): uno borrado antes de su hora y restaurado después no avisa (`recordatorio_restaurar` no vuelve
  `notificado_en` a nulo); la agenda igual lo muestra «Vencido».
- **D6 · La publicación de Realtime tiene su doble en PGlite** (el preámbulo de `scripts/probar-schema.mjs` la crea vacía) en vez de quitar la línea de la
  migración: así `db:probar` mira el catálogo de verdad. No hizo falta el plan B.
- **D7 · `notificaciones_por_accionar_idx` lleva las columnas de la lista** (`usuario_id, creado_en desc, id desc`): «primero las que piden acción» de 7.02 corre
  el mismo cursor sobre el parcial.
- **D8 · Sin índice nuevo para la purga:** el `limit` corta el recorrido al llenar el lote, lo viejo está al principio y corre una vez al día. Un índice por
  `visto_en` pagaría una escritura en cada visita.
- **D9 · Un destinatario sin perfil también se descarta en silencio** (antes caía por la FK): una notificación nunca hace fallar la operación que avisa.
- **D10 · `recordatorios_notificar()` entra al inventario de la cartera de `humo.sql`:** lee la fila vigente de `leads_asesores` del dueño del recordatorio
  sólo para elegir la `ruta` de su propio aviso; a quien está de baja no le llega nada (la puerta).
- **D11 · Sin prueba de carrera para el job:** dos corridas solapadas se reparten las filas con `skip locked` y el antispam frena lo que quede; no hay candado
  de numeración ni de dinero.
- **D12 · Realtime no aplica RLS a los `DELETE`** (llegan a todo suscriptor con la PK): este paso borra en D4 y en la purga diaria. 7.02 se suscribe sólo a
  `INSERT` y `UPDATE` con filtro `usuario_id=eq.<yo>` y nunca reacciona a `DELETE` (auditoría del plan, obs. 2). Va en la ficha de `notificaciones`. Realtime
  igual decodifica cada `DELETE` de la purga (hasta 50.000 por noche): 7.02 apunta ese costo en `docs/RENDIMIENTO.md` al escribir la fila de la campana.
- **D13 · El 7.01 se parte en dos sesiones:** 7.01-1 (esta) y 7.01-2 (los avisos al compartir, transferir y limpiar, con `avisos-de-cartera.sql`). Juntas
  pasaban de 6 commits de código, y la 7.01-2 tiene que decidir la marca de «ya avisado» de la limpieza, el choque con el antispam al volver a compartir y en
  qué job corre.
