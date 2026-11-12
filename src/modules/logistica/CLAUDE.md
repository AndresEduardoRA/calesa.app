# logistica

Operación diaria sobre el flujo: cadena por fase, mover con vista previa, documentos con aprobación y vencimiento, transporte (embarques y contenedores como grupos), declaraciones aduaneras, gastos y pagos, notas, alertas por demora y margen contra la cotización final.

## Entra y sale

- Entra: acciones de logística en `/logistica/*`, subida de documentos (también desde cámara), confirmación de pagos, cron de alertas.
- Sale: `leerUnidad(id)` (la unidad de vehículo bajo la RLS de quien mira; nula si no existe, está en la papelera o no la ve), `huecosVisibles`, `ORDEN_DE_HUECOS`, `refDeUnidad` y los tipos de la unidad y de los huecos; por `pantallas/unidad.ts`, `<PanelDeLaUnidad>` (6.01). Saldrá `bandejaLogistica()` (para `tablero`), `margenDe(vehiculoId)`, `<LineaTiempoUnidad>`, `dondeEsta(busqueda)`. Lo consumirán `tablero`, `vehiculos` (ficha), `web` (portal: fases y documentos visibles).
- Depende de: `vehiculos`, `flujos`, `cotizaciones`.

## Áreas

El módulo se parte por **área** (6.01, igual que `flujos` y `cotizaciones`) para que los carriles agreguen archivos propios y no editen los compartidos. Un área vive en `features/<área>/`,
`entities/<área>/`, `infra/<área>/`, `areas/<área>/{index,client,composicion}.ts` y `pantallas/<área>.ts` (y `pantallas/<área>-<pantalla>.ts`). El **núcleo** (la unidad, el panel y
sus huecos) es la carpeta `nucleo` de cada capa. `index.ts`, `client.ts` y `composicion.ts` de la raíz sólo hacen `export *` del núcleo y de cada área: nadie los edita.

| Área         | La llena | Qué es                                                                                 |
| ------------ | -------- | -------------------------------------------------------------------------------------- |
| `nucleo`     | 6.01     | `Unidad`, `HuecoDeLaUnidad`, el panel de la unidad y el orden de sus huecos            |
| `cadena`     | 6.03     | el kanban por fase de `/logistica`, filtros y «dónde está»                             |
| `mover`      | 6.04     | «qué falta», mover con nota, notas, historial y el lote (en el panel: sus tres huecos) |
| `documentos` | 6.06     | subir, aprobar o rechazar, vencimiento (hueco «documentos»)                            |
| `transporte` | 6.08     | embarques y contenedores (hueco «transporte», enlace «Embarques», catálogos)           |
| `aduana`     | 6.09     | declaraciones (hueco «aduana», enlace «Aduana»)                                        |
| `dinero`     | 6.11     | gastos, pagos y margen (tres huecos, enlace «Gastos», catálogos)                       |
| `alertas`    | 6.12     | alertas por demora y por vencimiento, bandeja en Inicio                                |

**Los huecos.** El panel de la unidad no sabe qué lleva: cada área declara sus huecos en un archivo suyo de `pantallas/` que hoy está vacío (`<área>-unidad.ts` →
`HUECOS_DE_<ÁREA>_EN_LA_UNIDAD`; `<área>-grupo.ts`; `<área>-enlace.ts`, nulo hasta que su página existe; `<área>-catalogos.ts`) y sólo `src/app` los junta. Un hueco se dibuja
si la persona tiene alguna de sus claves de permiso **en el origen de la unidad** y su regla de `flujos_reglas` está activa; el orden es fijo (`ORDEN_DE_HUECOS`), no el del archivo.
El panel exige `logistica.ver` en el origen de la unidad **y** que la RLS de `vehiculos` deje leer la fila (`vehiculos.ver`): quien tiene sólo una ve «No tienes permiso» o «ya no está disponible». Un hueco se monta al abrir su bloque (`BloqueDelHueco`).
**Un área no importa otra** (lo vigila `scripts/guardas/areas-de-logistica.test.ts`): lo compartido va al núcleo.

## Archivos clave

