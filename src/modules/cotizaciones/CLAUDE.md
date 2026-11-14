# cotizaciones

Cotizador configurable: fórmula por origen como grafo de nodos versionado, XCell con ⚙ de default global, tablas de referencia, snapshot por cotización, preventa/final, versiones, comentarios, adjuntos, reportes, plantilla de tarjeta y PDF, comprobantes.

El dominio (nodos, motor, reglas, niveles, cómo se guarda) está en `docs/COTIZADOR.md`: esta ficha no lo repite.

## Entra y sale

- **`/cotizaciones/nuevo?origen=&lead=&vehiculo=`** (pide `cotizaciones.crear` y `cotizaciones.ver` del origen, 4-32). Lead y vehículo son ids,
  sin importar esos módulos: sobre la hoja van la barra del vehículo de `vehiculos/pantallas/cotizar` (`?panel=vehiculo`, escribe `CLAVE_DE_VEHICULO`)
  y la del cliente de `leads/pantallas/cotizar` (`?panel=cliente`, `CLAVE_DE_LEAD`); un lead o vehículo que quien mira no ve se suelta. «Guardar» sin
  cliente dice «Para guardar, elige el cliente en «Cliente».» (`FALTA_EL_LEAD`; igual sin `leads.ver`). El borrador de la hoja va por persona, origen y
  vehículo, **sin el lead** (elegir el cliente remonta la hoja y repone lo tipeado); el pendiente del guardado va por lead. Guardar: la action
  `features/hoja/actions/crear-cotizacion.ts` (`cotizacion_crear`, siempre `ok(ResultadoDeCrear)`, sin `revalidatePath`).
- **`/cotizaciones`** (`cotizaciones.ver` en algún origen): `?origen=` (sólo con 2 o más), `?clase=preventa|final`, `?cuales=mias` (las que creó quien
  mira), `?por=`, `?cursor=`; `?vehiculo=` y `?lead=` no son del esquema (ni chip ni los borra «Limpiar»): los escribe `rutaDelListado()` como camino a
  lo antiguo del historial del vehículo y del lead, y el aviso de arriba (`textoDelAviso()`) sólo nombra lo que quien mira ve. Los nombres llegan por
  clave primaria (leads sólo con `leads.ver`) y los une `filasConNombres()`: lo que no llega es «—». Lee `cotizaciones_listado()` (invocadora: decide la
  RLS) por cursor, con `MAXIMO_DE_PAGINA_DE_COTIZACIONES` (100). El clic abre el resumen `?cotizacion=` (de sólo lectura, por `diferido()`); la que no está
  en la página la lee el servidor con `leerUnaDelListado()` (su fila y `cotizaciones_listado()` de tamaño `UNA` con el cursor `(creado_en, id + 1)`) y, si
  no llega, `usePedidoAlServidor()` pide una vez y luego «Reintentar»; `idDelResumen()` es la única lectura de la clave. «Nueva cotización»
  (`origenParaNueva()`) y la tecla `N`.
- **`/cotizaciones/[id]`** (`cotizaciones.ver`): la hoja de una guardada con SU versión (`cotizacion_hoja_guardada()` y `cotizacion_evaluar(p_cotizacion)`
  con lo guardado; `entradasDeLoGuardado()` espeja `_cotizacion_entradas_de`); sin `puede_guardar` de la base, sólo lectura. El recálculo usa tablas y
  vehículo de hoy: si difiere (`difiereAlAbrir()`) se dice y se muestra «Total guardado». «Guardar» (`cotizacion_guardar`, siempre
  `ok(ResultadoDeCrear)`, `revalidatePath` sólo si entró) manda la versión vista (`actualizadoEn`), las entradas al día y título, notas y vehículo sin
  tocar; apagado sin cambios, salvo con un pendiente (4-21) o si lo de hoy no es lo guardado. Pendiente y borrador van por persona y cotización, el
  borrador además con la versión (`claves-de-la-hoja.ts`).
