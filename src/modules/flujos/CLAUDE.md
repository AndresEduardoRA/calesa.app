# flujos

Motor único de flujos: fases, transiciones, requisitos (documento | dato | espera), roles por fase y transición, reglas por flujo, jubilar/eliminar, revisión de coherencia y la RPC `cambiar_fase` que mueve vehículos y repuestos.

## Entra y sale

- Entra: configuración del dueño en `/configuracion/flujos` (un flujo por origen + el de repuestos); llamadas a mover desde `logistica` y `repuestos`.
- Sale hoy por `index.ts`: `leerFasesDeOrigen(origenId)` → `FaseResumen[]` (id, nombre, color, orden, inicial, final, activa; también las jubiladas). Por `client.ts`: el tipo `FaseResumen`. Lo consume `vehiculos` para mostrar la fase y filtrar por ella. Del área `mover` (6.01): `leerFlujoDeOrigen(origenId)` → `FlujoDeOrigen | null` (`flujoId`, `reglasActivas`, y por fase `notaObligatoria`, `permiteContenedor`, `permiteAduana`, `demoraDias`; error visible si una lista llega al tope) y `reglaActiva(flujo, regla)`; por `client.ts`, sus tipos y `reglaActiva`. Lo consume el panel de la unidad de `logistica`.
- Saldrá con su fase del plan (todavía no existe): `transicionesDisponibles()`, `previsualizarCambio()`, `cambiarFase()`, `cambiarFaseLote()`, `<BadgeFase>`. Lo consumirán `logistica`, `repuestos`, `web` (fases públicas).
- El flujo de repuestos lo garantiza una migración (`fases_flujo_de_repuestos`, 5.01-2): sin fases y con sus 7 reglas; las fases las siembra `seed.sql` o se crean en «Fases».
- Depende de: `origenes`.

## Archivos clave

- `entities/fase.ts` — `FaseResumen`, `fasesDesde()`. `infra/queries/fases.ts` — `getFasesDeOrigen()`. `areas/nucleo/composicion.ts`.
- Todavía no existen (fases 5 y 6 del plan): `entities/transiciones.ts` — máquina de estados pura (espejo de `_puede_mover`), sólo para UX; la RPC es el candado.
- `entities/revisar.ts` — tipos de los avisos de `revisar_flujo()` (sin salida, inalcanzable, esperas cruzadas, roles que nadie tiene).
- `features/configuracion/` (núcleo, 5.02: `<PantallaDelFlujo>` —Server Component async, por `pantallas/configuracion.ts`—, el selector, la lista de fases y el inspector por fase; sólo la lista, sin «camino» ni «historial», D2). `entities/selector-de-flujos.ts` y `lectura-de-fase.ts` son los textos puros.
- La pantalla `/configuracion/flujos` (`src/app/(app)/configuracion/flujos/`) recibe de `src/app` los orígenes (`getOrigenes(true)`) y los roles (`leerRolesParaElegir()`): `flujos` no importa `origenes` ni `equipo`. `?fase=` lo lee `useFaseAbierta()`: un id que no es de una fase del flujo se ignora. `useVersionDelFlujo()` (dentro de `<ProveedorDelFlujo>`) entrega la `version` y `avisarConflicto()`; no sale por `client.ts` (D20).
- **Huecos** (`HuecosDelFlujo`, 5.02): `franjaDeRevisar`, `accionesDeLaLista`, `accionesDeFila`, `salidasDeFila` y `bloques.datos|salidas|requisitos` del inspector. Son **componentes de cliente** opcionales; cada área suma su línea en `src/app/(app)/configuracion/flujos/huecos.ts` al llenarlos. El inspector está registrado en `drawers-con-salida.ts` como `sinFormulario`: el paso que le ponga un formulario lo pasa a `formulario`.

## Áreas (5.02)

El módulo se parte por área, como `cotizaciones` (`scripts/guardas/areas-de-flujos.test.ts` lo vigila): el **núcleo** (`areas/nucleo/`, `entities/flujo.ts`, `entities/fase.ts`,
`infra/queries/`, `features/configuracion/`) y siete áreas con sus lugares: `fases`, `transiciones`, `requisitos`, `reglas`, `documentos`, `revisar` y `mover`. Un área vive en
`features|entities|infra/<área>/`, `areas/<área>/{index,client,composicion}.ts` y `pantallas/<área>.ts`; nace vacía y la llena su paso (`docs/plan.yaml`, `dueno_de`).

- `index.ts`, `client.ts` y `composicion.ts` de la raíz sólo hacen `export *` del núcleo y de cada área. Lo nuevo va en `areas/<su área>/`, nunca en la raíz.
- Un área importa lo suyo y el núcleo, nunca otra área; el núcleo no importa ningún área; adentro nadie importa la raíz. Lo que dos áreas comparten va al núcleo (lo decide el A).
- Un nombre exportado repetido entre dos áreas es un error de `tsc`.

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
- Nada de esta área sale por `index.ts` ni `client.ts`: los componentes de la pantalla (5.04-2 y 5.04-3) saldrán por `pantallas/fases.ts`.

## Tablas

`flujos`, `flujos_reglas`, `fases`, `fases_transiciones`, `fases_roles`, `fases_transiciones_roles`, `tipos_documento`, `fases_requisitos`, `historial_fases`, `flujos_transporte_oferta`.
RPC: `cambiar_fase`, `cambiar_fase_lote`, `previsualizar_cambio_fase`, `evaluar_requisitos`, `revisar_flujo`, `fase_crear`, `fase_guardar`, `fase_mover`, `fase_impacto`, `fase_eliminar`, `fase_reactivar`, `requisito_crear`, `requisito_guardar`, `requisito_mover`, `requisito_eliminar`, `requisito_impacto`, `flujo_fuera_de_regla`, `unidad_llego_a_fase`, `claves_dato_requisito`, `flujo_regla_impacto`, `flujo_regla_cambiar`, `flujo_oferta_guardar`, `flujo_oferta`.

## No se rompe

- `cambiar_fase` es la única que **mueve** (`fase_id` de vehículos e ítems de repuesto): secuencia viva → destino activo → transición o inicial → rol → requisitos bloqueantes → historial + nota + actividad, con `FOR UPDATE` y `PT409` si la fase esperada cambió.
- Una fase con historial no se elimina: se jubila (`activa = false`) y sale de los destinos. `fase_eliminar(p_fase, p_actualizado_en_esperado)` (5.01-2) toma la fase `for update` antes de contar (espera al cambio de fase en curso que entra o sale) y aplica `_fase_uso()`, la misma regla que lee `fase_impacto(p_fase)`: con unidades (también en la papelera) o historial jubila; sin ellos borra; con esperas → `23503`; la única inicial activa → `23514` (hint `es_inicial`); ya jubilada con uso → `22023`. Devuelve `{accion: jubilada|eliminada, version}`. Los conteos de `_fase_uso` llegan como tope + 1 (50 → 51): la app los pasa por `conteoAcotado(n, 50)`. Un cambio de fase hacia una fase que se está borrando recibe el `23503` de la FK.
- `fase_mover(p_fase, p_actualizado_en_esperado, p_despues_de)` renumera todas las fases del flujo (también las jubiladas) de 10 en 10, sin `orden` repetido, y sólo escribe `orden`. `fase_reactivar(p_fase, p_actualizado_en_esperado)` valida las reglas del flujo sobre la fila (`23514` con el campo en `hint`) y sólo escribe `activa`.
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
