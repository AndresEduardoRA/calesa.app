## 2026-11-11 — Paso 7.08-1: conversaciones y membresía del chat (parte 1 de 3 del 7.08)

- **Hecho:** `conversaciones` y `conversaciones_miembros` se escriben sólo por RPC `security definer`, y el canal global pide `chat.global` vigente.
  - Estructura: `conversaciones.par_directo` (par ordenado, único parcial: A→B y B→A son la misma directa), `conversaciones.ultimo_mensaje_en`
    con su índice y el trigger que la mueve en cada mensaje, el canal global «Equipo» sembrado en la migración y `conversaciones_miembros` en
    `supabase_realtime`.
  - `es_miembro()` exige `chat.global` en el canal global: quien lo pierde deja de leer el canal, sus miembros, mensajes, menciones y tareas,
    y no escribe, aunque quede su fila de miembro.
  - RPC: `chat_directa`, `chat_global_entrar`, `chat_grupo_crear`, `chat_grupo_miembros`, `chat_salir`, `chat_leer` y `chat_silenciar`. Toda
    empieza por `assert_activo()`.
  - Se van las policies y los grants de escritura de las dos tablas.
  - Cierra de `docs/PLAN.md:1510` ítem 5: el índice de una directa por par, nadie crea el canal global y quien pierde `chat.global` sigue leyendo.
    De PLAN:1753, «leer el canal global sin el permiso». Siguen abiertos la ventana de edición y el des-borrar (7.08-2).
- **Commits:** `0d223b26` (estructura), `29b79b6f` (`es_miembro` con `chat.global`), `05a98c2c` (directas y global), `fdbd2138` (grupos),
  `cea0f6f5` (leer y silenciar), `e452f029` (sin escritura directa) y, por la auditoría del informe, `9a738608` (el trigger acota
  `ultimo_mensaje_en` a la hora actual: mientras siga la escritura directa de `mensajes`, una fecha futura fijaba la conversación arriba).
- **Verificación** (`.piloto/salidas/7.08-1/`):
  - `db:probar` completo en el hook de `e452f029` y de `9a738608`: 824 ✓, ningún ✗.
  - `areas/chat/` (4 archivos, 14 bloques) y las de agenda que usan `es_miembro` en verde.
  - Publicación en la base local tras `db:reset`: `conversaciones_miembros` en `supabase_realtime`.
  - `scripts/guardas`: 1.044 ✓. `typecheck` sin errores. `nivel.mjs`: nivel 2 (`rls`, `estructura`).
  - El relleno de `par_directo` y `ultimo_mensaje_en` no tiene prueba con datos previos (PGlite arranca vacío); desempata por `creado_en, id`.
- **Trampa:** `cm_` ya era prefijo de otra área; en `db:probar` completo los `pg_temp` se comparten. El chat usa `chd_`, `chgl_`, `chm_`, `chgr_`.
- **7.08 sigue:**
  - **7.08-2 (mensajes):** índice `mensajes (conversacion_id, creado_en desc, id desc)`, `mensajes` a la publicación, `mensaje_enviar`,
    `mensaje_editar` (15 min), `mensaje_eliminar` (`chat.moderar`, vacía el cuerpo), `mensaje_tarea_crear`, `mensaje_evento_crear`, sin escritura
    directa en `mensajes` y `mensajes_menciones`; `mensajes.sql` y `fichas.sql`.
  - **7.08-3 (lecturas):** `chat_conversaciones` (cursor, `_acotar_pagina`, no leídos hasta 100) y `chat_no_leidos`, su fila en
    `docs/RENDIMIENTO.md`. Medir si su ruta por persona usa `conversaciones_ultimo_mensaje_idx`; si no, reemplazarlo. Esta parte cierra con `parcial: true`.
- **Para 7.08-2 y 7.08-3:** toda definer decide la membresía de quien llama con `es_miembro()`, nunca con la fila suelta de
  `conversaciones_miembros` (si no, el global se reabre en `mensaje_enviar`, `mensaje_tarea_crear`, `chat_conversaciones` y `chat_no_leidos`).
  Hoy `tarea_crear` y `agenda_quienes_reciben` miran la fila del responsable, y el responsable de una tarea del global puede no tener
  `chat.global`. `mensaje_enviar` no mueve `ultimo_mensaje_en` (lo hace el trigger) y fija `creado_en` en el servidor; el INSERT directo en
  `mensajes` se revoca en ese mismo paso. La ficha de tarea pasa `p_conversacion` a `tarea_crear`.
- **Aviso:** `chat_salir` pide `es_miembro()`: quien perdió `chat.global` recibe 42501 al querer salir del canal y su fila queda (no lee nada).
  Las pruebas G1 y M1 son de regresión (pasaban antes de esta parte); C5 lo prueba G3.
- **Para 7.09:** suscribirse a `conversaciones_miembros` sólo por INSERT y UPDATE con `usuario_id=eq.<yo>` (D19).
- **Para el carril a (D13):** `aplicado_en` en `seed.sql`: `chat.participar` «chat_directa, chat_grupo_crear, chat_grupo_miembros; policy
  mensajes»; `chat.global` «es_miembro, chat_global_entrar; policy conversaciones».
- **Para el coordinador (D7):** sumar `chat_grupo_miembros`, `chat_leer` y `chat_silenciar` a las excepciones sin versión de
  `.claude/rules/migraciones.md`.
- e2e completo: no (7.08-1, Nivel 2 por RLS y estructura: lo corre el CI del PR; sin pantalla)
