## 2026-11-11 — Paso 7.08-2: mensajes del chat (parte 2 de 3 del 7.08)

- **Hecho:** `mensajes` y `mensajes_menciones` se escriben sólo por RPC `security definer`.
  - Estructura: `mensajes_hilo_idx (conversacion_id, creado_en desc, id desc)` reemplaza a `mensajes_conversacion_fecha_idx`; `mensajes` en
    `supabase_realtime`; un mensaje eliminado no guarda cuerpo (check `mensajes_eliminado_sin_cuerpo`); `mensaje_editar_validar` deja pasar el
    borrado. Una ficha de vehículo, lead o cotización puede quedar sin su referencia cuando se purga lo nombrado.
  - RPC: `mensaje_enviar` (idempotente por id, menciones `#[tipo:uuid]` iguales a `p_menciones`, hasta 20, ficha de vehículo, lead o cotización
    que quien envía ve, aviso `mencion`), `mensaje_editar` (autor, 15 minutos, versión `coalesce(editado_en, creado_en)`), `mensaje_eliminar`
    (autor o `chat.moderar`, siempre miembro; vacía el cuerpo), `mensaje_tarea_crear` y `mensaje_evento_crear` (la regla de agenda y después la
    del chat, en una transacción). Ayudantes sin definer: `_chat_miembro_vigente`, `_chat_cuerpo`, `_chat_menciones_guardar`.
  - Se van las policies y los grants de escritura de las dos tablas.
  - Cierra de `docs/PLAN.md:1510` ítem 5 lo que quedaba (ventana de edición y des-borrar): con 7.08-1, el ítem queda cerrado. De PLAN:1753,
    «des-borrar un mensaje».
- **Commits:** `063a8b48` (estructura), `4392bc32` (enviar), `82710a59` (editar y eliminar), `4848f076` (tarea y evento, y los tipos),
  `68f411e2` (sin escritura directa), `965af1b4` (las papeleras borran de verdad y `mensajes_check` exigía la FK de la ficha, que es
  `on delete set null`: la purga daba `check_violation`) y, por la auditoría del informe, `8786965e` (las pruebas de fichas y menciones miran el
  alcance `propios`, no la falta de permiso; E2 y E7 con una cotización real).
- **Verificación** (`.piloto/salidas/7.08-2/`):
  - `db:probar` completo sobre el árbol final: 883 ✓, ningún ✗ (`probar-completo-fix2.txt`). `areas/chat/`: 7 archivos, 27 bloques.
  - Publicación en la base local tras `db:reset`: `conversaciones_miembros`, `mensajes` y `notificaciones` (`publicacion.txt`, con el comando).
  - `scripts/guardas`: 1.044 ✓. `typecheck` sin errores. `nivel.mjs`: nivel 2 (`rls`, `estructura`).
  - El hook del commit corrió commitlint y mapa (y lint en el que trae TS); con `PILOTO=1` salta `typecheck` y `schema`: los dos se corrieron
    aparte sobre el árbol final. `database.types.ts` va entero en `4848f076`: los commits de enviar y editar quedan, en su historia, sin sus tipos.
  - Vaciar los borrados de antes con cuerpo no tiene prueba con datos previos (PGlite arranca vacío): el orden de la migración lo cuida.
- **7.08 sigue:**
  - **7.08-3 (lecturas):** `chat_conversaciones(p_tamano, cursor)` (con `_acotar_pagina`, no leídos acotados a 100) y `chat_no_leidos()`, su fila
    en `docs/RENDIMIENTO.md`, el registro en `scripts/guardas/areas-c/paginas-en-la-base.ts`. Servido: `conversaciones_ultimo_mensaje_idx`
    (7.08-1, medir si la ruta por persona lo usa), `es_miembro()` con `chat.global`, el trigger de `ultimo_mensaje_en`; no leídos = mensajes de
    otros con `creado_en > ultimo_leido_en`, sobre `mensajes_hilo_idx`. Esta parte cierra con `parcial: true`.
- **Para 7.09 y 7.10:** la mención va en el texto como `#[<tipo>:<uuid>]` y `p_menciones` lleva exactamente esos tokens; editar dentro de 15
  minutos con la versión `coalesce(editado_en, creado_en)`; suscribirse a `mensajes` filtrando por `conversacion_id` (realtime aplica la RLS de
  `select` a INSERT y UPDATE); una ficha sin referencia es «ya no existe». El aviso `mencion` apunta a `/chat?c=<conversación>`, que no existe
  hasta 7.09.
- **Para el carril a:** `aplicado_en` en `seed.sql`: `chat.participar` «… mensaje_enviar, mensaje_editar, mensaje_tarea_crear,
  mensaje_evento_crear»; `chat.moderar` «mensaje_eliminar». Tipo de aviso nuevo `mencion` (referencia `mensaje`, sin cuerpo).
- **Para el carril b (D14):** `tarea_crear` y `agenda_quienes_reciben` miran la fila suelta del responsable: con `p_conversacion` del canal global,
  un responsable sin `chat.global` pasa. `mensaje_tarea_crear` lo vuelve a mirar con `_chat_miembro_vigente`.
- **Para el coordinador:** sumar `mensaje_eliminar` a las excepciones sin versión de `.claude/rules/migraciones.md` (D8); cerrar PLAN:1510 ítem 5
  y el «des-borrar un mensaje» de PLAN:1753.
- e2e completo: no (7.08-2, Nivel 2 por RLS y estructura: lo corre el CI del PR; sin pantalla)
