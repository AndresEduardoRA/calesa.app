# datos

Exportación e importación CSV: cada persona lo suyo, el dueño todo; vista previa por fila, importa las válidas y deja el informe.

Lo recorre R7 de `e2e/fase-9-recorrido.spec.ts` (el teléfono ajeno sale enmascarado y el lead vuelve a la cartera de su asesora), con
`datos-importar-funcion.spec.ts` contra `importar-csv` servida.

## Entra y sale

- Entra: archivo CSV subido desde el navegador, mapeo de columnas, confirmación.
- Sale: `/datos` y `POST /datos/exportar` (exportar todo por un flujo; `index.ts`: `exportarTodo`, `esquemaDelPedido`, `TOPE_DE_FILAS`,
  `TOPE_POR_ENTIDAD`). Entidades: `leads`, `vehiculos` (`origen` obligatorio: un archivo por origen) y `cotizaciones` (`origen` optativo).
- `/datos`: `pantallas/datos.ts` da `SeccionExportar` y `SeccionImportarDiferida` (con `diferido()` al abrir); `index.ts` da `seccionDeDatos(valor,
permisos)` y `seccionesDeDatos(permisos)` (las dos pestañas siempre; «Importar» apagada con «Tu rol no importa datos.» sin permiso, y pedirla así abre
  «Exportar»), `opcionesDeImportar`, `puedeImportar`, `entidadElegida`, `origenElegido`, `TOPE_DE_DESTINOS` (sólo dibujan) y `leerPersonasParaDestino`.
- Depende de, por sus entradas: `leads` (celdas de su exportación, catálogos, `PANEL_EXPORTAR`; por `leads/client`, `prepararFilas`,
  `preparadorDeFilas`, `origenInicial` y los lectores), `vehiculos` (`camposComunes`, `validarVehiculo`), `origenes` (`getOrigenes(true)`, `leerLayout`) y
  `flujos` (`leerFasesDeOrigen`); el route handler compone `equipo` (`getPermisos`) y `empresa` (`leerAjustes`). La importación total convierte en el
  navegador con las reglas de los dueños.
- **Los listados no dependen de `datos`:** el CSV de lo propio («lo que ves» e importar con vista previa) vive en `leads`, con `shared/lib/csv`. Lo de
  `datos` es el **todo del dueño** (`datos.exportar.todo`, `datos.importar.todo`) e `importar-csv`.

## Archivos clave

- `entities/plantillas.ts` — el **archivo normalizado** de la importación total: columnas por entidad (las claves de `datos` que admite la base),
  validadores por celda, `validarEncabezados`, `filaDelLote`, `escribirArchivo`, `LIMITES_DEL_ARCHIVO` (10 MB, 20.000 filas), `FILAS_POR_LOTE`. Sin un solo
  import: la función edge lleva una copia exacta.
- `infra/importar.ts` + `composicion.ts` — `crearImportacionTotal`, `pedirPaseParaImportar`, `despertarImportacion(pase)`: el pase se pide en la acción, con
  la sesión del pedido, y la función se despierta en `after()`; `llamarImportarCsv` manda sólo el pase, sin ninguna clave. Respuestas validadas con Zod.
- `features/importar/actions/crear-importacion.ts` — su cuerpo, `crearConPermiso` (`crear.ts`, probado con dependencias inyectadas): `motivoParaNoImportar`
  (espejo de `importacion_crear`) antes de la base; un destino igual a quien importa va como `null`; la ruta la arma el servidor (`rutaDelArchivo`).
- `features/importar/lanzar.ts` — subir → crear → quitar el objeto propio sólo ante un rechazo seguro (`sin_permiso`, `regla`, `validacion`); con un fallo
  dudoso queda, y reintentar con el mismo id y texto da `repetido`. `convertir-por-tramos.ts` (de a 500, cediendo el hilo), `intento.ts`. La lectura del
  servidor por entidad está en `src/app/(app)/datos/importar.tsx`.
- Avance y lista: `entities/resumen-de-importacion.ts`, `entities/informe-de-importacion.ts` (CSV de las rechazadas); lecturas del navegador
  (`infra/importaciones.client.ts`: lista por cursor y avance por ids; `infra/informe.client.ts`: de a 1.000); `use-sondeo-de-avance` cada 5 s, sólo con
  alguna en curso.
- `entities/exportacion.ts` — el pedido (Zod), `TOPE_DE_FILAS` (250.000), `FILAS_POR_PEDIDO` (el `max_rows`), el rango con instante de corte.
- `infra/cliente-del-flujo.ts` — `prepararSesion()`: token **fijo** (`accessToken` de supabase-js: nunca refresca). `infra/exportacion.ts`,
  `infra/vehiculos.ts` y `infra/cotizaciones.ts` leen de a 1.000 de `datos_exportar_leads()` y de las tablas `vehiculos` y `cotizaciones` (no
  `vehiculos_inventario()` ni `cotizaciones_listado()`); los nombres de cotizaciones, por `leads_vista_por_ids` y `vehiculos` de a
  `IDS_POR_CONSULTA_DE_NOMBRES` (100).
