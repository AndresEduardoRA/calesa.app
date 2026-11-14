# Tanda de 19 mejoras

> El único lugar de progreso de la tanda: una casilla por PR, `[x]` sólo con el PR integrado, `[!]` si quedó en `docs/PENDIENTES.md`.
> Una sesión nueva retoma desde la primera casilla abierta. Se borra en el último PR (F).

## Contexto

La persona pidió 19 mejoras con las decisiones de producto ya tomadas: avisos con salida, un visor de imágenes, «visto» por módulo,
zona horaria, vehículos, leads, cotizaciones y una logística nueva para cientos de miles de unidades. Cada una es una actualización
propia (`docs/FLUJO.md`): su rama, su PR con auto-merge y el CI en verde. La tanda termina cuando todo está integrado en `main` o anotado en
`docs/PENDIENTES.md` con su motivo. Aquí se marca cada casilla al
integrar y de ahí retoma una sesión nueva.

**Estado al planificar (2026-11-14).** `estado.sh` dio la rama `main` limpia, ningún PR abierto, el CI de `main` en verde y la noche en
verde. Además encontré el **orquestador** (`../orquestador-importadora`) trabajando en estas mismas mejoras: una cola de 22 tareas, con T01,
T02 y T03 corriendo. La persona eligió pausarlo y que la tanda la haga esta sesión. Para el lead en D1 eligió que el valor inicial sea
«obligatorio», como hoy.

## Paso 0 (hecho, 2026-11-14)

- El orquestador (`../orquestador-importadora`) quedó **en pausa**, con T01–T03 cortadas y sus carriles bajados. Lo no commiteado de T01 y T03,
  en `~/respaldos-tanda/`. T01 → A1a, T03 → C1, T02 no se usa (choca con B5). En F: `./orquestador.sh omitir` de T01 a T22.
- Un PR a la vez en el checkout principal; el siguiente arranca mientras corre el CI del anterior sólo si no depende de él.

## Reglas de la tanda (las del pedido, sin repetirlas todas)

- Orden A → E. Lo de A (`<Aviso>` con salida, visor, «visto», zona) se usa en todo lo que viene después.
- **Términos:** primero la entrada en `GLOSARIO.md` y después ese nombre en tablas, tipos y UI. El glosario ya tiene «Teléfono extra», así
  que C1 dice **teléfono extra**, nunca «número adicional». Una pantalla que cambia actualiza su fila de `UX.md`; una decisión que reemplaza
  otra edita la suya en `DECISIONES.md`.
- **Permisos nuevos:** van en `CLAVES_PERMISO` (`src/shared/lib/permisos.ts`) y en la fila de `permisos` (migración y `seed.sql`, con
  `por_origen`). La matriz los toma sola (`equipo/entities/matriz.ts`). En la UI se usa `puede()` y en la base, `assert_permiso` o RLS.
  La **migración de datos** les concede la clave nueva a quienes tenían la vieja, así que nadie pierde lo que hoy puede hacer.
- **Escala:** toda lectura nueva va por cursor, con su tope e índice nombrado. Ningún total exacto se muestra: se usa `conteoCorto()`
  («999+») o «≈». Lo que agrega una consulta a una lista se mide en `db:medir:volumen` y entra al presupuesto de `RENDIMIENTO.md`.
- **Nivel 1 por PR:** `lint`, `typecheck` y `test`. Con SQL, además `db:reset`, `db:types` y `db:probar:rapido`. Siempre los e2e dirigidos
  que nombra cada PR, más `movil` si toca interfaz. Lo de datos, dinero o permisos pasa por el agente `revisor` antes de publicar. Lo que
  toca `src/shared`, RLS, tablas o el shell dispara el completo en el CI, no en local.
- **Recorrido** (en B2, C1, D2, E1, E2 y en toda pantalla rediseñada): `pnpm dev`, entrar como dueña y como un rol limitado, recorrer el
  flujo en escritorio y en celular, y tomar capturas con `E2E_CAPTURAS`, que se miran con `hoja-de-contacto.mjs`. Lo que funciona queda como
  spec.
- **Si me trabo:** lo anoto en `PENDIENTES.md` con lo que intenté, lo marco `[!]` aquí y paso al siguiente.
- **Diseño:** antes de B y de E cargo la skill `frontend-design:frontend-design`, `design/tokens.css` y `src/shared/ui`. Ningún estilo
  sale del sistema.
- **Sin dependencias nuevas** (sumarlas es de la persona): el carrusel se hace con `scroll-snap` y eventos de puntero, sin librería.

---

## Fase A: base compartida

### [x] A1a · Avisos con salida: el patrón y los vehículos (`feat(shared): dar salida a los avisos de bloqueo`)

- **Base:** la rama de T01 (`feat/avisos-con-acciones`), terminada.
- **Contrato con la base:** `_vehiculo_bloqueo(v, al_enviar) → {causa, motivo}`; `_vehiculo_motivo_de_bloqueo` queda como su texto. El 23514 de
  enviar a la papelera lleva la causa en `hint` y `vehiculos_papelera_enviar()` la suma a cada rechazado. `vehiculos_con_lead_visible(p_ids)`
  (≤ 200, por PK) decide si «Ver el lead» se ofrece.
