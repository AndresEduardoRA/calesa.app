# vehiculos

Inventario de vehículos por origen con atributos dinámicos: listado con filtros en la URL y vistas guardadas, ficha según el layout del origen, alta y edición. Más adelante: fotos, interesados y vínculo a lead, vitrina web, papelera por lotes e importación desde Copart/IAAI vía apibara.

## Entra y sale

- Entra: `/vehiculos` (una pestaña por origen, `?origen=`, filtros, `?cursor=`). El layout de campos, las categorías y los orígenes vienen de `origenes`; las fases, de `flujos`; las vistas guardadas, de `equipo`. La página los lee y se los pasa por props.
- Sale por `index.ts` (servidor):
  - `buscarVehiculos({ origenId, condiciones, cursor, tamano })` → una página (`Pagina<Vehiculo>`), y `leerVehiculo(id)`.
  - `esquemaDeFiltros({ campos, fases, categorias })` y `condicionesDe(campos, valores, { zona })`: los filtros de un origen desde su layout.
  - `origenesVisibles()`, `origenElegido()`, `permisoDeAlta()`, `puedeEditar()`: qué ve y qué puede hacer la persona.
  - `<ListadoDeVehiculos>`, `<TarjetaVehiculo>`.
- Sale por `client.ts`: `<TarjetaVehiculo>`, `<BadgeDeFase>` y el tipo `Vehiculo`.
- Todavía no existe (partes 3 a 5 de la fase 2): fotos, `<SelectorVehiculo>`, `vincularLead()`, vitrina, papelera, apibara.
- Depende de: `origenes` (layout, orígenes, cómo se nombra lo que entra), `flujos` (las fases de un origen), `equipo` (sesión, permisos y `<MenuDeVistas>`). Lo consumirán `cotizaciones`, `logistica`, `repuestos`, `agenda`, `chat`, `web`, `buscador`, `tablero`, `datos`.

## Archivos clave

- `entities/vehiculo.ts` — `Vehiculo`, `COLUMNAS_DE_VEHICULO`, `vehiculosDesde()`.
- `entities/campo.ts` — `CampoDeVehiculo`: la forma de un campo del layout que este módulo necesita. `entities/` no importa otros módulos, así que la declara y `features/` le pasa el `CampoDeLayout` de `origenes`, que la cumple. `camposActivos()`, `camposDeTarjeta()`.
- `entities/filtros.ts` — `esquemaDeFiltros()` (los fijos: búsqueda, fase, categoría, año; y uno por cada campo `filtrable` activo, con el prefijo `a.`), `condicionesDe()` → `Condicion[]`, la lista neutra que `infra/` traduce.
- `entities/valor.ts` — `valorMostrado(campo, valor)`: qué mostrar de un atributo según su tipo (un monto queda para `<Monto>`).
- `entities/permisos.ts` — espejo de las reglas de la base para dibujar; `entities/repositorios.ts`.
- `infra/queries/condiciones.ts` — `aplicarCondiciones()`, `aplicarCursor()` y los saneadores `citar()` y `patronContiene()`. `infra/queries/listado.ts` — `buscarVehiculos()`, `getVehiculo()`. `composicion.ts`.
- `features/listado/components/` — `listado-de-vehiculos` (pestañas + `FilterShell` + resultado), `resultado-del-listado` (los estados vacíos), `tabla-de-vehiculos` (escritorio), `tarjeta-vehiculo` (celular), `valor-de-campo`, `badge-de-fase`, `miniatura`, `paginacion`, `vistas-de-vehiculos`, `pie-de-filtros`.

## Tablas

`vehiculos`, `vehiculos_imagenes`, `vehiculos_interesados`, `vehiculos_vinculos`, `cola_gc_storage`, `lotes_papelera` (compartida con leads y cotizaciones).
RPC: `vehiculo_crear`, `vehiculo_guardar`, `vehiculo_vitrina`, `papelera_enviar/listar/restaurar/purgar`. `vehiculos` es de sólo lectura para la app (`supabase/migrations/20261013000200_vehiculos_escritura.sql`).

## No se rompe

