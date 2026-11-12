# flujos

Motor único de flujos: fases, transiciones, requisitos (documento | dato | espera), roles por fase y transición, reglas por flujo, jubilar/eliminar, revisión de coherencia y la RPC `cambiar_fase` que mueve vehículos y repuestos.

**Fase 5 cerrada el 2026-11-12** (5.13): toda la configuración por RPC con la versión del flujo. Deja a la Fase 6 mover (6.04), los catálogos de puertos y navieras (6.08) y el requisito de dato con su regla apagada (**6-4**); y a la 8, la rama de repuestos de mover (8.13).

## Entra y sale

- Entra: configuración del dueño en `/configuracion/flujos` (un flujo por origen + el de repuestos); llamadas a mover desde `logistica` y `repuestos`.
- Sale hoy por `index.ts`: `leerFasesDeOrigen(origenId)` → `FaseResumen[]` (id, nombre, color, orden, inicial, final, activa; también las jubiladas). Por `client.ts`: el tipo `FaseResumen`. Lo consume `vehiculos` para mostrar la fase y filtrar por ella. Del área `mover` (6.01): `leerFlujoDeOrigen(origenId)` → `FlujoDeOrigen | null` (`flujoId`, `reglasActivas`, y por fase `notaObligatoria`, `permiteContenedor`, `permiteAduana`, `demoraDias`; error visible si una lista llega al tope) y `reglaActiva(flujo, regla)`; por `client.ts`, sus tipos y `reglaActiva`. Lo consume el panel de la unidad de `logistica`.
- **Mover (6.04-1):** por `client.ts`, las actions `leerParaMover`, `previsualizarCambio`, `previsualizarCambioLote`, `cambiarFase` y `cambiarFaseLote` y `destinosDeLaFase` (6.04-3: las salidas de una fase, sin vista previa; cada una exige `flujos.mover` o `flujos.mover.cualquiera` en el origen y la base decide otra vez; **8.13-1:** `leerParaMover`, `previsualizarCambio` y `cambiarFase` aceptan `vehiculo` **o** `repuesto` (uno solo: `unidadDelPedido`, que sale como `unidad: { tipo, … }`; `origenId` sólo se exige al vehículo) y un ítem se mueve con `repuestos.mover` global (`puedeMoverUnRepuesto`), nunca con `flujos.mover`; excepto `destinosDeLaFase` y el lote, que son sólo de vehículo) y las reglas puras `estadoDelBoton`, `textoDelBoton`, `motivoLegible`, `etiquetaDeRequisito`, `detalleDeRequisito`, `anclaDeRequisito`. Saldrá con su fase del plan: `<BadgeFase>`. Lo consumen `logistica` (el panel de la unidad) y, luego, `repuestos` y `web` (fases públicas).
- El flujo de repuestos lo garantiza una migración (`fases_flujo_de_repuestos`, 5.01-2): sin fases y con sus 7 reglas; las fases las siembra `seed.sql` o se crean en «Fases».
- Depende de: `origenes`.

## Archivos clave

- `entities/fase.ts` — `FaseResumen`, `fasesDesde()`. `infra/queries/fases.ts` — `getFasesDeOrigen()`. `areas/nucleo/composicion.ts`.
- `entities/transiciones/quien-mueve.ts` (5.06) — `quienMueve()`: espejo de `_puede_mover` sin su parte de permisos, sólo para UX; la RPC `cambiar_fase` es el candado.
- `entities/revisar/avisos.ts` (5.12) — lectura, orden y resumen de los avisos de `revisar_flujo()` (sin salida, inalcanzable, esperas cruzadas, roles que nadie tiene).
- `features/configuracion/` (núcleo, 5.02: `<PantallaDelFlujo>` —Server Component async, por `pantallas/configuracion.ts`—, el selector, la lista de fases y el inspector por fase; sólo la lista, sin «camino» ni «historial», D2). `entities/selector-de-flujos.ts` y `lectura-de-fase.ts` son los textos puros.
- La pantalla `/configuracion/flujos` (`src/app/(app)/configuracion/flujos/`) recibe de `src/app` los orígenes (`getOrigenes(true)`) y los roles (`leerRolesParaElegir()`): `flujos` no importa `origenes` ni `equipo`. `?fase=` lo lee `useFaseAbierta()`: un id que no es de una fase del flujo se ignora. `useVersionDelFlujo()` (dentro de `<ProveedorDelFlujo>`) entrega la `version` y `avisarConflicto()`; no sale por `client.ts` (D20).
- **Huecos** (`HuecosDelFlujo`, 5.02): `franjaDeRevisar`, `accionesDeLaLista`, `accionesDeFila`, `salidasDeFila` y `bloques.datos|salidas|requisitos` del inspector (`salidasDeFila` y `bloques.salidas` ya están llenos, 5.06; `salidas` recibe también `roles`; `bloques.requisitos`, 5.08; `franjaDeRevisar`, 5.12). Son **componentes de cliente** opcionales; cada área suma su línea en `src/app/(app)/configuracion/flujos/huecos.ts` al llenarlos. El inspector está registrado en `drawers-con-salida.ts` con el formulario de «Datos» (`formulario-de-datos-de-la-fase.tsx`, mecanismo `contexto`).