- `entities/documentos.ts` — estados pendiente/subido/aprobado/rechazado y qué cuenta para un requisito (aprobado y vivo, mime admitido, entre min y max).
- `entities/grupos.ts` — agrupar `transportes` por booking / contenedor (vistas, no entidades) y la edición «todo o nada».
- `features/cadena/`, `features/unidad/` (panel con «qué falta»), `features/documentos/`, `features/transporte/`, `features/aduana/`, `features/gastos/`, `features/pagos/`, `features/donde-esta/`.
- **Área `dinero`** (6.11-1: los huecos «Gastos» y «Margen»; «Pagos», `/logistica/gastos`, prorratear y las categorías de gasto llegan con 6.11-2 a 6.11-4). `pantallas/dinero-unidad.ts` los declara con `diferido()`
  (`features/dinero/components/diferidos.tsx`). `entities/dinero/`: `margen.ts` (`textosDelMargen`: un `null` de la base se escribe «Sin cotización final» o «Sin venta registrada», nunca 0, y un 0
  verdadero es un monto), `gasto.ts` (`validarGasto`, `cambiosDeGasto` con el tipo de cambio sólo si cambió la moneda o el tipo, D19), `tipo-de-cambio.ts`, `categoria.ts`, `paneles.ts`. El navegador lee con la
  sesión de quien mira (`infra/dinero/*.client.ts`: los gastos de la unidad con tope 50 por `gastos_vehiculo_idx`, `margen_vehiculo`, `mis_permisos`, los catálogos y el comprobante en el bucket
  `comprobantes`); escribir va por las Server Actions de `features/dinero/actions/`. **El equivalente en base lo devuelve la base** (`monto_base`): ningún componente multiplica por una tasa. Un hueco recibe
  sólo `{ unidad }`, así que decide «Registrar gasto» con `puede()` sobre `mis_permisos`; lo que protege es la base. `?panel=gasto&gasto=<id|nuevo>` y `?panel=eliminar-gasto&gasto=<id>`; el hueco
  «Gastos» avisa al «Margen» por un evento del navegador (`eventos-de-dinero.ts`), no por la URL.

## Tablas

`documentos`, `puertos`, `navieras`, `transportes` (1:1 con la unidad), `declaraciones_aduana`, `declaraciones_vehiculos`, `categorias_gasto`, `gastos`, `pagos`, `notas`.
RPC: `margen_vehiculo`, `alertas_demora` (cron), `storage_refcount`; mover vía `flujos`. La oferta de transporte es de `flujos`: la leerá en la Fase 6
por `flujo_oferta()`. Gastos y pagos se escriben sólo por RPC (6.10): `gasto_registrar`, `gasto_guardar`, `gasto_eliminar`, `gastos_prorratear`,
`pago_registrar`, `pago_guardar`, `pago_eliminar`, `pago_confirmar` y `pago_anular`. Se leen por cursor con `gastos_listar` y `pagos_listar` (6.10-2);
el bucket `comprobantes` lo abre `comprobante_puede` (la fila que nombra el objeto).

## No se rompe

- La entidad agrupadora no es dueña de datos: documentos, gastos, pagos, notas y transporte cuelgan **siempre** de la unidad (`vehiculo_id | repuesto_id`, uno y sólo uno). Prorratear un flete = N filas de `gastos`.
- Mientras la unidad esté en una fase, no se vacía el dato ni se quita el documento que esa fase exige como bloqueante (triggers); si pasa igual, la unidad aparece «fuera de regla», no se expulsa.
- Confirmar un pago es un acto sellado (`pago_sellos`): quién y cuándo los pone el trigger, no el cliente.
- El margen devuelve `null` sin venta registrada; la UI dice «Sin venta registrada», nunca $0.

## Ojo

- Documentos nunca se comprimen; fotos sí (WebP). Objetos por hash; un documento común a 8 vehículos es 1 objeto y 8 filas.
- «DUI pagada» es derivada: todos los vehículos de la declaración tienen un gasto vivo de la categoría tributos. Comprobante ≠ pago.
- Conflicto al mover o editar transporte → `PT409` → «Alguien lo cambió · Recargar». Nunca pisar en silencio.