- **Cliente:** `ErrorApp.causa`; las acciones son datos (`src/shared/lib/acciones-del-aviso.ts`: `ir`, `panel`, `reintentar`, `deshacer`,
  `recargar`), `resolverAcciones()` filtra por permiso, hasta 3, la que destraba primero. Se dibujan con `<AccionesDelAviso>`,
  `avisarError(error, { acciones })` o líneas del «⋯». Sin permiso para la que resuelve: «Para <verbo>, pídeselo a quien administra los roles.».
- **Vehículos:** papelera apagada por vínculo → «Quitar el vínculo» (ficha, `?panel=desvincular&luego=papelera`; el aviso de desvinculado
  ofrece «Enviar a la papelera») y «Ver el lead»; por fase, pagos o aduana → «Ver en logística»; documentos, comprobante o final, repuestos → su
  pestaña. Conflicto en la ficha → «Ver los cambios» y «Recargar».
- **e2e:** `vehiculos-papelera`, `vehiculos-vinculo`, `vehiculos-menu-orden`, `vehiculos-resumen`, `vehiculos-vitrina`, y el nuevo
  `vehiculos-aviso-con-acciones`.
- **Docs:** este archivo, GLOSARIO («Aviso con acciones», «Causa de bloqueo»), DECISIONES › Interfaz, `ui.md` («Avisos con acciones»).

### [ ] A1b · Avisos con salida en el área comercial (`feat(app): dar salida a los avisos del área comercial`)

- **Leads:**
  - Papelera: `_lead_motivo_de_bloqueo`, `_lead_motivo_de_restaurar` y `_lead_motivo_para_deshacer`, con código. «Tiene un vehículo
    vinculado» ofrece «Ver vehículo» y «Desvincular».
  - `_oportunidad_motivo`.
  - El teléfono que «Lo tiene <persona>» ofrece «Escribirle por chat» y, si se ve, «Abrir lead» (4-66 de PENDIENTES).
- **Cotizaciones:**
  - Los rechazos de la papelera (`cotizaciones_papelera_enviar`, que ya trae `codigo` y `motivo`).
  - Final sobre otra activa (23505): «Ver la final».
  - `falta_vehiculo` y `falta_lead`: «Elegir vehículo» y «Elegir cliente», que abren el panel.
- **Equipo:** dominancia (`rbac_*`, `equipo_bloquear`): «Lo puede hacer quien tenga <permiso>».
- **Empresa y orígenes:** `origen_eliminar` con uso ofrece «Desactivar»; `_nivel_motivo_de_uso`, «Ver dónde se usa».
- **Migración:** `avisos_codigos_comerciales` (sólo `hint` y `detail`; mismos textos).
- **e2e:** `leads-papelera*` (grep), `leads-oportunidades`, `leads-ficha-telefonos`, `cotizaciones-final-marcar`, `cotizar-hoja`,
  `roles-niveles`, `configuracion-origenes*`.

### [x] A1c · Avisos con salida en la operación (`feat(logistica): dar salida a los avisos de logística y flujos`)

- **Logística:** cada unidad que no se movió en un lote ofrece «Abrir la unidad»; el error al leer un destino de mover, «Reintentar»; «Editar
  grupo» sin navieras, «Cargar navieras» (con `logistica.catalogos.gestionar`).
- **Flujos:** una fase jubilada ofrece «Reactivar» en su panel; la oferta de transporte sin puertos o navieras, «Cargar puertos» / «Cargar
  navieras» (con `logistica.catalogos.gestionar`).
- **Ya cumplían** (revisado): «Qué falta» y el rechazo de mover (atajo al hueco de cada requisito), los conflictos (`AvisoDeConflicto`), la
  agenda y el chat (sólo errores de red, con «Reintentar»). A `docs/PENDIENTES.md`: los enlaces del bloqueo de eliminar una fase y tres casos raros.
- **e2e:** `logistica-lote`, `logistica-mover`, `logistica-transporte`, `configuracion-flujos-reglas`, `configuracion-flujos-fases`.

### [x] A2 · Visor de imágenes (`feat(shared): ver las fotos en un visor con carrusel`)

- `src/shared/ui/visor-de-imagenes/`: `<CarruselEnElLugar>` (portada y, al acercarse, el resto; flechas, puntos, gesto; `modo="abrir"` donde no
  caben flechas de 44 px), el visor (`?visor=<clave>&foto=<n>`, ← → Esc, «3 de 12», miniaturas, la grande sólo la actual y sus vecinas) y
  `useVisorDeGaleria()`.
- **Vehículos:** fila y tarjeta abren el visor (B2 agranda la tarjeta y le pone el carrusel); cabecera de la ficha y del resumen, carrusel de
  160 px; «Fotos» del resumen abre el visor en la tocada. **Repuestos:** las imágenes de un ítem. La barra de la hoja de cotizar queda con la
  miniatura fija (JS en el tope); la edición de fotos y la foto de un testimonio (un campo de un formulario) no cambian.
- **e2e:** `vehiculos-resumen` (con el recorrido del visor), `vehiculos-fotos`, `vehiculos-tarjetas-200`, `repuestos-proyecto`, `presupuesto-js`.

### [ ] A3a · Visto y último visto: base, preferencias y vehículos y leads (`feat(equipo): recordar lo visto por persona y módulo`)

