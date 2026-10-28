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
- **El diff de un lead no lleva sus números** (9f-2): `actividad.antes/despues` excluyen `numero` y `numero_propio` (el global sólo llega a quien tiene `leads.numero_global.ver` y una constancia no sabe quién la leerá); la función de la Fase 9 que recorta el diff según la cartera tampoco los reintroduce. `numero-global.sql` lo busca con un patrón.