- `features/exportar/lecturas.ts` (`exportarTodo` y el orden, `seguirCon`), `flujo.ts` (el `ReadableStream`), `fuente-de-<entidad>.ts` y
  `columnas-de-<entidad>.ts`; `entities/tarjetas.ts` y `entities/descarga.ts` (`EXPORTACIONES_POR_HORA`); `use-descarga.ts` (un POST a la vez).

## Tablas

`importaciones` (estado, totales, informe por fila). RPC: `importacion_crear()` (con destino `asignar_a` para importar a nombre de otra persona) y `_lead_crear` por fila vía `leads_importar_lote` (misma regla de limbo y duplicados).

- `importaciones` e `importaciones_filas` se leen desde el navegador bajo la RLS de quien mira (las propias, o todas con `datos.importar.todo`): sin
  `mapeo` ni `archivo_ruta`; nombres de quien, destino y origen embebidos por FK. Índices `importaciones_lista_propia_idx`, `importaciones_lista_idx`.
- `perfiles` (`infra/personas.ts`): sólo `id, nombre` de las activas y sin bloqueo, hasta 100, bajo «perfiles: leer». Nunca el correo.
- `datos_exportacion_registrar(p_entidad, p_filas, p_filtros)` (definer): el enforcement de `datos.exportar.todo`. Hasta 250.000 filas por archivo;
  filtros sólo `desde`, `hasta` (fecha) y `origen` (obligatorio en vehículos, rechazado en leads); 3 por hora por persona y entidad, con candado por persona
  (`{ok: false, libre_en}` la cuarta). Deja `datos.exportado` en `actividad` con entidad, filas y filtros: nada de nadie. El route la llama **antes** del
  primer byte.
- `datos_exportar_leads()` (invocadora): `leads_vista` con la sesión de quien exporta, sin las marcas de quien mira. La RLS decide; de un lead ajeno, el
  teléfono enmascarado y sin los campos de sólo cartera; el número global sólo con `leads.numero_global.ver`. No pide el permiso. PostgREST le pone el orden
  `(creado_en, id)`, el cursor y `max_rows`: se inlinea, así que **no le pongas** `strict`, `search_path`, `security definer`, `volatile` ni `begin atomic`.
- `importacion_crear(p_id, p_entidad, p_archivo_ruta, p_mapeo, p_asignar_a, p_origen)` (authenticated, idempotente por id): el enforcement de
  `datos.importar.todo` (para otra persona, con el destino activo y con `leads.crear`), de `leads.crear` (para sí misma) y de `vehiculos.crear` del origen;
  la ruta en la carpeta propia. `importacion_empezar`, `importacion_procesar_lote` (hasta 50 filas consecutivas) e `importacion_terminar`, **sólo
  `service_role`** (la función `importar-csv`): actúan a nombre de quien importa y vuelven a mirar sus permisos en cada lote. `importaciones_filas`: lo que
  no entró, con campo y motivo.
- Pases: `importaciones_pases` (sólo `service_role`); `importacion_pase_emitir(p_importacion)` (sólo la total propia y viva; reusa el vivo de 5 min) e
  `importacion_abrir(p_pase)` (service_role, un uso, 10 min). Jobs `importaciones-continuar` (cada 2 min, URL de Vault: 5 detenidas por corrida; sin avance
  en 24 h → `fallida`) e `importaciones-filas-purgar` (diario: informe a los 30 días, pases a los 7).

## No se rompe

- Exportar respeta RLS: lo que no ves no sale. El teléfono completo sale sólo de la propia cartera. «Todo» no trae teléfonos ni lo privado de carteras
  ajenas: la lectura va con la sesión.
- Importar nunca pisa: un teléfono existente se reporta como «ya existe» (en masa **no se nombra a nadie**, como en `leads`) y lo del limbo no se adopta en
  bloque: `crear_lead` con `adoptar` es una decisión por lead.
- En la importación total el lead lo crea el destino (`asignar_a`): nace en su cartera, con su constancia. Perder el permiso a mitad (o borrarse el
  destino) deja la importación `fallida`, nunca cambia de dueño. La identidad se captura al entrar y se repone en cada salida (`_importacion_previo`,
  `_importacion_fijar`, `_importacion_volver`): esos ayudantes sólo los ejecuta su dueño.
- `/leads` no toma una importación total (`archivo_ruta`): `leads_importar_lote` y `leads_importacion_terminar` dan 42501 y
  `leads_importaciones_recientes` no la lista. Deshacer una total: sólo terminada o fallida (nunca corta el proceso), con `datos.importar.todo` si tuvo
  destino, ≤ 2.000 leads, e «intacto» contra el destino. El pase lo pide sólo quien la creó.
