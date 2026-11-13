# datos

Exportación e importación CSV: cada persona lo suyo, el dueño todo; vista previa por fila, importa las válidas y deja el informe.

## Entra y sale

- Entra: archivo CSV subido desde el navegador, mapeo de columnas, confirmación.
- Sale: `/datos` y `POST /datos/exportar` (9.05-2: el archivo de «exportar todo» por un flujo; `index.ts` da `exportarTodo`, `esquemaDelPedido`, `TOPE_DE_FILAS` y `TOPE_POR_ENTIDAD`). Entidades: `leads`, `vehiculos` (9.05-2b, con `origen` obligatorio: un archivo por origen) y `cotizaciones` (9.05-2c, con `origen` optativo).
- La pantalla `/datos` (9.05-3): `pantallas/datos.ts` da `SeccionExportar`; `index.ts` suma `seccionDeDatos` (`?seccion=`, «Importar» apagada hasta el 9.06).
- Depende de: `leads` (las celdas de su exportación propia y sus catálogos, por su entrada), `vehiculos` (`camposComunes`), `origenes` (`getOrigenes(true)`, `leerLayout`) y `flujos` (`leerFasesDeOrigen`), por sus entradas (la pantalla, además, `PANEL_EXPORTAR` de `leads` para enlazar «Mis leads» a su diálogo); el route handler compone `equipo` (`getPermisos`) y `empresa` (`leerAjustes`). **Los listados no dependen de `datos`:** el CSV de lo propio de `leads` (exportar «lo que ves» e importar con vista previa) vive en `leads` (Fase 3, parte 8) y `datos` lo consume por su entrada y reutiliza `shared/lib/csv` (`escribir`, `leer`, `descargar`). Lo que es de `datos` es el **todo del dueño** con `datos.exportar.todo` e `importar-csv`. La importación total (9.06-4) convierte en el navegador con las reglas de los dueños, por su `client.ts`: `leads/client` (`prepararFilas`, el emparejamiento y los lectores de números, sí o no y fechas) y `vehiculos/client` (`validarVehiculo`, `camposComunes`).

## Archivos clave

- `entities/plantillas.ts` (9.06-3) — el **archivo normalizado** de la importación total: las columnas por entidad (las claves de `datos` que admite la base), los validadores de forma por celda, `validarEncabezados`, `filaDelLote`, `escribirArchivo`, `LIMITES_DEL_ARCHIVO` (10 MB, 20.000 filas) y `FILAS_POR_LOTE`. Sin un solo import: la función edge lleva una copia exacta.
- `infra/importar.ts` (9.06-3) — `pedirPaseDeImportacion` (con la sesión de quien creó la importación) y `llamarImportarCsv` (el pase, sin ninguna clave; respuesta validada con Zod). 9.06-4 suma `crearImportacion` (`importacion_crear`, respuesta validada con Zod). `composicion.ts` da `crearImportacionTotal`, `pedirPaseParaImportar` y `despertarImportacion(pase)`: el pase se pide en la acción, con la sesión del pedido, y la función se despierta en `after()`.
- `features/importar/actions/crear-importacion.ts` (9.06-4) — la acción `crearImportacion`; su cuerpo, `crearConPermiso` en `crear.ts` (probado con las dependencias inyectadas): `motivoParaNoImportar` (`entities/permiso-de-importar.ts`, el espejo de `importacion_crear`) antes de la base, un destino igual a quien importa va como `null`, la ruta la arma el servidor (`rutaDelArchivo`).
- `features/importar/lanzar.ts` (9.06-4) — subir el archivo normalizado → crear (la acción) → quitar el objeto propio sólo ante un rechazo seguro de la base (`sin_permiso`, `regla`, `validacion`); con un fallo dudoso queda, y reintentar con el mismo id y el mismo texto da `repetido`. La subida y el borrado, en `infra/archivo.client.ts` por `composicion.client.ts` («Sin conexión: el archivo no se subió.» con `navigator.onLine`).
- `entities/exportacion.ts` — exportar todo: el pedido (Zod), `TOPE_DE_FILAS` (250.000, medido), `FILAS_POR_PEDIDO` (el `max_rows`), el rango por fechas con el instante de corte, lo que contesta el registrar y los tipos `LectorDeExportacion`, `ColumnasDeExportacion` y `Registrador`.
- `infra/cliente-del-flujo.ts` — `prepararSesion()`: la sesión de quien exporta con su token **fijo** (`accessToken` de supabase-js: nunca refresca). `infra/exportacion.ts` — el conteo y las páginas de `datos_exportar_leads()` por cursor, el registrar y los nombres de los dueños. `infra/paginas.ts` — lo común de leer por páginas (`enElRango`, `siguienteDe`, `contarHasta`). `infra/vehiculos.ts` (9.05-2b) — los vehículos de un origen de la tabla `vehiculos`, de a 1.000, bajo la RLS de quien exporta (no `vehiculos_inventario()`). `infra/cotizaciones.ts` (9.05-2c) — las cotizaciones de la tabla `cotizaciones` (todas o de un origen), de a 1.000, bajo la RLS de quien exporta (no `cotizaciones_listado()`), y los nombres de una página: clientes por `leads_vista_por_ids` y títulos de `vehiculos` de a `IDS_POR_CONSULTA_DE_NOMBRES` (100).
- La pantalla (9.05-3): `entities/secciones.ts`, `entities/tarjetas.ts` (qué tarjeta ve y puede usar cada quien, por `puede()` y los orígenes de la base) y `entities/descarga.ts` (la respuesta del route como estado, la validación del formulario y `EXPORTACIONES_POR_HORA`); `features/exportar/hooks/use-descarga.ts` (el POST, un pedido a la vez) y `features/exportar/components/` (`seccion-exportar`, `tarjeta-mis-leads`, `tarjeta-de-entidad`, `campos-de-la-tarjeta`, `aviso-de-descarga`).
- `features/exportar/lecturas.ts` (`exportarTodo`: el orden), `flujo.ts` (el `ReadableStream`), `fuente-de-<entidad>.ts` y `columnas-de-<entidad>.ts` (leads, vehículos y cotizaciones, cada una con su `case` en `lecturas.ts`; el route sólo pasa `monedaBase` de los ajustes); `features/importar/` (mapeo, vista previa, resultado).