## Áreas (5.02)

El módulo se parte por área, como `cotizaciones` (`scripts/guardas/areas-de-flujos.test.ts` lo vigila): el **núcleo** (`areas/nucleo/`, `entities/flujo.ts`, `entities/fase.ts`,
`infra/queries/`, `features/configuracion/`) y siete áreas con sus lugares: `fases`, `transiciones`, `requisitos`, `reglas`, `documentos`, `revisar` y `mover`. Un área vive en
`features|entities|infra/<área>/`, `areas/<área>/{index,client,composicion}.ts` y `pantallas/<área>.ts`; nace vacía y la llena su paso (`docs/plan.yaml`, `dueno_de`).

- `index.ts`, `client.ts` y `composicion.ts` de la raíz sólo hacen `export *` del núcleo y de cada área. Lo nuevo va en `areas/<su área>/`, nunca en la raíz.
- Un área importa lo suyo y el núcleo, nunca otra área; el núcleo no importa ningún área; adentro nadie importa la raíz. Lo que dos áreas comparten va al núcleo (lo decide el A).
- Un nombre exportado repetido entre dos áreas es un error de `tsc`.

## Transiciones y quién mueve (5.06)

- Bloque «Salidas y quién mueve» del inspector (hueco `bloques.salidas`) y chips de la fila (hueco `salidasDeFila`): `pantallas/transiciones.ts` da `<BloqueDeSalidas>` y `<SalidasDeLaFila>`, que `src/app/(app)/configuracion/flujos/huecos.ts` registra. Lo llena el área `transiciones` en dos partes, ambas hechas: 5.06-1 ver, agregar y quitar una salida; 5.06-2 editar acción y nota y limitar a roles (`transicion_guardar` con `accion` y `nota_obligatoria`, `fase_roles_poner` y `transicion_roles_poner`; el campo del `hint` es `accion` o `roles`).
- **El hueco `salidas` recibe `{flujo, fase, roles}`**: los nombres de rol vienen de `src/app` (`flujos` no importa `equipo`); con el hueco lleno el inspector ya no dibuja `LecturaDeSalidas`.
- Archivos: `entities/transiciones/{quien-mueve,formulario-de-salida,roles-de-lista,vista-de-salidas,respuestas,repositorios}.ts`, `infra/transiciones/escribir.ts` (las cinco RPC con el campo del `hint`), `features/transiciones/{actions,schemas,hooks,components}`, `areas/transiciones/`. Cinco actions (`crearTransicion`, `guardarTransicion`, `eliminarTransicion`, `ponerRolesDeFase`, `ponerRolesDeTransicion`); cada una comprueba `flujos.configurar` o `repuestos.configurar` antes de la RPC y revalida la ruta (la lista se relee, la versión cruza como texto).
- **Alta en línea con estado local; sólo quitar vive en la URL:** `?eliminar=salida&salida=<id>` (constantes en `entities/transiciones/vista-de-salidas.ts`; registrado en `scripts/guardas/areas-b/confirmar-con-url.ts`). La clave `eliminar` la comparten requisitos (`quitar=`) y agenda: conviven porque cada hook abre sólo con su valor.
- **Editar y limitar (5.06-2):** componentes `selector-de-roles` (una casilla por rol; `alternarRol` toca sólo ese id y conserva los que no se muestran), `campos-de-salida` (alta y edición comparten «Acción» y «Pide nota»), `formulario-de-edicion-de-salida` (en el lugar de la fila; un solo «Guardar» manda primero la acción y la nota que cambiaron y luego los roles, **el segundo pedido con la versión que devolvió el primero**) y `quien-mueve-a-la-fase` (selector y «Guardar quién mueve»; el borrador se reinicia con `key` por la firma de lo guardado). Todo lo que escribe cuelga de `useSalidasDeLaFase`: una sola escritura a la vez en el bloque, para que no se pisen la versión. Limitar a un rol que quien configura no tiene no avisa (acota, no otorga).
- `quienMueve(flujo, de, a)`: la lista de la salida manda sobre la de la fase destino; sin listas, cualquiera con el permiso. El id del intento de «Agregar salida» se reutiliza al reintentar: «ya existe» sobre `id` se toma por hecho.

