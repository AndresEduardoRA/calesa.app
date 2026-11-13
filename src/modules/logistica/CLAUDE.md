# logistica

Operación diaria sobre el flujo: cadena por fase, mover con vista previa, documentos con aprobación y vencimiento, transporte (embarques y contenedores como grupos), declaraciones aduaneras, gastos y pagos, notas, alertas por demora y margen contra la cotización final.

La tarea de oro 3 la prueba `e2e/logistica-tarea-de-oro.spec.ts`. Abiertos (`docs/PENDIENTES.md`): **6-4**, **6-5** (medir `gastos_listar` y `pagos_listar`),
**6-6** (prorratear por valor), **6-7** (borrar una nota propia por RPC), **8-13b**.

## Entra y sale

- Entra: acciones de logística en `/logistica/*`, subida de documentos (también desde cámara), confirmación de pagos, cron de alertas.
- Sale (núcleo): `leerUnidad(id)` (la unidad de vehículo bajo la RLS de quien mira; nula si no existe, está en la papelera o no la ve; `titulo` =
  «<principal> · <título>» si el origen tiene campo principal y se puede leer: `features/nucleo/unidad-con-identidad.ts`), `huecosVisibles`,
  `ORDEN_DE_HUECOS`, `refDeUnidad`, los tipos de la unidad y de los huecos; por `pantallas/unidad.ts`, `<PanelDeLaUnidad>`.
- Área `cadena`: `leerCadena(origenId, filtros)` (columnas con la primera página de tarjetas nombradas por el campo principal), `dondeEsta(busqueda)`
  (hasta 10, en todos los orígenes de la persona; texto corto no llama a la base), `leerOrigenesDeLaCadena(permisos)` (las pestañas), `leerNavieras()`,
  `esquemaDeFiltrosDeLaCadena`, `pedidoDeLaCadena` y sus claves de URL (`origen`, `fase`, `q`, `demoradas`, `por_aprobar`, `contenedor`, `booking`, `naviera`).
- Área `alertas`: `bandejaLogistica(tope)` (demoradas, trabados y por aprobar de quien mira; una lectura de `logistica_bandeja` por request con `cache()`),
  `detalleDeDemorada` y `detalleDeTrabado`, para los bloques de Inicio de `tablero` (que arman su «Ver todas» con las claves de URL de `cadena`).
- Lo consumen `tablero`, `vehiculos` (ficha) y `web` (portal: fases y documentos visibles).
- Depende de: `vehiculos`, `origenes`, `empresa`, `flujos`, `cotizaciones`.

## Áreas

El módulo se parte por **área** (igual que `flujos` y `cotizaciones`). Un área vive en `features|entities|infra/<área>/`, `areas/<área>/{index,client,composicion}.ts`
y `pantallas/<área>.ts` (y `pantallas/<área>-<pantalla>.ts`). El **núcleo** (la unidad, el panel, sus huecos y la selección) es la carpeta `nucleo` de cada capa.
`index.ts`, `client.ts` y `composicion.ts` de la raíz sólo hacen `export *` del núcleo y de cada área. **Un área no importa otra y el núcleo no importa ningún
área** (`scripts/guardas/areas-de-logistica.test.ts`): lo compartido va al núcleo.

| Área         | Qué es                                                                                                              |
| ------------ | ------------------------------------------------------------------------------------------------------------------- |
| `nucleo`     | `Unidad`, `HuecoDeLaUnidad`, el panel de la unidad, el orden de sus huecos y la selección del lote                  |
| `cadena`     | el kanban por fase de `/logistica`: columnas con «Ver más», tarjeta, filtros en la URL y «dónde está»               |
| `mover`      | «Qué falta», mover con nota, notas, historial y el lote                                                             |
| `documentos` | subir, aprobar o rechazar, editar fechas, «Visible en el portal», eliminar y subir a un grupo                       |
| `transporte` | embarques y contenedores (hueco «Transporte», `/logistica/embarques`, «Editar grupo», catálogos Puertos y Navieras) |
| `aduana`     | declaraciones (hueco «Aduana», `/logistica/aduana`, alta, edición, composición y canal)                             |
| `dinero`     | gastos, pagos y margen (tres huecos, `/logistica/gastos`, prorratear, categorías de gasto, pagos de un proyecto)    |
| `alertas`    | alertas por demora y por vencimiento, bandeja en Inicio                                                             |

