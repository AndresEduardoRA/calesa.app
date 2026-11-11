## 2026-11-11 — Paso 7.08-3: lecturas del chat (parte 3 de 3 del 7.08)

- **Hecho:** las dos lecturas del chat, `security definer`, que repiten la regla de `es_miembro` calculada una vez (fila propia y, en el canal
  global, `chat.global` vigente).
  - `chat_conversaciones(p_tamano, p_antes_en, p_antes_id)`: mis conversaciones, la del mensaje más reciente primero, por cursor
    `(ultimo_mensaje_en, id)`, 20 por defecto y 50 como mucho (`_acotar_pagina`). Cada fila trae `ultimo_leido_en`, `silenciada`, `no_leidos`
    (0 a 100: de otros entre las 100 entradas más nuevas posteriores a mi lectura) y `otro` (`{id, nombre}` en una directa). Sin cuerpos.
  - `chat_no_leidos()`: el total, de 0 a 100; no suma silenciadas, propios ni el global sin `chat.global`.
  - Se borra `conversaciones_ultimo_mensaje_idx`: ninguna ruta por persona lo usa y volvía no-HOT el update de cada mensaje (D2).
- **Commits:** `c50886f5` (la lista y el índice) y `4d226d45` (el total).
- **Verificación** (`.piloto/salidas/7.08-3/`):
  - `areas/chat/lista.sql` L1–L4: 4 ✓ (`solo-lista.txt`). `db:probar` completo: 898 ✓, ningún ✗ (`probar-completo.txt`).
  - `EXPLAIN (analyze)` como dueño de la tabla (así corre la definer): con 200.000 conversaciones la lista va por
    `conversaciones_miembros_usuario_idx` → `conversaciones_pkey` y ordena sólo las de quien mira; con 20.000, el planificador prefiere recorrer
    `conversaciones` (chica). No leídos: `mensajes_hilo_idx`, 100 filas (`explain.txt`, `explain-200k.txt`).
  - `scripts/guardas`: 1.045 ✓. `typecheck` sin errores. `nivel.mjs`: nivel 2 (`estructura`, por el `drop index`).
- **7.08 terminado** (`parcial: false`): estructura (`par_directo`, `ultimo_mensaje_en`, canal global), RPC de membresía (7.08-1), mensajes y
  menciones sólo por RPC (7.08-2), lecturas (7.08-3); pruebas en `supabase/tests/areas/chat/` (`membresia`, `directas`, `global`, `grupos`,
  `mensajes`, `mensajes-editar`, `fichas`, `lista`).
- **Para 7.09:** registrar `chat_conversaciones` en `scripts/guardas/areas-c/paginas-en-la-base.ts` (`parametro: 'p_tamano'`,
  `pideElCodigo: TAMANO_DE_VER_MAS`) en el commit de su primer `.rpc(` (`paginas.test.ts` rechaza una entrada sin llamador). Llamar `chat_leer`
  con `p_hasta` = el `creado_en` del último mensaje visto, también tras enviar (enviar no mueve la lectura, D5). `no_leidos` 100 se escribe «99+»
  con `conteoAcotado(n, 99)` y `conteoCorto()`. La lista trae los no leídos también de las silenciadas: la pantalla decide (D9).
- **Para 7.11:** `chat_no_leidos()` ya descuenta las silenciadas y se detiene en 100.
- **Para el coordinador:**
  - La fila 7.08 de PLAN deja de decir «con su índice» para `conversaciones.ultimo_mensaje_en` (D2). Sumar a la fila 7.09 el registro de
    `chat_conversaciones` en `paginas-en-la-base.ts` (`p_tamano`, `TAMANO_DE_VER_MAS`).
  - PLAN:1500 (huecos, «Chat»: «…no leídos; realtime»): no leídos queda en la base (`chat_conversaciones`, `chat_no_leidos`); realtime entró en
    7.08-1 y 7.08-2.
  - Siguen abiertos de 7.08-1 y 7.08-2: `aplicado_en` en `seed.sql` de `chat.participar` («… mensaje_enviar, mensaje_editar, mensaje_tarea_crear,
    mensaje_evento_crear») y `chat.moderar` («mensaje_eliminar») (carril a); `mensaje_eliminar` en las excepciones sin versión de
    `.claude/rules/migraciones.md`; para el carril b, D14 de 7.08-2 (`tarea_crear` y `agenda_quienes_reciben` miran la fila suelta del responsable).
- e2e completo: no (7.08-3, Nivel 2 por el paso: lo corre el CI del PR; sin pantalla)
