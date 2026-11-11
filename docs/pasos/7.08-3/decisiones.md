## 2026-11-11 — Paso 7.08-3: lecturas del chat (parte 3 de 3 del 7.08)

- **D1** · `chat_conversaciones` y `chat_no_leidos` son `security definer`, no de invocador (a diferencia de `agenda_tareas_sin_fecha`): contar no
  leídos bajo la RLS paga `es_miembro` por cada mensaje (hasta 2.000 por página). Repiten la regla entera, calculada una vez
  (`v_global := tiene_permiso('chat.global')`; por fila `m.usuario_id = yo and (not c.es_global or v_global)`), y `lista.sql` L1 y L4 la prueban en el
  borde que importa (global con fila y sin permiso). Si la regla de `es_miembro` cambia, cambia en los tres lugares.
- **D2** · La lista parte de las filas de miembro de quien mira y ordena el top-N; `conversaciones_ultimo_mensaje_idx` (orden global) no sirve a
  ninguna ruta y se borra: con él, cada mensaje volvía no-HOT el update de `ultimo_mensaje_en`. Respaldo: `EXPLAIN` con 200.000 conversaciones
  (`.piloto/salidas/7.08-3/explain-200k.txt`, como dueño de la tabla y con valores literales). Desnormalizar `ultimo_mensaje_en` en `conversaciones_miembros` se descarta: cada mensaje del global
  escribiría una fila por miembro, todas en `supabase_realtime`. Reversible.
- **D3** · No leídos lee a lo sumo 100 entradas de `mensajes_hilo_idx` posteriores a la lectura y cuenta las de otros: acotado aunque la persona
  haya escrito mucho sin leer. Si entre esas 100 hay propias, el número puede quedar bajo «99+»; por la pantalla no pasa (7.09 marca leído lo que
  se ve, también al enviar). Los eliminados cuentan (el hilo muestra «Mensaje eliminado»).
- **D4** · Tope 100 = `tope + 1` con tope 99: la base devuelve 0…100 y el código escribe «99+» con `conteoAcotado`/`conteoCorto`.
  `chat_no_leidos()` devuelve un entero, no un objeto.
- **D5** · Enviar no mueve la última lectura de quien envía: lo haría con `clock_timestamp()` y marcaría leído un mensaje ajeno de otra
  transacción con hora anterior (lo que D9 de 7.08-1 evitó con `p_hasta`). Lo hace 7.09 con `chat_leer`.
- **D6** · `p_tamano`: 20 por defecto (`TAMANO_DE_VER_MAS`) y 50 como mucho, como la agenda. Cursor `(ultimo_mensaje_en, id)`: una conversación
  que recibe un mensaje mientras se pagina sube y no reaparece abajo; la trae la relectura de la cabeza (realtime de 7.09).
- **D7** · El registro en `scripts/guardas/areas-c/paginas-en-la-base.ts` va con el primer llamador (7.09): `paginas.test.ts` rechaza una entrada
  sin `.rpc(` en `src/`. `_acotar_pagina` ya lo vigila `escala.sql`.
- **D8** · Sin vista previa del último mensaje: su cuerpo lleva tokens de mención que resuelve 7.10; 7.09 la suma con `create or replace` si su
  diseño la pide.
- **D9** · La lista devuelve `no_leidos` también de las silenciadas (con `silenciada`, la pantalla decide); el total no las suma («silenciar apaga
  los no leídos», PLAN:1681).
- **D10** · Leer no pide permiso aparte de la membresía (como la RLS de `mensajes`); `otro.nombre` sale aunque la persona esté de baja (la directa
  sigue siendo legible).