- La hoja guarda en la URL lo que abre (se borra al guardar): `?panel=avanzado`, `?panel=vista-previa` (la tarjeta; sólo con `<ProveedorDeLaTarjeta>`,
  también para quien sólo ve; en una guardada dibuja lo guardado), `?ayuda=texto|tabla&nodo=<id>` (sólo lectura; la URL no abre lo que la hoja no dibuja)
  y, con el proveedor del área, `?ajuste=celda&nodo=<id>` (el ⚙, también dentro de «Avanzado»).
- `index.ts`: `recalcularAlAbrir()` va DESPUÉS de leer la hoja (4-28), con `modoInicial()` (el primer modo del diseño); `contarCotizacionesDelVehiculo()`
  («Cotizado (n)») es acotado y con la RLS de quien mira; `rutaDeLaHoja()` la usan «Cotizar» de `/vehiculos` y de `/leads/[id]`;
  `datosDelVehiculoDeLaHoja(hoja)` dice qué campo del vehículo casa con qué tabla (qué se elige lo decide `vehiculos`). Lo consumen `logistica`, `chat`,
  `buscador`, `web` (precio público), `tablero`.
- `client.ts`: `useLectorDeOpciones()`, las opciones de un dato del vehículo (los textos de su columna en `cotizacion_tabla`, 5 min con
  `memoriaDeLectura()`): con él la página arma el lector del panel del vehículo (`vehiculos` no conoce `cotizaciones`). La celda sin valor de un campo que
  se elige (`seEligen`; `campo_sin_valor`, `fila_sin_coincidencia`) dice «Elige el dato del vehículo en «Vehículo»…».
- **«Revisiones»** (`?panel=revisiones`): lee `cotizacion_revisiones` desde el navegador por `composicion-revisiones.client.ts`, con «Ver más» por
  cursor (el id de la última); lo leído es de una versión (`actualizadoEn`). La RPC recorta cada diff al nivel de quien mira; `cambiosDeLaRevision()` da el
  total sólo si llegan los dos números. «Ir a una fecha»: `p_hasta` es el inicio del día siguiente en la zona de la empresa (exclusivo); el salto
  reemplaza lo leído, «Ver más» sigue sin `p_hasta` y la ventana no va a la URL (`useTurno`). La base supone que el id crece con `creado_en`
  (`docs/PENDIENTES.md`, 4-95).
- **La cadena** (`cadena` de `cotizacion_hoja_guardada`): «Versión V de la n.º N» con enlace a la anterior si se ve, «Hay una versión nueva: n.º M
  (versión W).» o «Hay una versión nueva que no puedes ver.».
- **«Cotizar encima»** (`features/encima/`): el aviso (`avisoDeVersion()`: otra versión que la publicada hoy, o vencida) lo ve todo el que abre; el
  botón, sólo con `cadena.puedeCotizarEncima` (lo decide la base, no `puede()`). El intento es el id de la nueva y se conserva sólo tras una pérdida; con
  cambios sin guardar o un pendiente el botón espera, porque la nueva lleva lo guardado.
- **Historial** (pestaña de `/vehiculos/[id]` con `cotizaciones.ver` del origen del vehículo; sección de `/leads/[id]` con `cotizaciones.ver` en algún
  origen, sin mirar la cartera: la RLS recorta): se lee al montarse desde el navegador por `composicion-historial.client.ts` (por
  `cotizaciones_vehiculo_creado_idx` o `cotizaciones_lead_creado_idx`), de a 20 hasta 500, y el tope dice «Ver todas en Cotizaciones». Va aparte de
  `composicion.client.ts` y cada cáscara de `diferido()` en su `diferidos.tsx` (`features/historial/components/{pestana,lead}/`) porque lo que importa la
  hoja viaja en la carga en frío de `/cotizaciones/nuevo` (4-73). `usePaginasDelHistorial(de)` descarta lo viejo con `ultimo`; `<ListaDelHistorial>` espera
  300 ms el esqueleto salvo con `esperarEsqueleto={false}` (pestaña y sección: llegan tras el esqueleto del `diferido()`).