**Los huecos.** El panel no sabe qué lleva: cada área los declara en su `pantallas/` (`<área>-unidad.ts` → `HUECOS_DE_<ÁREA>_EN_LA_UNIDAD`; `<área>-grupo.ts`;
`<área>-enlace.ts`; `<área>-catalogos.ts`) y sólo `src/app` los junta. Un hueco se dibuja si la persona tiene alguna de sus claves **en el origen de la unidad**
y su regla de `flujos_reglas` está activa; el orden es `ORDEN_DE_HUECOS`, no el del archivo. Se monta al abrir su bloque (`BloqueDelHueco`). El panel exige
`logistica.ver` en el origen **y** que la RLS de `vehiculos` deje leer la fila: con sólo una, «No tienes permiso» o «ya no está disponible».

## Archivos clave

- **Cadena:** `useCadena` siembra por firma y pide una página a la vez por columna; la tarjeta es un enlace con `?vehiculo=`, nunca arrastrar.
- **Unidad de un ítem de repuesto.** El panel abre una `UnidadAbierta`: `Unidad` (`origenId: string`; la única que ven las áreas sólo de vehículos) o un ítem
  (`origenId` nulo, `proyecto?: { id, vehiculoId }`); `esUnidadDeVehiculo(u)` estrecha. Sólo `mover` y el núcleo tipan con `UnidadAbierta`. `repuestos` arma la
  unidad (`src/app/(app)/repuestos/item-abierto.tsx`); `logistica` no importa `repuestos`. Un hueco declara su variante `repuesto?: { permisos, regla, componente? }`
  (sin `componente` no dibuja nada; el `componente` del hueco nunca recibe un ítem); sin variante no se dibuja para un ítem (Aduana, Gastos, Pagos, Margen).
  `huecosVisibles({ tipo: 'repuesto', origenId: null })` filtra por `repuestos.ver` global; el filtro de tipo va antes de descartar repetidos. El transporte de un
  ítem lo dibuja el núcleo (`pantallas/unidad-item.ts`, `textoDelTransporteDelItem`; 8-13b).
- **Hueco «Repuestos»:** en `ORDEN_DE_HUECOS` entre `transporte` y `aduana`; lo declara `repuestos` (`pantallas/flujo-esperas.ts`) y lo suma
  `src/app/(app)/logistica/huecos-de-la-unidad.tsx` (`repuestos.ver` y regla `esperas`; sin variante `repuesto`). `logistica` sólo conoce la clave.
- **Área `mover`, «Qué falta» y mover** (`pantallas/mover-unidad.ts`, hueco `que-falta` abierto al inicio). `useParaMover` lee con `leerParaMover` de `flujos`
  y relee al volver el foco (5 s de mínimo), al cambiar la fase y con `logistica:unidad-cambio`; `useMoverLaUnidad` envía con `faseEsperada = unidad.faseId`
  (éxito = `router.refresh()`). El atajo de un requisito abre el bloque de otro hueco (`logistica:abrir-hueco`, `features/nucleo/hooks/eventos-de-la-unidad.ts`);
  un hueco que el panel no dibuja no ofrece atajo. Textos y estado del botón son de `flujos`. Un ítem manda `{ repuesto }` (`unidadAMover`).
