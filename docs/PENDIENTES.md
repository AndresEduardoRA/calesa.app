# Pendientes

Lo que falta, para elegir la próxima actualización. Cada entrada: `- **[id]** qué falta — contexto mínimo y, si la hay, la salida recomendada.`
Al cerrar una, se borra su línea (el PR lo cuenta). Lo nuevo que aparezca al trabajar se anota aquí en una línea, en su sección.

## Para desplegar (sólo la persona)

- **[—]** Producción: variables, secretos, `db push` y la lista de `docs/DESPLIEGUE.md` — el ensayo en seco está en `listo`.
- **[9-6]** Las dos corridas de `db:carreras` por `workflow_dispatch` que faltan (cuenta 3 de 5) para pasarlas al job `base` — una sesión no puede disparar un workflow; comandos en `docs/DESPLIEGUE.md` › «Lo que sólo una persona comprueba».
- **[9-11]** El dispatch con un spec que cae a propósito debe dejar en `e2e-fallos/` los cinco archivos de `scripts/ci/volcar-base.sh` — el resto está hecho; misma lista.
- **[9-12]** «¿Guardar contraseña?» de Chrome con el Modo Live (`XCell` abre su entrada como `password`) — pide un Chrome con sesión y gestor; si lo ofrece, se decide de nuevo (`type="text"` deja el valor en el árbol de accesibilidad).
- **[5a-4b]** El e2e completo con los dos proyectos tarda ≈ 95 min de reloj contra el assert de 25 — lo decidido hasta hoy: los shards del CI, sin segunda pila local de Supabase.
- **[—]** Fotos y cámara en un iPhone real: subir desde Safari una foto HEIC (debe verse y quedar WebP en el bucket); el `capture` de `<ZonaDeArchivos>` sólo se prueba como «el botón existe».
- **[—]** Push a un teléfono real: falta poner las claves VAPID en Vercel y en los secretos de `push` (`docs/DESPLIEGUE.md` › «6. VAPID»); comprobar también que el clic de una notificación enfoque la app instalada.
- **[—]** Los contratos de las API que usa `env:check produccion` no se verificaron contra la nube: lo confirma la primera corrida real con credenciales.
- **[9-01b]** Los índices de `actividad` se crean sin `concurrently`: en una base con volumen bloquean sus escrituras — si la tabla nunca se purgó, purgarla antes del `db push` (no figura en `docs/DESPLIEGUE.md`).
- **[—]** Qué IP ve el CRM tras la reescritura del sitio: al publicar el portal, mirar en Vercel la de `/api/portal/ingresar`; si es la del sitio, una cabecera propia firmada con secreto compartido (hoy frena el límite por código: 5 fallos, 15 min).

## Decisiones de producto que esperan a la persona

### Cotizaciones

- **[4-71]** Cambiar el vehículo de una preventa guardada desde `/cotizaciones/[id]` — la base lo admite; falta la barra del vehículo en la guardada, o elegir sólo entre vehículos ya cargados.
- **[4-72]** Quien ve una cotización pero no su vehículo no puede recalcularla («No se pudo recalcular») — que el recálculo de una guardada no dependa del vehículo, o que la pantalla diga por qué.
- **[4-94]** «Cotizar» desde la ficha `/vehiculos/[id]` y el «⋯» del inventario; hoy está sólo en el resumen de `/vehiculos` y en la barra de la hoja.
- **[4-101]** El editor de la tarjeta no reordena, suma ni quita grupos a mano (manda la fórmula) — decidir viendo la vista previa.
- **[4-103]** La vista previa de la tarjeta no muestra la `descripcion` del nodo, el nombre del tipo de cambio ni el título de la variante — llevarlos cuesta ≈ 20 KB sobre el tope del primer HTML.
- **[—]** Editor de la fórmula: sumar o quitar grupos y editar `buckets`, `total_en` y los modos — espera a que la plantilla de la tarjeta se edite junto con la fórmula.
- **[—]** Editor del diseño: mover, sumar y quitar secciones o ítems quedó sin dueño.
- **[—]** En la primera publicación de un origen (las dos esperadas nulas), el borrador puede nacer sobre una v1 que otra persona publicó entre medio — decidir si la esperada nula deja de valer.
- **[—]** Sin hacer: el filtro «Favoritas» y la insignia en el listado, quién reportó en la lista de reportes, el tiempo real en comentarios y el motivo de lo bloqueado en la fila de un lote de la papelera.