- **Tabla nueva `vistos`:**
  - Columnas `(usuario_id, modulo, tipo, referencia_id, visto_en)`, con PK `(usuario_id, modulo, tipo, referencia_id)` e índice
    `(usuario_id, modulo, tipo, visto_en desc)` para el último.
  - RLS de fila propia en las cuatro operaciones; escritura sólo por RPC.
  - `visitados` no se toca.
- **RPC:**
  - `visto_registrar(p_modulo, p_tipo, p_id)` hace un upsert que no escribe si `visto_en > now() - 30 s` (antirrebote en la base). El
    cliente además espera 1 s y descarta repetidos.
  - `vistos_de(p_modulo, p_tipo, p_ids uuid[])` acepta ≤ 100 ids y lee por la PK. Devuelve `{id, visto_en}` más el id del último visto
    del módulo (por el índice, `limit 1`). Es una sola llamada por página dibujada.
- **Preferencias:** la clave `vistos` en `preferencias_usuario` guarda `{activado: true, dias: 7, ultimo: true}`, con un `check` de
  `dias ∈ {7,30,90,365}`. En `/perfil` va un bloque «Vistos» en `PreferenciasPerfil`.
- **Purga:** el job `vistos-purgar` (diario, por lotes de 5.000 y con tope por corrida, como `actividad_purgar`) usa los días de cada
  persona.
- **UI:**
  - `useVistos(modulo, tipo, ids)` en `src/shared/ui/lista`. La fila suma `data-visto` (texto apagado) y `data-ultimo-visto` (borde de
    acento y la etiqueta «Último visto» para lectores de pantalla). No depende sólo del color.
  - «Visto» = abrir la ficha o el resumen de **ese** módulo.
  - Desactivado: ni se escribe ni se lee.
- **Este PR aplica a** `/vehiculos` y `/leads`.
- **Migración:** `equipo_vistos` (tabla, RLS, grants, RPC, job y `check`). Pide `humo.sql` y una prueba en
  `supabase/tests/areas/equipo/vistos.sql` que pruebe que nadie lee lo de otro.
- **Medir:** `medir-vistos.sql` con 200.000 filas por persona: la lectura por ids y la del último, sin crecer con N.
- **e2e:** `leads-listado`, `vehiculos.spec`, `perfil-*`. Un camino feliz nuevo `vistos.spec.ts`.
- **Docs:** GLOSARIO («Visto», «Último visto») y RENDIMIENTO.

### [ ] A3b · Visto en el resto de las listas (`feat(app): marcar lo visto en todas las listas`)

- Cotizaciones, agenda (eventos y tareas), repuestos (proyectos), notificaciones (abrir una = vista) y logística (aplica cuando exista la
  lista de E1; hasta entonces, `/logistica/vehiculo/[id]` registra).
- **e2e:** `cotizaciones-listado`, `agenda`, `repuestos-*` del listado, `notificaciones-campana`.

### [x] A4a · Zona horaria de las fechas de subasta (`feat(shared): mostrar la zona de las fechas de subasta`)

- `fechas.ts`: `formatearFechaHoraConZona()`, `abreviaturaDeZona()`, con tests del cambio de horario de EE. UU. (la hora que no existe y la
  repetida). `useRegional().zonaDeLaPersona` (preferencia `zona_horaria`, `/perfil` › «Zona horaria»; sin elegir, la de la empresa).
- `<FechaDeSubasta>` (vehículos): la fecha en la zona de quien mira con su abreviatura y, en el tooltip (y debajo en la ficha), la hora del
  patio (`zonaDelPatio()` desde `ubicacion_estado`) y la de la empresa. En `BloqueDeSubasta`, el panel de cotizar y el chip de la agenda.
- Sin migración: apibara no da la zona; `subasta_zona` sigue sin uso. **e2e:** `cotizar-panel-del-vehiculo`, `agenda`, `perfil-*`, `presupuesto-js`.

### [ ] A4b · Editar las fechas de subasta en su zona (`feat(vehiculos): editar las fechas de subasta en su zona`)

- `subasta_en` y `subasta_fin_en` editables en el panel de edición de un vehículo de origen subasta (lista cerrada de `vehiculo_guardar`),
  con un campo que dice «Se escribe en hora de <zona> (GMT−4)» y guarda en UTC (`instanteDeLocal`). Refrescar sigue mandando.
- **Migración:** `vehiculos_subasta_editable`. **e2e:** `vehiculos-alta`, `vehiculos-resumen`.

---

## Fase B: vehículos (antes, la skill de diseño)

### [x] B1 · Quién da de alta y cómo (`feat(vehiculos): separar el alta suelta del alta desde cotizar`)

- **Permisos:** `vehiculos.crear` pasa a ser «alta suelta». La clave nueva `vehiculos.crear.desde_cotizar` (por origen) se concede en la
  migración a todo rol y origen que hoy tiene `vehiculos.crear`.
- **Contexto en la base** (se escribe en DECISIONES):
  - `vehiculo_crear(…, p_contexto text default 'suelto')`, con `check` en `('suelto','cotizar')`, exige la clave que corresponde.
  - La columna `vehiculos.creado_desde` deja la marca.
  - Es un límite de flujo, no de seguridad dura: quien tiene la clave de cotizar puede crear un vehículo marcado `cotizar`, y eso queda
    en la columna y en Actividad. El otro camino, crear el vehículo recién en `cotizacion_crear(p_vehiculo_nuevo)`, se descarta, porque
    la hoja necesita el vehículo elegido antes de guardar.