## Mover (6.04)

- Área `mover`: `entities/mover/{vista-previa,requisitos,motivos,para-mover,boton-de-mover}.ts` (puro: Zod de lo que devuelven las RPC, una etiqueta por cada clave de dato de la base —`requisitos.test.ts` la compara con el SQL de `claves_dato_requisito`—, la frase de cada rechazo y el estado del botón), `infra/mover/{mover,destinos}.ts` (las RPC y los destinos con `tope + 1`), `features/mover/{actions,schemas}` y `areas/mover/`.
- **El rechazo llega como campo:** `porCampo: { <hint>: mensaje }` con `conflicto`, `requisitos`, `rol`, `nota`, `transicion` o `acceso` (el patrón de `transiciones`). El `PT409` conserva el texto de la base, que trae el nombre de quien movió.
- Un ítem de repuesto se lee de `repuestos_items` bajo la RLS (`logistica_unidad` es sólo de vehículo): sin «fuera de regla» ni «quién la movió», con la vista previa de cada destino (`previsualizar_cambio_fase(p_repuesto)`); sus destinos salen del flujo `ambito = 'repuestos'` sin origen. Abierto 8-13a. El lote no cambia.
- `leerParaMover` junta `logistica_unidad`, los destinos (hasta 12) y una vista previa por destino en paralelo; la de un destino que falla dice su error y no tumba a los demás. `cambiarFase` no revalida: la pantalla se repinta con `router.refresh()`.

## Documentos (5.03 y 5.09)

- Pestaña `?seccion=documentos` de `/configuracion/flujos` (área `documentos`; `pantallas/documentos.ts` da `<PantallaDeDocumentos>` y `<EsqueletoDeTipos>`): dos grupos de `tipos_documento`, los de toda la empresa (`flujo_id` nulo; los cambia `logistica.catalogos.gestionar`) y los del flujo elegido (`flujos.configurar` o `repuestos.configurar`; el permiso por origen lo decide la base). Los ve cualquier cuenta con la pestaña; quien no puede cambiar un grupo lo ve con «Nuevo tipo», «Editar» y el orden apagados y con el motivo.
- Archivos: `entities/documentos/{tipo-de-documento,formulario-de-tipo,respuestas,vista-de-grupo,repositorios}.ts` (reglas puras, validación espejo de la base —probada contra PGlite—, qué abre cada grupo), `infra/documentos/{tipos,escribir-tipos}.ts` (lectura con `tope + 1` y las cuatro RPC `tipo_documento_crear|guardar|mover|eliminar`), `features/documentos/{actions,schemas,hooks,components}`, `areas/documentos/`.
- **La lista se relee, no se siembra:** ninguna RPC devuelve la lista, así que cada action revalida `RUTAS.configuracionDeFlujos` y la página trae los dos grupos de nuevo; la versión (`actualizadoEn`) cruza como texto ISO. El uso de cada tipo (`tipos_documento_con_uso`, conteos acotados a 50) sólo se pide a quien puede cambiar el grupo (a los demás la base les da `42501`).
- URL: `?panel=nuevo-tipo&de=empresa|flujo`, `?panel=editar-tipo&tipo=<id>`, `?panel=eliminar-tipo&tipo=<id>` (constantes `PANEL_*`, `CLAVE_DEL_TIPO`, `CLAVE_DEL_GRUPO` en `entities/`). Un solo modal y una sola confirmación sirven a los dos grupos; lo que la URL pide y no se puede abrir (grupo ajeno, tope, tipo ausente, tipo en uso al eliminar) se avisa y se limpia. Con uso, «Eliminar» está apagado: se desactiva (D13 del 5.09).
- Las actions llevan el `flujoId` del grupo y comprueban `puede()` antes de la RPC; `leerTiposDeDocumento` y `leerUsoDeTiposDeDocumento` salen por el `index.ts` del área.

## Fases (5.04)

- Área `fases` (`entities|features|infra/fases/`, `areas/fases/`): se escriben por RPC, nunca con `.update()`. `entities/fases/reglas-de-fase.ts` es el espejo puro de
  `_fase_validar()` (`validarFase(valores, contexto)`, `motivoDelInterruptor()`; lo prueba `reglas-de-fase-contra-la-base.test.ts` contra la función real en
  PGlite); `formulario-de-fase.ts` (`cambiosParaGuardar` manda sólo lo que cambió, `datosParaCrear` sólo nombre, color y tipo), `colores-de-fase.ts` (paleta
  cerrada), `orden-de-fases.ts` (`despuesDeAlMover`), `vista-de-impacto.ts` (los textos de jubilar o eliminar) y `respuestas.ts` (lee las seis RPC).