### Leads y web

- **[9-14a]** Marcar final y editar un lead exigen tenerlo en cartera (`puede_actuar_lead` › `en_cartera`): una dueña con «todos» no cierra la venta de un lead de su asesora sin que se lo compartan — recomendado dejarlo.
- **[8-14a]** Un rol con `web.cola.participar` sin `leads.crear` ni `web.cola.gestionar` recibe turnos (campana) pero no los ve en Inicio — recomendado dejarlo (quien atiende la web crea el lead).
- **[—]** Ordenar el listado de leads por último seguimiento o por próximo recordatorio, y mostrar ambos en la tarjeta del kanban (que lee oportunidades, no leads) — el listado ordena sólo por `creado_en` en todos sus caminos; un orden propio pide cursor, ruta e índice (el recordatorio es personal) y su medición.
- **[8-05a]** Vincular a un lead una solicitud web ya contactada — `web_confirmar_contacto` sólo escribe `lead_id` en `asignada` o `vencida`; pide una RPC nueva.

### Logística

- **[T02]** Un bloque «Subastas sin resolver» en Inicio (hoy se ven en el inventario y, con el filtro de situación, se filtran).
- **[T02]** El filtro del inventario para ver las no ganadas (T14): hasta entonces, «vacío de primera vez» puede salir aunque haya no ganadas
  ocultas.
- **[A1c]** Avisos sin salida que quedaron: el bloqueo de eliminar una fase no enlaza «las fases que esperan» ni «las unidades en ella» (`ImpactoDeFase` sólo trae conteos; pide los ids); «Editar grupo» con más unidades de las que se muestran y «súbelo por partes» de documentos de un grupo de más de 100 no dicen el paso siguiente; «No pudimos leer los títulos» del panel de fuera de regla no ofrece «Reintentar».
- **[6-2]** Publicar en la vitrina mueve la versión de la ficha (`vehiculo_vitrina` usa `vehiculos.actualizado_en`) — una columna `vitrina_actualizado_en` que la RPC exija y devuelva.
- **[6-4]** Se puede pedir un requisito de dato cuya regla está apagada (`transporte.*`, `aduana.*`, `pagos.*`) y nadie puede cumplirlo — que `revisar_flujo()` lo avise con un código propio o que la RPC lo rechace.
- **[6-6]** Prorratear un gasto por el valor del vehículo u otro criterio; hoy se reparte en partes iguales — base e interfaz.
- **[6-7]** Borrar una nota propia con una RPC `security definer` (el `update` da `42501`), que además impida a su autora cambiar el cuerpo de una nota de cambio de fase (hoy lo frena sólo la action).
- **[—]** Vincular un pago a un lead: sin interfaz (el alta manda `p_lead` nulo).
- **[—]** `/logistica/gastos` sin filtro por vehículo ni por proveedor — `gastos_listar` sólo filtra origen, categoría y fechas; pide migración.

### Repuestos

- **[8-13a]** Un ítem no dice «fuera de regla» ni quién lo movió, y «Esperas que destraban vehículos» no cruza los ítems con la fase del vehículo — `logistica_unidad` es sólo de vehículo; pide una RPC `security definer` (o sería N+1).
- **[8-13b]** El transporte propio de un ítem sin vehículo es sólo texto — falta el formulario; `transportes.repuesto_id` y `transporte_guardar(p_repuesto)` ya existen.

### Chat

- **[—]** Agregar o quitar miembros de un grupo del chat: `chat_grupo_miembros` existe en la base, sin pantalla.

## Seguridad y dinero