- **UI:**
  - Sin alta suelta, «Nuevo» de `/vehiculos` aparece apagado con su motivo y el CTA «Cotizar un vehículo nuevo» (abre
    `/cotizaciones/nuevo?origen=` con el panel en alta), si tiene la otra clave. Si no tiene ninguna, no aparece.
  - El atajo `N` sigue la misma regla.
  - El panel de cotizar ofrece «+» y «Traer» sólo con `desde_cotizar`.
  - `crearVehiculo` recibe el contexto y lo valida con Zod.
- **Migración:** `vehiculos_alta_por_contexto` (clave, concesión, columna y RPC). Pruebas SQL: las cuatro combinaciones de claves.
- **e2e:** `vehiculos-alta`, `cotizar-panel-crear-vehiculo`, `roles-*` (la matriz muestra la clave).

### [ ] B2 · Tarjetas o tabla, y la columna de subasta (`feat(vehiculos): elegir la vista del inventario y nombrar la puja`)

- **Conmutador «Tabla | Tarjetas»:**
  - En escritorio, en la barra del listado. La preferencia es `vehiculos.vista` en `preferencias_usuario`, con `?vista=` en la URL para
    compartir.
  - El servidor sigue dibujando **una sola vista** (`UnaSolaVista` recibe la elegida); bajo 768 px, siempre tarjetas.
  - Las tarjetas usan el visor de A2 y el «visto» de A3.
- **La columna «Precio» en un origen de subasta:**
  - El encabezado es «Puja actual», y la celda de una subasta `terminada` o `vendida` lleva el rótulo «final».
  - En la tarjeta, el rótulo completo: «Puja actual» o «Puja final».
  - El tooltip dice «Es la puja de la subasta, no el precio del vehículo».
- **e2e:** `vehiculos.spec`, `vehiculos-por-pagina`, `vehiculos-tarjetas-200`, `listas-por-pagina-volumen` (nodos con tarjetas en
  escritorio).
- Lleva **recorrido** con capturas.
- **Docs:** GLOSARIO («Puja actual», «Puja final») y la fila de UX.

### [x] B3 · Vitrina desde la lista (`feat(vehiculos): publicar en la web desde la lista`)

- El estado de vitrina ya estaba en cada fila (`InsigniaDeVitrina`); se suma el toque: «Publicar» o «Sacar de la web» con «Deshacer» por
  `vehiculo_vitrina` con la versión de la fila (`vehiculos.vitrina` del origen). Sin precio público, el panel chico `?panel=vitrina-rapida&para=`
  pide sólo el precio («Publicar sin precio» deja «Consultar»). La base no exige nada más para publicar (`DECISIONES.md`).
- **e2e:** `vehiculos-vitrina` (con el toque desde la lista), `vehiculos`.

### [ ] B4 · Cotización aprobada (`feat(cotizaciones): aprobar una cotización por vehículo`)

- **Datos:**
  - `cotizaciones.aprobada boolean`, con un índice único parcial `(vehiculo_id) where aprobada and eliminado_en is null`.
  - `cotizacion_crear`: la primera viva del vehículo nace aprobada; las demás, sin aprobar.
  - Enviar a la papelera a la aprobada no traslada la marca (queda sin aprobada hasta que alguien apruebe).
- **Permiso y RPC:**
  - La clave nueva `cotizaciones.aprobar` (por origen) se concede a quien tiene `cotizaciones.final.gestionar`.
  - `cotizacion_aprobar(p_cotizacion, p_actualizado_en_esperado)` exige esa clave. Toma el vehículo y después las cotizaciones (mismo
    orden que la final), desmarca la anterior y mueve la versión de las dos.
- **En la lista de vehículos:**
  - La columna «Aprobada» la lee `cotizaciones_aprobadas_de(p_vehiculos uuid[])`, con ≤ 100 ids, por el índice único y con la RLS y el
    nivel de quien mira (definer que pregunta por fila). Es una llamada por página.
  - Muestra `total_base` con `<Monto>` en la moneda base, nunca la fórmula.
  - Sin `cotizaciones.ver` del origen, la columna no se dibuja.
- **Se descarta denormalizar en `vehiculos`:** el total se filtraría a quien no ve la cotización.
- **La marca «Aprobada»** (`<Badge>`) se ve en la cotización, en su lista y en las pestañas de cotizaciones del vehículo y del lead.
- Final y aprobada son conceptos distintos: la final la sigue gestionando `cotizacion_marcar_final`.
- **Migración:** `cotizaciones_aprobada` (columna, índice, rellenar la más nueva viva de cada vehículo como aprobada, clave, concesión y
  RPC). Pruebas SQL, `db:carreras` (dos que aprueban a la vez) y `medir-cotizaciones-aprobadas.sql`.
- **e2e:** `cotizaciones-listado`, `vehiculos-cotizaciones`, `cotizar-hoja`, `vehiculos.spec`.
- **Docs:** GLOSARIO («Cotización aprobada»), COTIZADOR y DECISIONES.

### [ ] B5a · La fase que no cuadra con la subasta (`feat(vehiculos): avisar cuando la fase no cuadra con la subasta`)

