# flujos

Motor único de flujos: fases, transiciones, requisitos (documento | dato | espera), roles por fase y transición, reglas por flujo, jubilar/eliminar, revisión de coherencia y la RPC `cambiar_fase` que mueve vehículos y repuestos.

Toda la configuración se escribe por RPC con la versión del flujo. Abiertos (`docs/PENDIENTES.md`): **6-4** (requisito de dato con su regla apagada), **8-13a**.

## Entra y sale

- Entra: configuración del dueño en `/configuracion/flujos` (un flujo por origen + el de repuestos); llamadas a mover desde `logistica` y `repuestos`.
- Sale por `index.ts`: `leerFasesDeOrigen(origenId)` → `FaseResumen[]` (id, nombre, color, orden, inicial, final, activa; también las jubiladas), que usa
  `vehiculos` para mostrar y filtrar la fase. Del área `mover`: `leerFlujoDeOrigen(origenId)` → `FlujoDeOrigen | null` (`flujoId`, `reglasActivas` y por fase
  `notaObligatoria`, `permiteContenedor`, `permiteAduana`, `demoraDias`; error visible si una lista llega al tope) y `reglaActiva(flujo, regla)`. Por `client.ts`,
  sus tipos y `reglaActiva`.
- **Mover**, por `client.ts`: las actions `leerParaMover`, `previsualizarCambio`, `previsualizarCambioLote`, `cambiarFase`, `cambiarFaseLote`,
  `destinosDeLaFase` (las salidas de una fase, sin vista previa) y `ganarLaSubasta` («La ganamos»: `vehiculo_subasta_ganada`, que mueve con
  `cambiar_fase` hacia una fase que no es la subasta y anota la subasta ganada, todo o nada; sólo vehículos). Cada destino trae `esSubasta`. Exigen `flujos.mover` o `flujos.mover.cualquiera` en el origen y la base decide otra vez.
  `leerParaMover`, `previsualizarCambio` y `cambiarFase` aceptan `vehiculo` **o** `repuesto` (`unidadDelPedido` → `unidad: { tipo, … }`; `origenId` sólo para
  vehículo); un ítem se mueve con `repuestos.mover` global (`puedeMoverUnRepuesto`), nunca con `flujos.mover`. `destinosDeLaFase` y el lote son sólo de vehículo.
  Reglas puras: `estadoDelBoton`, `textoDelBoton`, `motivoLegible`, `etiquetaDeRequisito`, `detalleDeRequisito`, `anclaDeRequisito`. Lo consume `logistica`.
- El flujo de repuestos (`ambito = 'repuestos'`, sin origen) viene en la base, sin fases y con sus 7 reglas; las fases las siembra `seed.sql` o se crean en «Fases».
- Depende de: `origenes`.

## Archivos clave

- `entities/fase.ts` (`FaseResumen`, `fasesDesde()`), `infra/queries/fases.ts` (`getFasesDeOrigen()`), `areas/nucleo/composicion.ts`.
- `features/configuracion/` (núcleo): `<PantallaDelFlujo>` (Server Component async, por `pantallas/configuracion.ts`), el selector, la lista de fases y el
  inspector por fase.
- `/configuracion/flujos` recibe de `src/app` los orígenes (`getOrigenes(true)`) y los roles (`leerRolesParaElegir()`): `flujos` no importa `origenes` ni
  `equipo`. `?fase=` lo lee `useFaseAbierta()` (un id ajeno al flujo se ignora). `useVersionDelFlujo()` (dentro de `<ProveedorDelFlujo>`) da la `version` y
  `avisarConflicto()`; no sale por `client.ts`.
- **Huecos** (`HuecosDelFlujo`): `franjaDeRevisar`, `accionesDeLaLista`, `accionesDeFila`, `salidasDeFila` y `bloques.datos|salidas|requisitos` del inspector.
  Son componentes de cliente opcionales que se registran en `src/app/(app)/configuracion/flujos/huecos.ts`. El inspector está en `drawers-con-salida.ts` con el
  formulario de «Datos» (`formulario-de-datos-de-la-fase.tsx`, mecanismo `contexto`).