- `infra/fases/{escribir-fases,leer-impacto}.ts` llama `fase_crear|guardar|mover|eliminar|reactivar` y `fase_impacto`; el `hint` de la base vuelve como el campo del
  formulario. `features/fases/actions/` (`crearFase`, `guardarFase`, `moverFase`, `eliminarFase`, `reactivarFase`, `leerImpactoDeUnaFase`) exigen
  `flujos.configurar` en el origen (o `repuestos.configurar` si `origenId` es nulo) antes de la RPC y revalidan configuración y vehículos. Crear lleva el
  `flujoId`; repetir el id de un intento da «Esa fase ya existe.», no el mismo resultado.
- **La lista (5.04-2):** `pantallas/fases.ts` da `<AccionesDeLaLista>` («Nueva fase», y —una vez por pantalla— el modal y la confirmación, con `diferido()`) y
  `<AccionesDeFila>` (`<BotonesDeOrden>` y el «⋯»: Editar, Jubilar o eliminar, Reactivar); `src/app/(app)/configuracion/flujos/huecos.ts` los pone en
  `accionesDeLaLista` y `accionesDeFila`. URL: `?panel=nueva-fase` y `?panel=eliminar-fase&quitar=<id>` (`PANEL_*` y `CLAVE_DE_FASE_A_QUITAR` en
  `entities/fases/panel-de-fase.ts`; registrada en `scripts/guardas/areas-b/confirmar-con-url.ts`). La confirmación lee `fase_impacto` al abrirse
  (`leerImpactoDeUnaFase`); una bloqueada se explica y no se confirma. Cada escritura la hace `useListaDeFases` (una a la vez), manda la `version` del flujo y,
  ante `PT409`, `avisarConflicto()`; la lista se relee, no se siembra. Sin permiso en la interfaz: el selector sólo ofrece flujos configurables (D1).
- **El inspector › Datos (5.04-3):** `pantallas/fases.ts` suma `<DatosDeLaFase>` (hueco `bloques.datos`, en `huecos.ts`). Es un formulario en cinco `<Bloque>`s
  (Identidad, En el flujo, Alerta por demora, Transporte y aduana, Web y portal; `entities/fases/bloques-de-fase.ts` dice qué campo va en cuál, su orden visual y su
  `id`), uno por archivo `bloque-*.tsx`, con `<InterruptorConMotivo>` (la regla del flujo apagada lo deshabilita con su motivo, `motivoDelInterruptor`). Lo maneja
  `useFormularioDeDatos` (valida con `validarFase`, manda a `fase_guardar` sólo `cambiosParaGuardar`, deja el motivo junto al campo y el foco en el primero, borrador
  `fase-<id>` en `sessionStorage`, red y conflicto) sobre `useValoresDeFase`. Se reinicia con una `key` (`fase.id` + versión del flujo) al llegar la fase releída.
- Nada de esta área sale por `index.ts` ni `client.ts`: los componentes salen por `pantallas/fases.ts`.

## Requisitos (5.08)