- El contrato de `leads`: `_lead_crear(…, p_recordar_origen)` y `leads_importar_lote` son lo que se llama por fila o por lote; `importaciones.archivo_ruta`
  es nulo sólo en la de `leads`.
- El CSV usa `;` o `,` detectado, UTF-8 con BOM al exportar (Excel en español).
- El bucket `importaciones` guarda el **archivo normalizado**, no el de la persona; `importar-csv` sólo valida su forma, sigue la marca `procesadas` que
  devuelve la base (nunca su cuenta) y borra el CSV al llegar a `terminada` o `fallida`. **`plantillas.ts` y `shared/lib/csv/leer.ts` tienen copia exacta en
  `supabase/functions/importar-csv/`**: se edita el de `src/` y se copia (`scripts/guardas/areas-c/importar-csv-copias.test.ts` cae si se separan).
- Una fila normalizada por cada fila de datos de la persona, también la rechazada (la fila `n` del archivo es la `n + 1` de la persona); cada fila pasa por
  los validadores de `plantillas.ts` antes de escribirse, así la vista previa y la función no se separan. Los motivos de la conversión pueden repetir la
  celda (el «un motivo nunca repite la celda» de `plantillas.ts` vale para la función): quedan en `importaciones_filas`, bajo su RLS, 30 días, nunca en un log.
- Convertir por tramos da **exactamente** lo mismo que una pasada (en orden, sin saltos; lo visto de teléfonos cruza los tramos), con la misma entrada que
  la vista previa. Reintentar reusa el id sólo con el mismo texto, entidad, mapeo, destino y origen: nunca nacen dos importaciones del mismo archivo. El
  destino no se filtra por `leads.crear`: lo rechaza `importacion_crear`.
- Las rechazadas nunca nombran a la dueña de un lead que ya existía (la base no lo guarda); las celdas salen sólo del archivo que la persona tiene en
  memoria; desde la lista, sólo fila, resultado, campo y motivo. «En pausa» se mira antes que «Esperando». `crearImportacion` no lleva `revalidatePath`
  porque ningún Server Component lee las importaciones totales: si la lista pasa al servidor, se suma.
- Exportar todo: el permiso (efectivo) → la sesión → layout y catálogos → el conteo hasta `TOPE_POR_ENTIDAD[entidad] + 1` → **el registrar** → el flujo.
  Con más del tope o ninguna fila, no se registra; con 42501 o el cupo gastado, 403 o 429 sin leer filas; nunca se registra dos veces; el archivo nunca
  lleva más filas que las registradas (mismo instante de corte; la lectura corta en `filas`). Lo prueba `route.test.ts`. El orden está escrito una vez
  (`seguirCon`): una entidad sólo trae su fuente (lector, columnas y etiqueta).
- Vehículos y cotizaciones se leen de su tabla bajo la RLS de quien exporta (las policies deciden filas y papelera; en cotizaciones, sólo columnas con
  `grant select`). Un origen que no está da 404 `vacia` sin contar ni registrar (no dice si existe); uno inactivo exporta. Precio y total salen tal como los
  guarda la base. Los nombres de cotizaciones se traen por página y sólo de lo que se ve (clientes sólo con `leads.ver`, títulos bajo «vehiculos: leer»);
  lo que no llega va vacío. Lo prueban `route-vehiculos.test.ts`, `route-cotizaciones.test.ts` y `supabase/tests/areas/datos/exportar-{vehiculos,cotizaciones}.sql`.
- La pantalla no decide nada: `puede()` sólo dibuja; el permiso, el cupo y las filas los exige la base. `EXPORTACIONES_POR_HORA` espeja el 3 de
  `datos_exportacion_registrar`: si cambia uno, cambia el otro.
- Un fallo a mitad del flujo, o un token a menos de 30 s de vencer, lo corta con error: una descarga fallida, nunca un CSV que parezca entero.

## Ojo

- `datos.exportar.todo` / `datos.importar.todo` son los únicos permisos que ven datos de otros en bloque: sólo para el dueño. Exportar todo sin pasar por
  `datos_exportacion_registrar` es saltarse el permiso y el límite.
- **`getSession()` sólo en `prepararSesion()`** (la excepción a «nunca getSession()»): `getClaims()` no da el token crudo, así que se toma de la sesión y
  se verifica **ese mismo** con `getClaims(token)`; `sub` y `exp` salen de los claims verificados. El flujo no usa la cookie: lee con un cliente de token
  fijo (refrescar a mitad rotaría el refresh token sin poder guardarlo y cerraría la sesión por reuso). Si al token le quedan menos de 5 min, se renueva
  **dentro del pedido y antes de crear la `Response`** (Next agrega la cookie nueva).