## Tablas

`importaciones` (estado, totales, informe por fila). RPC: `crear_lead` por fila (misma regla de limbo y duplicados).

- `datos_exportacion_registrar(p_entidad, p_filas, p_filtros)` (9.05-1, definer): el enforcement de `datos.exportar.todo`. Entidades `leads`,
  `vehiculos` y `cotizaciones`; hasta 250.000 filas por archivo; filtros sólo `desde`, `hasta` (fecha) y `origen` (obligatorio en vehículos,
  rechazado en leads); 3 por hora por persona y por entidad, con candado por persona (`{ok: false, libre_en}` la cuarta). Deja la constancia
  `datos.exportado` en `actividad` con entidad, filas y filtros: nada de nadie. El route handler la llama **antes** del primer byte.
- `datos_exportar_leads()` (9.05-1, invocadora): los leads a exportar, `leads_vista` con la sesión de quien exporta y sin las marcas de quien mira.
  La RLS decide las filas; de un lead ajeno, el teléfono enmascarado y sin los campos de sólo cartera; el número global sólo con
  `leads.numero_global.ver`. No pide el permiso (devuelve lo que la vista ya da). PostgREST le pone el orden `(creado_en, id)`, el cursor y
  `max_rows`: se inlinea, así que **no le pongas** `strict`, `search_path`, `security definer`, `volatile` ni `begin atomic`.
- Importación total (9.06-1): `importacion_crear(p_id, p_entidad, p_archivo_ruta, p_mapeo, p_asignar_a, p_origen)` (authenticated, idempotente por id):
  el enforcement de `datos.importar.todo` (para otra persona, con el destino activo y con `leads.crear`), de `leads.crear` (para sí misma) y de
  `vehiculos.crear` del origen; la ruta en la carpeta propia. `importacion_empezar`, `importacion_procesar_lote` (hasta 50 filas consecutivas) e
  `importacion_terminar`, **sólo `service_role`** (la función edge `importar-csv`, 9.06-3): actúan a nombre de quien importa y vuelven a mirar sus
  permisos en cada lote. `importaciones_filas`: lo que no entró, con su campo y su motivo (RLS: la regla de `importaciones`). Columnas de avance
  `procesadas`, `ya_existian`, `rechazadas`, `avance_en`; de destino `asignar_a`, `con_destino`, `origen_id`.
- Motor de la importación total (9.06-2): `importaciones_pases` (sólo `service_role`); `importacion_pase_emitir(p_importacion)` (authenticated, sólo
  la total propia y viva; reusa el pase vivo de 5 min) e `importacion_abrir(p_pase)` (service_role, un uso, 10 min). Jobs:
  `importaciones-continuar` (cada 2 min, URL de Vault: 5 detenidas por corrida, sin avance en 24 h → `fallida`) e `importaciones-filas-purgar`
  (diario: informe a los 30 días, pases a los 7). Índices de la lista «Importaciones»: `importaciones_lista_propia_idx`, `importaciones_lista_idx`.
- Cotizaciones (9.05-2c): la tabla `cotizaciones` (sólo columnas con `grant select`; la papelera la cortan sus policies y el filtro explícito), `leads_vista_por_ids`
  (sólo `id, nombre`) y `vehiculos` (`id, titulo`), todo con el cliente del flujo. Medido en `supabase/tests/medir-datos-exportar-cotizaciones.sql`.

## No se rompe

- Exportar respeta RLS: lo que no ves no sale. El teléfono completo sale sólo de la propia cartera.
- Importar nunca pisa: un teléfono existente se reporta como «ya existe» (en masa **no se nombra a nadie**, como en `leads`) y lo del limbo no se adopta en bloque: `crear_lead` con `adoptar` es una decisión por lead.
- En la importación total el lead lo crea el destino (`asignar_a`): nace en su cartera, con su constancia. Perder el permiso a mitad (o borrarse el
  destino) deja la importación `fallida`, nunca cambia de dueño. La identidad se captura al entrar y se repone en cada salida (`_importacion_previo`,
  `_importacion_fijar`, `_importacion_volver`): esos ayudantes sólo los ejecuta su dueño.