- Niveles: `/configuracion/cotizacion?seccion=niveles` (`equipo.roles.ver|gestionar`; `?panel=nuevo-nivel|renombrar-nivel|eliminar-nivel&nivel=<id>`).
- Con Live, las cifras de la ayuda de una celda de dinero pasan por `<Monto>`; las de otra celda quedan a la vista.
- Los `loading.tsx` de la hoja importan `pantallas/esqueleto-de-hoja.ts`, nunca el barril de su pantalla (con él, el HTML en frío baja dos chunks casi
  iguales). El núcleo del guardado (`useNucleoDelGuardado`: pendiente, un envío a la vez, reintento al volver la red) es el mismo de la hoja nueva y de la
  guardada. `hoja-de-una-guardada.ts` viaja al navegador sin Zod; su lectura es `hoja-de-una-guardada-lectura.ts` (sólo servidor).
- **Tablas de referencia** (área `tablas`; `/configuracion/cotizacion?seccion=tablas&origen=&tabla=`, `cotizaciones.configurar`): la lista del origen y
  las compartidas (tope 100; una compartida tapada por una propia va `tapada`) y, con `?tabla=` de esa lista, el editor por `diferido()` de a 100 filas.
  `leerTablaParaEditar()` lee **todas** las filas por cursor `(orden, id)` hasta 2.001: con una fila que no se lee o más de 2.000 no devuelve nada, porque
  publicar reemplaza todas. Se edita en memoria y se valida con el espejo de la base (`entities/tablas/validacion.ts`, `TOPE_DE_FILAS` = 2.000); el
  borrador va por versión en `sessionStorage` (pausado mientras publica) y el editor lleva `key` id:versión. «Publicar» (`?panel=publicar-tabla`,
  `tabla_referencia_publicar()`): el PT409 y el 22023 con `hint` llegan tal cual (`porCampo` con el camino de la celda).
- **El PDF** (área `tarjeta`): `GET /cotizaciones/[id]/pdf` (`requerirSesion()`; 404 en texto igual al de la página para lo que no existe, está en la
  papelera o no se ve; `rutaDelPdf(id)`) arma la página (fecha del último guardado en la zona de `leerAjustes()`, que falla en vez de dar lo de fábrica) y
  pide `pdfDeUnaGuardada()`: `cotizacion_tarjeta` como quien pide, sin memoria, y `infra/tarjeta/pdf/` (Geist TTF). Lo baja quien ve la cotización, sin
  clave propia (pie de «Vista previa» de una guardada; `<a download>` en la tarjeta de lo guardado de la hoja nueva). Las pruebas leen su texto con
  `scripts/pdf/texto-del-pdf.ts`.
- **El diseño** (`/configuracion/cotizacion?seccion=diseno&origen=`, `cotizaciones.configurar`): lee el borrador o la publicada y los niveles de
  `cotizaciones_niveles` (no de `niveles_con_uso()`); edita secciones, celdas (ver y editar juntos con `ponerNiveles()`; `admiteNivel` apaga lo que la base
  rechazaría con `nivel_no_admitido`), atajos, interruptor, ayuda, modos y la tarjeta del total (variante y subtotal no se editan), con el aviso «se deduce
  restando» (sin bloquear). «Guardar el borrador» (`formula_guardar_borrador`, con la esperada de la publicada o la hora del borrador) manda `definicion` y
  `params` sin cambios. El área `diseno` replica la lectura y escritura de `formula` porque un área no importa otra.
- **Los tonos** (`/configuracion/cotizacion?seccion=tonos`, `cotizaciones.configurar`; `?panel=nuevo-tono|editar-tono|eliminar-tono&tono=<id>`): son de
  la empresa y se guardan al instante (`tono_crear|guardar|eliminar` devuelven la lista entera). `entities/diseno/tonos.ts` espeja `_tono_nombre()` y
  `_tono_colores()` (los mismos textos, AA con la razón truncada a un decimal). Un tono en uso: 23503 con la fórmula que lo usa.
- **La vista previa del diseño** (`?vista=412|1280|200`): `hojaDeLaVistaPrevia()` espeja `_cotizacion_hoja()` **sin niveles, tablas ni
  `dato_del_vehiculo`**; `cifrasDelDiseno()` evalúa con datos en 0 y nunca lanza. Dibuja con las piezas del núcleo y **no con `LugaresDeLaHoja`** (lee
  `?ayuda=` y `?panel=`, que chocarían con la pestaña); un hijo de ancho propio en px dentro de una caja con scroll (los cortes `@4xl/hoja` y `@5xl` miran al
  hijo); «200 %» es 206 px con `zoom: 2`. Va `inert`, en un `diferido()` aparte.