- Bloque «Requisitos para entrar» del inspector (hueco `bloques.requisitos`; `pantallas/requisitos.ts` da `<BloqueDeRequisitos>`, que `src/app/(app)/configuracion/flujos/huecos.ts` registra). Lo llena el área `requisitos` en tres partes (todas hechas): 5.08-1 lista, ordena, quita y agrega un **dato**; 5.08-2 las formas **documento** y **espera** y **editar** (`requisito_guardar`); 5.08-3 «Bloqueante» (interruptor de la fila con aviso de impacto en línea) y «fuera de regla».
- Archivos: `entities/requisitos/{claves,descripcion,formulario-de-dato,formulario-de-documento,formulario-de-espera,formulario-de-edicion,notas,opciones,respuestas,repositorios,vista-de-fase}.ts`, `infra/requisitos/{opciones,escribir}.ts` (lectura de tipos y de las fases activas del otro flujo con `tope + 1`, y las RPC `requisito_crear|guardar|mover|eliminar`), `features/requisitos/{actions,schemas,hooks,components}`, `areas/requisitos/`.
- **`claves.ts` es espejo de `claves_dato_requisito(ámbito)`** y `claves.test.ts` lo compara con el SQL vigente (`definicionSql`): una clave nueva en la base sin etiqueta rompe la prueba. Sólo `pagos.umbral_pct` lleva `config.pct`. Las reglas que apagan una clave son `transporte`, `aduana` y `pagos` (por prefijo).
- **El hueco es de cliente y sólo recibe `{flujo, fase}`:** lo que necesita para nombrar (tipos de documento) lo pide una Server Action de lectura (`leerOpcionesDeRequisitos`) una vez por flujo, guardada un minuto con `memoriaDeLectura`. La lista sale de `flujo.requisitos`; cada escritura revalida la ruta y manda la versión del flujo (`useVersionDelFlujo()`); un `PT409` se dice con `avisarConflicto()`.
- Las actions llevan el `ambito` del flujo y comprueban `flujos.configurar` o `repuestos.configurar` antes de la RPC. Nacen informativos; `requisito_crear` pone el `espera_ambito`.
- Una sola action `crearRequisito` (unión por `tipo`: dato, documento, espera) y `guardarRequisito` (sólo lo que cambió; `null` vacía; con `bloqueante` solo, que manda el interruptor de la fila y nunca el formulario). El estado de todo formulario de requisito (id del intento, motivo junto al campo, conflicto, duplicado) es `useFormularioDeRequisito`. `leerOpcionesDeRequisitos` recibe `{flujoId, ambito}` y trae también las fases activas del otro ámbito (hasta 1.000; una espera de repuestos puede apuntar a cualquier flujo de vehículos).
- URL: `?agregar=nuevo&forma=elegir|dato|documento|espera`, `?editar=requisito&requisito=<id>` y `?eliminar=requisito&quitar=<id>` (constantes en `entities/requisitos/vista-de-fase.ts`); el diálogo de quitar está registrado en `scripts/guardas/areas-c/confirmar-con-url.ts`. Un área no importa otra: los tipos de documento se leen aparte, no de `documentos`.

- **Bloqueante y fuera de regla (5.08-3):** `leerImpactoDeRequisito` (action de lectura: permiso por ámbito y `requisito_impacto`) alimenta `useBloqueanteDeRequisito`; el aviso va en línea (`<ConfirmarBloqueo>`), con estado local. `leerFueraDeRegla` (`flujo_fuera_de_regla`, `tope + 1`) sale por `areas/requisitos/index.ts` y lo lee `src/app/(app)/configuracion/flujos/requisitos/fuera-de-regla.tsx`, que resuelve los títulos con `leerTitulosDeVehiculos` de `vehiculos` (`flujos` no lo importa) y arma `href` por fase con `FILTRO_FASE`. Lo entrega a `PantallaDelFlujo` por `sobreLaLista`, una **prop de servidor** (función del flujo leído, tras su `<Suspense fallback={null}>`), no un hueco de cliente. URL `?panel=fuera-de-regla` (`PANEL_FUERA_DE_REGLA`); el panel está registrado `sinFormulario` en `scripts/guardas/areas-c/drawers-con-salida.ts` y las dos RPC en `areas-c/paginas-en-la-base.ts` (`p_tope` por constante, defecto 50 en la base).

## Revisar (5.12)

- La franja sobre el selector de la pestaña «Fases» (hueco `franjaDeRevisar`; `pantallas/revisar.ts` da `<FranjaDeRevisar>`, que registra `src/app/(app)/configuracion/flujos/huecos.ts`).
  Cerrada, el resumen («Todo en orden», «1 error y 3 avisos»; las de información no cuentan); abierta, la lista ordenada error › aviso › información con icono,
  palabra y el texto de la base. **Nace cerrada siempre**; abrir es estado local. Cambiar de flujo la vuelve a cerrar (`key` por `flujo.id` adentro).
- Archivos: `entities/revisar/{avisos,repositorios}.ts`, `infra/revisar/leer-avisos.ts` (`revisar_flujo` con `limit 201`, tope 200 y `<AvisoDeTope>`),
  `features/revisar/{schemas,actions,hooks,components}`, `areas/revisar/composicion.ts`. La action `leerAvisosDeRevisar({flujoId, ambito})` exige
  `flujos.configurar` o `repuestos.configurar` antes de la RPC; el origen lo decide la base (cero filas a quien no configura).
- **Se relee por `flujo.version`** (cada guardado revalida la ruta): `useAvisosDeRevisar` conserva lo último leído mientras relee, y descarta la respuesta de
  un pedido viejo. Va fuera de `<ProveedorDelFlujo>`: no usa `useVersionDelFlujo()`.
- Un aviso de una fase leída abre su inspector con un botón «Abrir la fase» (`useFaseAbierta().abrir()`). Ni `<AbrirResumen>` ni `<Link>`: los specs vecinos
  buscan `[data-abre-resumen]` y enlaces por nombre sin acotar a una región. «Revisar» no frena nada.

