# vehiculos

Inventario de vehículos por origen con atributos dinámicos: listado con filtros en la URL y vistas guardadas, ficha según el layout del origen, y alta y edición en un panel. Más adelante: fotos, interesados y vínculo a lead, vitrina web, papelera por lotes e importación desde Copart/IAAI vía apibara.

## Entra y sale

- Entra: `/vehiculos` (una pestaña por origen, `?origen=`, filtros, `?cursor=`) y `/vehiculos/[id]` (la ficha). El panel de alta y edición tiene su URL en las dos: `?panel=nuevo` y `?editar=<id>`. El layout de campos, las categorías y los orígenes vienen de `origenes`; las fases, de `flujos`; las vistas guardadas, de `equipo`. La página los lee y se los pasa por props.
- Sale por `index.ts` (servidor):
  - `buscarVehiculos({ origenId, condiciones, cursor, tamano })` → una página (`Pagina<Vehiculo>`), y `leerVehiculo(id)`.
  - `esquemaDeFiltros({ campos, fases, categorias })` y `condicionesDe(campos, valores, { zona })`: los filtros de un origen desde su layout.
  - `origenesVisibles()`, `origenElegido()`, `permisoDeAlta()`, `puedeEditar()`: qué ve y qué puede hacer la persona.
  - `<ListadoDeVehiculos>`, `<FichaDeVehiculo>`, `<TarjetaVehiculo>`; `<PanelDeVehiculo>` (va una vez por pantalla), `<BotonEditarVehiculo>` y `CLAVE_DE_EDICION`.
- Sale por `client.ts`: `<TarjetaVehiculo>`, `<BadgeDeFase>` y el tipo `Vehiculo`.
- Todavía no existe (partes 3 a 5 de la fase 2): fotos, `<SelectorVehiculo>`, `vincularLead()`, vitrina, papelera, apibara.
- Depende de: `origenes` (layout, orígenes, cómo se nombra lo que entra), `flujos` (las fases de un origen), `equipo` (sesión, permisos y `<MenuDeVistas>`). Lo consumirán `cotizaciones`, `logistica`, `repuestos`, `agenda`, `chat`, `web`, `buscador`, `tablero`, `datos`.

## Archivos clave

- `entities/vehiculo.ts` — `Vehiculo`, `COLUMNAS_DE_VEHICULO`, `vehiculosDesde()`.
- `entities/campo.ts` — `CampoDeVehiculo`: la forma de un campo del layout que este módulo necesita. `entities/` no importa otros módulos, así que la declara y `features/` le pasa el `CampoDeLayout` de `origenes`, que la cumple. `camposActivos()`, `camposDeTarjeta()`.
- `entities/filtros.ts` — `esquemaDeFiltros()` (los fijos: búsqueda, fase, categoría, año; y uno por cada campo `filtrable` activo, con el prefijo `a.`), `condicionesDe()` → `Condicion[]`, la lista neutra que `infra/` traduce.
- `entities/valor.ts` — `valorMostrado(campo, valor)`: qué mostrar de un atributo según su tipo (un monto queda para `<Monto>`).
- `entities/comunes.ts` — `camposComunes(tipoDeOrigen)`: los datos que son columna (título, marca, año, VIN, precio…; lote, plataforma y enlace sólo en subasta), con su etiqueta, su bloque («Datos principales», «Precio») y sus topes. `valorComun()`. Es el único lugar con etiquetas fijas de campos.
- `entities/formulario.ts` — el estado del formulario (`ValoresDeFormulario`: lo que la persona ve y escribe, con los campos del layout bajo `a.<clave>`), `valoresIniciales()` (en un alta, el `valor_defecto` de cada campo).
- `entities/esquema.ts` — `esquemaDeVehiculo(fuentes)`: el `z.object` armado desde los datos comunes y el layout; `validarVehiculo()` devuelve los datos listos para la base o el primer motivo de cada campo. **Lo usan igual el formulario y la Server Action.**
- `entities/permisos.ts` — espejo de las reglas de la base para dibujar; `entities/repositorios.ts`.
- `infra/queries/condiciones.ts` — `aplicarCondiciones()`, `aplicarCursor()` y los saneadores `citar()` y `patronContiene()`. `infra/queries/listado.ts` — `buscarVehiculos()`, `getVehiculo()`. `infra/vehiculos.ts` — las dos RPC de escritura; traduce el `hint` de la base (`anio`, `atributos.color`) a la clave del campo en el formulario. `composicion.ts`.
- `features/alta/` — `controles.ts` (qué control dibuja cada dato, común o del layout), `fuentes.ts` (lo que el servidor vuelve a leer para validar), `actions/crear-vehiculo.ts` y `guardar-vehiculo.ts`, `hooks/use-formulario-de-vehiculo.ts` (validar, enviar, borrador, conflicto, reintento al volver la conexión, atajos), `hooks/use-panel-de-vehiculo.ts` (el panel en la URL), `components/` (`panel-de-vehiculo`, `formulario-de-vehiculo`, `campo-de-formulario`, `botones`).
- `features/ficha/components/` — `ficha-de-vehiculo` (cabecera con la fase de sólo lectura, los dos bloques comunes y un `<Bloque>` por grupo del layout), `valor-mostrado` (dibuja un `ValorMostrado`; lo usa también la celda del listado).
- `features/listado/components/` — `listado-de-vehiculos` (pestañas + `FilterShell` + resultado), `resultado-del-listado` (los estados vacíos), `tabla-de-vehiculos` (escritorio), `tarjeta-vehiculo` (celular), `valor-de-campo`, `badge-de-fase`, `miniatura`, `paginacion`, `vistas-de-vehiculos`, `pie-de-filtros`.