- Depende de `leads`, `vehiculos`, `empresa` (tipos de cambio); los orígenes entran por props desde `src/app`.

## Áreas

El módulo se parte por **área**: `listado`, `tarjeta`, `plantilla`, `formula`, `diseno`, `tablas`, `papelera`, `final`, `comprobantes`, `comentarios`.
Lo demás es el **núcleo** (la hoja, guardar, encima, revisiones, historial, niveles, el motor, el compilador, los validadores, el diseño, la apertura, la
ruta): lo que comparten. La lista y las carpetas del núcleo están en `scripts/guardas/areas-de-cotizaciones.ts`.

- **Dónde va:** `features/<área>/`, `entities/<área>/`, `infra/<área>/` y sus entradas `areas/<área>/{index,client,composicion}.ts` (la composición empieza
  con `import 'server-only'`). Su pantalla es `pantallas/<área>.ts`; otra, `pantallas/<área>-<pantalla>.ts` (una pantalla paga lo que reexporta su archivo).
  Una carpeta nueva se suma a un área o al núcleo en la guarda.
- **Las entradas de la raíz** (`index.ts`, `client.ts`, `composicion.ts`) sólo llevan `export * from './areas/<x>/<mismo nombre>'` por el núcleo y cada
  área; un nombre repetido entre dos áreas es un error de `tsc`. T13 de `scripts/mapa.test.ts` pide al menos 87 nombres en la API del mapa.
- **La dirección:** un área importa lo suyo y el núcleo, **nunca otra área**; el núcleo no importa ningún área; adentro nadie importa las entradas de la
  raíz (los casos de uso del núcleo importan `areas/nucleo/composicion.ts`). Cuentan `import type`, `import()` y los tests. Lo que dos áreas necesitan va
  al núcleo. Lo vigila `scripts/guardas/areas-de-cotizaciones.test.ts` (también que cada área tenga sus lugares).
- **La composición del navegador** del núcleo (`composicion.client.ts`, `-historial.client.ts`, `-revisiones.client.ts`) queda en la raíz (la nombran los
  `vi.mock`). La de un área va en `areas/<área>/composicion.client.ts`, la importa sólo su feature y ningún barril la reexporta: lo que suma un
  `areas/<área>/client.ts` lo paga toda pantalla que importa `@/modules/cotizaciones/client`.

## Los huecos

Lo que un área llena en una pantalla del núcleo es un **hueco** (tipos sin código en `features/hoja/components/huecos.ts`); la página de `src/app` los une
por `pantallas/<área>-<pantalla>.ts`. Un hueco vacío es un objeto sin componentes: no se dibuja nada.

- **La hoja** (`HuecosDeLaHoja`, `pantallas/formula-hoja.ts`): `EnlaceSinPublicar` (el enlace de «Falta publicar la fórmula») y `Proveedor`, que enciende
  el ⚙ por `ContextoDelAjuste`: sin él ninguna celda lo dibuja ni se llama ningún hook del ajuste. La base dice qué celda lo lleva (`ajustes`);
  `<LugarDelAjuste>` se monta con las secciones principales y también **dentro del modal «Avanzado»**, como la ayuda.
- **La guardada** (`HuecosDeLaGuardada`): `Acciones` (cabecera, tras «Revisiones»), `Insignias` (cabecera, tras la clase y la vigencia) y `Debajo` (bajo la
  hoja, fuera del proveedor del ⚙). Los llenan `pantallas/{final,comprobantes,comentarios,papelera}-cotizacion.ts` (cada uno con un vacío en
  `features/<área>/components/huecos-en-la-guardada.ts`) y `src/app/(app)/cotizaciones/[id]/huecos-de-la-guardada.tsx` los ordena: final, comprobantes,
  comentarios y papelera (la destructiva al final). Cada componente recibe `{ cotizacion, puedeGuardar, permisos }`. Fichas: `areas/<área>/CLAUDE.md`.