## Reglas (5.11)

- Pestaña `?seccion=reglas` de `/configuracion/flujos` (área `reglas`; `pantallas/reglas.ts` da `<PantallaDeReglas>` y `<EsqueletoDeReglas>`): las reglas del ámbito del flujo elegido, cada una con su interruptor, y, con «Transporte» encendida, la oferta de transporte (puertos de origen, de destino y navieras activos). La ve quien configura un flujo (`flujos.configurar` o `repuestos.configurar`); la base decide cada escritura.
- Archivos: `entities/reglas/{catalogo,impacto,oferta,permiso,repositorios}.ts` (las 10 claves con su texto, comparadas en un test con el check de la base y con `_flujo_regla_admitida`; la frase de «no se puede apagar» y el enlace `?fase=`; vacío = se ofrecen todos y la firma del borrador), `infra/reglas/{oferta,escribir-reglas}.ts` (`flujo_oferta`, puertos y navieras activos con `limit 201`, y las RPC `flujo_regla_impacto|cambiar` y `flujo_oferta_guardar`), `features/reglas/{actions,schemas,hooks,components}`, `areas/reglas/`.
- **Apagar pregunta antes de escribir:** `cambiarRegla` llama `flujo_regla_impacto`; con uso responde `en_uso` y no escribe. Los interruptores siguen a lo que lee el servidor; «Deshacer» y las escrituras usan la **última versión conocida** del flujo (`useEscrituraDeReglas`), no la del toast. El borrador de la oferta lleva `key` por la firma de lo guardado, no por la versión.
- Puertos y navieras sólo se **leen**: su gestión es de `logistica` (Fase 6, `logistica.catalogos.gestionar`); `navieras` nace vacía y la pantalla lo dice.

## Tablas

`flujos`, `flujos_reglas`, `fases`, `fases_transiciones`, `fases_roles`, `fases_transiciones_roles`, `tipos_documento`, `fases_requisitos`, `historial_fases`, `flujos_transporte_oferta`.
RPC: `cambiar_fase`, `cambiar_fase_lote`, `previsualizar_cambio_fase`, `previsualizar_cambio_fase_lote`, `revisar_flujo`, `fase_crear`, `fase_guardar`, `fase_mover`, `fase_impacto`, `fase_eliminar`, `fase_reactivar`, `requisito_crear`, `requisito_guardar`, `requisito_mover`, `requisito_eliminar`, `requisito_impacto`, `flujo_fuera_de_regla`, `claves_dato_requisito`, `flujo_regla_impacto`, `flujo_regla_cambiar`, `flujo_oferta_guardar`, `flujo_oferta`, `logistica_cadena`, `logistica_cadena_columna`, `logistica_unidad`, `logistica_donde_esta`.

## No se rompe

- `cambiar_fase` es la única que **mueve** (`fase_id` de vehículos e ítems de repuesto). Orden (6.02-1): acceso (`puede_unidad(…, 'logistica.ver', 'repuestos.ver')`,
  antes del candado: quien no ve la unidad no espera) → `for no key update` de la unidad → `previsualizar_cambio_fase` en una sentencia nueva → fase esperada
  distinta → `PT409` de `_fase_conflicto` («Rosa Mamani la movió a «X» hace 1 min.», «La moviste… desde otra ventana.», «Otra persona…»; sin «Recarga») →
  rechazos `23514` → nota → historial + nota + actividad. Todo rechazo lleva su código en `hint`: `acceso` y `unidad` (42501 / 22023, un solo texto exista o no),
  `conflicto`, `transicion`, `rol`, `requisitos`, `nota`. La vista previa trae los mismos en `codigos`, alineado con `motivos`. La esperada nula vale sólo para
  una unidad sin fase. Mover no mueve `vehiculos.actualizado_en` ni audita `vehiculos.update` (consta como `unidad.fase_cambiada`).
- `cambiar_fase_lote(p_unidades jsonb, p_fase_destino, p_nota)`: 1–200 `{vehiculo, fase_esperada}` (mal formado o repetido → `22023` hint `p_unidades`, sin mover
  nada); mueve en orden de id y devuelve en el de entrada `{vehiculo_id, ok, codigo, motivo, historial_id}`; sólo atrapa PT409, 23514, 42501 y 22023.
  `previsualizar_cambio_fase_lote(p_vehiculos uuid[], p_fase)`, invocadora, ≤ 200. `evaluar_requisitos` y `unidad_llego_a_fase` no son de `authenticated`: las
  llaman funciones `definer` que ya miraron el acceso; el `detalle` de un requisito trae `tipo_documento_id` o `clave_dato`.
