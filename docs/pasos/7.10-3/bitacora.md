## 2026-11-12 — Paso 7.10-3: `/tarea`, `/evento`, sus fichas y completar (parte 3 de 3 del 7.10)

- **Hecho:** el redactor reconoce `/tarea` y `/evento` al enviar y abre su formulario; la tarea o el evento nacen ligados a la conversación y dejan su ficha en el hilo, donde el responsable completa o reabre la tarea. Sin migración, policy, RLS ni `db:types`: las RPC `mensaje_tarea_crear` y `mensaje_evento_crear` ya existían (7.08-2).
  - `agenda/client.ts` deja salir `SelectorDePersonas`, las reglas puras del formulario, `leerPersonasParaTarea(texto, conversacion?)` y la action `completarTarea`.
  - `entities/fichas.ts` con su test (filas, estados, `puedeCompletarDesdeFicha`, `estaVencida`), `infra/fichas.client.ts` (una lectura por clase y por tanda de 100, más los nombres de los responsables), `useFichasDelHilo`, `FichaDelMensaje`, `FichaDeTarea` y `FichaDeEvento`.
  - `comandoDelTexto` en `entities/menciones.ts` con su test; `useRedactor` y `Redactor` con `alComando` y el aviso.
  - `PanelDeTarea` y `PanelDeEvento` (diferidos, por `?panel=tarea|evento`), `usePanelesDeFicha`, `infra/miembros.client.ts`; `Hilo` extrajo `useAccionesDelHilo` y `PanelesDelHilo` (límite de 80 líneas por función); `page.tsx` pasa `puedeAsignar` y `puedePublicar` con `puede()`.
  - Los dos paneles se registran en `scripts/guardas/areas-c/drawers-con-salida.ts`. `e2e/soporte/chat.ts` acepta `permisosDeLuis` y borra las tareas y eventos de prueba antes que las personas.
- **Commits:** `78d76f01` (agenda `client.ts`), `5e6c3d9c` (crear por RPC), `1cdbdfa5` (fichas), `04870b3f` (comando), `fa6552a0` (formularios) y `12ecd5f4` (e2e), más el de docs.
- **Verificación** (`.piloto/salidas/7.10-3/`):
  - `vitest run src/modules/chat scripts/guardas`: 47 archivos, 1.244 ✓. `typecheck` y `eslint` sin avisos.
  - `e2e/chat-menciones.spec.ts` en `escritorio`: 6 ✓ (`e2e-dirigidos-3.txt`). Caso 5: Ana escribe `/tarea …` y Enter, no se envía texto; se abre «Nueva tarea» con el título y Luis elegido; crea con vencimiento; la ficha dice «Para Luis Chat» y «Pendiente», sin botón de completar. Luis ve el aviso en la campana, la tarea en la agenda, y «Marcar como hecha» → «Hecha» y «Reabrir»; recargar la deja hecha. Caso 6: `/evento` de Ana (sin `agenda.eventos.publicar`) es privado: Ana ve la ficha y Luis lee «Evento no disponible» (el título no está en su DOM).
  - `chat.spec.ts`, `chat-menciones.spec.ts` y `agenda.spec.ts` en `escritorio` y `movil`: 36 ✓ (`e2e-dirigidos-4.txt`).
  - Las dos primeras corridas del caso 5 cayeron por errores del propio spec (el campo queda tapado por el panel; el panel de la agenda se llama «Tarea») y por la limpieza (las tareas de prueba impedían borrar a Ana); corregidos.
- **No se hizo:** reasignar, editar o eliminar desde la ficha (se hace en la agenda), menú de comandos con `/`, Realtime de tareas, fichas de lead, vehículo y cotización desde la interfaz.
- e2e completo: no (7.10-3, Nivel 1: lo corre el CI del PR; dirigidos: chat, chat-menciones, agenda)
- **Para el coordinador:** «7.10-3 hecha (`/tarea`, `/evento`, fichas y completar); 7.10 completa (3 de 3)». Quita `parcial`. Pasar a `docs/DECISIONES.md` la lista del final de `docs/pasos/7.10-3/decisiones.md`.