- **[—]** Un gasto en la moneda base acepta `NaN` como monto: `_gasto_validar` mira `< 0` y `_monto_en_base` no lo ataja sin conversión — el corte de `_pago_validar`; migración.
- **[—]** `pago_registrar_proyecto` no mira la regla `pagos` del flujo de repuestos (el del vehículo sí, con `_dinero_regla_activa`) y la pestaña «Pagos» del proyecto no la lee — decidir si se esconde o se apaga con su motivo, y frenarlo en la base.
- **[—]** Corregir o eliminar un pago sin confirmar de un proyecto cerrado pasa (una compra no: 23514) — decidir si el cierre congela los pagos sin confirmar; confirmar y anular no lo miran a propósito.
- **[—]** Repuestos: la policy de UPDATE de `repuestos_proyectos` pide `repuestos.editar` sin `repuestos.ver` (un `update` sin `where` no pasa por la de leer) y no mira proyecto cerrado ni eliminado — como el trigger `repuestos_item_escritura` de los ítems.
- **[—]** `lead_campo_impacto` lee los valores públicos de todos los leads aunque quien llama tenga `leads.ver` con alcance «propios»: acotando el rango se hallan los extremos de leads que no ve — contar con `_lead_visible_para` sin perder los de la papelera.
- **[—]** Anular o eliminar el último pago de un proyecto no toma sus ítems mientras uno entra a una fase que pide `proyecto.pago_cliente` (`cambiar_fase` toma el ítem `for no key update`) — carrera sin cubrir en `supabase/tests/areas/dinero/`.
- **[—]** `cotizacion_evaluar` con la hoja abierta reconstruye las tarifas en cada recálculo: una que confirma después de abrir la hoja con `cambiado_en` anterior cambia el cálculo sin aviso hasta guardar (crear sí compara la huella) — compararla también al recalcular, midiendo antes `medir-cotizacion-hoja.sql`.
- **[—]** Un pago confirmado con `confirmado_en` nulo (filas anteriores al sellado) no entra al «Margen del mes» ni a «sin venta» — un `check` con relleno, mirando antes los datos de producción.
- **[—]** Gastos y pagos viejos en otra moneda sin `tipo_cambio_id`: al corregirlos la base pide el tipo (`23502`, hint `tipo_cambio`) — revisar antes de cargar datos reales.

## Errores conocidos

- **[4-54]** Si se elige otro vehículo o cliente, o se crea un lead, mientras la hoja guarda, se guarda con el de antes sin tarjeta de éxito y puede quedar una cotización de más — la barra queda fuera de `[data-hoja]` y su `inert`; assert: o dice que se guardó o el panel no deja elegir.
- **[—]** Guardada: enviarla a la papelera, invalidarla o reactivarla descarta lo tipeado sin aviso (la `key` con `actualizadoEn` remonta la hoja); un guardado pendiente sobrevive al envío y, tras «Deshacer», da PT409 contra uno mismo.
- **[5a-39]** Equipo › «Dadas de baja» dice «Por ahora el equipo eres tú…» aunque haya personas en la lista: el aviso cuenta el equipo activo y no mira el filtro (`cabecera-equipo.tsx`).
- **[9-13]** `rbac_eliminar_rol` sobre un rol que figura en `fases_roles` o `fases_transiciones_roles` devuelve el `23503` crudo de la FK `restrict` — mensaje humano o quitar el rol de esas listas; migración.
- **[—]** `declaracion_leer` con un id que no existe da `55000` («record "s" is not assigned yet») en vez de `P0002`, y un enlace viejo muestra el error con «Reintentar» — el `if` lee `s.vehiculos` sin asignar; separar el «no existe».
- **[—]** El `23503` de crear un vehículo en una fase que se borra a la vez (`vehiculo_crear`) no se traduce a PT409.
- **[7-5]** (segunda mitad) La suscripción de la campana pedida sin red pone la barra «Sin conexión. No se pudo abrir esto.» aunque nadie abrió nada — una suscripción de fondo no avisa (`notificaciones/features/campana`).
- **[4-60]** La action que guarda una preferencia de lista no se reintenta si la red se corta a mitad de envío (`listas-por-pagina-pendiente.spec.ts`) — reintentar al volver la red.
- **[4-76]** El aviso de versión no sale si la hoja no tiene secciones (`SinDatosQueVer` corta antes); y en `cotizar-encima.spec.ts`, «sin envío» no tiene centinela y «otra persona» se simula con la dueña.
- **[—]** Un `22023` de `_formula_rechazar` cuyo `hint` es un nodo llamado `valor` se pinta bajo el campo «Valor nuevo» del ⚙.
- **[—]** Al descartar o publicar la fórmula, un error que no es PT409 ni falta de red muestra el mensaje de la base (guardar ya usa texto propio).
- **[—]** Tras pasar a stock, el estado derivado de la cabecera del proyecto de repuestos (pendientes) sólo se actualiza al volver a entrar.