## Áreas

El módulo se parte por área (`scripts/guardas/areas-de-flujos.test.ts`): el **núcleo** (`areas/nucleo/`, `entities/flujo.ts`, `entities/fase.ts`,
`infra/queries/`, `features/configuracion/`) y siete áreas: `fases`, `transiciones`, `requisitos`, `reglas`, `documentos`, `revisar` y `mover`. Un área vive en
`features|entities|infra/<área>/`, `areas/<área>/{index,client,composicion}.ts` y `pantallas/<área>.ts`.

- `index.ts`, `client.ts` y `composicion.ts` de la raíz sólo hacen `export *` del núcleo y de cada área. Lo nuevo va en `areas/<su área>/`, nunca en la raíz.
- Un área importa lo suyo y el núcleo, nunca otra área; el núcleo no importa ningún área; adentro nadie importa la raíz. Lo que dos áreas comparten va al núcleo.
- Un nombre exportado repetido entre dos áreas es un error de `tsc`.

## Transiciones y quién mueve

- `pantallas/transiciones.ts` da `<BloqueDeSalidas>` (`bloques.salidas`, recibe `{flujo, fase, roles}`) y `<SalidasDeLaFila>` (`salidasDeFila`).
- Cinco actions (`crearTransicion`, `guardarTransicion`, `eliminarTransicion`, `ponerRolesDeFase`, `ponerRolesDeTransicion`) comprueban `flujos.configurar` o
  `repuestos.configurar`, llaman su RPC (el `hint` es el campo) y revalidan la ruta.
- Sólo quitar vive en la URL: `?eliminar=salida&salida=<id>` (en `scripts/guardas/areas-b/confirmar-con-url.ts`). La clave `eliminar` la comparten requisitos
  y agenda: cada hook abre sólo con su valor.
- Editar una salida: un solo «Guardar» manda primero acción y nota y luego los roles, **el segundo con la versión que devolvió el primero**. `alternarRol` toca
  sólo ese id y conserva los que no se muestran. Todo cuelga de `useSalidasDeLaFase`: una escritura a la vez. Limitar a un rol que quien configura no tiene no
  avisa (acota, no otorga).
- `quienMueve(flujo, de, a)` (`entities/transiciones/quien-mueve.ts`): espejo de `_puede_mover` sin permisos, sólo UX; la lista de la salida manda sobre la de
  la fase destino; sin listas, cualquiera con el permiso. El candado es `cambiar_fase`. Reintentar «Agregar salida» reusa el id: «ya existe» sobre `id` = hecho.

## Mover

- `entities/mover/` (puro: Zod de lo que devuelven las RPC, una etiqueta por clave de dato —`requisitos.test.ts` la compara con `claves_dato_requisito`—, la
  frase de cada rechazo, el estado del botón), `infra/mover/{mover,destinos}.ts` (destinos con `tope + 1`).
- **El rechazo llega como campo:** `porCampo: { <hint>: mensaje }` con `conflicto`, `requisitos`, `rol`, `nota`, `transicion` o `acceso`. El `PT409` conserva
  el texto de la base, que nombra a quien movió.
- `leerParaMover` junta `logistica_unidad`, los destinos (hasta 12) y una vista previa por destino en paralelo; la que falla dice su error sin tumbar a las
  demás. `cambiarFase` no revalida: la pantalla se repinta con `router.refresh()`.
- Un ítem de repuesto se lee de `repuestos_items` bajo la RLS (`logistica_unidad` es sólo de vehículo): sin «fuera de regla» ni «quién la movió», con vista
  previa por destino (`previsualizar_cambio_fase(p_repuesto)`); sus destinos salen del flujo de repuestos. 8-13a.

## Documentos