- **El listado** (`HuecosDelListado`): `Junto`, antes de «Nueva cotización» (el vacío ofrece sólo «Nueva»); lo llena `pantallas/papelera-listado.ts`.
- **La vista previa de la tarjeta:** `ContextoDeLaVistaPrevia` (`features/hoja/components/hueco-de-la-vista-previa.tsx`) lleva `dibujar(props)`; la llena
  `<ProveedorDeLaTarjeta>` (`pantallas/tarjeta.ts`) con la cáscara del modal y lo que sabe la página (vehículo, asesor, número, logo). El modal lee
  `cotizacion_tarjeta(p_formula)` al abrirse (5 min por versión) y dibuja `modeloDeLaTarjeta()` (puro). El pie: Live y «Copiar texto»
  (`textoDeLaTarjeta()`, apagado sin tarjeta, con «Total desactualizado.» o sin total) y, en una guardada, «Descargar PDF» (`pedirElPdf()`: `fetch` sin
  seguir la redirección ni caché; un 404, la sesión que no vale u otro fallo se dicen en el pie con «Reintentar»).

## Archivos clave

- Motor y grafo (`docs/COTIZADOR.md`: léelo antes de tocar el motor): `entities/nodos.ts` (Zod por `tipo`, `referenciasDe()`), `formula.ts`, `motor.ts` y
  `motor-*.ts` (`evaluar()`, una pasada), `redondeo.ts` (`round(numeric)` de Postgres), `compilador*.ts` (texto a nodos, puro, nunca lanza),
  `casos-del-motor.json`.
- Validación: `entities/validar*.ts` espeja `validar_formula()` (`docs/COTIZADOR.md` › «Las reglas») y `validar-diseno*.ts` a `validar_diseno()` (con el
  tope de 40 ítems, `demasiados_items`, primero tras la forma); juegos `casos-de-{formula,diseno}.json` (regla nueva = su caso).
- La plantilla: `validar_plantilla()` (`docs/COTIZADOR.md` › «Plantilla de tarjeta (PDF)»), espejo `entities/plantilla/validar-plantilla.ts` (code points,
  `btrim`, orden C, tope en bytes del texto jsonb, sin prototipo) con su juego `casos-de-plantilla.json`. **Lo que va a un `jsonb` o `text` pasa por
  `revisarTextoParaLaBase()`** (un `\u0000`, un surrogate suelto o más de 8 niveles no los lee la base).
- Base: `evaluar_formula()` (espejo exacto de `motor.ts`), `cotizacion_evaluar()`, `cotizacion_hoja()`, `cotizacion_crear()`, `cotizacion_guardar()`,
  `_nodos_visibles()`, `_publicar_formula()` / `_preparar_publicacion()`; semillas `supabase/semillas/cotizador-*.sql`. Detalle: `docs/COTIZADOR.md` ›
  «El diseño de la hoja», «Niveles de acceso», «Quién escribe una cotización y cómo», «Cómo se guarda», «La lectura que abre la hoja», «La hoja abierta».
- Hoja en el cliente: `entities/{hoja,recalculo,entradas,binding,guardado,claves-de-la-hoja,borrador-de-hoja,…}.ts`, `infra/queries/`. `features/hoja/`
  marca para los e2e `data-nodo`, `data-atajos`, `data-seccion`, `data-avanzado`, `data-cabecera`, `data-secciones`, `data-modo`, `data-total-bs`,
  `data-pie-de-panel`.
- El resumen al pie se pliega (`useResumenPlegado`): «Ver el detalle» / «Ocultar el detalle» esconde el total en moneda local, los secundarios y el modo;
  el total, sus avisos, lo guardado, la región viva y el pie quedan. Nace plegado con la fuente raíz ≥ 24 px; al costado (`@4xl/hoja`) no hay botón. El
  modo de tipo de cambio es parte de `Entradas`; «Ver total Bs» no (no cambia el cálculo), pero vuelve con el borrador.

## Tablas