- **Área `mover`, notas e historial** (plegados). Se leen con la sesión de quien mira de a `TAMANO_DE_VER_MAS` por cursor `(creado_en, id)` hasta
  `TOPE_DE_LO_CARGADO`; un ítem por `repuesto_id`. «Ir a una fecha» usa `entities/mover/hasta-de-un-dia.ts` (copia de la de `cotizaciones`). Escriben
  `crearNota` (`vehiculo` xor `repuesto`; `logistica.ver` del origen o `repuestos.ver` para un ítem; autor del servidor) y `editarNota`, directo bajo la RLS
  de `notas`, sin RPC ni versión. **No hay «Borrar»:** el borrado suave por `update` lo rechaza la policy de lectura (`supabase/tests/areas/mover/notas.sql`;
  6-7). La nota de un cambio de fase no se edita (`quePuedeHacerConLaNota`). «Ver en logística» de la ficha lo pone `src/app`.
- **Área `mover`, el lote.** La **selección vive en el núcleo** (`entities/nucleo/seleccion.ts`: una sola fase, hasta 200; `useSeleccionDeLaCadena()`, `null`
  sin proveedor). La cadena sólo la lee; `mover` la provee (`ProveedorDeLaSeleccion`, que `src/app/(app)/logistica/page.tsx` monta sólo con `flujos.mover` en
  el origen y vacía al cambiar origen o filtros) y dibuja `BarraDelLote` y `DrawerDelLote` (`?panel=lote` con `destino`, `contenedor`, `booking`). El drawer usa
  `destinosDeLaFase`, `previsualizarCambioLote` (una llamada, hasta 200) y `cambiarFaseLote`; el resultado es el de **todo** el lote (las que la vista dejó
  afuera cuentan como no movidas) y «Reintentar» vuelve a la vista previa con las no movidas. Un grupo (`?contenedor=` o `?booking=`) lee sus unidades de a
  201 y entran las de una misma fase; `pantallas/mover-grupo.ts` declara «Mover el grupo» con «Marcar que llegó» para un contenedor.
- **Área `documentos`.** `entities/documentos/`: `admision.ts` (qué entra a la bandeja, fechas por modo de vencimiento), vencimiento («vence hoy» aún vale),
  qué cuenta para un requisito (aprobado, vivo, sin vencer, mime **del requisito**, entre min y max: repite `evaluar_requisitos` sólo para «N de M») y
  `revision.ts` (`quePuedeHacer`: cada acción oculta, habilitada o apagada con motivo). `pantallas/documentos-unidad.ts` declara «Documentos» (`logistica.ver`,
  sin regla) y lo reexporta como `DocumentosDeLaUnidad` para `/vehiculos/[id]`. El navegador lee con la sesión de quien mira (vivos con tope 50, URL firmada de
  60 s del bucket privado `documentos`).
  **Subir:** la bandeja queda **sin subir** hasta enviar (`useBandeja`: formato del tipo, 25 MB, repetido por hash, hasta 20; aviso desde 10 MB); se sube por
  hash (`<unidad>/<sha>.<ext>`) y recién entonces `registrarDocumentos` (`documento_registrar`, id del intento por archivo); cerrar con bandeja pregunta.
  **Revisar:** `revisarDocumento`, `editarDocumento`, `eliminarDocumento` → `documento_revisar|editar|eliminar` con la versión de la fila (`PT409` en la fila
  con `<AvisoDeConflicto>`, conserva lo escrito). Sin la clave nada se esconde: se apaga con el motivo. Editar y eliminar se ofrecen a quien tiene aprobar o
  subir (el navegador no sabe quién subió) y la base decide. `?panel=eliminar-documento&documento=<id>` (el rechazo de la fase se dice sin cerrar).
  **Grupo:** `pantallas/documentos-grupo.ts` declara «Subir un documento a las unidades» (`logistica.documentos.subir`): un objeto en la carpeta de la primera
  unidad y una fila por unidad (hasta 100).