- `?seccion=documentos` de `/configuracion/flujos` (`pantallas/documentos.ts`: `<PantallaDeDocumentos>`, `<EsqueletoDeTipos>`): dos grupos de
  `tipos_documento`, los de la empresa (`flujo_id` nulo; `logistica.catalogos.gestionar`) y los del flujo (`flujos.configurar` o `repuestos.configurar`; el
  origen lo decide la base). Quien no puede cambiar un grupo lo ve con «Nuevo tipo», «Editar» y el orden apagados y el motivo.
- `entities/documentos/` valida espejo de la base (probado contra PGlite); escriben `tipo_documento_crear|guardar|mover|eliminar`.
  `leerTiposDeDocumento` y `leerUsoDeTiposDeDocumento` salen por el `index.ts` del área.
- **La lista se relee, no se siembra:** cada action comprueba `puede()` con el `flujoId` del grupo y revalida `RUTAS.configuracionDeFlujos`. El uso
  (`tipos_documento_con_uso`, acotado a 50) sólo se pide a quien puede cambiar el grupo (a los demás, `42501`).
- URL: `?panel=nuevo-tipo&de=empresa|flujo`, `?panel=editar-tipo&tipo=<id>`, `?panel=eliminar-tipo&tipo=<id>`. Lo que la URL pide y no se puede abrir se avisa
  y se limpia. Con uso, «Eliminar» está apagado: se desactiva.

## Fases

- Se escriben por RPC: `fase_crear|guardar|mover|eliminar|reactivar` y `fase_impacto` (`infra/fases/`); el `hint` vuelve como campo del formulario. Las
  actions exigen `flujos.configurar` en el origen (o `repuestos.configurar` si `origenId` es nulo) y revalidan configuración y vehículos. Repetir el id de un
  intento de crear da «Esa fase ya existe.».
- `entities/fases/reglas-de-fase.ts` es el espejo puro de `_fase_validar()` (`validarFase`, `motivoDelInterruptor`; lo prueba
  `reglas-de-fase-contra-la-base.test.ts` en PGlite). `cambiosParaGuardar` manda sólo lo que cambió. Colores: paleta cerrada.
- **La lista:** `pantallas/fases.ts` da `<AccionesDeLaLista>` y `<AccionesDeFila>` (Editar, Jubilar o eliminar, Reactivar). URL `?panel=nueva-fase` y
  `?panel=eliminar-fase&quitar=<id>` (en `scripts/guardas/areas-b/confirmar-con-url.ts`). La confirmación lee `fase_impacto` al abrirse; una bloqueada se
  explica y no se confirma. `useListaDeFases` escribe una a la vez con la `version`; `PT409` → `avisarConflicto()`. El selector sólo ofrece flujos configurables.
- **Inspector › Datos:** `<DatosDeLaFase>` (`bloques.datos`), cinco `<Bloque>`s con `<InterruptorConMotivo>` (la regla apagada lo deshabilita).
  `useFormularioDeDatos` manda a `fase_guardar` sólo `cambiosParaGuardar`, borrador `fase-<id>` en `sessionStorage`; se reinicia con `key` (`fase.id` + versión).
  «En el flujo» lleva «Es la subasta» (`fases.es_subasta`, la **fase de subasta**): sólo en el flujo de un origen de tipo subasta
  (`FlujoParaConfigurar.origenEsSubasta`, del tipo del origen embebido; fuera, apagado con `motivoDeEsSubasta`) y nunca con «Es final». Puede haber
  varias. La lee `vehiculos` para calcular la situación del vehículo.
- Nada de esta área sale por `index.ts` ni `client.ts`.

## Requisitos

- `pantallas/requisitos.ts` da `<BloqueDeRequisitos>` (`bloques.requisitos`); escriben `requisito_crear|guardar|mover|eliminar`.
- **`entities/requisitos/claves.ts` es espejo de `claves_dato_requisito(ámbito)`** (`claves.test.ts` lo compara con el SQL vigente): una clave nueva sin
  etiqueta rompe la prueba. Sólo `pagos.umbral_pct` lleva `config.pct`. Apagan claves (por prefijo) las reglas `transporte`, `aduana` y `pagos`.