- **Configuración:** la columna nueva `fases.es_de_subasta boolean default false`, que se marca en el panel de la fase de
  `/configuracion/flujos` (`DatosDeLaFase`) como «Cuenta como en subasta». Es por fase, así que queda por flujo.
- **Regla en la base:** `_subasta_descuadre(p_es_de_subasta, p_estado_subasta) returns text`, un código o nulo. Hoy es
  `subasta_terminada` cuando la fase es de subasta y `estado_subasta ∈ (terminada, vendida)`, y se puede extender.
  - El inventario la devuelve por fila sin releer la fila: une `fases` (decenas de filas) en la misma ruta.
  - `logistica_unidad` también la devuelve.
- **Sólo se avisa:**
  - `<AvisoDeDescuadre>` explica las dos fuentes («La fase dice <fase>; la subasta terminó el <fecha con zona>»).
  - Ofrece «Mover de fase» (abre mover con vista previa), «Refrescar subasta» y «Ver en logística», cada una con su permiso.
  - Va en la ficha, en la unidad de logística, en cotizar y como ícono con tooltip en la fila y la tarjeta.
- **Migración:** `flujos_fase_de_subasta`. Pruebas SQL de la regla y `medir-vehiculos-inventario` sin regresión.
- **e2e:** `vehiculos-resumen`, `logistica-unidad`, `cotizar-panel-del-vehiculo`, `configuracion-flujos*`.
- **Docs:** GLOSARIO («Fase de subasta», «Descuadre de subasta»).

### [ ] B5b · Filtro por fase (`feat(vehiculos): filtrar el inventario por fase con «Sin fase»`)

- El inventario ya acepta `columna_en` sobre `fase_id` con `incluirNulo`, y la URL ya tiene `fase`. Se verifica la UI y se suma «Sin
  fase», con las opciones de las fases del flujo del origen.
- Índice `vehiculos_origen_fase_creado_idx (origen_id, fase_id, creado_en, id) where eliminado_en is null`, sólo si
  `medir-vehiculos-inventario` muestra que la ruta filtrada recorre de más.
- **e2e:** `vehiculos.spec`, `barra-de-filtros-vehiculos-200`, `vehiculos-inventario-postgrest`.

### [ ] B6 · Cotizar con la subasta vencida (`feat(cotizaciones): avisar al cotizar con la subasta vencida`)

- **Cuándo:** al elegir o abrir en la hoja un vehículo de origen subasta con `estado_subasta ∈ (terminada, vendida)`, o con
  `cierre_subasta_en` pasado.
- **El aviso** (de A1) dice «Ya no está en subasta: terminó el <fecha y zona de A4>» y ofrece:
  - «Refrescar subasta» (la misma tubería de la ficha, desde el navegador);
  - «Cotizar igual» (cierra el aviso para esa hoja);
  - «Elegir otro vehículo» (abre `?panel=vehiculo`);
  - «Ver vehículo».
- No bloquea guardar.
- Va en la barra (`vehiculos/pantallas/cotizar`), con los datos que la barra ya lee.
- **e2e:** `cotizar-panel-del-vehiculo`, `cotizar-hoja`.
- **Medir:** el JS de `/cotizaciones/nuevo` (439,5 de 460 KB). Si pasa, sube con la regla del 5 %.

### [ ] B7 · Relaciones lead ↔ vehículo (`feat(vehiculos): mostrar las relaciones entre leads y vehículos`)

- **Sección «Relaciones»** en `vehiculos/features/vinculo/`, igual en la ficha y en el resumen de los dos lados, sin entrar a pestañas.
  La compone `src/app`; `leads` no importa `vehiculos`.
- **Grupos:** «Vinculado», «Interesados» y «Cotizado» (leads o vehículos con cotización que quien mira ve). Cada uno con conteo con tope
  (`conteoCorto`, 100+) y sus 3 primeros.
- **Lecturas:** reutiliza `lead_vehiculos()` (ya trae 101), `vehiculo_vinculos()` y `vehiculo_interesados()`, y para «Cotizado» el
  historial de cotizaciones por `cotizaciones_vehiculo_creado_idx` y `cotizaciones_lead_creado_idx`. Ninguna lee `leads` directo.
- **Acciones según permiso:** vincular, marcar interesado, quitar e ir al otro lado.
- **e2e:** `vehiculos-vinculo`, `vehiculos-resumen`, `leads-ficha`, `leads-rapido-*` del resumen.

---

## Fase C: leads

### [ ] C1 · Teléfonos extra desde el resumen (`feat(leads): agregar teléfonos extra desde el resumen`)

- **Base:** la de T03, revisada.
- **Configuración** en `ajustes_leads`:
  - `telefonos_extra_tope smallint default 6 check (1..10)`. Reemplaza el 10 fijo de `lead_telefono_guardar`; quien ya tiene más
    conserva los suyos y sólo «agregar» frena.
  - `telefonos_extra_con_regla boolean default false`.
  - Se edita en `/configuracion/leads`, en la sección de teléfonos (`leads.configurar`).
