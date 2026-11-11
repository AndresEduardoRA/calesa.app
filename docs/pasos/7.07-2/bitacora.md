## 2026-11-11 — Paso 7.07-2: los paneles de evento y de tarea de `/agenda` (parte 2 de 3 del 7.07)

- **Hecho:** desde `/agenda` se crea, se ve, se edita y se elimina un evento y una tarea, todo por URL. `parcial: true`.
  - Paneles: `?evento=<id>` y `?tarea=<id>` (detalle, leído por id en el servidor bajo la RLS), `&editar=1` (el formulario en el mismo panel),
    `?eliminar=evento|tarea` (confirmar), `?panel=nuevo-evento|nueva-tarea` (alta); la tecla `N` abre «Nuevo evento»; los chips de evento y tarea son enlaces
    que conservan la vista, la fecha y los filtros.
  - Formularios: evento con visibilidad (público y «seleccionados» deshabilitados con motivo sin `agenda.eventos.publicar`) y destinatarios (hasta 50, buscados
    por nombre desde 3 letras); tarea con vencimiento y, con `agenda.tareas.asignar`, «Para otra persona». Valores de partida, validación y claves que cambian
    en `entities/edicion.ts`. Conflicto `PT409` con «Recargar»; borrador en `sessionStorage`.
  - Seis actions sobre las RPC `evento_*` y `tarea_*`; ninguna decide permisos. Sin migración ni dependencia.
  - Guardas: `scripts/guardas/areas-b/{confirmar-con-url,drawers-con-salida}.ts` (la carpeta nace aquí) y `drawers-con-salida-areas.test.ts` suma los de las áreas.
  - `e2e/agenda.spec.ts`: la dueña crea por la interfaz el evento «seleccionados» (con la tecla N) y la tarea para la asesora, edita el título, la asesora los ve
    (sin «Editar» ni «Eliminar») y la dueña elimina el evento confirmando por URL.
- **Queda para 7.07-3:** completar y reabrir tareas, reasignar, «Sin fecha», `?recordatorio=` y su «Completar», bloque «Mis tareas» de la bandeja y
  `scripts/guardas/areas-b/paginas-en-la-base.ts`.
- **Verificación** (`.piloto/salidas/7.07-2/`): `vitest` de agenda y `scripts/guardas` 1.147 ✓; `lint` y `typecheck` sin avisos; e2e `agenda` 5 ✓ (4 de 7.07-1 en
  escritorio y móvil, 1 nueva en escritorio).
- e2e completo: no (7.07-2, Nivel 1; lo corre el CI del PR; cuenta 0 de 3)