- **El hueco es de cliente y sólo recibe `{flujo, fase}`:** los nombres los pide `leerOpcionesDeRequisitos({flujoId, ambito})` una vez por flujo (un minuto
  en `memoriaDeLectura`), con las fases activas del otro ámbito (hasta 1.000). Cada escritura revalida y manda la versión; `PT409` → `avisarConflicto()`.
- Actions `crearRequisito` (unión por `tipo`) y `guardarRequisito` (sólo lo que cambió; `null` vacía; `bloqueante` solo lo manda el interruptor, nunca el
  formulario), con el `ambito` y `flujos.configurar` o `repuestos.configurar`. `requisito_crear` pone el `espera_ambito`. Los tipos de documento se leen aparte
  (no de `documentos`).
- URL: `?agregar=nuevo&forma=elegir|dato|documento|espera`, `?editar=requisito&requisito=<id>`, `?eliminar=requisito&quitar=<id>`
  (`entities/requisitos/vista-de-fase.ts`; en `scripts/guardas/areas-c/confirmar-con-url.ts`).
- **Bloqueante:** `leerImpactoDeRequisito` (`requisito_impacto`) alimenta `useBloqueanteDeRequisito`; aviso en línea (`<ConfirmarBloqueo>`). **Fuera de regla:**
  `leerFueraDeRegla` (`flujo_fuera_de_regla`, `tope + 1`) sale por `areas/requisitos/index.ts`; lo lee `src/app/(app)/configuracion/flujos/requisitos/fuera-de-regla.tsx`
  (títulos con `leerTitulosDeVehiculos` de `vehiculos`, `href` con `FILTRO_FASE`) y lo entrega a `PantallaDelFlujo` por `sobreLaLista`, una **prop de
  servidor** tras su `<Suspense fallback={null}>`. `?panel=fuera-de-regla`, registrado `sinFormulario` en `scripts/guardas/areas-c/drawers-con-salida.ts`; las
  dos RPC en `areas-c/paginas-en-la-base.ts` (defecto 50).

## Revisar

- `pantallas/revisar.ts` da `<FranjaDeRevisar>` (`franjaDeRevisar`). Cerrada, el resumen («Todo en orden», «1 error y 3 avisos»; información no cuenta);
  abierta, la lista error › aviso › información. **Nace cerrada siempre** y cambiar de flujo la cierra (`key` por `flujo.id`).
- `revisar_flujo` con tope 200 y `<AvisoDeTope>`; `leerAvisosDeRevisar({flujoId, ambito})` exige `flujos.configurar` o `repuestos.configurar`.
- **Se relee por `flujo.version`:** `useAvisosDeRevisar` conserva lo último leído y descarta respuestas viejas. Va fuera de `<ProveedorDelFlujo>`.
- Un aviso abre su fase con un botón «Abrir la fase» (`useFaseAbierta().abrir()`), ni `<AbrirResumen>` ni `<Link>`: los specs vecinos buscan
  `[data-abre-resumen]` y enlaces por nombre sin acotar a una región. «Revisar» no frena nada.

## Reglas

- `?seccion=reglas` (`pantallas/reglas.ts`: `<PantallaDeReglas>`, `<EsqueletoDeReglas>`): las reglas del ámbito con su interruptor y, con «Transporte»
  encendida, la oferta (puertos de origen, de destino y navieras activos). La ve quien configura (`flujos.configurar` o `repuestos.configurar`).
- `entities/reglas/catalogo.ts`: las 10 claves con su texto, comparadas en un test con el check de la base y `_flujo_regla_admitida`.
- **Apagar pregunta antes de escribir:** `cambiarRegla` llama `flujo_regla_impacto`; con uso responde `en_uso` y no escribe. «Deshacer» y las escrituras usan la
  **última versión conocida** (`useEscrituraDeReglas`), no la del toast. El borrador de la oferta lleva `key` por la firma de lo guardado.
