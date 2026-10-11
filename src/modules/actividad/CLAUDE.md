# actividad

Auditoría inmutable de 14 días: qué cambió, quién, cuándo y el diff, con purga automática.

## Entra y sale

- Entra: trigger `auditar()` en las tablas sensibles y `registrar_actividad()` desde las RPC (mover fase, publicar fórmula, otorgar portal, adoptar lead…).
- Sale: `actividadDe(entidad)` (línea de tiempo en fichas), `<ListaActividad>`. Lo consumen `leads`, `vehiculos`, `cotizaciones`, `tablero`.
- Depende de: `equipo` (permiso `actividad.ver`).

## Archivos clave

- `entities/diff.ts` — presentación del diff `{campo: {antes, despues}}` con los términos del glosario.
- `features/listado/` (por día, filtro por persona/entidad/acción).

## Tablas

`actividad`. RPC/cron: `registrar_actividad`, `actividad_purgar` (diario, `ajustes_empresa.actividad_dias` = 14).

## No se rompe

- Append-only: sin UPDATE ni DELETE para `authenticated`; sólo el cron purga.
- La actividad **no** reemplaza al historial de negocio (`historial_fases`, `cotizaciones_revisiones`, `oportunidades_historial`): esos no caducan.

## Ojo

- Lo que ve cada persona se acota por permiso y, para entidades propias, por su cartera; el dueño ve todo salvo teléfonos (siguen enmascarados en el diff).
