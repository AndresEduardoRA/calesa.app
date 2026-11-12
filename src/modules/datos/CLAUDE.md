# datos

Exportación e importación CSV: cada persona lo suyo, el dueño todo; vista previa por fila, importa las válidas y deja el informe.

## Entra y sale

- Entra: archivo CSV subido desde el navegador, mapeo de columnas, confirmación.
- Sale: `/datos` y `POST /datos/exportar` (9.05-2: el archivo de «exportar todo» por un flujo; `index.ts` da `exportarTodo`, `esquemaDelPedido`, `TOPE_DE_FILAS` y `TOPE_POR_ENTIDAD`). Entidades: `leads` y, desde la 9.05-2b, `vehiculos` (con `origen` obligatorio: un archivo por origen).
- Depende de: `leads` (las celdas de su exportación propia y sus catálogos, por su entrada), `vehiculos` (`camposComunes`), `origenes` (`getOrigenes(true)`, `leerLayout`) y `flujos` (`leerFasesDeOrigen`), por sus entradas; el route handler compone `equipo` (`getPermisos`) y `empresa` (`leerAjustes`). **Los listados no dependen de `datos`:** el CSV de lo propio de `leads` (exportar «lo que ves» e importar con vista previa) vive en `leads` (Fase 3, parte 8) y `datos` lo consume por su entrada y reutiliza `shared/lib/csv` (`escribir`, `leer`, `descargar`). Lo que es de `datos` es el **todo del dueño** con `datos.exportar.todo` e `importar-csv`.

## Archivos clave

- `entities/plantillas.ts` — columnas de cada plantilla CSV con sus validadores Zod (teléfono normalizado por la base con el código de la empresa, fechas ISO, orígenes por nombre).
- `infra/importar.ts` — llama a `supabase/functions/importar-csv` (fuera de la Server Action: es trabajo en segundo plano).
- `entities/exportacion.ts` — exportar todo: el pedido (Zod), `TOPE_DE_FILAS` (250.000, medido), `FILAS_POR_PEDIDO` (el `max_rows`), el rango por fechas con el instante de corte, lo que contesta el registrar y los tipos `LectorDeExportacion`, `ColumnasDeExportacion` y `Registrador`.
- `infra/cliente-del-flujo.ts` — `prepararSesion()`: la sesión de quien exporta con su token **fijo** (`accessToken` de supabase-js: nunca refresca). `infra/exportacion.ts` — el conteo y las páginas de `datos_exportar_leads()` por cursor, el registrar y los nombres de los dueños. `infra/paginas.ts` — lo común de leer por páginas (`enElRango`, `siguienteDe`, `contarHasta`). `infra/vehiculos.ts` (9.05-2b) — los vehículos de un origen de la tabla `vehiculos`, de a 1.000, bajo la RLS de quien exporta (no `vehiculos_inventario()`).
- `features/exportar/lecturas.ts` (`exportarTodo`: el orden), `flujo.ts` (el `ReadableStream`), `fuente-de-<entidad>.ts` y `columnas-de-<entidad>.ts` (leads y vehículos; la 9.05-2c suma cotizaciones con un `case` en `lecturas.ts`, sin tocar el flujo ni el route); `features/importar/` (mapeo, vista previa, resultado).

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

## No se rompe

- Exportar respeta RLS: lo que no ves no sale. El teléfono completo sale sólo de la propia cartera.
- Importar nunca pisa: un teléfono existente se reporta como «ya existe» (en masa **no se nombra a nadie**, como en `leads`) y lo del limbo no se adopta en bloque: `crear_lead` con `adoptar` es una decisión por lead.
- El contrato de `leads` (Fase 3, parte 8, `docs/DECISIONES.md`): `_lead_crear(…, p_recordar_origen)` y `leads_importar_lote` son lo que se llama por fila o por lote; `importaciones.archivo_ruta` es nulo sólo en la de `leads`.
- El CSV usa `;` o `,` detectado, UTF-8 con BOM al exportar (Excel en español).
- Exportar todo: el permiso (efectivo) → la sesión → layout y catálogos → el conteo hasta `TOPE_POR_ENTIDAD[entidad] + 1` → **el registrar** → el flujo. Con más del
  tope o ninguna fila, no se registra; con 42501 o el cupo gastado, 403 o 429 sin leer filas; nunca se registra dos veces; el archivo nunca lleva más
  filas que las registradas (el conteo y la lectura usan el mismo instante de corte y la lectura corta en `filas`). Lo prueba `route.test.ts`.
- El orden está escrito una vez (`seguirCon` de `lecturas.ts`): una entidad sólo trae su fuente (lector, columnas y etiqueta del archivo).
- Vehículos (9.05-2b): se leen de la tabla `vehiculos` bajo la RLS de quien exporta (la policy decide filas y papelera; ninguna función nueva). Un
  origen que no está da 404 `vacia` sin contar ni registrar (no dice si existe); uno inactivo exporta. El precio sale tal como lo da la base. Lo
  prueba `route-vehiculos.test.ts` y, con tres cuentas, `supabase/tests/areas/datos/exportar-vehiculos.sql`.
- Un fallo a mitad del flujo, o un token a menos de 30 s de vencer, lo corta con error: una descarga fallida, nunca un CSV que parezca entero.

## Ojo

- `datos.exportar.todo` / `datos.importar.todo` son los únicos permisos que ven datos de otros en bloque: sólo para el dueño.
- `datos.exportar.todo` tiene su enforcement en `datos_exportacion_registrar` (9.05-1): exportar todo sin pasar por ella es saltarse el permiso y el
  límite. «Todo» no trae teléfonos ni lo privado de carteras ajenas (`docs/DECISIONES.md`, duda 2 del 9.05): la lectura va con la sesión.
- **`getSession()` sólo en `prepararSesion()`** (la excepción a «nunca getSession()»): `getClaims()` no da el token crudo, así que se toma de la sesión
  y se verifica **ese mismo** con `getClaims(token)`; `sub` y `exp` salen de los claims verificados, nunca de la sesión. El flujo no usa la cookie:
  lee con un cliente de token fijo, armado en `infra/` (refrescar a mitad del flujo rotaría el refresh token sin poder guardarlo y cerraría la sesión
  por reuso). Si al token le quedan menos de 5 min, se renueva **dentro del pedido y antes de crear la `Response`** (Next agrega la cookie nueva).