- Puertos y navieras sólo se **leen** (los gestiona `logistica`); sin navieras, la pantalla lo dice.

## Tablas

`flujos`, `flujos_reglas`, `fases`, `fases_transiciones`, `fases_roles`, `fases_transiciones_roles`, `tipos_documento`, `fases_requisitos`, `historial_fases`, `flujos_transporte_oferta`.
RPC: `cambiar_fase`, `cambiar_fase_lote`, `previsualizar_cambio_fase`, `previsualizar_cambio_fase_lote`, `revisar_flujo`, `fase_crear`, `fase_guardar`, `fase_mover`, `fase_impacto`, `fase_eliminar`, `fase_reactivar`, `requisito_crear`, `requisito_guardar`, `requisito_mover`, `requisito_eliminar`, `requisito_impacto`, `flujo_fuera_de_regla`, `claves_dato_requisito`, `flujo_regla_impacto`, `flujo_regla_cambiar`, `flujo_oferta_guardar`, `flujo_oferta`, `logistica_cadena`, `logistica_cadena_columna`, `logistica_unidad`, `logistica_donde_esta`.

## No se rompe

- `cambiar_fase` es la única que **mueve** (`fase_id` de vehículos e ítems). Orden: acceso (`puede_unidad(…, 'logistica.ver', 'repuestos.ver')`, antes del
  candado) → `for no key update` de la unidad → `previsualizar_cambio_fase` en una sentencia nueva → fase esperada distinta → `PT409` de `_fase_conflicto`
  («Rosa Mamani la movió a «X» hace 1 min.», «La moviste… desde otra ventana.», «Otra persona…»; sin «Recarga») → rechazos `23514` → nota → historial + nota
  - actividad. Todo rechazo lleva su código en `hint`: `acceso` y `unidad` (42501 / 22023, un solo texto exista o no), `conflicto`, `transicion`, `rol`,
    `requisitos`, `nota`; la vista previa los trae en `codigos`, alineado con `motivos`. La esperada nula vale sólo sin fase. Mover no toca
    `vehiculos.actualizado_en` ni audita `vehiculos.update` (consta como `unidad.fase_cambiada`).
- `cambiar_fase_lote(p_unidades jsonb, p_fase_destino, p_nota)`: 1–200 `{vehiculo, fase_esperada}` (mal formado o repetido → `22023` hint `p_unidades`, sin
  mover nada); mueve en orden de id, devuelve en el de entrada `{vehiculo_id, ok, codigo, motivo, historial_id}`; sólo atrapa PT409, 23514, 42501 y 22023.
  `previsualizar_cambio_fase_lote(p_vehiculos uuid[], p_fase)`, invocadora, ≤ 200. `evaluar_requisitos` y `unidad_llego_a_fase` no son de `authenticated` (las
  llaman `definer` que ya miraron el acceso); el `detalle` de un requisito trae `tipo_documento_id` o `clave_dato`.
- Quitar lo que pide la fase actual (un documento, la declaración, el transporte, un pago confirmado, un gasto de tributos) toma la unidad `for share` antes
  de mirar la fase: espera y hace esperar a `cambiar_fase`. Lo prueban las carreras de `supabase/tests/areas/{aduana,dinero}/`.
- La cadena: `logistica_cadena(p_origen, p_tope, p_filtros)` y `logistica_cadena_columna(p_origen, p_fase, p_desde, p_id, p_tope, p_filtros)` son `security
definer` (las policies de `transportes` y `documentos` preguntan por fila): alcance = el menor de `logistica.ver` y `vehiculos.ver` del origen
  (`_logistica_alcance`, una vez; sin él 42501 hint `acceso`); toda consulta empieza por `origen_id` y fuera de la papelera. Cuatro consultas fijas en
  `_logistica_columna` sobre `vehiculos_cadena_idx (origen_id, fase_id, fase_desde, id)`; «Sin fase» es `fase_id` nulo (check
  `vehiculos_fase_desde_coherente`: `fase_desde` existe si y sólo si hay fase; lo completa `trg_0_fase_desde_coherente`). Se miden en
  `supabase/tests/medir-escala.sql` › «La cadena».