- **Área `aduana`.** `/logistica/aduana` (`pantallas/aduana.ts`; `ENLACE_DE_ADUANA` pide `logistica.ver`). `entities/aduana/`: `declaracion.ts` (`actualizadoEn` es
  la versión), `estado.ts` («pagada» y «faltan» los calcula la base, nunca el cliente; el día es el de la empresa), `filtros.ts` (sólo `canal`, `pagada`, `q`;
  cursor `(creado_en, id)`, sin «Anterior»), `escritura.ts` (`cambiosDeDeclaracion`: sólo lo que cambió, `null` vacía). Lee `declaraciones_listar` (en la guarda
  de páginas) y `declaracion_leer`; el hueco «Aduana» lee el vínculo vivo por `declaraciones_vehiculos` y «Tributos pagados» (sin montos); fuera de las 200 que
  trae: «Abre la declaración para ver los tributos.». Escriben `guardarDeclaracion`, `ponerVehiculos`, `asignarCanal` → `declaracion_guardar|vehiculos_poner|canal`
  con la versión leída (`PT409` → «Recargar» conserva lo escrito). `?panel=nueva-declaracion` / `?panel=editar-declaracion&declaracion=<id>` (`shallow: false`,
  no convive con el resumen); `?panel=canal` es un `<Confirmar>` sobre el resumen (`?declaracion=`). La composición se cambia en **un solo envío** (buscador por
  `logistica_donde_esta`, al enviar); con canal queda fija. Todo pide `logistica.aduana.gestionar`.
- **Área `dinero`.** Huecos «Gastos», «Pagos», «Margen» en `pantallas/dinero-unidad.ts`. `entities/dinero/`: `margen.ts` (`textosDelMargen`: un `null` es «Sin
  cotización final» o «Sin venta registrada», nunca 0; un 0 verdadero es un monto), `gasto.ts` (`cambiosDeGasto` manda el tipo de cambio sólo si cambió la
  moneda o el tipo), `pago.ts` (monto > 0), `acciones-del-pago.ts` (un confirmado nunca se edita ni se elimina). **`monto_base` lo devuelve la base**: ningún
  componente multiplica por una tasa. El hueco recibe sólo `{ unidad }` y decide «Registrar gasto» con `puede()` sobre `mis_permisos`; protege la base.
  `?panel=gasto&gasto=<id|nuevo>`, `?panel=eliminar-gasto&gasto=<id>`, `?panel=pago|confirmar-pago|eliminar-pago|anular-pago&pago=<id>` (una URL a mano no
  abre lo que el estado o el permiso no dejan). Gastos, confirmar y anular avisan al «Margen» por un evento del navegador (`eventos-de-dinero.ts`). Confirmar y
  anular piden `logistica.pagos.confirmar` (global); el sello «Confirmado por <nombre> el <fecha>» lo pone la base; anular pide motivo; el lead va nulo.
  **Pagos de un proyecto de repuestos:** `pantallas/dinero-proyecto.ts` (pestaña «Pagos» de `/repuestos/[id]`): el mismo `CuerpoDePagos` con
  `AmbitoDePagoContext` en `proyecto`, registra `{ proyectoId }` por `pago_registrar_proyecto`, sin lead; permisos por props (`repuestos.costos.editar`,
  `logistica.pagos.confirmar`); anula como el vehículo, y `pago_anular` no deja sin pago vivo a un proyecto con un ítem en una fase que pide
  `proyecto.pago_cliente`.
  **Lista:** `/logistica/gastos?ver=gastos|pagos` (`ENLACE_DE_DINERO` pide `logistica.gastos.ver`). `entities/dinero/listas.ts` manda sólo las claves que acepta
  cada RPC (una de más da `22023`); cursor `(fecha, id)` como instante a medianoche, sin «Anterior» ni sumas. La fila abre `?vehiculo=` de `/logistica`.
  **Prorratear:** `pantallas/dinero-grupo.ts`, hueco del resumen de un grupo (`logistica.gastos.editar`; no en el de una declaración). `entities/dinero/reparto.ts`
  repite la aritmética de centavos de `gastos_prorratear` (los que sobran, a los primeros) sólo para la vista previa. El `lote` es el id del intento: se
  conserva si no se sabe qué pasó y se renueva al cambiar lo escrito o al rechazar la base.
  **Categorías de gasto** (`logistica.catalogos.gestionar`): escritura directa bajo la RLS; `categoria.ts` fija los propósitos del `check` de la base.
