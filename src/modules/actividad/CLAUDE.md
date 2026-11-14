# actividad

Auditoría inmutable de 14 días: qué cambió, quién, cuándo y el diff, con purga automática.

## Entra y sale

- Entra: trigger `auditar()` en las tablas sensibles y `registrar_actividad()` desde las RPC (mover fase, resolver una subasta, publicar fórmula, otorgar portal, adoptar lead…).
  Una acción propia que no se lee bien humanizada lleva su verbo en `VERBOS` de `entities/etiquetas.ts` (`vehiculo.subasta_resuelta` → «Resolvió la subasta»).
- Sale: `/actividad` (`pantallas/listado.ts`): por día en la zona de la empresa, «Ver más» con tope, «Ir a una fecha», filtros `?persona=`, `?entidad=` y
  `?registro=` (sólo con `?entidad=`; lo trae «Ver actividad» de la ficha de lead y de vehículo: no hay línea de tiempo en las fichas). Una fila visible
  abre su diff en `<DrawerDeCambio>` (`?cambio=<id>`). `index.ts` también da `rutaDeActividadDe(tabla, id)`.
- Depende de `equipo` (`actividad.ver`) y `empresa` (zona y `actividad_dias`).

## Archivos clave

- `entities/etiquetas.ts` — `ENTIDADES_DE_LA_ACTIVIDAD`, espejo de `_actividad_recorte`: una tabla nueva ahí, una línea aquí.
- `entities/diff.ts` — `presentarDiff`: sólo lo que cambió (también dentro de `atributos`), un monto como monto y cada lado en su moneda.
- `features/diff/` — lee al abrir y descarta la respuesta de otro cambio; sin acceso o `?cambio=` inválido: «No tienes acceso a este cambio.».

## Tablas

`actividad`. RPC/cron:

- `actividad_listar`: cursor sobre `id`, una ruta por filtro (`p_actor`, `p_tabla` + `p_registro`, `p_accion`) con su índice, `p_hasta`; sin valores,
  sólo los nombres de los campos que cambiaron.
- `actividad_diff(id)`: `{visible, cambios: {campo: {antes, despues}}}`; con `visible: true` suma `moneda_antes`, `moneda_despues` (de la foto, fuera de
  `leads` y sólo si `authenticated` lee `moneda`) y `origen_id` de un vehículo.
- `registrar_actividad`: sólo desde funciones `security definer`; la app no la ejecuta (`areas/actividad/registrar.sql` cae si una de invocador la llama).
- `actividad_purgar` (job `actividad-purgar`, 03:25 UTC): por lotes, lo de más de `ajustes_empresa.actividad_dias` y los `eventos_web` de más de 12
  meses.

Una tabla nueva con trigger `auditar` se declara en `_actividad_recorte(tabla)` (`lead`, `entidad` con su espejo en `_actividad_puede_ver_fila`, o
`configuracion`) o `supabase/tests/areas/actividad/actividad.sql` cae.

## No se rompe

- Append-only: sin UPDATE ni DELETE para `authenticated`; sólo el cron purga.
- La app no lee `actividad.detalle` (teléfonos enmascarados, código del portal, montos): sólo la cabecera, y el diff por `actividad_diff`.
- No reemplaza al historial de negocio (`historial_fases`, `cotizaciones_revisiones`, `oportunidades_historial`): esos no caducan.
- Se ve por permiso y, en entidades propias, por cartera; el dueño ve todo salvo teléfonos.
- **El diff de un lead no lleva sus números**: `actividad.antes/despues` excluyen `numero` y `numero_propio`; `_actividad_recortar` los quita otra vez,
  con `telefono_principal`, y no muestra nada de un lead que quien mira no ve (`numero-global.sql`).

## Ojo

- **La moneda de un monto**: cada lado con la de **su** foto, nunca la fila vigente. Sin foto (`registrar_actividad`) sale con `monedaConocida: false`
  (`<Monto moneda={null}>` + «(moneda sin conocer)»), nunca en la moneda base.
- **Las etiquetas de `atributos`** se leen al abrir, sólo de las claves que llegaron; si falla, la clave sale humanizada y el resto se ve igual.