- `logistica_unidad(p_vehiculo)` (definer, mismo acceso) da `demorada`, `fuera_de_regla` con `faltan` (bloqueantes sin cumplir de su fase) y `movida` (última
  fila de `historial_fases`, sin la nota); inexistente, papelera o sin acceso: un solo 42501 hint `acceso`. `logistica_donde_esta(p_buscar, p_tope)` busca hasta
  10 por título, VIN o lote (trigramas, hasta 1.000 candidatas y las propias por `vehiculos_creador_idx`) sólo en orígenes con la regla `logistica`; corto o
  sin orígenes, vacío. `notas_vehiculo_vivas_idx` sostiene la lista de notas.
- Una fase con historial no se elimina: se jubila (`activa = false`) y sale de los destinos. `fase_eliminar(p_fase, p_actualizado_en_esperado)` toma la fase
  `for update` antes de contar y aplica `_fase_uso()`, la misma regla que lee `fase_impacto(p_fase)`: con unidades (también en la papelera) o historial jubila;
  sin ellos borra; con esperas → `23503`; la única inicial activa → `23514` (hint `es_inicial`); ya jubilada con uso → `22023`. Devuelve `{accion:
jubilada|eliminada, version}`. Los conteos de `_fase_uso` llegan como tope + 1 (51): la app usa `conteoAcotado(n, 50)`. Mover hacia una fase que se está
  borrando recibe el `23503` de la FK.
- `fase_mover(p_fase, p_actualizado_en_esperado, p_despues_de)` renumera todas las fases del flujo (también jubiladas) de 10 en 10 y sólo escribe `orden`.
  `fase_reactivar(p_fase, p_actualizado_en_esperado)` valida las reglas del flujo (`23514` con el campo en `hint`) y sólo escribe `activa`.
- `revisar_flujo(p_flujo)` (`security definer`) sólo responde a quien configura el flujo (`puede_configurar_flujo`); a los demás, cero filas sin error. Devuelve
  `{nivel, codigo, mensaje, fase_id}` sin orden. Códigos: error `sin_inicial`; aviso `sin_salida`, `inalcanzable`, `orden_duplicado`,
  `contenedor_inalcanzable`, `espera_jubilada`, `espera_cruzada`, `rol_sin_personas` (roles sin persona `activo and not bloqueado`),
  `tipo_documento_inactivo`, `salida_a_jubilada`, `sin_fase_de_subasta` (origen de subasta sin ninguna fase con `es_subasta`, activa o jubilada: nada
  figura «Sin resolver»); info `sin_bloqueantes`, `entrada_no_automatica` (sólo vehículos, espejo de `_vehiculo_fase_de_entrada`).
  Lo prueba `supabase/tests/flujos-revisar.sql`. Avisa y nunca impide guardar.
- Un requisito nace informativo; volverlo bloqueante muestra cuántas unidades quedan «fuera de regla» y pide confirmación.
- Las esperas se evalúan al entrar a la fase y nunca mueven en cascada.
- La versión de toda la configuración es `flujos.actualizado_en`; la mueve siempre hacia adelante el trigger `flujo_version()` (también dos veces en una
  transacción). Toda RPC de configuración llama `_flujo_para_editar(p_flujo uuid, p_actualizado_en_esperado timestamptz) returns flujos` antes de leer o
  escribir y `_flujo_tocar(p_flujo uuid) returns timestamptz` al final, y devuelve ese valor (firmas estables). Orden: inexistente → `PT409`; sin
  `puede_configurar_flujo` → `42501` (antes del candado); `for no key update` (no frena el `key share` de las FK de `cambiar_fase`); versión distinta → `PT409`.
  `authenticated` no ejecuta los dos ayudantes.