## Deuda técnica

### Rendimiento y escala

- **[4-79]** `origenes_resumen()` cuenta con `count(*)` exacto vehículos y cotizaciones por origen, contra la regla de escala — `limit n + 1` por origen con `conteoCorto()`, o quitar el número.
- **[4-67]** El conteo de exportar (`contarLeadsHasta`) de una cartera recién sembrada de 5.001 elige `Seq Scan on leads` tras `analyze` (≈ 3 s) — cierre: páginas sin seq scan, que no crecen y bajo 50 ms en `db:medir:volumen`.
- **[4-77]** Cada lectura con la policy de `cotizaciones` paga ≈ 160–240 buffers fijos (`mis_permisos()`), sin reproducir — causa sin medir; arreglarlo toca una `security definer` de todas las policies.
- **[4-78]** Las listas del panel del vehículo de la hoja («Últ. cotización», «Cierre subasta» y su búsqueda) leen `from('vehiculos')` y recorren el origen para quien ve «propios» — pasarlas a rutas tipo `vehiculos_inventario()`.
- **[4-51]** El `on delete set null` de `cotizaciones.vehiculo_id` no tiene índice que lo sirva (todos son parciales): purgar un vehículo recorre `cotizaciones` — assert: `seq_scan` = 0 con 250.000.
- **[4-14]** La página profunda del historial de un vehículo muy cotizado ordena sus cotizaciones (crece con las de ese vehículo, no con N) — límite sin assert.
- **[4-65]** La pestaña de una clase de lead que quien mira no tiene recorre su cartera (hasta ≈ 400 ms con 80.000) — salida no hecha: copiar la clase en la cartera.
- **[5a-40]** La baja de 200.000 leads tarda 9 corridas y 15 s porque ningún update de `cartera` es HOT (11 btree) — un índice que sostenga lo ajeno sin nombrar la cartera, sin romper `medir-escala.sql`; la persona aceptó el número actual.
- **[6-5]** Medir `gastos_listar` y `pagos_listar` con volumen (≈ 50.000 filas, dueña con «todos» y una persona con «propios»): el filtro `en_cartera` por fila puede ir descartando al profundizar.
- **[8-13c]** Índice `(fase_id, fase_desde, id)` en `repuestos_items` si la Cadena de repuestos y los bloques de Inicio llegan a miles — hoy alcanza `repuestos_items_fase_id_idx`.
- **[—]** El editor de la fórmula tarda ≈ 1 s en abrir con 600 filas y ≈ 2 s con 2.000 (O(filas × nodos)) — una versión por lote de `textoVigente()`/`textoDeNodo()`.
- **[—]** El job de la papelera toma siempre los 50 lotes vencidos más viejos: 50 que no se pueden purgar del todo (pago, portal, comprobante) frenan para siempre a los nuevos; vale para los tres tipos.
- **[—]** `vehiculos_papelera_listar()` y `leads_papelera_listar()` usan el mismo `exists` por lote: sin medir si con poco volumen leen el índice entero.
- **[—]** `limpieza_avisar()` no tiene tope de filas revisadas — si crecen los retenidos, cota inferior o índice parcial.
- **[—]** El bloque «Leads sin seguimiento» de Inicio cuesta lo que pesa la cartera de quien mira; no se midió con volumen.
- **[4-73]** Presupuestos al borde: JS de `/cotizaciones/nuevo` 439,5 de 460 KB, la hoja 491 nodos de 500, la ficha del lead «Datos» 39,2 de 43 KB y «Oportunidades» 61,2 de 66 — lo nuevo se carga con `diferido()`; con la regla del 5 % se sube el tope.
- **[—]** Tope de 40 ítems por diseño: `subasta_usa` tiene 39 — para crecer, subir `_diseno_maximo_de_items()` y la constante midiendo la hoja, o partir la hoja.