- **Con la regla encendida:**
  - Un teléfono extra es único entre los leads vivos, contra los principales y los extras. La RPC toma un candado consultivo por número
    y usa el índice de `leads_telefonos(telefono)`.
  - Se verifica mientras se tipea con `useVerificarTelefono`.
  - Se enmascara fuera de la cartera y el buscador lo trata como al principal (nunca un oráculo fuera de la cartera).
- **Duplicados existentes al encender la regla:** no se rompe nada.
  - La sección lista «Teléfonos repetidos» por cursor (`telefonos_repetidos(p_cursor)`, con tope, sin total), con «Ver lead» por
    lado.
  - Sólo frena el alta o el cambio nuevos.
  - Queda escrito en DECISIONES.
- **Permiso:** la clave nueva `leads.telefonos.agregar` se concede a quien tiene `leads.editar`. Sigue siendo clase 1: cartera y permiso.
- **UI:** el bloque de `features/ficha/components/telefonos-extra.tsx` va también en `edicion-del-resumen.tsx` y en
  `cuerpo-del-rapido.tsx`.
- **Migración:** `leads_telefonos_extra_configurables`. Pruebas SQL (tope, regla, candado y `auditoria-leads.sql`) y `db:carreras`
  (dos altas del mismo número).
- **e2e:** `leads-ficha-telefonos`, `leads-rapido-editar`, `leads-alta-un-drawer`, `configuracion-leads*` (grep).
- Lleva **recorrido** con capturas.

### [ ] C2 · Último seguimiento y recordatorio en la lista (`feat(leads): mostrar el seguimiento y el recordatorio en la lista`)

- **Columnas mantenidas por trigger:**
  - `leads.ultimo_seguimiento_tipo_id`, junto a `ultimo_seguimiento_en`, que ya existe. Fuera de `lead_version()` y de la auditoría.
  - En `leads_asesores` (por persona y lead, porque los recordatorios son personales): `proximo_recordatorio_en` y
    `ultimo_recordatorio_cumplido_en`, por un trigger en `recordatorios`.
  - `leads_vista` y `leads_cartera_vista` las exponen; se recrean con `_leads_vista_crear()`.
- **Ordenar por «Próximo recordatorio»:** índice `(usuario_id, proximo_recordatorio_en)`.
- **UI:**
  - «Último seguimiento»: «hace 3 días · Llamada».
  - «Recordatorio»: «en 2 días», «vencido hace 3 h» en rojo con texto, nunca sólo color, o el último cumplido.
  - En el embudo, en la tarjeta, si cabe.
- **Migración:** `leads_seguimiento_y_recordatorio_en_la_lista`. Pide `db:probar` **completo**, porque toca la vista de leads, y
  `medir-escala` sin regresión.
- **e2e:** `leads-listado`, `leads-listado-filtros`, `leads-rapido-seguimientos`, `leads-embudo`.

### [x] C3a · La oportunidad base al nacer (`feat(leads): crear la oportunidad base al dar de alta un lead`)

- `_lead_crear` crea en la misma transacción una oportunidad en `_embudo_defecto_de(creador)`, en la etapa `es_inicial`. Cubre
  `crear_lead`, `leads_importar_lote` y la importación de «Datos»: todo pasa por `_lead_crear`, que exige una sesión (la web no da de alta
  leads sin una persona), y se verifica.
- **Migración:** `leads_oportunidad_base`. Pruebas SQL del alta, la importación con su reintento, deshacer y el limbo, y `medir-bajas` sin
  regresión.
- **e2e:** `leads-alta-un-drawer`, `leads-oportunidades`, `leads-importar*` (grep).

### [ ] C3b · «Nueva oportunidad» desde la fila (`feat(leads): crear una oportunidad desde la fila`)

- En el «⋯» de la fila y la tarjeta, un popover con embudo y etapa preseleccionados (el de por defecto y la inicial) y un clic, por
  `oportunidad_crear`, más el aviso con «Ver oportunidad».
- **e2e:** `leads-listado`, `leads-oportunidades`.

---

## Fase D: cotizaciones

### [ ] D1 · Vehículo y lead obligatorios por rol y origen (`feat(cotizaciones): exigir vehículo y lead por rol y origen`)

- **Cómo se expresa:** los permisos se suman, así que la regla se escribe como libertad. Las claves nuevas por origen son
  `cotizaciones.sin_vehiculo` («Puede guardar sin vehículo») y `cotizaciones.sin_lead` («Puede guardar sin cliente»). Sin la clave, es
  obligatorio. Se escribe en DECISIONES y reemplaza la entrada del ajuste global.
- **Migración de datos:**
  - Si hoy `vehiculo_obligatorio_al_cotizar = false`, `sin_vehiculo` se concede a todo rol y origen con `cotizaciones.crear`.
  - `sin_lead` no se concede a nadie, porque hoy el lead es obligatorio (decisión de la persona).
  - Se quita la columna de `ajustes_empresa`, su campo en «Ajustes de cotización» y su uso en `cotizacion_crear`, `cotizacion_encima`,
    `cotizacion_hoja` y `_cotizacion_cadena`.
- **Una cotización sin lead** (cuando alguien tenga la clave):
  - La ven su creador y quien tiene alcance «todos» en `cotizaciones.ver` del origen.
  - Marcar final sigue pidiendo lead.
  - Se revisa la policy de `cotizaciones` y `cotizaciones-visibilidad.sql`.