`formulas`, `tonos`, `cotizaciones_niveles`, `tablas_referencia`, `tablas_referencia_filas`, `plantillas_tarjeta`, `cotizaciones`, `cotizaciones_revisiones`,
`cotizaciones_comentarios`, `cotizaciones_adjuntos`, `cotizaciones_reportes`, `cotizaciones_favoritos`, `comprobantes`, `comprobantes_contadores`,
`comprobantes_ajustes`.

RPC: `formula_guardar_borrador`, `formula_publicar`, `formula_descartar_borrador`, `formula_cambiar_constante` y `formula_revertir` (publican la N+1 desde
la publicada sin pisar el borrador), `tabla_referencia_publicar` (reemplaza las filas, sube la versión y publica la N+1 de cada fórmula que la usa),
`tono_crear|guardar|eliminar`, `nivel_crear|renombrar|retirar|restaurar|eliminar`, `niveles_con_uso`, `validar_formula`, `validar_diseno`,
`validar_plantilla`, `evaluar_formula`, `cotizacion_evaluar`, `cotizacion_hoja`, `cotizacion_tabla`, `cotizacion_tarjeta`, `cotizacion_crear`,
`cotizacion_guardar`, `cotizaciones_listado`, `plantilla_guardar_borrador|publicar|descartar_borrador` (versión esperada y candado por origen; esperada
nula al guardar = crear), `cotizacion_marcar_final`, `cotizacion_moderar` (con la versión),
`cotizacion_comentarios|comentario_respuestas|comentar|comentario_editar|comentario_borrar`, `cotizacion_adjuntar|adjunto_quitar`,
`cotizacion_reportar|reporte_retirar`, `cotizacion_favorito_poner`, `comprobante_emitir|anular`, `comprobantes_serie_cambiar`, `margen_vehiculo`.

## No se rompe

- Una cotización se recalcula **siempre** con su `formula_id`, nunca con la vigente. El snapshot (`valores`, `fuentes`, `tipos_cambio`, `totales`) es la
  autoridad.
- Versionado append-only: un borrador y una publicada por origen; revertir = publicar una copia. El ⚙ de una constante publica N+1; el de un tipo de
  cambio lo cambia para la empresa (`tipo_cambio_guardar`).
- **El listado** (`cotizaciones_listado()`) corre como quien mira y cada ruta va por su índice: la clase nunca es columna de un índice (`enum_eq` no es
  leakproof; la final va por parciales con `'final'` literal) y `lead_id` y `origen_id` tienen un solo índice entero al frente
  (`cotizaciones_lead_creado_idx`, `cotizaciones_origen_creado_idx`; L8 de `cotizaciones-listado.sql`). Con `p_lead` es una sola ruta por
  `cotizaciones_lead_creado_idx`, sin la cartera, y el vehículo es un filtro sobre esas filas (L9). Lo que devuelve es la regla (L2 de
  `cotizaciones-visibilidad.sql`).
- Crear con un vehículo, o guardar una que pasa a otro, mueve `vehiculos.cotizado_en` (trigger `trg_vehiculo_cotizado`, «sólo si es mayor»): cotizar toma
  la fila del vehículo `for no key update` hasta confirmar. Historial y «Cotizado (n)» van por `cotizaciones_vehiculo_creado_idx`
  (`vehiculo_id, creado_en desc, id desc`).
- A lo sumo una final activa por vehículo. `cotizacion_marcar_final` toma lead → vehículo → la cotización y las vivas del vehículo (detalle:
  `areas/final/CLAUDE.md`). Al entrar a logística la final se congela; si sale, vuelve a preventa.
- Sin motor de expresiones al cotizar: sólo las operaciones cerradas de `calculo`. La fórmula como texto se compila a nodos **al configurar**; lo que no
  compila se rechaza. Un nodo nuevo = tipo discriminado (`nodos.ts`) + caso en `referenciasDe()` + caso en `validar_formula()` y en el juego.
- **Toda copia de una versión lleva el diseño** (el ⚙, revertir y la N+1 de una tabla; publicar lo exige). Un tono o nivel que una versión nombra no se
  elimina (`_tono_en_uso()`, `_nivel_uso()`; un nivel se retira). Tonos y niveles salen de un solo punto (tabla `tonos`, `_niveles_de_cotizacion()`): nada
  escribe «costos» a mano ni razona por el nombre o la clave de un nivel. `formulas` y `plantillas_tarjeta` sólo las lee quien tiene
  `cotizaciones.configurar` del origen (los demás leen la plantilla por `cotizacion_tarjeta`).