### Archivos y funciones sobre el tope

- **[4-39]** `vehiculos/entities/vitrina.ts` (358), `leads/entities/alta.ts` (331) y `leads/entities/oportunidad.ts` (307) — partir por responsabilidad.
- **[4-43]** `e2e/leads-ficha-edicion.spec.ts` (331) — por tema: edición, borrador, sin red, permisos.
- **[4-46]** `supabase/tests/cotizacion-hoja.sql` (735) y `cotizacion-hoja-dato-del-vehiculo.sql` (340) — los ayudantes `pg_temp.ch_*` a un archivo que `probar-schema.mjs` cargue antes, y que `SOLO` sepa cargarlos.
- **[4-52]** `supabase/tests/medir-cotizacion-guardar.sql` (319) — en terreno/funciones y casos.
- **[4-56]** `e2e/soporte/cotizar-formula.ts` (332) — la fórmula de prueba, los orígenes y su limpieza, lo que se mira en la base.
- **[4-64]** En `supabase/tests/`: `cotizaciones-visibilidad` 1.931, `medir-escala` 1.047, `cotizacion-guardar` 764, `cotizacion-crear` 730, `publicar-diseno` 626, `derivados-leads` 493, `medir-publicar` 420, `medir-cotizaciones-lectura` 348; además `scripts/carreras.mjs` 422 y `eslint.config.mjs` 396.
- **[4-64]** Funciones SQL de más de 80 líneas: `cotizaciones_listado()`, `cotizacion_guardar`, `_cotizacion_hoja`, `cotizacion_encima`, `importacion_procesar_lote`, `lead_campo_guardar`, `origen_campo_guardar`, `_web_doc_nodo`, `_web_ajustes_objeto` — al tocarlas; partir una `security definer` mueve su inventario y carreras.

### Limpieza y código