- `flujos_reglas` (sin fila = apagada) se escribe sólo por `flujo_regla_cambiar(p_flujo, p_actualizado_en_esperado, p_regla, p_activa)`: forma (`22023`, hint
  `regla|activa`) → versión → encender fuera del catálogo del ámbito → `22023` (`_flujo_regla_admitida`: repuestos sin `vitrina_web`, `portal_cliente` ni
  `aduana`) → apagar con uso → `23514` (hint `regla`). Una regla ya apagada no mira el uso (puede quedar un requisito de espera vivo con la regla apagada); la
  versión se mueve siempre. El uso es `_flujo_regla_uso()`: fases (también jubiladas) que la marcan y, en «esperas», sus requisitos de espera (tope 50 + 1); lo
  leen `flujo_regla_impacto(p_flujo, p_regla)` (sin versión) y el trigger `flujo_regla_apagar_validar`, que frena también a `service_role` y deja pasar el
  borrado en cascada del flujo. `authenticated` no escribe `flujos_reglas`.
- `flujos_transporte_oferta` se escribe sólo por `flujo_oferta_guardar(p_flujo, p_actualizado_en_esperado, p_puertos_origen, p_puertos_destino, p_navieras)`:
  reemplazo todo o nada; forma (`22023`: elemento nulo o más de 200 por lista) → versión → regla «transporte» apagada → `23514` (hint `transporte`) → id
  inexistente → `23503` (hint el arreglo). Repetidos se colapsan; inactivos se aceptan. Vacía = se ofrece todo; filtra lo ofrecido, nunca invalida lo guardado;
  apagar «transporte» no la borra. La lee `flujo_oferta(p_flujo)` (`security invoker`). Sin PK: dos índices parciales (el INFO `no_primary_key` es esperado).
- La versión cruza como texto ISO tal cual (microsegundos), nunca por un `Date` de JS: se quedaría en milisegundos y daría `PT409` en cada guardado.
- `authenticated` no tiene `insert` ni `update` sobre `fases` ni `update` sobre `flujos`. `fase_crear(p_id, p_flujo, p_actualizado_en_esperado, p_datos)` y
  `fase_guardar(p_fase, p_actualizado_en_esperado, p_cambios)`: lista cerrada de claves (`22023` con la clave en `hint`), validaciones con el campo en `hint`,
  reglas del flujo (`23514`) y únicos con mensaje humano (`23505`). `es_subasta` fuera del flujo de un origen de subasta → `23514` (hint `es_subasta`,
  también en el trigger `fase_validar` sin hint; `_flujo_de_subasta()`); con `es_final` → `22023` (hint `es_subasta`). Lo prueba
  `supabase/tests/areas/flujos/fases-subasta.sql`.

## Ojo

- Clave de dato nueva = caso en `_requisito_dato_cumplido()` **y** en `claves_dato_requisito()`, o la UI la ofrece y la RPC la rechaza.
- `fases.demora_dias`: NULL hereda `ajustes_empresa.demora_dias_default`, 0 apaga la alerta. Un solo lector del umbral (`alertas_demora`).
- El vehículo nace en la fase inicial **sólo si no hay nada que decidir** (`vehiculo_crear`: exactamente una inicial activa, que no pide nota, sin requisitos bloqueantes pendientes ni roles que excluyan a quien crea), con su fila en `historial_fases` (`de_fase_id` nulo). Si no, nace sin fase y la primera transición explícita (`cambiar_fase`) lo pone en una inicial. Entrar al nacer no pide `flujos.mover`.
- Un origen recién creado tiene flujo y reglas pero **ninguna fase**: `leerFasesDeOrigen()` devuelve una lista vacía.
- `flujos.activo` no lo lee nadie ni lo edita ninguna pantalla: no filtres por él sin decidir qué apaga.