- La ficha se escribe sólo por RPC: `vehiculo_crear(p_id, p_origen, p_datos)` y `vehiculo_guardar(p_vehiculo, p_actualizado_en_esperado, p_datos)`. Aceptan una lista cerrada de claves (las columnas comunes y `atributos`); `fase_id`, `publicado_web`, `lead_id` o `creado_por` se rechazan. No hay `.insert()` ni `.update()` sobre `vehiculos`.
- `fase_id` lo escribe `cambiar_fase` y, **sólo al nacer**, `vehiculo_crear`: el vehículo entra a la fase inicial cuando el flujo tiene exactamente una inicial activa, que no pide nota, sin requisitos bloqueantes pendientes y sin roles que excluyan a quien crea. Si no, nace sin fase («Sin fase») y lo ubica quien mueve.
- Toda edición manda la versión (`actualizado_en`); otra versión es `PT409` con «<quién> cambió este vehículo hace <cuánto>» (el quién sale de `actividad`). Guardar lo que ya está guardado no es conflicto. Cualquier escritura sobre la fila (mover de fase, vitrina) mueve la versión.
- En `atributos` nunca se guarda un nulo: vaciar quita la clave. Lo de un campo desactivado se conserva y no se escribe.
- Las pestañas son los orígenes donde la persona tiene `vehiculos.ver` (`origenesVisibles()`, espejo de `origenes_con_permiso`), también los desactivados. Lo que ve adentro lo decide la RLS: `buscarVehiculos()` no filtra por permiso.
- Los filtros salen del layout: la clave de un atributo que llega a la base viene de `origenes_campos`, nunca de la URL. Un filtro de un campo que ya no es filtrable, o un valor que no corresponde, se ignora (`leerFiltros()` es tolerante).
- Todo texto que escribió la persona pasa por `citar()` o `patronContiene()` antes de entrar a un `or()` de PostgREST: una coma o un paréntesis sin comillas devuelven 400.
- Ningún nombre de origen, de fase, de categoría ni de campo del layout está escrito en la interfaz: salen de su fila (`etiqueta`, `nombre`, `sustantivo`). Las columnas comunes (año, precio, VIN…) no tienen fila en `origenes_campos` (son claves reservadas): sus etiquetas son el único texto fijo.
- Todo monto pasa por `<Monto>` (Modo Live). En esta parte no se muestra ningún costo: `precio` es precio de lista; los costos reales llegan con logística, con sus permisos.

## Ojo

- **Bajo RLS los filtros sobre `atributos` no usan el GIN** (`@>` e `ilike` no son `leakproof`: Postgres no los evalúa antes que la policy). Lo que hace barata la consulta es `vehiculos_origen_listado_idx` (`origen_id, creado_en desc, id desc`): camina el origen en orden, filtra y corta. Si un origen crece a decenas de miles y un filtro poco selectivo se siente, el listado pasa a una función `definer` que repite la regla de permiso.
- Paginación por keyset `(creado_en, id)`: el borde sobre `creado_en` va como condición propia (entra al índice) y un `or` desempata por id. El cursor viaja como texto: pasarlo por `Date` pierde microsegundos.
- Un rango «hasta N» sobre un atributo numérico (`atributos->clave`) no trae a los que no tienen el dato sólo porque nunca se guarda `null`.
- Una fecha del layout se guarda como `YYYY-MM-DD` y una fecha con hora como ISO en UTC: así comparan bien como texto. «Hasta el 13» es «antes del 14».
- Un campo de opciones sin opciones (los preconfigurados nacen así) no se ofrece como filtro.
- Un VIN repetido **bloquea**: es único entre todos los vehículos vivos, no por origen (`vehiculos_vin_unico`), así que puede chocar con uno que la persona no ve. El lote es único por origen y plataforma; la RPC lo frena también sin plataforma.
- El `id` del alta lo genera el navegador al abrir el formulario: reintentar tras perder la respuesta devuelve el mismo vehículo.
- `puedeEditar()` sólo sabe «lo creé yo»; con alcance «propios» la base también deja editar lo vinculado a un lead de la cartera. Se completa con el vínculo (parte 4).
- La tabla (escritorio) y las tarjetas (celular) están las dos en el DOM: un e2e mira lo visible.
- apibara (parte 5): no distingue plataforma para un lote suelto (con URL se usa `urltodetails`); 429 = cuota del mes agotada (no reintentar), 5xx sí, con tope. El scrape trae identidad del vehículo, nunca números de la cotización.