- **[4-45]** `cotizaciones.moneda_mostrar` y `cotizaciones.plantilla_id` no tienen uso real (`moneda_mostrar` sólo viaja por `cotizaciones_listado()`) — migración que la recree sin ellas, con su medición y `db:types`.
- **[—]** `VAPID_PRIVATE_KEY` y `VAPID_SUBJECT` siguen en `esquemaDelServidor` (`src/shared/config/esquemas.ts`) y en `.env.example`, pero sólo los lee la función `push` — dejarlos sólo en `esquemaDeLasFunciones`.
- **[—]** Copias que deberían subir al núcleo o a `shared`: el esquema de la nota de publicar, `TOPE_DE_TONOS`, `FILAS_POR_PEDIDO`, `MARCAS_DE_GESTORES`, `valorTipeado`, `diasParaLaPurga`/`textoDePurga`, las lecturas de tonos, `normalizar` de la XCell y la subida por hash a bucket privado.
- **[—]** «Ver comprobante» duplicado en repuestos y logística (`ver-comprobante.ts` y `useComprobante.ver`); `XCell` no tiene `emptyLabel`.
- **[—]** Las guardas de áreas (`areas-de-cotizaciones`, `-flujos`, `-logistica`, `areas-b/areas-de-web`, `areas-c/areas-de-repuestos`) son cinco copias de la misma lógica, y los registros de `<Confirmar>`, `<Drawer>` y RPC paginadas están partidos en `areas-b/`, `areas-c/`, `*-formula.ts` y `*-papelera.ts` — unificar en una guarda parametrizada y un registro por módulo.
- **[—]** Repuestos sube imágenes con `subirPorHash` desde el hook — debería ir a `infra/items/imagenes.client.ts`.
- **[—]** Huérfanos de Storage: `storage_gc_encolar_huerfanos` sólo barre `vehiculos`; quedan los de `repuestos` y `cotizaciones` (subidas cuyo registro falló), imágenes de guías y fotos de testimonios web subidas y nunca guardadas.
- **[—]** El CSV de una importación que el job deja `fallida` tras 24 h sin avance no se borra (ni el objeto de un borrado fallido en el navegador), y un error que se repite reintenta cada 2 min esas 24 h.
- **[—]** La importación total lee «2.125» como 2125: un campo `numero` con 3 decimales y parte entera ≤ 3 dígitos escrito con punto no vuelve igual.
- **[—]** Las ramas `p_repuesto` de las RPC de logística sólo se prueban con filas sembradas por SQL (ninguna pantalla las usa); el e2e de compras no sube un comprobante.
- **[4-95]** El `creado_en` de una revisión es el `now()` de su transacción: «Ir a una fecha» puede dejar del lado equivocado una revisión de esa ventana — `clock_timestamp()` o saltar por `(creado_en, id)`, si alguna vez se ve.
- **[4-74]** `schemas/edicion.ts` acota `notas` con `.max(2000)`, que cuenta unidades UTF-16 mientras la base cuenta caracteres (un emoji cerca del tope da distinto); `cotizar-guardada-guardar.spec.ts` usa `waitForTimeout(600)`.
- **[4-98]** El PDF sale sin logo si el logo es WebP o un SVG con estilos, `use`, `mask`, `filter` o `<image>` (`logo-del-pdf.ts`) — convertirlo a PNG al subirlo.
- **[7-3]** El `aplicado_en` de `chat.participar` y `chat.moderar` en el catálogo dice «policy …» y no nombra las RPC que los exigen — dato de catálogo en una migración nueva.
- **[5a-42]** `medir-bajas.sql` falla sin regresión cuando el disco tarda en `fsync` (topes de tiempo) — juzgar el trabajo (40 lotes, ≤ 16 M buffers) y los tiempos sólo con la ventana sana (`pg_stat_checkpointer`, `/proc/pressure/io`).
- **[5a-43]** `medir-importacion-volumen.sql` falla si la segunda pasada es más rápida (banda 0,8–1,2) — tope de razón sólo por arriba y el mismo trabajo por fila en las dos pasadas.
- **[—]** `supabase/tests/medir-jobs.sql` corre la limpieza con `now() + 12 h`: entre las 12:00 y las 15:00 de La Paz no mide nada.
- **[—]** `fase_mover` con `orden` repetido previo y ancla compartida deja la movida detrás de la otra fase — desempatar si molesta.
- **[—]** `logistica/entities/dinero/reparto.test.ts` («para cualquier monto…», ~2700 casos) pasa de los 5 s de Vitest con la máquina cargada (`pnpm test` junto a `db:probar`) — menos casos o un `timeout` propio.
- **[—]** `e2e/cotizaciones-listado.spec.ts` E6 y E8 fallan a veces en el CI y pasan en local: la tecla N abre `panel=nuevo-lead` en vez de la hoja, y «Ver todas» pierde `clase=preventa` — esperar la hidratación o el `href` ya filtrado antes de actuar.

### Límites aceptados

- **[T02]** Una no ganada en una fase de subasta que no es la inicial queda retenida de la limpieza por «fase» o «bloqueo», como hoy.
- **[—]** Un aviso de limpieza no se repite tras quitar «Conservar» o restaurar; con `aviso_dias` > 90 un vencimiento puede avisar dos veces.
- **[—]** Tablero: «Finales» cuenta por cohorte de creación, porque no hay fecha de marca final.
- **[—]** `cambiar_fase` acepta `p_fase_esperada` nulo; despublicar no revoca la URL de una foto; «Ver como» acota la interfaz, no las filas.
- **[—]** `storage-gc`, `apibara` e `importar-csv` (Deno) quedan fuera de lint y typecheck; `lead_dormido_meses` y `demora_dias_default` no tienen interfaz (nada lee `lead_dormido_meses`).
- **[—]** Borrar una naviera mientras se aplica un grupo puede dar un `40P01` raro (carrera aceptada, sin cubrir).

## Pulido de interfaz