- **La hoja** lo dice antes de guardar (`FALTA_EL_VEHICULO` y `FALTA_EL_LEAD`), con la salida de A1 («Elegir vehículo» o «Elegir
  cliente»). La base lo exige.
- **Migración:** `cotizaciones_vinculos_por_rol`. Pruebas SQL (las cuatro combinaciones y la visibilidad sin lead), `revisor`.
- **e2e:** `cotizar-hoja`, `cotizar-panel-*`, `configuracion-cotizacion*` (grep), `roles-*`.

### [ ] D2a · Buscador y vistas guardadas en `/cotizaciones` (`feat(cotizaciones): buscar y guardar vistas en el listado`)

- **`?q=`:**
  - Número (`#123`) o título, desde 3 caracteres.
  - Va por `buscador_cotizaciones()`, que ya tiene GIN y medición, para los ids, y por `cotizaciones_listado(p_ids)` para la página.
    Si no cabe, una ruta nueva de `cotizaciones_listado` con su índice.
  - Se mide en `medir-cotizaciones-listado.sql`.
- **Vistas guardadas:** `RUTA_DE_PANTALLA` suma `cotizaciones`, y `<MenuDeVistas>` va en la barra.
- **e2e:** `cotizaciones-listado`, `cotizaciones-listado-resumen`.

### [ ] D2b · Acciones en la fila (`feat(cotizaciones): dar acciones a la fila del listado`)

- Va `<MasAcciones>` a la derecha, con las piezas de `src/shared/ui/lista`: abrir, aprobar (B4), marcar final, favorita, reportar,
  invalidar y enviar a la papelera.
- Cada acción según rol y origen, apagada con su motivo (salidas de A1), por las RPC actuales y sin N+1. Lo que la fila no trae se
  decide al abrir el «⋯» con una lectura de ese id.
- Se quita el comentario «sin «⋯»» de `tabla-de-cotizaciones.tsx`.
- **e2e:** `cotizaciones-listado`, `cotizaciones-final-marcar`, `cotizaciones-papelera*` (grep).

### [ ] D2c · El resumen con adjuntos, revisiones y comentarios (`feat(cotizaciones): sumar historia al resumen`)

- **Decisión** (va en DECISIONES): pestañas `PestanasDelResumen` con «Resumen» y «Actividad».
  - «Actividad» es **una línea de tiempo** que intercala comentarios (con sus adjuntos adentro, porque ya viven en el comentario) y
    revisiones, por fecha.
  - Un filtro «Todo | Comentarios | Revisiones» deja ver una sola fuente.
  - Por qué: la persona lee «qué pasó con esta cotización» en orden y no salta entre tres pestañas. Los adjuntos sueltos no existen sin
    un comentario.
- **Lectura:** al abrir la pestaña, desde el navegador (`composicion-revisiones.client.ts` y la de comentarios), de a
  `TAMANO_DE_VER_MAS` por fuente, mezclando por fecha, con «Ver más» y tope.
- **e2e:** `cotizaciones-listado-resumen`, `cotizaciones-comentarios*` (grep).
- D2 cierra con **recorrido** y capturas.

---

## Fase E: logística (antes, la skill de diseño)

### [ ] E1a · La cadena como gráfico (`feat(logistica): resumir la cadena por fase`)

- **Tabla `logistica_fases_resumen`:**
  - Columnas `(origen_id, fase_id, unidades int, demoradas int, trabadas int, calculado_en)`.
  - `unidades` la mantiene un trigger **por sentencia** en `vehiculos`, con tablas de transición: un lote de 200 es un `update` por
    fase y no hay candado por fila. Se reconcilia con el job.
  - `demoradas` y `trabadas` dependen del tiempo y las calcula el job `logistica-resumen` cada 15 minutos, por
    `vehiculos_cadena_idx (origen_id, fase_id, fase_desde, id)`, con conteo acotado (`limit 10.001`). Trabadas: hasta 50 demoradas por
    fase evaluadas, como la bandeja; arriba de eso, «≈».
- **Quién ve qué:**
  - Con alcance «todos» se lee la tabla.
  - Con «propios», un conteo acotado de lo propio por la ruta de la cadena (`limit 1.001`), para no filtrar totales ajenos.
  - Siempre con `conteoCorto` y «Actualizado hace X min».
- **UI:** `<GraficoDeLaCadena>`, con barras horizontales por fase (color de la fila, texto y número, nunca sólo color) y trabadas y
  demoradas marcadas. Accesible como lista. Clic → `?fase=<id>`.
- **Migración:** `logistica_resumen_de_fases` (tabla, RLS, trigger, job y relleno). `medir-logistica-resumen.sql` con 300.000 vehículos.
- **e2e:** `logistica-cadena` (reescrito).

### [ ] E1b · La bandeja del día (`feat(logistica): mostrar la bandeja del día`)

- **RPC `logistica_bandeja_del_dia(p_tope, p_solo_mio)`** (definer, ≤ 20 por bloque, `{filas, hay_mas}`): demorados, trabados,
  documentos por aprobar y por vencer, ETA y arribos de hoy, y pagos por confirmar.
- **Índices nuevos:** `transportes (eta_el)`, `transportes (arribo_el)` y `pagos (creado_en) where not confirmado`. Los demás existen
  (`documentos_por_revisar_idx`, `documentos_vencen_idx`).