## Tablas

`vehiculos`, `vehiculos_imagenes`, `vehiculos_interesados`, `vehiculos_vinculos`, `cola_gc_storage`, `lotes_papelera` (compartida con leads y cotizaciones).
RPC: `vehiculo_crear`, `vehiculo_guardar`, `vehiculo_vitrina`, `papelera_enviar/listar/restaurar/purgar`. `vehiculos` es de sólo lectura para la app (`supabase/migrations/20261013000200_vehiculos_escritura.sql`).

## No se rompe

- La ficha se escribe sólo por RPC: `vehiculo_crear(p_id, p_origen, p_datos)` y `vehiculo_guardar(p_vehiculo, p_actualizado_en_esperado, p_datos)`. Aceptan una lista cerrada de claves (las columnas comunes y `atributos`); `fase_id`, `publicado_web`, `lead_id` o `creado_por` se rechazan. No hay `.insert()` ni `.update()` sobre `vehiculos`.
- `fase_id` lo escribe `cambiar_fase` y, **sólo al nacer**, `vehiculo_crear`: el vehículo entra a la fase inicial cuando el flujo tiene exactamente una inicial activa, que no pide nota, sin requisitos bloqueantes pendientes y sin roles que excluyan a quien crea. Si no, nace sin fase («Sin fase») y lo ubica quien mueve.
- Toda edición manda la versión (`actualizado_en`); otra versión es `PT409` con «<quién> cambió este vehículo hace <cuánto>» (el quién sale de `actividad`). Guardar lo que ya está guardado no es conflicto. Cualquier escritura sobre la fila (mover de fase, vitrina) mueve la versión.
- El formulario y el servidor validan con **el mismo esquema**: la action recibe el estado del formulario, vuelve a leer el layout y llama a `validarVehiculo()`. Los motivos vuelven por campo (`porCampo`) y se escriben al lado; un rechazo de la base con `hint` también. Una opción que el vehículo tiene guardada y ya se sacó del campo (o una categoría desactivada) sigue valiendo mientras la tenga.
- Los grupos del layout son los bloques del formulario y de la ficha, con el nombre que les puso el origen; delante van «Datos principales» y «Precio». Un bloque con algo obligatorio nace abierto y uno con un error se abre solo.
- Atajos: `N` abre «Nuevo» en `/vehiculos` (con permiso, origen activo y sin otro panel); `Ctrl/Cmd+S` guarda y cierra; `Ctrl/Cmd+Enter` guarda y, en un alta, deja el panel listo para el siguiente.
- Conflicto (`PT409`): `<AvisoDeConflicto>` dentro del panel, con «Ver cómo quedó» (otra pestaña) y «Recargar» (trae la versión nueva y descarta lo escrito). Conexión caída: lo escrito queda (estado + borrador en `sessionStorage`) y el guardado pendiente sale solo al volver; no duplica.
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
- La ficha de un vehículo de un origen desactivado se sigue editando; lo que no recibe es altas: «Nuevo» sale apagado y el motivo va en un aviso arriba de la lista (`permisoDeAlta()`).
- Una constante que la página lee en el servidor no se exporta desde un archivo `'use client'` (llegaría como referencia): por eso `CLAVE_DE_EDICION` vive en `features/alta/claves.ts`.
- El pie del panel es `sticky` con `-bottom-4`: el área que desplaza tiene relleno y «pegajoso» se mide contra el borde de adentro.
- Un campo deshabilitado no recibe el foco: tras «guardar y cargar otro» se espera a que termine el envío.
- `puedeEditar()` sólo sabe «lo creé yo»; con alcance «propios» la base también deja editar lo vinculado a un lead de la cartera. Se completa con el vínculo (parte 4).
- La tabla (escritorio) y las tarjetas (celular) están las dos en el DOM: un e2e mira lo visible.
- La ficha declara todas sus pestañas en `src/app/(app)/vehiculos/[id]/pestanas.ts` y sólo muestra las que tienen su `seccion-<clave>.tsx` (un test lo compara con el disco). Con una sola no dibuja la barra. Sumar una pestaña = crear su sección y prender `disponible`.
- Lo que no existe, lo que está en la papelera y lo que la persona no ve se muestran igual («No existe o no tienes acceso»): `leerVehiculo()` devuelve `null` en los tres casos.
- apibara (parte 5): no distingue plataforma para un lote suelto (con URL se usa `urltodetails`); 429 = cuota del mes agotada (no reintentar), 5xx sí, con tope. El scrape trae identidad del vehículo, nunca números de la cotización.
