## 2026-11-11 — Paso 7.07-3: completar, reasignar, «Sin fecha», recordatorios y la bandeja (parte 3 de 3 del 7.07)

- **Hecho:** cierra el 7.07 (`parcial: false`). Sin SQL ni dependencias.
  - Tarea: el pie de su panel trae `Marcar como hecha` / `Reabrir` (creador y responsable) y «Cambiar de responsable» (creador con `agenda.tareas.asignar`; un despliegue dentro del
    mismo panel con el selector de una persona). Dos actions (`completarTarea`, `reasignarTarea`) sobre `tarea_completar` y `reasignar_tarea`; `PT409` con «Recargar».
  - «Tareas sin fecha»: sección plegable bajo el calendario (si se ven las tareas), cerrada al entrar; se lee al abrirla (`agenda_tareas_sin_fecha`, de a `TAMANO_DE_VER_MAS`, cursor
    `(creado_en, id)`), código diferido, «Ver más» y tope de 500 con `<AvisoDeTope>`. El vencimiento de una tarea pasó a ser opcional. La RPC entra a `areas-b/paginas-en-la-base.ts`.
  - Recordatorio: el chip es un enlace a `?recordatorio=<id>`; su panel lee `recordatorios_vista` por id (`leerRecordatorio`), dice su estado con texto y completa o reabre con la
    action de `leads` (una línea en `leads/client.ts`).
  - Bandeja: «Mis tareas» lee `leerMisTareas` (pendientes, las que vencen primero, las sin fecha al final; cada fila abre su panel) y «Ver todas» baja de ese bloque y de «Recordatorios de hoy».
- **Verificación** (`.piloto/salidas/7.07-3/`): `vitest` de agenda, tablero y `scripts/guardas` 1.170 ✓; `lint` y `typecheck` sin avisos; e2e `agenda` + `inicio-bandeja` 12 ✓ (escritorio y móvil;
  `agenda.spec.ts` suma la prueba «la asesora ve sus tareas sin fecha y completa un recordatorio» y amplía el recorrido de la dueña con completar, reabrir y la ausencia de «Cambiar de responsable» para la asesora).
- **No se hizo:** la reasignación por la interfaz no entra al e2e (la cubren las pruebas SQL de `reasignar_tarea` del 7.06-1); ni volumen (las tablas de la agenda no crecen por persona).
- e2e completo: no (7.07-3, Nivel 1; lo corre el CI del PR; cuenta 0 de 3)