- **Área `transporte`.** **Catálogos:** `pantallas/transporte-catalogos.ts`, pestañas «Puertos» (primera) y «Navieras» de `/configuracion/logistica`
  (`logistica.catalogos.gestionar`). Escritura directa bajo la RLS (`infra/transporte/catalogos.ts`): 0 filas = «No tienes permiso…», nunca éxito; sin versión.
  **No hay «Eliminar»** (borrar dejaría nulos los transportes y vaciaría la oferta): se desactiva. `entities/transporte/catalogo.ts` valida (nombre 1–80, país
  ≤ 60, código ≤ 12 en mayúsculas sin espacios, orden 0–32.767); un puerto **sin país** no lo cubre la unicidad de la base (`NULL ≠ NULL`): la action lo mira,
  pero dos altas simultáneas pueden duplicarlo. `<AvisoDeTope>` a 200.
  **Hueco «Transporte»** (`pantallas/transporte-unidad.ts`; `logistica.ver`, regla `transporte`; sólo vehículos): escribe `guardarTransporte` →
  `transporte_guardar` con la versión leída. Opciones = la oferta del flujo (vacía = todos los activos) **más lo ya guardado**, rotulado «(inactiva)» o «(fuera
  de la oferta)» (`entities/transporte/oferta.ts`). `useBorradorDeTransporte` guarda los campos tocados: tras un `PT409`, «Recargar» trae la versión nueva y lo
  escrito sigue. Sin `logistica.transporte.editar` del origen, campos apagados con el motivo. `entities/transporte/transporte.ts` repite los textos de la base
  (contenedor y booking `^[A-Z0-9./-]{1,40}$` tras quitar **todo** espacio y pasar a mayúsculas; notas ≤ 2.000; ETA y arribo no antes del zarpe) sólo en lo
  que cambió; `porCampoDe` lleva el `hint` al campo. Un rechazo sin campo va en un aviso sobre «Guardar».
  **`/logistica/embarques`:** vistas `?grupo=embarques|contenedores` (cambiar suelta filtros y cursor). Sólo por RPC: `transporte_grupos()` por **cursor opaco**
  (`?cursor=` es el id de una fila, validado con `z.guid()`, no con `leerCursor`; en `scripts/guardas/areas-b/paginas-en-la-base.ts`) y `transporte_grupo()`
  (≤ 200, `hay_mas`, `hay_ocultas`: nunca un total). `cortada` (la base paró a las 2.000 filas) ofrece «Seguir buscando». Filtros
  (`entities/transporte/filtros.ts`): `naviera`, `puerto_origen`, `puerto_destino` (sin opciones no se dibujan), `en_transito` (sin arribo), `q` por prefijo.
  La fila escribe lo común, «Varias»/«Varios» si difieren y «—» si ninguna lo tiene o el id ya no está en el catálogo, nunca el uuid (`textosDelGrupo`). El
  resumen (`?booking=` o `?contenedor=`) lista unidades con fase y ETA (sin «días en la fase»: sería N+1) y monta los huecos de grupo de `mover`, `documentos`
  y `dinero` (`src/app/(app)/logistica/embarques/huecos-del-grupo.ts`) por permiso en cualquier origen, **sin mirar la regla de flujo**; la base exige por unidad.
  **«Editar grupo»:** `?panel=editar-grupo` **tapa** al resumen (`src/app` dibuja uno u otro). El botón sale con `logistica.transporte.editar` o
  `repuestos.editar` (`puedeEditarTransporte`, sin origen). `entities/transporte/edicion-del-grupo.ts`: lo que difiere sale vacío y un «Varios» vacío nunca se
  vacía; las versiones esperadas son las que vio el resumen. `aplicarAlGrupo` → `transporte_grupo_aplicar` (todo o nada, **sin `notas`**, devuelve la clave
  nueva si cambió contenedor o booking); `PT409` → «No se cambió ninguna: <motivo>» con «Recargar» que conserva lo escrito. Opciones: todos los activos (un
  grupo cruza flujos; la base revisa oferta y fase por unidad).