- **La hoja calcula en la base** (`cotizacion_evaluar()` sobre `evaluar_formula()`) para todos; la fórmula (`definicion`, `params`, texto) viaja sólo a
  `cotizaciones.configurar` (`motor.ts` queda para el editor y la paridad), salvo el `dato_del_vehiculo` de una celda de tabla que se ve (qué columna casa
  con qué campo, sin las entradas del `match` que nombran un nodo; `_hoja_datos_del_vehiculo()`); lo que un nivel esconde no viaja por ninguna lectura
  (`docs/COTIZADOR.md` › «Niveles de acceso»).
- **Nadie escribe `cotizaciones` ni `cotizaciones_revisiones` directo** (sin grants ni policies de escritura): una escritura nueva es una RPC
  `security definer`, nunca un grant. `authenticated` no lee `valores|fuentes|totales|tipos_cambio` ni el `diff`; lo oculto sale por
  `cotizacion_leer|evaluar|revisiones|tabla`, recortado con `_cotizacion_recorte()` y `_nodos_visibles(formula_id)` de SU versión.
- **Inventario de lo oculto:** una función nueva que pueda devolver esas columnas, `formulas.*` o las tablas de referencia, o un guardado/lectura nuevos del
  diseño, se registra en el inventario de `supabase/tests/cotizaciones-visibilidad.sql` y entra a la matriz por nivel de `cotizacion-hoja.sql`.
- `cotizacion_guardar` es la única edición: calcula con SU fórmula y SUS tipos de cambio y conserva lo que quien guarda no ve ni edita; mismo `intento` con
  otros datos = `intento_reusado`; quién guarda lo decide sólo `_cotizacion_puede_guardar()` (ver y editar; una final, ver y
  `cotizaciones.final.gestionar`), antes y después del candado. La revisión guarda `totales` por clave (grupos enteros) y su lectura no delata un grupo.
- **La hoja abierta la firma la base** (`abierta` = fórmula.µs.huella.HMAC con la clave de Vault `cotizacion:abierta`; la huella, de las tarifas que vio): `cotizacion_crear`, `cotizacion_evaluar` y
  `cotizacion_tabla` la reciben como `p_abierta`, nunca una hora del cliente (4-27); el recálculo y la tabla de una ayuda usan la versión (y el recálculo,
  las tarifas) de la hoja dibujada (4-28). La pantalla la trata como opaca. Un cálculo o alta nuevo recibe `p_abierta`; una prueba SQL la firma por persona.
- En el cliente: entradas inmutables; lo que se busca por id usa `Map`; los textos del candado, estado y faltante son **propios, nunca el mensaje de la
  base**, salvo: el PT409 de `cotizacion_guardar` (`version_cambiada`: una persona y cuándo), los de `formula_publicar()`, `formula_cambiar_constante()`,
  `formula_revertir()` y `tabla_referencia_publicar()` (una persona, una versión y cuándo), los de `plantilla_*` (cuándo, sin nombre) y los de
  `comprobante_emitir|anular` y `comprobantes_serie_cambiar` (escritos para la persona). El porcentaje de un par va a `inputs` u `overrides` según
  `secundario.tipoDeNodo` (4-31); todo error con SQLSTATE suelta el pendiente; la `key` de la hoja lleva la abierta.
- La hoja calcula **por su origen o por su cotización, nunca por las dos** (`DeDondeCalcula`: la base rechaza `p_abierta` con `p_cotizacion`); una
  guardada no manda `p_origen`, `p_abierta` ni `p_vehiculo`. `actualizadoEn` (y toda versión esperada) es el texto de la base con sus microsegundos:
  **nunca pasa por `Date`**.
- «Recargar» en una guardada remonta la hoja (la `key` suma una lectura pedida): sin remonte `useRecalculo` ignora el primer cálculo nuevo y lo rechazado
  se reenvía. `difiereAlAbrir` compara `valores` y `totales.usd` de lo guardado con el primer recálculo.