- La cadena (6.02-2): `logistica_cadena(p_origen, p_tope, p_filtros)` y `logistica_cadena_columna(p_origen, p_fase, p_desde, p_id, p_tope, p_filtros)` son
  `security definer` (las policies de `transportes` y `documentos` preguntan por fila): el alcance es el menor de `logistica.ver` y `vehiculos.ver` del origen
  (`_logistica_alcance`, una vez; sin él 42501 hint `acceso`) y toda consulta empieza por `origen_id` y fuera de la papelera. Cuatro consultas fijas en
  `_logistica_columna` sobre `vehiculos_cadena_idx (origen_id, fase_id, fase_desde, id)`; «Sin fase» es `fase_id` nulo (check `vehiculos_fase_desde_coherente`:
  `fase_desde` existe si y sólo si hay fase; el trigger `trg_0_fase_desde_coherente` lo completa). Se miden en `supabase/tests/medir-escala.sql` › «La cadena».
- La unidad y «dónde está» (6.02-3), `security definer` con el mismo acceso que la cadena: `logistica_unidad(p_vehiculo)` da `demorada`, `fuera_de_regla`
  con `faltan` (los bloqueantes sin cumplir de su fase) y `movida` (la última fila de `historial_fases`, sin la nota); inexistente, papelera o sin acceso, un
  solo 42501 hint `acceso`. `logistica_donde_esta(p_buscar, p_tope)` busca hasta 10 por título, VIN o lote (trigramas, hasta 1.000 candidatas y las propias por
  `vehiculos_creador_idx`) sólo en orígenes con la regla `logistica` activa; corto o sin orígenes, vacío. `notas_vehiculo_vivas_idx` sostiene la lista de notas (6.04).
- Una fase con historial no se elimina: se jubila (`activa = false`) y sale de los destinos. `fase_eliminar(p_fase, p_actualizado_en_esperado)` (5.01-2) toma la fase `for update` antes de contar (espera al cambio de fase en curso que entra o sale) y aplica `_fase_uso()`, la misma regla que lee `fase_impacto(p_fase)`: con unidades (también en la papelera) o historial jubila; sin ellos borra; con esperas → `23503`; la única inicial activa → `23514` (hint `es_inicial`); ya jubilada con uso → `22023`. Devuelve `{accion: jubilada|eliminada, version}`. Los conteos de `_fase_uso` llegan como tope + 1 (50 → 51): la app los pasa por `conteoAcotado(n, 50)`. Un cambio de fase hacia una fase que se está borrando recibe el `23503` de la FK.
- `fase_mover(p_fase, p_actualizado_en_esperado, p_despues_de)` renumera todas las fases del flujo (también las jubiladas) de 10 en 10, sin `orden` repetido, y sólo escribe `orden`. `fase_reactivar(p_fase, p_actualizado_en_esperado)` valida las reglas del flujo sobre la fila (`23514` con el campo en `hint`) y sólo escribe `activa`.
- `revisar_flujo(p_flujo)` (5.12-1, plpgsql `security definer`) sólo responde a quien configura el flujo (`puede_configurar_flujo`): a los demás, inexistente o
  nulo, cero filas y sin error. Devuelve `{nivel, codigo, mensaje, fase_id}` sin orden prometido (lo ordena la pantalla). Códigos: error `sin_inicial`; aviso `sin_salida`,
  `inalcanzable`, `orden_duplicado`, `contenedor_inalcanzable`, `espera_jubilada`, `espera_cruzada`, `rol_sin_personas` (fase o salida limitadas a roles donde ninguno
  tiene persona activa: `activo and not bloqueado`), `tipo_documento_inactivo`, `salida_a_jubilada`; info `sin_bloqueantes`, `entrada_no_automatica` (sólo vehículos,
  espejo de `_vehiculo_fase_de_entrada`). Lo prueba `supabase/tests/flujos-revisar.sql` por `codigo` y `fase_id`. «Revisar» avisa y nunca impide guardar.