## Tablas

`documentos`, `puertos`, `navieras`, `transportes` (1:1 con la unidad), `declaraciones_aduana`, `declaraciones_vehiculos`, `categorias_gasto`, `gastos`, `pagos`, `notas`.
RPC: `margen_vehiculo`, `alertas_demora` (cron), `storage_refcount`; mover vía `flujos`. La oferta de transporte es de `flujos` (`flujo_oferta_guardar`);
logística sólo la lee con `flujo_oferta()`. Gastos y pagos se escriben sólo por RPC: `gasto_registrar`, `gasto_guardar`, `gasto_eliminar`, `gastos_prorratear`,
`pago_registrar`, `pago_registrar_proyecto`, `pago_guardar`, `pago_eliminar`, `pago_confirmar`, `pago_anular`; se leen por cursor con `gastos_listar` y
`pagos_listar`. El bucket `comprobantes` lo abre `comprobante_puede` (la fila que nombra el objeto).
**Alertas:** `trg_alertas_cerrar_al_mover` (en `historial_fases`) acciona los `demora_fase` abiertos de la unidad al moverla (`notificaciones_referencia_idx`).
`alertas_demora()` (job `alertas-demora`, cada hora en el minuto 12) recorre por lotes los pares (origen, fase) que alertan, avisa a quien tiene `flujos.mover`,
`logistica.ver` y `vehiculos.ver` del origen (el menor alcance: con `propios`, la unidad que creó o la de su cartera) y reabre el aviso pasado
`fases.alerta_cada_horas` (nulo = 72 h). `documentos_vencimientos()` (job `documentos-vencimientos`, 11:15 UTC) avisa `documento_por_vencer` a quien tiene
`logistica.documentos.subir` del origen (mismo menor alcance), una vez por persona y documento desde `vence_el - aviso_dias`; el texto cambia con
`modo_vencimiento`. `logistica_bandeja(p_tope)` (definer, `authenticated`; 5, máximo 20) da `{ demoradas, trabados, por_aprobar }`, cada una
`{ filas, hay_mas }`, de los orígenes que quien mira ve (por aprobar, además con `logistica.documentos.aprobar`); trabado = demorada a la que le falta un
requisito bloqueante para su fase siguiente. La lee `bandejaLogistica(TOPE_DE_BLOQUE)` (en la guarda de páginas).

## No se rompe

- La entidad agrupadora no es dueña de datos: documentos, gastos, pagos, notas y transporte cuelgan **siempre** de la unidad (`vehiculo_id | repuesto_id`, uno y sólo uno). Prorratear un flete = N filas de `gastos`.
- Mientras la unidad esté en una fase, no se vacía el dato ni se quita el documento que esa fase exige como bloqueante (triggers); si pasa igual, la unidad aparece «fuera de regla», no se expulsa.
- Confirmar un pago es un acto sellado (`pago_sellos`): quién y cuándo los pone el trigger, no el cliente.
- El margen devuelve `null` sin venta registrada; la UI dice «Sin venta registrada», nunca $0.

## Ojo

- Documentos nunca se comprimen; fotos sí (WebP). Objetos por hash; un documento común a 8 vehículos es 1 objeto y 8 filas.
- «DUI pagada» es derivada: todos los vehículos de la declaración tienen un gasto vivo de la categoría tributos. Comprobante ≠ pago.
- Conflicto al mover o editar transporte → `PT409` → «Alguien lo cambió · Recargar». Nunca pisar en silencio.
- Un requisito de dato cuya regla está apagada se puede pedir en `flujos` y su hueco aquí no se dibuja: **6-4** (`docs/PENDIENTES.md`).
