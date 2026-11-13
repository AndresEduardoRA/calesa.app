# actividad

Auditoría inmutable de 14 días: qué cambió, quién, cuándo y el diff, con purga automática.

## Entra y sale

- Entra: trigger `auditar()` en las tablas sensibles y `registrar_actividad()` desde las RPC (mover fase, publicar fórmula, otorgar portal, adoptar lead…).
- Sale: `/actividad` (9.01-3, `pantallas/listado.ts` → `<ListadoDeActividad>`): por día en la zona de la empresa, «Ver más» de a
  `TAMANO_DE_VER_MAS` hasta `TOPE_DE_LO_CARGADO` con `<AvisoDeTope>`, «Ir a una fecha», filtros `?persona=` y `?entidad=` (una sola opción,
  «Todas» por defecto) y `?registro=` sólo junto a `?entidad=` (lo usará el «Ver actividad» de las fichas, 9.01-4). `index.ts`:
  `leerPaginaDeActividad`, `leerPersonasDeLaActividad`, el esquema y el pedido de filtros, `claveDelPedido` (la `key` del listado) y
  `ENTIDADES_DE_LA_ACTIVIDAD`. `composicion.client.ts`: «Ver más» y `leerDiff(id)` (el drawer de la 9.01-4). Sin línea de tiempo en las
  fichas (D1 del 9.01): «Ver actividad» lleva a `/actividad?entidad=&registro=`.
- Depende de: `equipo` (sesión, `puede`, permiso `actividad.ver`), `empresa` (`leerAjustes`: zona y `actividad_dias`).

## Archivos clave

- `entities/actividad.ts` — Zod de las respuestas de `actividad_listar` y `actividad_diff`; una fila sin acceso sale sin campos.
- `entities/etiquetas.ts` — `ENTIDADES_DE_LA_ACTIVIDAD` (espejo de `_actividad_recorte`: una tabla nueva ahí, una línea aquí), el verbo por
  sufijo, la etiqueta de cada campo (sin ella, la clave humanizada) y «Sistema» / «Sin nombre».
- `entities/diff.ts` — `presentarDiff`: sólo lo que cambió (en profundidad, también dentro de `atributos`), un monto como monto y cada lado
  en su moneda; sin moneda conocida, `monedaConocida: false` (nunca la base inventada). Test en `diff.test.ts`.
- `entities/filtros.ts` — esquema, pedido, `hastaDeUnDia` (copia de la de `cotizaciones`) y `agruparPorDia`.
- `infra/consultas.ts` — las lecturas escritas una vez con el cliente como parámetro; `features/listado/` — la lista, su hook (un pedido a la vez) y su pie.

## Tablas

`actividad`. RPC/cron:

- `actividad_listar` (9.01-1): página por cursor sobre `id`, una ruta por filtro (`p_actor`, `p_tabla` + `p_registro`, `p_accion`) con su índice,
  «Ir a una fecha» con `p_hasta`; sin valores, sólo los nombres de los campos que cambiaron.
- `actividad_diff(id)` (9.01-1): el diff recortado `{visible, cambios: {campo: {antes, despues}}}`.
- `registrar_actividad` (9.01-2): sólo desde funciones `security definer`; la app no la ejecuta (`areas/actividad/registrar.sql` cae si una
  función de invocador la llama).
- `actividad_purgar` (job `actividad-purgar`, 03:25 UTC): por lotes, la actividad de más de `ajustes_empresa.actividad_dias` (14) y los `eventos_web`
  de más de 12 meses.

La lista cerrada es `_actividad_recorte(tabla)`: una tabla con trigger `auditar` nueva se declara ahí (`lead`, `entidad` con su espejo en
`_actividad_puede_ver_fila`, o `configuracion`) o `supabase/tests/areas/actividad/actividad.sql` cae.

## No se rompe

- Append-only: sin UPDATE ni DELETE para `authenticated`; sólo el cron purga.
- La app no lee `actividad.detalle` (9.01-2: lleva teléfonos enmascarados, el código del portal o montos): sólo la cabecera, y el diff por
  `actividad_diff`. Si un día hace falta, va por una función definer que lo recorte.
- La actividad **no** reemplaza al historial de negocio (`historial_fases`, `cotizaciones_revisiones`, `oportunidades_historial`): esos no caducan.

## Ojo

- **La moneda de un monto** (9.01-3): `actividad_diff` sólo trae las claves que cambiaron; si cambió `monto` y no `moneda`, la moneda no llega
  y el monto sale con `monedaConocida: false`. La 9.01-4 suma `moneda_antes`/`moneda_despues` desde la foto del cambio.

- Lo que ve cada persona se acota por permiso y, para entidades propias, por su cartera; el dueño ve todo salvo teléfonos (siguen enmascarados en el diff).
- **El diff de un lead no lleva sus números** (9f-2): `actividad.antes/despues` excluyen `numero` y `numero_propio` (el global sólo llega a quien tiene `leads.numero_global.ver` y una constancia no sabe quién la leerá); `_actividad_recortar` (9.01-1) los quita otra vez, con `telefono_principal`, y no muestra nada de un lead que quien mira no ve. `numero-global.sql` lo busca con un patrón.