- `/leads` no toma una importación total (`archivo_ruta`): `leads_importar_lote` y `leads_importacion_terminar` dan 42501 y
  `leads_importaciones_recientes` no la lista. Deshacer una total: sólo terminada o fallida (nunca corta el proceso), con `datos.importar.todo`
  si tuvo destino, ≤ 2.000 leads, e «intacto» contra el destino. El pase lo pide sólo quien la creó.
- El contrato de `leads` (Fase 3, parte 8, `docs/DECISIONES.md`): `_lead_crear(…, p_recordar_origen)` y `leads_importar_lote` son lo que se llama por fila o por lote; `importaciones.archivo_ruta` es nulo sólo en la de `leads`.
- El CSV usa `;` o `,` detectado, UTF-8 con BOM al exportar (Excel en español).
- Importación total (9.06-3): el bucket `importaciones` guarda el **archivo normalizado**, no el de la persona (la pantalla convierte en el navegador); la
  función `importar-csv` sólo valida su forma, sigue la marca `procesadas` que devuelve la base (nunca su cuenta) y borra el CSV al llegar a `terminada`
  o `fallida`. `plantillas.ts` y `shared/lib/csv/leer.ts` tienen copia exacta en `supabase/functions/importar-csv/`: se edita el de `src/` y se copia
  (la guarda `scripts/guardas/areas-c/importar-csv-copias.test.ts` cae si se separan).
- Exportar todo: el permiso (efectivo) → la sesión → layout y catálogos → el conteo hasta `TOPE_POR_ENTIDAD[entidad] + 1` → **el registrar** → el flujo. Con más del
  tope o ninguna fila, no se registra; con 42501 o el cupo gastado, 403 o 429 sin leer filas; nunca se registra dos veces; el archivo nunca lleva más
  filas que las registradas (el conteo y la lectura usan el mismo instante de corte y la lectura corta en `filas`). Lo prueba `route.test.ts`.
- El orden está escrito una vez (`seguirCon` de `lecturas.ts`): una entidad sólo trae su fuente (lector, columnas y etiqueta del archivo).
- Vehículos (9.05-2b): se leen de la tabla `vehiculos` bajo la RLS de quien exporta (la policy decide filas y papelera; ninguna función nueva). Un
  origen que no está da 404 `vacia` sin contar ni registrar (no dice si existe); uno inactivo exporta. El precio sale tal como lo da la base. Lo
  prueba `route-vehiculos.test.ts` y, con tres cuentas, `supabase/tests/areas/datos/exportar-vehiculos.sql`.
- Cotizaciones (9.05-2c): se leen de la tabla `cotizaciones` bajo la RLS de quien exporta (las policies deciden filas y papelera; sólo columnas
  con `grant select`). El total sale en moneda base tal como se guarda. Los nombres se traen por página y sólo de lo que se ve: clientes sólo
  con `leads.ver` (y aun así decide la RLS de `leads`), títulos bajo «vehiculos: leer»; lo que no llega va vacío. Un origen que no está, 404.
  Lo prueba `route-cotizaciones.test.ts` y, con tres cuentas, `supabase/tests/areas/datos/exportar-cotizaciones.sql`.
- La pantalla no decide nada: `puede()` sólo dibuja; el permiso, el cupo y las filas los exige la base al exportar. `EXPORTACIONES_POR_HORA` espeja el 3 de `datos_exportacion_registrar`: si cambia uno, cambia el otro.
- Un fallo a mitad del flujo, o un token a menos de 30 s de vencer, lo corta con error: una descarga fallida, nunca un CSV que parezca entero.

## Ojo

- `datos.exportar.todo` / `datos.importar.todo` son los únicos permisos que ven datos de otros en bloque: sólo para el dueño.
- `datos.exportar.todo` tiene su enforcement en `datos_exportacion_registrar` (9.05-1): exportar todo sin pasar por ella es saltarse el permiso y el
  límite. «Todo» no trae teléfonos ni lo privado de carteras ajenas (`docs/DECISIONES.md`, duda 2 del 9.05): la lectura va con la sesión.
- **`getSession()` sólo en `prepararSesion()`** (la excepción a «nunca getSession()»): `getClaims()` no da el token crudo, así que se toma de la sesión
  y se verifica **ese mismo** con `getClaims(token)`; `sub` y `exp` salen de los claims verificados, nunca de la sesión. El flujo no usa la cookie:
  lee con un cliente de token fijo, armado en `infra/` (refrescar a mitad del flujo rotaría el refresh token sin poder guardarlo y cerraría la sesión
  por reuso). Si al token le quedan menos de 5 min, se renueva **dentro del pedido y antes de crear la `Response`** (Next agrega la cookie nueva).
