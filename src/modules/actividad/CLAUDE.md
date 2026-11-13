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

`actividad`. RPC/cron:

- `actividad_listar` (9.01-1): página por cursor sobre `id`, una ruta por filtro (`p_actor`, `p_tabla` + `p_registro`, `p_accion`) con su índice,
  «Ir a una fecha» con `p_hasta`; sin valores, sólo los nombres de los campos que cambiaron.
- `actividad_diff(id)` (9.01-1): el diff recortado `{visible, cambios: {campo: {antes, despues}}}`.
- `registrar_actividad` (desde las RPC).
- `actividad_purgar` (job `actividad-purgar`, 03:25 UTC): por lotes, la actividad de más de `ajustes_empresa.actividad_dias` (14) y los `eventos_web`
  de más de 12 meses.

La lista cerrada es `_actividad_recorte(tabla)`: una tabla con trigger `auditar` nueva se declara ahí (`lead`, `entidad` con su espejo en
`_actividad_puede_ver_fila`, o `configuracion`) o `supabase/tests/areas/actividad/actividad.sql` cae.

## No se rompe

- Append-only: sin UPDATE ni DELETE para `authenticated`; sólo el cron purga.
- La actividad **no** reemplaza al historial de negocio (`historial_fases`, `cotizaciones_revisiones`, `oportunidades_historial`): esos no caducan.

## Ojo

- Lo que ve cada persona se acota por permiso y, para entidades propias, por su cartera; el dueño ve todo salvo teléfonos (siguen enmascarados en el diff).
- **El diff de un lead no lleva sus números** (9f-2): `actividad.antes/despues` excluyen `numero` y `numero_propio` (el global sólo llega a quien tiene `leads.numero_global.ver` y una constancia no sabe quién la leerá); `_actividad_recortar` (9.01-1) los quita otra vez, con `telefono_principal`, y no muestra nada de un lead que quien mira no ve. `numero-global.sql` lo busca con un patrón.