- **«Sólo lo mío»** (por defecto, `?todo=si` para ver todo) = lo que puedo mover: `flujos.mover` del origen con su alcance.
- `bandejaLogistica` de Inicio sigue igual.
- **Medir:** `medir-logistica-bandeja-del-dia.sql`.
- **e2e:** `inicio-bandeja-logistica` y un camino feliz nuevo `logistica-bandeja-del-dia.spec.ts`.

### [ ] E1c · La lista de una fase en lugar del kanban (`feat(logistica): cambiar el kanban por la lista de una fase`)

- **Lista:** `?fase=<id>` (o `sin`) dibuja una lista con `ui/lista`, por cursor `(fase_desde, id)` con `logistica_cadena_columna`
  (filtros `contenedor`, `booking`, `naviera`, `demoradas`, `por_aprobar` y `q`).
  - Lleva el «visto» de A3, el descuadre de B5 y casillas para el lote (hasta 200, `ProveedorDeLaSeleccion`, `DrawerDelLote`, sin
    cambios).
  - **El clic va a `/logistica/vehiculo/[id]`**: es una excepción a «abre su resumen» y va en DECISIONES y en la excepción de
    `listas-con-patron`.
- **Sale:** el kanban (`area cadena`: `CadenaDeLogistica`, la columna y `useCadena`) y el drawer `?vehiculo=`.
- **Redirecciones:**
  - `?vehiculo=<id>` → `/logistica/vehiculo/<id>`.
  - `?demoradas=si` y `?por_aprobar=si` sin fase (los «Ver todas» de `tablero`) abren la bandeja en ese bloque.
  - `franja-de-donde-esta.tsx`, la fila de `/logistica/gastos` y los resúmenes de embarques y aduana apuntan a la página del vehículo.
  - Las notificaciones ya usan `/logistica/vehiculo/<id>`.
- **Tarea de oro 3:** R1 entra por `/logistica?origen&fase=a`, la lista y el vehículo, y mueve en la página, con el mismo presupuesto
  (robot < 15 s, KLM ≤ 15). Las demás rutas, sin aflojar.
- **e2e:** `logistica-tarea-de-oro`, `logistica-cadena`, `logistica-lote`, `logistica-mover`, `logistica-transporte`,
  `inicio-bandeja-logistica`, `notificaciones-campana`.
- Lleva **recorrido** con capturas, como dueña y con un rol de sólo `logistica.ver`.
- **Medir:** el JS de `/logistica` (≤ 410 KB, hoy 401).

### [ ] E2 · El detalle del vehículo en logística (`feat(logistica): rediseñar el detalle del vehículo`)

- **Disposición:**
  - `PanelDeLaUnidad` suma `disposicion: 'pagina'`. `entities/nucleo/` declara `AREAS_DE_LA_PAGINA` (clave de hueco → área: `mover`,
    `documentos`, `dinero`, `transporte` y `secundarias`).
  - El orden sigue saliendo de `ORDEN_DE_HUECOS` y `huecosVisibles`. Ningún área importa otra.
  - Cambia la disposición, no los contratos.
- **Escritorio, sin scroll en 1366×768:**
  - Cabecera: identidad, fase, días en fase, aviso de B5 y visor de A2.
  - Columna izquierda: «Qué falta» y mover.
  - Columna derecha: documentos.
  - Debajo: gastos y pagos compactos, y transporte.
  - Aduana, repuestos, notas, historial y margen, en pestañas.
- **Celular:** el mismo orden apilado, con «Mover» fijo abajo (sticky, 44 px).
- **e2e:** `logistica-unidad`, `logistica-documentos`, `logistica-gastos-y-pagos`, `logistica-transporte`, `logistica-aduana`,
  `logistica-tarea-de-oro` (R1, R2 y R5). «Mover 1» contra su presupuesto (11,3 de 15 s).
- Lleva **recorrido** con capturas.

### [ ] F · Cerrar la tanda (`docs(docs): cerrar la tanda de mejoras`)

- Borrar `docs/TANDA.md` y poner al día `docs/ESTADO.md` (lo nuevo que funciona y las tareas de oro).
- `pnpm test:e2e:completo` (Nivel 3) sobre `main` al día. Lo que caiga se diagnostica con `e2e-fallos/` y se arregla en un PR aparte.
- `./orquestador.sh omitir` de T01 a T22.

---

## Verificación

- **Por PR:** el Nivel 1 de arriba más los e2e nombrados; `revisor` en lo de datos, dinero o permisos (A1a, A3a, B1, B4, C1, C2, C3a, D1
  y E1a/b); `publicar.sh`, y el CI decide. Una casilla se marca `[x]` sólo con el PR integrado.
- **Medidas** que entran a `RENDIMIENTO.md`: vistos, aprobadas por página, inventario con la regla de descuadre, la vista de leads, la
  búsqueda de cotizaciones, el resumen y la bandeja de logística, y el JS de `/vehiculos`, `/cotizaciones/nuevo` y `/logistica`.
- **Al final:** el Nivel 3 en verde y el reporte a la persona. Lleva los PR integrados (título y número), lo que quedó en PENDIENTES con su
  motivo, las decisiones tomadas (`DECISIONES.md`), los presupuestos que cambiaron y las capturas de B2, C1, D2, E1 y E2.