- **[4-20]** Ancho contra altura del aviso de escritorio: a 22 rem, al 200 % tapa texto de la última fila de una lista — decidir (ancho, angosto o que se aparte) y afirmarlo en `e2e/avisos-con-descripcion.spec.ts` (`--ancho-del-aviso`; `avisosAbajo()` cambia con el ancho).
- **[R7]** Blancos táctiles bajo 44 px en componentes de toda pantalla (`Tabs`, `Switch`, `Checkbox`, `Popover` de Roles, «Nuevo lead» del marco, «Saltar al contenido», «Abrir» de las listas, el botón de 32 px): 121 en `BLANCOS_CONOCIDOS` — rediseño; se cierra vaciando la lista.
- **[R7]** R7 sólo es dura en `RUTAS_DE_LAS_FASES_5_A_9` (`e2e/soporte/accesibilidad-conocidos.ts`); fuera quedan 5 blancos (`/`, `/leads` ×2, `/leads/[id]` → `tel:`, `/configuracion/origenes/[id]`) — se cierra ampliándola a toda la app.
- **[4-50]** El resumen fijo de la hoja no cabe entero al 200 % con la página arriba (empeoró con la barra del cliente).
- **[4-47]** La ayuda de una tabla corta en 1.000 filas sin enlace al editor, y una tabla congelada sin copia viva sale con claves en vez de etiquetas — falta el enlace y congelar `columnas` (espera a la baja de tablas).
- **[4-61 a 4-63]** El segundo «atrás» tras recargar desde una pestaña de la ficha deja el foco en `body` (comprobar si sigue; anotar y agendar ya van por `abrirConVuelta`).
- **[—]** `LugarDelAjuste` no recuerda la última celda: el panel del ⚙ no se desliza y el foco se devuelve a mano; tras publicar o descartar el borrador de la fórmula, el foco cae al `body`.
- **[—]** Panel de la unidad: «Qué falta» deja un hueco vacío arriba del primer destino y de «Desde esta fase no hay a dónde mover.».
- **[—]** El resumen del contenedor pone «Mover el grupo» debajo de toda la lista: con 8 unidades hay que desplazar para llegar a «Marcar que llegó».
- **[—]** `/logistica/embarques` › Contenedores dice «Las primeras.» sobre la lista sin decir de qué.
- **[—]** El margen sin gastos dice «Real USD 0,00» junto a «Sin venta registrada» y parece un costo cargado — «Sin gastos» lo diría sin cifra.
- **[—]** La cadena de la dueña: en el celular las pestañas de origen parten en dos líneas y la última queda cortada; en escritorio la tercera columna se corta sin indicio de que se desplaza.
- **[—]** El inspector de fase no se miró al 200 % (los bloques anidados miden con `minmax(0, 1fr)`).
- **[—]** Al 200 % la burbuja del chat puede tapar la última línea de una página.
- **[—]** Las 200 compras por proyecto llevan `<AvisoDeTope>` sin camino a lo antiguo — filtro por fecha si aparece.
- **[—]** En un campo privado de cartera, los avisos de rango y de opciones que sacas cuentan sólo los leads de tu cartera y no lo dicen (`resumenDeImpacto` de leads).

## Fuera de alcance

- Multiidioma. Offline real (modo sin conexión y sincronización en segundo plano). Editor de artes (Konva). Directorio de contactos/empresas.
- API de WhatsApp/Meta. Multi-empresa por despliegue.
- La web pública en sí (repo aparte con `sitio-marketing` sobre el esquema `web`).

De esta versión, además: línea de tiempo dentro de las fichas (hay «Ver actividad» en el «⋯»), exportar la actividad; cambiar qué permisos
existen o la matriz de Roles; cambiar embudos ya existentes (la plantilla sólo toca los que nacen después); exportar seguimientos,
documentos, fotos o repuestos y formatos que no sean CSV; importar `seguimientos`, `repuestos_items` y cotizaciones, y deshacer una
importación de vehículos; métricas por asesor para quien no tiene `tablero.metricas.ver`; editar la cola desde el tablero; estabilizar
inestables; specs nuevos al 200 % y lectores de pantalla reales.

Si algo de esta lista se vuelve necesario, se discute y se agrega explícitamente; no se cuela dentro de otro trabajo.
