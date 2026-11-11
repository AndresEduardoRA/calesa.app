## 2026-11-11 — Paso 7.06-1: escribir eventos y tareas por RPC (parte 1 de 3 del 7.06)

- **Hecho:** `eventos`, `eventos_destinatarios` y `tareas` se escriben sólo por RPC `security definer` (sin policies ni grants de escritura).
  - Eventos: `evento_crear`, `evento_guardar` y `evento_eliminar`. Publicar exige `agenda.eventos.publicar` al crear, en todo guardar y al eliminar.
    Los destinatarios van de 1 a 50 y tienen que estar activos; cada uno nuevo recibe `evento_invitacion`.
  - Tareas: `tarea_crear`, `tarea_guardar`, `tarea_completar`, `tarea_eliminar` y `reasignar_tarea`, que cambió de firma y ahora lleva versión.
    Dar una tarea exige `asignar`, y quien la recibe tiene que estar activo, sin bloqueo y con `recibir`. No se vence en el pasado.
  - Columnas nuevas: `eventos.cotizacion_id` y `tareas.conversacion_id`. Los miembros de la conversación leen la tarea.
  - `agenda_version()` mueve la versión aunque haya dos cambios en una transacción.
  - Toda RPC empieza por `assert_activo()` y responde `{resultado, id, actualizado_en}`.
  - Cierra lo de agenda de `docs/PLAN.md:1508`, ítem 4: la ficha con `subasta_en`, `tarea_validar` sin pasado ni bloqueados y `eventos: editar` sin publicar.
- **Commits:** `60dec20a` (eventos), `56ba4031` (tareas). Son dos en vez de los tres del plan: con el primero solo, `db:probar` caía porque
  `agenda.eventos.publicar` quedaba sin punto de enforcement. Se partió por tabla y cada commit deja el árbol en verde.
- **Verificación** (`.piloto/salidas/7.06/`):
  - `db:probar` completo: 787 ✓, ningún ✗.
  - `areas/agenda/` (6 archivos, 20 bloques) en verde.
  - `scripts/guardas`: 1.044 ✓.
  - `typecheck` sin errores.
  - Una mutación de control (sin mirar el bloqueo en `_agenda_puede_recibir`) cae en T2 y T5.
  - `nivel.mjs`: nivel 2 (`rls`, `estructura`).
- **7.06 sigue:**
  - **7.06-2:** `agenda_rango`, `agenda_tareas_sin_fecha` (con `_acotar_pagina`), `agenda_quienes_reciben`, el índice por `vence_en` y `rango.sql`.
  - **7.06-3:** `entities/visibilidad.ts` con su test. Esta parte cierra con `parcial: true`.
- **Para el carril a (D6):** `permisos.aplicado_en` de las cuatro claves de agenda vive en `seed.sql`. Ahora tiene que nombrar las RPC de 7.06-1.
- **Para 7.10:** `mensaje_tarea_crear` tiene que pasar `p_conversacion` a `tarea_crear`. Si no, la tarea nace sin conversación y sus miembros no la leen.
- **Para 7.07:** el registro de `agenda_tareas_sin_fecha` en `scripts/guardas/areas-b/paginas-en-la-base.ts` llega con su primera llamada (D7).
- **Aviso:** `evento_invitacion` no pide acción y no se acciona. Por el índice antispam, a quien se quita y se vuelve a sumar no le llega un segundo aviso.
- e2e completo: no (7.06-1, Nivel 2 por RLS y estructura: lo corre el CI del PR; sin pantalla)