- **La hoja de una guardada** (`cotizacion_hoja_guardada`) edita sólo con `_cotizacion_puede_guardar()` (no con `_nodos_visibles()`, que da editar con
  `crear`). **Cotizar encima** (`cotizacion_encima`) crea la N+1 en el acto, una viva por anterior (`cotizaciones_encima_unica`), y se lleva lo oculto (se
  guarda, no se devuelve); es la excepción a «un alta nueva recibe `p_abierta`».
- **La tarjeta** (`cotizacion_tarjeta(p_formula)`) dibuja la plantilla publicada del origen **validada otra vez contra la versión de esa cotización**: si no
  le sirve, `sin_plantilla` sin motivo. De la fórmula sólo sale lo del nivel «todos» (grupos enteros, el total, lo aparte, la variante); los tipos de
  cambio, sólo por su nombre; ningún id ni texto de un nodo de un nivel, para nadie (K4 de `cotizacion-tarjeta.sql`). El modelo toma valores, estados y
  totales por id de nodo (`CalculoDeLaTarjeta`), nunca de la hoja de quien mira. En una guardada dibuja **lo guardado** (`calculoDeLoGuardado()`: el
  snapshot, con los estados del primer recálculo) y lo que difiere se dice fuera.
- **El editor de la plantilla** (`/configuracion/cotizacion?seccion=tarjeta`): al navegador llega sólo el contexto reducido y nada se importa del área
  `formula`. Los modales de publicar y descartar (`?panel=publicar-tarjeta|descartar-plantilla`) **viven fuera de la `key` del editor**
  (`origen:esperada`) para que «Recargar» tras un PT409 no pierda la nota. Su vista previa es un hueco: el tipo sin código
  `entities/vista-previa-de-la-plantilla.ts` (lectura plana, sin `Map`), que `plantilla` arma y `tarjeta` dibuja (`pantallas/tarjeta-plantilla.ts`).
- **El PDF** dibuja lo mismo que la tarjeta de esa guardada: lo guardado y sólo lo que la lectura nombra. Los montos van con `formatearMonto()` y siempre con
  cifras aunque Live esté encendido: es lo que se entrega al cliente (la excepción a `<Monto>`, `docs/DECISIONES.md`). react-pdf se carga sólo al pedir un
  PDF (`import()` en `areas/tarjeta/composicion.ts`) y nunca llega al navegador. El logo lo baja `logo-del-pdf.ts` con tope (`PESO_MAXIMO_LOGO`) y 2 s y
  llega como `Buffer`, nunca URL; un SVG con lo que react-pdf se salta o con `<image>`, y un WebP, dejan el PDF sin logo (`docs/PENDIENTES.md`, 4-98). Los
  metadatos no nombran al cliente, al asesor ni al vehículo. «Copiar texto» sale del mismo modelo.
- **Las tablas de referencia se escriben sólo con `tabla_referencia_publicar()`** (sin insert, update ni delete para `authenticated`). Candados: la tabla
  (`for update`) y después `formulas:<origen>` en orden de origen, como el ⚙ y revertir. Pruebas: `supabase/tests/areas/tablas/`,
  `scripts/carreras/tablas*.mjs`.
- **Comentarios, adjuntos, reportes y favoritas se escriben sólo por RPC.** Todas piden ver la cotización; adjuntar pide lo que pide guardarla, igual que
  las policies del bucket `cotizaciones` (`cotizacion_puede_adjuntar`, 4-69). Candados: la raíz antes que la respuesta (comentar la toma `for share`,
  borrar `for update`); la cotización antes que sus reportes. Borrar no deja respuestas eliminadas ni raíces eliminadas sin respuestas
  (`cotizaciones_comentarios_respuesta_viva_check`). Pruebas: `supabase/tests/areas/comentarios/`.

## Ojo

- `fuentes[id]` pinta la XCell: `override` → anillo, `sugerido` → punto. No derivarlo comparando números.
- `comprobantes_contadores` es tabla, no sequence: la numeración no puede tener huecos.
- Cambiar una fórmula del seed = cambiar su caso del juego (`semilla.test.ts`) **y su diseño**.