- Un requisito nace informativo; volverlo bloqueante muestra cuántas unidades quedan «fuera de regla» y pide confirmación.
- Las esperas se evalúan al entrar a la fase y nunca mueven en cascada.
- La versión de toda la configuración de un flujo es `flujos.actualizado_en`, y la mueve siempre hacia adelante el trigger `flujo_version()` (también dos veces en una transacción). Toda RPC de configuración (fases, y desde el 5.05, 5.07 y 5.10 transiciones, requisitos y reglas) llama `_flujo_para_editar(p_flujo uuid, p_actualizado_en_esperado timestamptz) returns flujos` antes de leer o escribir, y `_flujo_tocar(p_flujo uuid) returns timestamptz` al final, y devuelve ese valor. Firmas estables. El orden: inexistente → `PT409`; sin `puede_configurar_flujo` → `42501` (antes del candado: quien no puede no espera); `for no key update` (no frena el `key share` de las FK de `cambiar_fase`); versión distinta → `PT409`. `authenticated` no ejecuta los dos ayudantes.
- Las reglas del flujo (`flujos_reglas`, sin fila = apagada) se escriben sólo por `flujo_regla_cambiar(p_flujo, p_actualizado_en_esperado, p_regla, p_activa)` (5.10-1):
  forma (`22023`, hint `regla|activa`) → el contrato de versión → encender fuera del catálogo del ámbito → `22023` (`_flujo_regla_admitida`: repuestos sin `vitrina_web`,
  `portal_cliente` ni `aduana`) → apagar con uso → `23514` (hint `regla`). Una regla ya apagada no mira el uso; la versión se mueve siempre. La regla única del uso es
  `_flujo_regla_uso()`: las fases (también jubiladas) que la marcan y, en «esperas», los requisitos de espera de sus fases (tope 50 + 1); la leen
  `flujo_regla_impacto(p_flujo, p_regla)` (sin versión; ya apagada → `bloquea: false`) y el trigger `flujo_regla_apagar_validar`, que también frena a `service_role` y deja
  pasar el borrado en cascada del flujo. `authenticated` no tiene `insert`, `update` ni `delete` sobre `flujos_reglas`. Hasta el 5.07, un requisito de espera creado a la
  vez que se apaga «esperas» puede quedar vivo con la regla apagada (D11 del 5.10-1): por eso una regla ya apagada no bloquea.
- La oferta de transporte (`flujos_transporte_oferta`, 5.10-2) se escribe sólo por `flujo_oferta_guardar(p_flujo, p_actualizado_en_esperado, p_puertos_origen,
p_puertos_destino, p_navieras)`: reemplazo todo o nada; forma (`22023`: elemento nulo o más de 200 por lista, hint el arreglo) → el contrato de versión → regla
  «transporte» apagada → `23514` (hint `transporte`) → un id inexistente → `23503` (hint el arreglo). Repetidos se colapsan; un puerto o una naviera inactivos se
  aceptan. Lista vacía = se ofrece todo; filtra lo ofrecido, nunca invalida lo guardado; apagar «transporte» no la borra. La lee `flujo_oferta(p_flujo)` (`security
invoker`, cualquiera que lea el flujo). Sin PK: la unicidad la dan dos índices parciales (el aviso INFO `no_primary_key` es esperado). `authenticated` no la escribe.
- La versión cruza como texto ISO tal cual (microsegundos), nunca por un `Date` de JS: se quedaría en milisegundos y daría `PT409` en cada guardado.
- La configuración no se escribe directo: `authenticated` no tiene `insert` ni `update` sobre `fases` ni `update` sobre `flujos` (5.01-1). Crear y guardar una fase: `fase_crear(p_id, p_flujo, p_actualizado_en_esperado, p_datos)` y `fase_guardar(p_fase, p_actualizado_en_esperado, p_cambios)`, con lista cerrada de claves (`22023` con la clave en `hint`), validaciones con el campo en `hint`, reglas del flujo (`23514`) y únicos con mensaje humano (`23505`).

## Ojo

- Clave de dato nueva = caso en `_requisito_dato_cumplido()` **y** en `claves_dato_requisito()`, o la UI la ofrece y la RPC la rechaza.
- `fases.demora_dias`: NULL hereda `ajustes_empresa.demora_dias_default`, 0 apaga la alerta. Un solo lector del umbral (`alertas_demora`).
- El vehículo nace en la fase inicial **sólo si no hay nada que decidir** (`vehiculo_crear`: exactamente una inicial activa, que no pide nota, sin requisitos bloqueantes pendientes ni roles que excluyan a quien crea), con su fila en `historial_fases` (`de_fase_id` nulo). Si no, nace sin fase y la primera transición explícita (`cambiar_fase`) lo pone en una inicial. Entrar al nacer no pide `flujos.mover`.
- Un origen recién creado tiene flujo y reglas pero **ninguna fase**: `leerFasesDeOrigen()` devuelve una lista vacía.
- `flujos.activo` no lo lee nadie ni lo edita ninguna pantalla (5.13): no filtres por él sin decidir qué apaga.
