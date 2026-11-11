# logistica

Operación diaria sobre el flujo: cadena por fase, mover con vista previa, documentos con aprobación y vencimiento, transporte (embarques y contenedores como grupos), declaraciones aduaneras, gastos y pagos, notas, alertas por demora y margen contra la cotización final.

## Entra y sale

- Entra: acciones de logística en `/logistica/*`, subida de documentos (también desde cámara), confirmación de pagos, cron de alertas.
- Sale: hoy nada (las entradas de la raíz están vacías; 6.01-1 sólo deja el árbol y los tipos de la unidad y de los huecos). Saldrá `bandejaLogistica()` (para `tablero`), `margenDe(vehiculoId)`, `<LineaTiempoUnidad>`, `dondeEsta(busqueda)`. Lo consumirán `tablero`, `vehiculos` (ficha), `web` (portal: fases y documentos visibles).
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
**Un área no importa otra** (lo vigila `scripts/guardas/areas-de-logistica.test.ts`): lo compartido va al núcleo.

## Archivos clave

- `entities/documentos.ts` — estados pendiente/subido/aprobado/rechazado y qué cuenta para un requisito (aprobado y vivo, mime admitido, entre min y max).
- `entities/grupos.ts` — agrupar `transportes` por booking / contenedor (vistas, no entidades) y la edición «todo o nada».
- `features/cadena/`, `features/unidad/` (panel con «qué falta»), `features/documentos/`, `features/transporte/`, `features/aduana/`, `features/gastos/`, `features/pagos/`, `features/donde-esta/`.

## Tablas

`documentos`, `puertos`, `navieras`, `transportes` (1:1 con la unidad), `flujos_transporte_oferta`, `declaraciones_aduana`, `declaraciones_vehiculos`, `categorias_gasto`, `gastos`, `pagos`, `notas`.
RPC: `margen_vehiculo`, `alertas_demora` (cron), `storage_refcount`; mover vía `flujos`.

## No se rompe

- La entidad agrupadora no es dueña de datos: documentos, gastos, pagos, notas y transporte cuelgan **siempre** de la unidad (`vehiculo_id | repuesto_id`, uno y sólo uno). Prorratear un flete = N filas de `gastos`.
- Mientras la unidad esté en una fase, no se vacía el dato ni se quita el documento que esa fase exige como bloqueante (triggers); si pasa igual, la unidad aparece «fuera de regla», no se expulsa.
- Confirmar un pago es un acto sellado (`pago_sellos`): quién y cuándo los pone el trigger, no el cliente.
- El margen devuelve `null` sin venta registrada; la UI dice «Sin venta registrada», nunca $0.

## Ojo

- Documentos nunca se comprimen; fotos sí (WebP). Objetos por hash; un documento común a 8 vehículos es 1 objeto y 8 filas.
- «DUI pagada» es derivada: todos los vehículos de la declaración tienen un gasto vivo de la categoría tributos. Comprobante ≠ pago.
- Conflicto al mover o editar transporte → `PT409` → «Alguien lo cambió · Recargar». Nunca pisar en silencio.
