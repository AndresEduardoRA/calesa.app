# Experiencia de uso — importadora

Reemplaza planillas de Excel por asesor, WhatsApp entre áreas y el prototipo `ip`. Regla: ninguna tarea de oro puede ser más lenta que la
planilla que reemplaza.

## Roles

Los roles son libres (el dueño los crea); la interfaz se arma por **permisos**, no por nombre de rol. Perfiles de referencia y su inicio:

- **Asesor:** leads, cotizaciones, turnos de la web; escritorio y celular. Inicio: recordatorios de hoy, turnos web sin confirmar, leads sin
  seguimiento.
- **Logística:** vehículos por el flujo, documentos, embarques, aduana; celular en puerto o aduana. Inicio: vehículos trabados, documentos
  por aprobar, alertas por demora.
- **Repuestos:** proyectos e ítems, compras, stock. Inicio: ítems por mover, esperas que destraban vehículos.
- **Dueño / admin:** configura, mira métricas, resuelve conflictos. Inicio: tablero operativo.
- **RRHH / equipo:** alta, roles, bloqueo y baja. Inicio: Equipo.

## Tareas de oro

Cada meta la hace cumplir su e2e, en escritorio y celular.

- **1. Registrar lead y anotar un seguimiento** (asesor, ~30/día). Meta: ≤ 25 s desde `N` hasta lead guardado (seguimiento opcional);
  duplicado detectado al terminar de tipear el teléfono. `e2e/leads-alta.spec.ts`. Nunca: crear un lead con teléfono ajeno; perder lo
  tipeado.
- **2. Cotizar un vehículo para un lead** (asesor, ~15/día). Meta: ≤ 90 s con link de subasta o vehículo del inventario; cada celda editable
  con teclado; PDF en 1 clic. `e2e/cotizar-tarea-de-oro.spec.ts` (la hoja), `…-enlace.spec.ts` (enlace de subasta), `…-cliente.spec.ts`
  (cliente elegido o creado con el «+»), `…-recorrido.spec.ts` (del listado al PDF, con dos cuentas). Nunca: guardar con una constante
  vencida sin saberlo; un total que no cuadre con las líneas.
- **3. Mover vehículos de fase con documentos** (logística, ~40/día). Meta: mover 1 en ≤ 15 s; marcar llegada de un contenedor de 8 en
  ≤ 60 s; ver _antes_ de confirmar qué falta en cada uno. `e2e/logistica-tarea-de-oro.spec.ts` (el contenedor desde `/logistica/embarques`).
  Nunca: mover sin el documento bloqueante; perder un archivo subido; pisar el cambio de otro.
- **4. Atender un turno de la web y dar acceso al portal** (asesor, ~5/día). Meta: «contacté» en 2 toques desde el celular (hoy, 1 desde
  Inicio, `e2e/web-turno.spec.ts`); otorgar portal desde la ficha en ≤ 30 s con sólo el teclado (`e2e/leads-portal-acceso.spec.ts`). Nunca:
  dejar vencer un turno sin aviso (el vencido queda «Vencido» en Inicio y avisa en `/notificaciones`); un código que no se pueda dictar.

### Flujo 1 — Registrar lead y seguimiento

1. «Nuevo lead» en la barra superior, o `N` donde la pantalla no tiene un «nuevo» propio → drawer (no página), `?panel=nuevo-lead`. **Se
   abre al instante** y lee orígenes, tipos y layout desde el navegador: esqueleto con la forma del formulario, listo, o error («No se pudo
   cargar el formulario.» con «Reintentar»). **Un solo panel**: se desliza una vez y los estados cambian dentro
   (`e2e/leads-alta-un-drawer.spec.ts`). Foco en **Teléfono principal**.
2. Al completar el teléfono (debounce 400 ms) se consulta `verificar_telefono`. Es mío: «Ya existe: Ana Quispe (Tu n.º 12), y es tuyo». Es
   de otro: «Lo tiene Diego Vargas», nada más. En limbo: «Sin dueño» y «Tomar lead» (se adopta al guardar, queda constancia). Existente o
   ajeno no deja seguir. Debajo, cómo quedará y de qué país («Se guardará como +54 91155550000 · Argentina»), sin pedir nada al servidor;
   «País» (en «Más datos») se llena solo mientras esté vacío; lo escrito no se pisa.
3. Nombre, origen (el último usado, por persona), tipo (el primero activo de la clase prospecto) y los **requeridos** del layout, en su
   orden; el resto plegado en «Más datos» con su valor por defecto. Volver requerido un campo suma un paso: Configuración lo avisa (desde el
   cuarto, la meta cuesta).
4. `Ctrl/Cmd+Enter` valida y abre «Primer seguimiento (opcional)» en el mismo drawer, sin guardar; `Ctrl/Cmd+S` o «Guardar lead» guardan
   desde cualquier paso; `Esc` vuelve a los datos. Mismos campos que el redactor de la ficha; se escribe seguimiento sólo si hay algo
   escrito.
5. El pie dice lo que pasará, sin diálogo («Se creará sin primer seguimiento…» / «Se guardará con el primer seguimiento que escribiste.»).
   Guardar crea lead, seguimiento y próximo contacto en una transacción → toast «Lead #124 creado»; el drawer queda listo para el siguiente,
   foco en el teléfono. «Abrir ficha» → `/leads/[id]`. Abierto con el «+» del panel del cliente de la hoja de cotizar, guardar cierra el
   drawer y la hoja elige al lead creado (foco a la barra «Cliente»; el aviso va sin «Abrir ficha»: salir dejaría la cotización a medias).

Estados propios: teléfono en verificación (spinner, resto editable); sin permiso (ni botón, ni atajo, ni URL); conexión caída al guardar
(conserva todo y guarda solo al volver; el intento lleva su id, reintentar no duplica); cerrar o recargar con datos (borrador con
«Descartar»); dato inválido (motivo junto al campo); ningún origen activo (campo deshabilitado con motivo).

### Flujo 2 — Cotizar

La hoja es **configurable por origen** (`docs/COTIZADOR.md` › «El diseño de la hoja»): la semilla trae un diseño igual al cotizador actual
(`docs/referencias/cotizador-actual.md`) y otro al Excel (`docs/referencias/excel-de-cotizacion.md`).

1. **Entrada:** desde la ficha del lead, el resumen de un vehículo o el listado. Arriba, pestañas de orígenes (nombres de la base; «Oficina»
   es un origen) y los **modos** de tipo de cambio del diseño (Aduana, Paralelo, Unificado…; se eligen con dos o más, la hoja abre con el
   primero marcado; con uno solo no se elige y el resumen lo nombra). `Ctrl/Cmd+K → «Nueva cotización»` abre la hoja.
2. **Pasos:** **la hoja** (preventa o final), **vehículo**, **cliente**, **vista previa**; no hay paso «Oficina».
   - **Vehículo:** un solo campo busca por nombre, VIN o lote (desde 3 letras o números) y trae un enlace, un VIN o un lote de la subasta
     (`apibara` llena ficha y fotos); «+» carga a mano. **Ambas abren el alta del inventario dentro del panel y «Crear y elegir» crea el
     vehículo y lo elige**, sin guardar la cotización; pestañas «Últ. cotización» y «Cierre subasta»; el elegido muestra su historial
     (plegado, se lee al desplegarlo, «Ver más»); la barra dice «Cotizado (n)». En «Elegido», el tipo de vehículo se elige entre las filas
     de la tabla, con el del vehículo marcado; un toque lo guarda en el vehículo, cierra el panel y la hoja recalcula (quien no puede editar
     el vehículo lo ve sin elegir; la celda sin valor dice que se elige en «Vehículo»).
   - **Cliente:** búsqueda desde 3 letras o `#n`; sin buscar, «míos» por `reciente_en` (el último seguimiento o el alta) en las pestañas
     «Todos», «Prospecto» y «Cliente» (abre en «Todos»); busca entre los leads que quien cotiza ve, como el listado, y el tipo de cada lead
     va como texto; el elegido tiene «Quitar»; «+» abre «Nuevo lead» del shell (borrador y verificación del teléfono) y al guardar la hoja
     elige al creado, conservando lo tipeado. Los dos paneles van por cursor (Anterior y Siguiente), nunca «Página N de M».
   - **El lead es obligatorio siempre** (preseleccionado desde su ficha: «Cotizar», en la cabecera junto a «Editar», abre la hoja con ese
     lead en el primer origen donde se cotiza). El vehículo, salvo que el ajuste «Vehículo obligatorio al cotizar» diga que no; una final lo
     exige siempre.
3. **La hoja:** secciones en el orden declarado; cada monto en una **XCell** (`Tab` avanza, tipear abre edición, `Esc` cancela) con el tono
   de su grupo, ayuda y ⚙ si el permiso lo da. Lo **sugerido** lleva un punto; sobrescrito queda **modificado** (anillo y ↺). Atajos (chips
   de año), **variante** (Moto, Auto Gasolina…), **interruptores** (habilitar fila, mostrar garantía). **Una celda que quien mira no puede
   ver no se dibuja ni llega**; una que no puede editar va con candado y su motivo. **Recalcula en la base** 150 ms después de la última
   tecla. En el celular y al 200 %, una columna en el mismo orden.
   - **El ⚙** (`?ajuste=celda&nodo=`) abre «Valor por defecto de <celda>»: el valor por defecto de cada constante, que afecta a las
     cotizaciones nuevas del origen (publica la versión siguiente de la fórmula con lo que el panel leyó) y, si la celda se edita en esta
     hoja, «Aplicar también a esta cotización». La hoja sigue en su versión. Si otra persona publicó antes, el mensaje de la base y «Volver
     a leer», sin perder lo tipeado. Cerrar con algo tipeado pregunta.
   - **Una celda de tipo de cambio** abre «Tipo de cambio de <celda>»: en la hoja nueva, el valor de hoy (por `<Monto>`), que cambiarlo
     afecta a toda la empresa (las guardadas conservan el suyo) y «Valor nuevo» (con Modo Live, como una celda); al cambiarlo la hoja se
     reabre con el valor nuevo y lo tipeado vuelve. Sin fila o desactivado, dice dónde se cambia; en una guardada, que se cambia en
     Configuración › Empresa › Monedas y que la cotización conserva el suyo.
   - **La ayuda** («Ayuda de X») abre un panel de sólo lectura con su texto o su tabla de referencia (la de la hoja abierta; cargando, sin
     filas, tope de 1.000 filas, fallo con «Reintentar» o «Recargar»); con Modo Live sus cifras se tapan.
4. **Resumen fijo:** total (y en moneda local si se pidió con «Ver total en moneda local», apagado al nacer y sólo si la versión da su
   moneda), garantía si está a la vista, modo de tipo de cambio y toggle **Live**; al pie en el celular (alto máximo 40 % de la ventana) y
   al costado, pegado bajo la barra, desde 56 rem de la hoja (el 200 % lo pasa al pie). `Ctrl/Cmd+S` guarda (preventa); «Vista previa»
   abre la tarjeta, con «Copiar texto» (apagado sin total o desactualizado) y, en una guardada, «Descargar PDF» (sin salir de la página;
   un fallo con «Reintentar»). La tarjeta de lo guardado también ofrece «Descargar PDF».

Estados propios:

- **Fórmula del origen sin publicar:** pantalla bloqueada «Falta publicar la fórmula de <origen>», con enlace a configuración si hay
  permiso. **Link de subasta inválido o sin datos:** se sigue a mano.
- **Desactualizada:** al guardar una nueva, la fórmula o un tipo de cambio cambió desde que se abrió; el resumen ofrece «Usar la versión
  nueva» o «Guardar con la versión N». Editar una vieja usa SU versión. **Vencida:** pasó la vigencia de la empresa; se dice en listado,
  tarjeta y PDF, y se recotiza encima.
- **Guardar:** la hoja pasa a la tarjeta «Cotización n.º N guardada» con total y «Cotizar otra». Sin lead, apagado («Para guardar, elige el
  cliente en «Cliente».»); con el total nulo o recalculando, también. El borrador vuelve al recargar.
- **El recálculo falla o no hay red:** conserva lo tipeado, «No se pudo recalcular» con «Reintentar», no deja guardar con un total viejo; si
  la fórmula cambió, «Recargar». El mensaje de la base nunca se muestra (puede nombrar lo que quien mira no ve). Una celda apagada por una
  bandera que el nivel esconde dice «Está apagada en esta hoja.» sin nombrarla; «Sin total» dice «Revisa las celdas con aviso.» o «Falta un
  dato que esta hoja no muestra.».
- **Una guardada** (`/cotizaciones/[id]`):
  - «Enviar a la papelera» no pregunta, aunque haya cambios sin guardar (lo guardado vuelve con «Deshacer»; lo tipeado, no). «Guardar» y
    `Ctrl/Cmd+S` apagados sin cambios, salvo con un guardado pendiente o con «Lo de hoy»; guardar no cambia la URL. Si otra persona la
    cambió, el resumen dice quién y cuándo (el único texto de la base que se muestra), que lo escrito no vuelve, y «Recargar» monta la hoja
    con la lectura nueva.
  - **Sólo lectura** (puede verla y no guardarla): sin «Guardar», modos y «Ver total Bs» apagados, con su aviso.
  - **Lo de hoy no es lo guardado** (cambió una tabla de referencia o un dato del vehículo): se recalcula con lo de hoy, el aviso lo dice,
    «Total guardado» muestra el de antes con `<Monto>` (también si el recálculo falla o no ve el vehículo) y «Guardar» la deja con lo de
    hoy.
  - **Revisiones** (`?panel=revisiones`, sólo lectura; recargar lo abre, «atrás» lo cierra): por revisión, autor y fecha relativa, qué
    cambió (tres cosas y «y N más»; «Sin cambios que puedas ver.» si sólo cambió lo que el nivel esconde) y «Total: <antes> → <después>»;
    de a 20 hasta 500, con «Ir a una fecha» (no va a la URL) y «Volver a las más recientes». Esqueleto a los 300 ms, vacío, error.
  - **La cadena** bajo el título: «Versión V de la n.º N» (enlace a la anterior) y, si la hay, la versión nueva (enlace) o «Hay una versión
    nueva que no puedes ver.».
  - **Aviso de versión:** si usa otra versión de la fórmula que la de hoy o venció, lo dice a todos y, a quien puede, ofrece «Cotizar
    encima», que crea la versión nueva en el acto y la abre (apagado con cambios sin guardar: la versión nueva lleva lo guardado); un
    rechazo dice por qué con «Abrir la versión nueva», «Reintentar» o «Recargar». Una que no existe, está en la papelera o no se ve: «Esta
    cotización ya no está disponible: no existe o ya no tienes acceso.».
  - **Marcar final:** sin vehículo o sin cliente, apagado con su motivo al lado (a quien no puede guardarla, a quién pedírselo); la URL a
    mano avisa y se limpia. El `<Confirmar>` dice que el vehículo queda vinculado a su lead, el lead pasa a cliente, las demás cotizaciones
    del vehículo van a tu papelera y se marca lo guardado. Al entrar, la cabecera dice «Final». Rechazo: el diálogo sigue abierto con su
    motivo (otra persona la cambió, otra ya es la final, no se sabe si entró) y «Recargar». Se puede marcar una vencida o de otra versión:
    el aviso de versión basta.
- **Puede cotizar pero no ve la hoja** (`cotizaciones.crear` sin `cotizaciones.ver`): «No puedes ver esta hoja». **Par con monto
  calculado:** bloqueado («Se calcula con los demás datos.»); su porcentaje editable llega con el candado por lado.

### Flujo 3 — Mover de fase

1. `/logistica` abre la **cadena**: columnas por fase del flujo del origen, tarjetas con alerta por demora, filtros en URL.
2. Clic en un vehículo → panel lateral «Qué falta para pasar a …» (documentos aprobados/faltantes, datos, esperas de repuestos, en vivo).
3. Subir documento desde el panel (arrastrar o cámara); se sube al confirmar, nunca antes; queda «subido» hasta que alguien con permiso lo
   aprueba.
4. «Mover a <fase>» pide nota interna (obligatoria si la fase lo exige) → RPC con `fase_esperada`; conflicto: «Rosa Mamani la movió a
   «<fase>» hace 1 min.», «No se movió nada.» y «Recargar», que conserva la nota escrita (nunca pisa).
5. Lote: en la cadena, elegir unidades de una fase (su casilla o «Elegir los de esta columna»), o desde el resumen de un contenedor en
   `/logistica/embarques`, «Marcar que llegó» (abre el lote con ese contenedor) → destino → vista previa por unidad («Lista» / «Falta:
   <documento> aprobado.») → «Mover los N que pueden» → resultado parcial explícito («Se movieron 7 de 8.») con «Reintentar» de los que no.

### Flujo 4 — Turno de la web

1. Notificación push/campana «Turno web #WEB-4F2K · Toyota RAV4» → tarjeta con **Contacté** y **Vincular a lead** (buscador; «crear lead»
   adentro). Cuenta regresiva visible; al vencer, aviso y reasignación.
2. Ficha del lead, pestaña «Portal» (`?seccion=portal`; lead en la cartera y `leads.portal.gestionar`): «Dar acceso» → diálogo
   (`?panel=otorgar-portal`) con el campo de la clave (8 a 64) y **un solo botón principal** que dice lo que hará («Generar clave y dar
   acceso» con el campo vacío; «Dar acceso con esta clave» con algo escrito) → código `MII-4F2K9` en grande y dicho símbolo por símbolo, la
   clave **una sola vez** y el texto para WhatsApp. Mientras otorga el diálogo no se cierra; al cerrarse la clave se olvida.
3. Con acceso, la sección muestra estado (activo, bloqueado, revocado), código, quién lo otorgó y último ingreso, con «Volver a otorgar»
   (avisa que el código anterior y la sesión abierta dejan de valer), «Revocar» (confirma nombrando el código, `?panel=revocar-portal`) y
   «Desbloquear».

## Pantallas

Navegación de primer nivel (hasta 7, filtrada por permisos, en `src/app/(app)/_shell/navegacion.ts`): Inicio · Leads · Vehículos ·
Cotizaciones · Logística · Agenda · Chat; Repuestos sólo con permiso. Configuración, Actividad y Datos van en el menú del usuario y en
`Ctrl/Cmd+K`, con «Mi perfil», «Instalar la app» (sólo si el navegador puede instalarla y aún no corre instalada; en iOS explica «Compartir ›
Agregar a inicio»), «Ver como» (quien gestiona roles), tema, densidad y «Cerrar sesión».

- **Acceso** — `/ingreso`, `/registro`, `/recuperar` (sin sesión): `?returnTo=`, `?aviso=`; `/registro` sólo con registro abierto o sin
  equipo; `/auth/nueva-contrasena` tras el enlace del correo.
- **Inicio** — `/` (todos): bandeja por rol + widgets opcionales; bloques por permiso; cada contador lleva a la lista filtrada. «Turnos de
  la web sin confirmar» (`leads.crear` o `web.cola.gestionar`: mis turnos con código, fuente y «Vence en…», «Contacté» en un toque y
  «Vincular a lead»), «Repuestos por mover» (`repuestos.mover`) y «Esperas que destraban vehículos» (`repuestos.ver`).
- **Leads** — `/leads` (`leads.ver`): tabla + resumen. «Míos» por defecto; con alcance «todos», `?alcance=`. Filtros del layout
  (`a.<campo>`), tipo, origen, `?q=`, `?cursor=`, vistas guardadas; resumen `?lead=` (`?pestana=seguimientos|recordatorios`); marcas
  `?tachados=`, `?favoritos=`, `?etiqueta=`; `?panel=etiquetas`. «Lista | Embudo»: `?vista=embudo&embudo=<id>` es el kanban de las
  oportunidades propias (`?etapa=` en el celular; `?panel=etapas`, `?panel=nuevo-embudo`).
- **Lead** — `/leads/[id]` (`leads.ver` y acceso): «Datos» (`?panel=editar-lead`; «Cotizar» en la cabecera para quien cotiza),
  «Seguimientos» (`?seccion=seguimientos`; `?panel=anotar-seguimiento`, `editar-seguimiento&seguimiento=<id>`), «Vehículos»
  (`vehiculos.ver`; `?panel=agregar-vehiculo`), «Oportunidades» (`?panel=nueva-oportunidad`, `editar-oportunidad&oportunidad=<id>`),
  «Cotizaciones» (con `cotizaciones.ver` en algún origen; ver «Pestaña de cotizaciones») y «Portal». Ninguna pestaña se dibuja vacía.
- **Vehículos** — `/vehiculos` (`vehiculos.*`): tabla + panel de filtros + resumen. Pestaña por origen (`?origen=`); filtros en URL (`q`,
  `fase`, `categoria`, `anio.min`, `a.<campo>`…), `?cursor=`, vistas guardadas; resumen `?vehiculo=<id>` (`?pestana=fotos|interesados`);
  alta `?panel=nuevo` (sin el alta suelta pero con la de cotizar: «Nuevo» apagado con «Cotizar un vehículo nuevo», que abre la hoja con el panel
  del vehículo en alta); edición `?editar=`; `?vitrina=si|no`, `?limpieza=si|no`; junto al estado de vitrina de cada fila, «Publicar» / «Sacar de la
  web» con un toque y «Deshacer» (con `vehiculos.vitrina` del origen; sin precio público, `?panel=vitrina-rapida&para=<id>` pide sólo el precio).
  En escritorio, «Tabla | Tarjetas» (`?vista=`, recordada en `vehiculos.vista`; las tarjetas van en grilla, con el carrusel en la foto). En un
  origen de subasta con el campo de la puja, «Precio» es «Puja actual» (USD, «final» si terminó o se vendió; sin puja, «—»).
  `/vehiculos/papelera` (por lote).
- **Vehículo** — `/vehiculos/[id]` (según origen): cabecera con portada y fase de sólo lectura; «Publicar en la web» en `?panel=vitrina`;
  `?seccion=`: «Ficha» (por layout del origen; edición `?editar=`; banner de limpieza; en un origen de subasta, el bloque «Subasta» con
  «Editar fechas» en `?panel=fechas-de-subasta` para quien edita: inicio y cierre en su zona, vacío borra; «Vínculo e interesados» con
  «Desvincular» confirmado), «Fotos» (≤ 24, portada, orden), «Repuestos» (con `repuestos.ver`, la última; sin proyecto, «Este vehículo no tiene proyecto
  de repuestos.» con «Crear proyecto de repuestos» sólo si se puede editar; con él, «Proyecto #N», su estado y los ítems por fase) y
  «Cotizaciones» (sólo con `cotizaciones.ver` del origen del vehículo). Las pestañas que se leen al abrirlas tienen esqueleto y error con
  «Reintentar».
  - **Pestaña de cotizaciones** (lead y vehículo): las que quien mira ve, de la más nueva, de a 20 con «Ver más» y, en 500, «Ver todas en
    Cotizaciones» (`/cotizaciones?lead=` o `?vehiculo=`); se lee al abrirla; esqueleto, error con «Reintentar», «Sin cotizaciones que
    puedas ver.».
- **Cotizaciones** — `/cotizaciones` (`cotizaciones.*`): tabla + resumen `?cotizacion=` (lo de la fila y «Abrir cotización»; una que no se
  ve dice que ya no está disponible); filtros mías, clase (preventa o final), origen; `?vehiculo=` y `?lead=` (ids fuera del esquema: sin
  chip y «Limpiar» no los borra; arriba, de quién o de qué son, con «Ver todas», y su vacío propio); «Vencida» en la fila; `nuevo` abre la
  hoja. «Papelera» (para quien puede enviar a ella o vaciarla) lleva a `/cotizaciones/papelera`: lotes por cursor (5, las primeras 20 de
  cada uno y «Mostrar los N»), «Restaurar» y «Purgar» una o el lote (`cotizaciones.papelera.purgar`,
  `?panel=purgar&lote=<id>[&cotizacion=<id>]`, nombra lo que borra; un lote de varios pide tipear «purgar N»; una final con comprobante
  queda y el aviso dice por qué); las que se fueron con su vehículo están en la papelera de vehículos.
- **Cotizar** — `/cotizaciones/nuevo` (`cotizaciones.crear`): formulario hoja (XCell); `?origen=&lead=&vehiculo=&returnTo=` (se validan y
  se llevan; el vehículo va al recálculo); sin entrada en la navegación. Ver Flujo 2.
- **Cotización guardada** — `/cotizaciones/[id]` (`cotizaciones.ver`; edita quien la puede guardar, `puede_guardar` de la base): la hoja de
  SU versión; quien sólo ve, en sólo lectura. Cabecera: «Revisiones», la cadena, «Cotizar encima» si no está al día, «Marcar final» (en una
  preventa, con `cotizaciones.final.gestionar` del origen; `?panel=marcar-final`), «Emitir comprobante» (en una final activa sin
  comprobante vigente, con `cotizaciones.comprobantes.emitir`; `?panel=emitir-comprobante`, el aviso nombra el número «S-N») y «Enviar a la
  papelera» (quien puede guardarla o, en una preventa, quien tiene `cotizaciones.moderar`; vuelve al listado con «Deshacer»). Bajo la hoja,
  «Comprobantes» (en una final o en una que ya tiene alguno): del más nuevo, «Vigente» o «Anulado» con quién, cuándo y motivo, hasta 20
  con aviso de tope; «Anular» el vigente pide motivo en `?panel=anular-comprobante` (sin id: hay a lo sumo uno). Estados en Flujo 2.
- **Logística** — `/logistica` (`logistica.ver` en algún origen): cadena (kanban por fase) + panel de la unidad en un `<Drawer>` por URL
  (`?vehiculo=<id>`, lo abre el clic en una tarjeta); en la URL: `?origen=` (orígenes con la logística encendida), `?fase=` (celular: una
  fase a la vez), `q` (nombre, VIN o lote; 3 letras o números), `demoradas`, `por_aprobar`, `contenedor`, `booking` y `naviera`.
  `/logistica/vehiculo/[id]` (el mismo panel en su página: a ella apunta la notificación de demora), `/embarques`, `/aduana`, `/gastos`
  (`?ver=gastos|pagos`). El panel de la unidad tiene el hueco «Repuestos» (con `repuestos.ver`): «Espera N repuestos», cada ítem con su
  proyecto, «Para pasar a «X» espera que llegue a «Y».» y el enlace a su panel; sin espera, «Este vehículo no espera ningún repuesto.». Ver
  «Logística: estados propios».
- **Repuestos** — `/repuestos` (`repuestos.ver`): proyectos por cursor `numero` (`?q=` de 3 letras o un número,
  `?estado=abiertos|cerrados|todos`, `?por=`, `?cursor=`) con número, vehículo o «Externo», cliente, estado derivado, ítems («200+») y
  última actividad; «Nuevo proyecto» (`repuestos.editar`, `N`, `?panel=nuevo-proyecto`, `&vehiculo=<id>` lo abre vinculado).
  - `/repuestos/[id]`: «Cerrar proyecto» o «Reabrir proyecto» (y «Eliminar proyecto» sin ítems: sin confirmación, con «Deshacer») y la hoja
    de ítems editable celda a celda. Pestañas «Compras» (`?pestana=compras`, `repuestos.costos.ver`; escribir con
    `repuestos.costos.editar` en `?panel=compra&compra=<id|nueva>`), «Cotizaciones» (`?pestana=cotizaciones`, `repuestos.cotizar`) y
    «Pagos».
  - Vistas «Stock» (`?vista=stock`) y «Cadena» (`?vista=cadena`: una columna por fase del flujo de repuestos, más «Sin fase» si tiene
    ítems, de a 50, tarjeta con «Proyecto #N» y días en la fase; `?q=`, `?proyecto=` y, en el celular, `?fase=`).
  - El panel del ítem (`?item=<id>`, sobre el proyecto o la Cadena) es el panel de la unidad de logística.
  - **Cotizaciones del proyecto:** «Nueva cotización» con la moneda en la misma barra (apagado con su motivo con el proyecto cerrado o sin
    monedas activas; sin configuración, el mensaje de la base y, con `repuestos.configurar`, el enlace a configurarla) y la lista (número,
    estado, total o «Sin total», fecha; tope 50). En `/repuestos/[id]/cotizaciones/[cotizacion]`, una borrador con el proyecto abierto se
    edita: bloques «Importado» y «Local» con «Agregar línea» y «Agregar desde un ítem»; cada línea con descripción, `XCell` de cantidad,
    costo y logística (sugerida del tramo, ↺), caja (con la elegida en `<Monto>`), total o «Sin total · motivo» y «Quitar línea»; pie con
    el total en vivo, notas y «Guardar» (PT409 en `<AvisoDeConflicto>`). «Aceptar» (`?panel=aceptar-cotizacion`; apagado sin permiso para
    editar ítems, con cambios sin guardar o sin total) y «Anular» (`?panel=anular-cotizacion`, borrador o aceptada con el proyecto
    abierto). Las demás, y la borrador con el proyecto cerrado, en sólo lectura con la configuración con que se calculó y el total de la
    base.
  - Ver «Repuestos: listado (estados propios)» y «Repuestos: proyecto (estados propios)».
- **Agenda** — `/agenda` (todos): calendario mes/semana/día + drawer; eventos, tareas, recordatorios, subastas.
- **Chat** — `/chat` (`chat.participar`; `?c=<conversación>`, `?panel=nueva|grupo|salir|borrar-mensaje&mensaje=<id>`; estados en «Chat
  (estados propios)»): maestro-detalle; menciones `#` de vehículo/lead/cotización, `/tarea`, `/evento`; widget flotante fuera de `/chat`.
- **Notificaciones** — `/notificaciones` (todos): lista; la campana trae las que piden acción. Arriba, «Preferencias de avisos» a
  `/perfil#notificaciones`.
- **Perfil** — `/perfil` (todos): nombre, foto, preferencias (tema, densidad, ítems por página) y:
  - «Turnos de la web»: «Disponible para recibir turnos» (apagado, la ruleta no le reparte; el pegajoso sí); si su rol no recibe turnos,
    deshabilitado con el motivo.
  - «Tu ficha en la web» (plegable; el formulario se pide al abrirlo): WhatsApp, identificador, cargo, bio, especialidades y «Aparecer en la
    web», con versión.
  - **Notificaciones:** push en este navegador, un interruptor por tipo del catálogo (sólo apagan el push, no la campana) y «Tus
    navegadores» con «Quitar». Con el interruptor a la vista y deshabilitado, dice por qué: el rol no recibe push, la empresa no lo activó
    (y dónde), falta la clave pública, el navegador no lo admite o lo bloqueó; mientras revisa, «Revisando este navegador…».
- **Actividad** — `/actividad` (`actividad.ver`): tabla agrupada por día en la zona de la empresa con «Ver más» e «Ir a una fecha»; filtros
  `?persona=`, `?entidad=` (y `?registro=` desde «Ver actividad» del «⋯» de la ficha de lead y de vehículo); el diff en un drawer
  `?cambio=<id>` (sólo lo que cambió, con la etiqueta del campo y cada monto con la moneda de su lado; sin moneda conocida, el número y
  «(moneda sin conocer)»); «No tienes acceso a este cambio.»; retención de `actividad_dias` (14 si no se puede leer).
- **Configuración** — `/configuracion/*` (permiso de cada sección): hub + bloques: empresa, equipo, roles, orígenes, leads, cotización,
  flujos, web, cola web, integraciones.
- **Leads (config)** — `/configuracion/leads` (`leads.campos.gestionar` o `leads.configurar`): lista agrupada + panel lateral.
  `?seccion=campos` (`?campo=`), `origenes` (`?panel=nuevo-origen`/`editar-origen&origen=<id>`), `tipos`
  (`?panel=nuevo-tipo`/`editar-tipo&tipo=<id>`/`eliminar-tipo&tipo=<id>`), `seguimientos`, `embudo` (la plantilla: editor de etapas en la
  página, «Guardar» apagado sin cambios, «Restablecer» con `?panel=restablecer-embudo`), `portal` (el mensaje del portal: `<Textarea>` que
  parte del texto de fábrica con sus variables, vista previa con un cliente, código y clave de ejemplo, rechazo junto al campo, «Guardar»
  apagado sin cambios; en blanco remite a «Restablecer», `?panel=restablecer-portal`). «Campos» pide `leads.campos.gestionar` y las otras
  cinco `leads.configurar`: la que no puedes abrir se ve apagada con su motivo bajo la barra, y su `?seccion=` abre la primera habilitada.
  Sin ninguno de los dos no se entra.
- **Cotización (config)** — `/configuracion/cotizacion` (`equipo.roles.ver|gestionar` o `cotizaciones.configurar` en algún origen):
  `?seccion=niveles|formula|tarjeta|diseno|tonos|tablas|ajustes`, cada pestaña con sus permisos, Niveles primero y Ajustes al final.
  «Fórmula» con `?origen=` (los orígenes con la clave, también los inactivos), `?panel=publicar-formula`,
  `?panel=revertir-formula&version=<id>`, `?panel=descartar-borrador` y `?panel=editar-formula` (el editor en texto). «Diseño» con
  `?origen=`. «Tonos» con `?panel=nuevo-tono`, `editar-tono&tono=<id>` y `eliminar-tono&tono=<id>`. «Tarjeta» con `?origen=`,
  `?panel=publicar-tarjeta` y `?panel=descartar-plantilla`. «Tablas» con `?origen=`, `?tabla=<id>` (el editor) y `?panel=publicar-tabla`.
  Estados en las secciones «Cotización: …».
- **Empresa** — `/configuracion/empresa` (`empresa.*`): bloques + `?seccion=empresa|monedas|integraciones|comprobantes` («Comprobantes»,
  con `empresa.ajustes.gestionar`: la serie vigente, el próximo comprobante y el campo para cambiarla, con versión); `?tc=`, `?moneda=`,
  crear en `?panel=`.
- **Flujos (config)** — `/configuracion/flujos` (`flujos.configurar` en algún origen, `repuestos.configurar` o
  `logistica.catalogos.gestionar`): una pestaña por flujo configurable (los orígenes con la clave, también los inactivos, y «Repuestos»),
  `?origen=<id>` y `?ambito=repuestos`, `?seccion=fases|documentos|reglas` (la barra con dos o más pestañas; «Fases» abre primero) y
  `?fase=<id>` (el inspector). Las fases se crean, ordenan, jubilan y reactivan desde la lista; en el inspector se editan y se agregan y
  quitan salidas y requisitos. Ver «Flujos: configuración (estados propios)» y siguientes.
- **Logística (config)** — `/configuracion/logistica` (`logistica.catalogos.gestionar`): catálogos «Puertos» (nombre, país, código, orden y
  activo), «Navieras» (nombre y activa; sin «Eliminar»: se desactivan) y «Categorías de gasto» (nombre, propósito de la lista fija de la
  base, orden y activa; una con gastos no se elimina, se desactiva), en `?seccion=puertos|navieras|categorias-de-gasto` (sin barra con una
  sola; una URL ajena abre «Puertos»). La tarjeta del hub sólo existe cuando algún área llena un catálogo; si no, la URL entra y dice «Por
  ahora no hay nada que configurar aquí.». Ver «Logística: estados propios».
- **Repuestos (config)** — `/configuracion/repuestos` (`repuestos.configurar`): pestaña «Catálogos» con tipo de pieza, condición, vía de
  transporte y país de origen (agregar, editar nombre, orden y activo, desactivar, eliminar sin uso; tope 200 por catálogo con
  `<AvisoDeTope>`; `?panel=nuevo-valor&catalogo=`, `editar-valor&valor=`, `eliminar-valor&valor=`). Pestaña «Cotizador»
  (`?seccion=cotizador`): «Fórmula» con «Publicar cambios» y su historial, «Tramos de logística» y «Cajas» por moneda con sus modales en la
  URL (`?panel=tramo|caja`). Arriba, el enlace a su flujo en Flujos (config).
- **Sitio web (config)** — `/configuracion/web` (`web.ajustes.gestionar` o `web.contenido.gestionar`):
  `?seccion=ajustes|legales|guias|faqs|testimonios` («Ajustes» y «Legales» con `web.ajustes.gestionar`; el resto con
  `web.contenido.gestionar`; la barra sólo con dos o más). «Ajustes»: la fila única del sitio (nombre, lema, WhatsApp de respaldo, horario,
  dirección, redes, SEO, moneda secundaria y orígenes visibles, avisando qué vehículos dejan de verse), con versión, sin red y conflicto.
  «Guías» (con categorías) y «Legales»: lista y editor `/configuracion/web/guias/[id]` (documento con imágenes; publicar, programar o
  despublicar con `web.guias.publicar`; «Borrador», «Programada», «Publicada»). «Preguntas frecuentes»: panel por URL, reordenar, eliminar
  con confirmación. «Testimonios»: con su consentimiento (quién, cuándo, canal; ciudad, vehículo y foto por separado) y «Retirar».
- **Cola web (config)** — `/configuracion/cola-web` (`web.cola.gestionar`): «Sin asignar» arriba (solicitudes sin asesor: código y fuente),
  «En la rueda» (en el orden de la ruleta: disponible o no, abiertas de su cupo, prioridad, «Contacta el N %» o «Sin turnos aún», vencidas
  y último turno, con «Quitar»), «Habilitada, pero su rol no recibe turnos de la web» (con «Se cambia en Roles.»), «Actualizar», «Agregar a
  la rueda» (`?panel=agregar-a-la-rueda&q=`, busca en el equipo; avisa si el rol no recibe turnos) y la política de la cola (cola activa,
  minutos para contactar, días de pegajoso, máximo de abiertas e intentos).
- **Orígenes** — `/configuracion/origenes`, `/[id]` (`origenes.gestionar`; lectura con `flujos.configurar` o `cotizaciones.configurar`):
  `?panel=nuevo`; `/[id]?seccion=datos|campos|categorias`, `?campo=`, `?categoria=`; sin permiso, todo deshabilitado con motivo.
- **Equipo** — `/configuracion/equipo` (`equipo.usuarios.*`): tabla desde 768 px, tarjetas debajo, panel lateral. `?q=&estado=` se
  resuelven en el servidor («jose» encuentra «José»); dibuja las 100 primeras por nombre y lo dice al pie; la persona se gestiona desde su
  «⋯», sin resumen. `?panel=invitar`; `?persona=`; `?baja=`.
- **Roles** — `/configuracion/roles` (`equipo.roles.*`): matriz roles × permisos por módulo; desde 768 px la columna «Permiso» queda pegada
  a la izquierda; cada celda guarda sola. En móvil, un rol a la vez (`?rol=`) y como lista (permiso, explicación y control debajo).
  `?panel=nuevo-rol`, `?eliminar=`.
- **Datos** — `/datos` (todos: «Mis leads»; todo: `datos.exportar.todo`): `?seccion=exportar|importar`, con la barra siempre; sin permiso
  para importar nada (`leads.crear`, `datos.importar.todo` o `vehiculos.crear` en algún origen), «Importar» apagada con su motivo y
  pedirla abre «Exportar».
  - **Exportar:** «Mis leads» (con `leads.ver` y `leads.exportar`, abre `/leads?panel=exportar`) y, con `datos.exportar.todo`, una tarjeta
    por entidad (Leads; Vehículos, un archivo por origen; Cotizaciones, todas o de un origen) con «Desde», «Hasta» y «Descargar». Estados:
    preparando (botón apagado), nada en el rango, más de 250.000 filas (pide un rango más corto), límite de 3 por hora (dice cuándo se
    puede), error con «Reintentar», tarjeta apagada con su motivo.
  - **Importar:** «Qué importas» (Leads o Vehículos, sólo lo que puedes; `?entidad=`); con Leads y `datos.importar.todo`, «Destino» («Yo» y
    las personas activas, hasta 100); con Vehículos, «Origen» (activos donde creas; `?origen=`). Pasos: Archivo (CSV ≤ 20.000 filas y
    10 MB; sirve el de Exportar) → Columnas (emparejadas solas, «Ignorar esta columna», las que faltan; en Leads, origen y tipo para las
    filas sin) → Vista previa (las primeras 500 de 50 en 50, «Lista» o «Con errores» con su motivo, filtro de errores, «Importar N filas»)
    → Importando (preparar, subir, «puedes seguir en otra pantalla»; sin conexión o error, «Reintentar» manda el mismo intento).
  - **Avance:** «Importando» lee la importación cada 5 s: esperando, «n de N filas», en pausa (sin avance hace 2 min la retoma el sistema);
    al terminar, cuántos creados, ya existentes y con errores, o «No terminó: <motivo>.», y «Descargar las rechazadas» (con las celdas del
    archivo; un «ya existe» no nombra a nadie; el detalle se guarda 30 días). Si no se puede leer, lo dice sin perder lo último.
  - Al pie, «Importaciones»: las propias (todas, con quién, con `datos.importar.todo`), con fecha, qué, destino, estado y avance; de a 20
    hasta 500 con aviso; vacío; error con «Reintentar».
- **Buscador** — `Ctrl/Cmd+K` o el botón «Buscar» de la barra (todos): paleta sin URL (un `Dialog`). Sin texto: «Últimos abiertos» (8) y
  las acciones que la persona puede (`puede()`: Nuevo lead, Nuevo vehículo, Nueva cotización, «Ir a…», Configuración, «Ver atajos de
  teclado»). Con texto (mínimo 3, 250 ms de espera, cancela la anterior): las acciones que coinciden arriba y una sección por tipo (Leads,
  Vehículos, Cotizaciones; hasta 5 cada una) y «Ver todos en Leads» (`/leads?q=`). Un teléfono no se busca. Estados: buscando, sin
  resultados, error y sin conexión con «Reintentar». Enter abre la fila; Esc cierra. `?` lista los atajos.

## Permisos (matriz de referencia; el catálogo real vive en `permisos.ts` y se siembra en SQL)

- **Asesor:** crear lead y ver mis leads; cotizar; crear y ver vehículos (por origen); chat y tareas; importar leads (`leads.crear`);
  deshacer mi importación (24 h).
- **Logística:** crear y ver vehículos; mover de fase y aprobar documentos (por origen); chat y tareas.
- **Repuestos:** proyectos, costos y cotizador de repuestos; chat y tareas.
- **Dueño:** todo lo anterior, más leads de otros (teléfono enmascarado), fórmulas, costos y margen, vitrina web y guías,
  equipo/roles/bloqueo/registro, exportar e importar todo, exportar mi cartera (`leads.exportar`).

## Reglas transversales

- **Estados obligatorios en toda pantalla:** cargando (esqueleto propio por patrón), vacío primera vez, vacío por filtro, error con
  reintentar, sin permiso — `.claude/rules/ui.md`. **Cargando**: toda página de `(app)` tiene su propio `loading.tsx` con la forma de lo
  que dibuja después; no vale el heredado (`scripts/guardas/estados-de-ruta.test.ts`).
- **Destructivas:** papelera (vehículos, cotizaciones, leads) = hacer + toast con deshacer 10 s; purga y baja de usuario = diálogo que nombra
  el objeto; masivas irreversibles = confirmación tipeada.
- **Fotos:** toda foto de una entidad abre el visor (`?visor=`) con ← →, Esc, «3 de 12» y miniaturas; la cabecera de la ficha y la del resumen
  del vehículo llevan el carrusel en su lugar (flechas, puntos y gesto). Las galerías («Fotos» del resumen, imágenes de un ítem) abren el visor en la foto tocada.
- **Vistos:** en las listas de vehículos y leads (y las que se sumen), lo que la persona abrió en ese módulo se apaga como un enlace visitado y
  lo último lleva borde de acento y «Último visto». `/perfil` › «Vistos»: marcar o no, recordar 7, 30, 90 días o 1 año, marcar o no el último.
- **Avisos con acciones:** un aviso de error, advertencia o bloqueo que tiene salida la ofrece ahí mismo (de 1 a 3, la que destraba primero;
  sin permiso, a quién pedírselo) — `.claude/rules/ui.md` › «Avisos con acciones».
- **Fechas de subasta:** en la zona de quien mira (`/perfil` › «Zona horaria»; sin elegir, la de la empresa), con la abreviatura («14:00
  GMT-4»); en el tooltip (y debajo, en la ficha) la hora del patio y la de la empresa. Lo demás, en la zona de la empresa.
- **Formatos:** `Intl` con locale y moneda de la empresa (`es-BO` por defecto); montos con cifras tabulares; fechas cruzan servidor↔cliente
  como ISO y se muestran en la zona de la empresa. **Modo Live** oculta cifras sensibles **y** símbolos de moneda. Voz: español neutro con
  tuteo. Densidad: compacta en escritorio (filas 36–40 px), cómoda en táctil (48 px), recordada por usuario.
- **Atajos:** `Ctrl/Cmd+K` buscar/comandos · `N` nuevo, lo propio de la pantalla (vehículo en vehículos; si no hay, un lead; «Nuevo lead»
  siempre tiene botón) · `Ctrl/Cmd+S` guardar · `Ctrl/Cmd+Enter` guardar y seguir · `Esc` cerrar panel o volver un paso · `?` abre «Atajos
  de teclado» (la lista del catálogo; no se dispara mientras se escribe). En un alta de vehículo `Ctrl/Cmd+S` guarda y cierra; en «Nuevo
  lead» deja el drawer listo para el siguiente.
- **Filtros:** panel lateral plegable si el listado mide 40 rem o más (si no, hoja inferior) + chips activos + «limpiar»; esquema
  declarativo por listado; estado en URL (nuqs, `shallow:false`); vistas guardadas por usuario. Formularios en drawer/modal con bloques
  plegables; `returnTo` para volver.
- **Patrón de lista** (`.claude/rules/ui.md`): toda lista de registros se dibuja igual. Desde 768 px, tabla con **nombre pegado a la
  izquierda** (entero hasta 16 rem; más largo, «…» y completo en `title`) y **«⋯» a la derecha**, que se desplaza de costado dentro de su
  tarjeta, nunca la página; por debajo, tarjetas. **Un clic en cualquier parte de la fila o tarjeta abre su resumen**, salvo casilla, «⋯»,
  enlace o botón. Teclado: una parada de Tab por fila (el nombre, «Abrir Ana Rojas»); al cerrar el resumen el foco vuelve a él. El «⋯»
  («Más acciones de …») mide 44 px en el celular; lo que no se puede hacer no aparece, y un ítem visible pero imposible dice por qué.
- **Texto al 200 % (reflujo, WCAG 1.4.10):** ninguna lista ensancha la página; «⋯» y casilla miden 44 px; una tarjeta de menos de 16 rem
  apila sus piezas; los botones chicos crecen con el texto. Los avisos (22,25 rem) crecen con el texto sin pasar de la pantalla menos 1 rem
  por lado y suben sobre el pie de un panel abierto.
- **Paneles y modales con formulario:** cerrar con algo escrito (Esc, ✕, clic afuera, «Cancelar») pregunta **en el mismo modal o panel**
  («Tienes cambios sin guardar.» con «Seguir editando», con el foco, y «Descartar»); sin cambios cierra directo; «atrás» cierra sin
  preguntar (el borrador vuelve al reabrir). La acción de un aviso que deja la pantalla («Abrir ficha», «Recargar») con algo escrito
  pregunta lo mismo en el pie del panel; la que actúa en el lugar («Deshacer») no. Mientras guarda, los campos se apagan y no se cierra. El
  rechazo de un campo se dice **junto a su campo**, con el foco ahí. Sin conexión lo escrito queda y se guarda al volver.
- **Un modal nunca abre otro modal:** segundo nivel = panel lateral o página. En el celular al 200 %: título y pie fijos, **la descripción
  se desplaza con el cuerpo**, botones del pie de 44 px (`e2e/modales-celular-200.spec.ts`: pie ≤ 26 % de la pantalla, cuerpo ≥ 45 % del
  modal).
- **Confirmaciones con URL** (`?panel=mover-oportunidad&oportunidad=<id>&destino=<id>`, `salir-lead`, `purgar&lote=<id>`,
  `deshacer-importacion&importacion=<id>`, `desvincular`, `etapas&eliminar=embudo`, `eliminar-origen`): «atrás» las cierra, recargar las
  reabre, Esc devuelve el foco, no se cierran mientras actúan. Si lo que nombra ya no existe, avisa y limpia la URL.
- **Barra de un listado (`<FilterShell>`):** búsqueda, «Filtros», «Vistas», acciones y «Ítems por página». Con contenedor de 48 rem o más
  las acciones van a la derecha; si no, cada pieza envuelve a la izquierda. **El marcador de búsqueda es corto** («Nombre o número»,
  «Título, VIN o lote», «Título o lead») para caber al 200 % en el celular.
- **Mínimo para buscar por nombre:** 3 letras o dígitos seguidos; un número (`5`, `#5`) busca por número desde un dígito. Mientras no
  alcanza, el campo lo deja escrito, dice «Escribe al menos 3 letras» y **no escribe `?q=`, no pide nada, no deja chip ni toca los
  tachados**; un `?q=ab` por URL igual (`e2e/leads-listado-busqueda-minima.spec.ts`).
- **Ítems por página:** en cada lista con Anterior/Siguiente y filtros (leads, vehículos), selector «Ítems por página» (10, 25, 50, 100) en
  la barra desde `md` y, por debajo, arriba de la lista (`<select>` de 44 px). Se guarda en la cuenta (`listas.por_pagina`, también en el
  perfil); `?por=` la fija para esa página; cada lista tiene un máximo (hoy 100). Cambiarlo vuelve a la primera página y conserva filtros y
  búsqueda. No lo llevan el kanban ni las papeleras (`docs/RENDIMIENTO.md`).
- **Barra superior:** tipo de cambio por defecto a la vista y, al abrirlo, los vigentes con su último cambio (Modo Live lo oculta). En el
  celular menú, Live y avatar miden 44 px y la barra cabe al 200 %; el tipo de cambio sólo se dibuja con 24 rem o más. El botón «Buscar»
  (44 px) abre la paleta (`Ctrl/Cmd+K`) y la campana trae los avisos; el widget del chat flota fuera de `/chat` y no va en la barra.
- **Permisos en UI**: ocultar lo que nunca va a usar; deshabilitar con motivo lo que espera poder hacer (**dominancia**: lo que no puede dar
  nunca se esconde). RLS es la seguridad. **«Ver como»:** banner fijo «Viendo como <rol> · Salir»; cambia lo que se ve, no lo que se puede.
- **Conflictos:** todo formulario de edición manda `actualizado_en` esperado; `PT409` → «X cambió esto hace N min · ver / recargar». Barras
  que se desplazan: degradado en el borde por donde siguen. **Movimiento**: transiciones con View Transitions (un fundido corto) y
  `prefers-reduced-motion`.

### Chat (estados propios)

- **Entrar:** `chat.participar`; sin él, «sin permiso» y no se lee nada. `?c=` ilegible = «Elige una conversación»; una conversación que ya
  no es mía (salí, la borraron, perdí `chat.global`) dice «Esta conversación ya no es tuya», nunca un 404. En el celular, lista y hilo son
  dos pantallas.
- **Lista:** esqueleto con la forma de las filas; vacío de primera vez que invita a iniciar una; error con «Reintentar»; «Ver más» hasta el
  tope. No leídos «99+».
- **Hilo:** esqueleto que reserva el alto; error con «Reintentar» (sin redactor); sin mensajes, «Escribe el primero». «Ver anteriores» por
  cursor y, en el tope, `<AvisoDeTope>` con «Ir a una fecha» (desde una fecha el hilo no sigue lo nuevo y dice cómo volver).
- **Enviar:** Enter envía, Mayús+Enter salta de línea; se ve al instante («Enviando…»). Sin red o rechazado queda «No enviado ·
  Reintentar» con el motivo; reintentar reusa el mismo `id` y nunca duplica. Pasado el largo máximo, el motivo bajo el campo.
- **Responder:** desde el «⋯» del mensaje (siempre visible, 44 px en celular): «Respondiendo a {nombre}» sobre el redactor con «Quitar
  respuesta». La cita va arriba del texto; sin original legible, «Mensaje no disponible»; borrado, «Mensaje eliminado».
- **Editar:** sólo lo propio, hasta 15 minutos (se mide al abrir el «⋯»; la base manda), en la burbuja: Enter guarda, Esc cancela;
  «Guardar» apagado vacío, sin cambios o guardando. Un rechazo se dice dentro y conserva el texto. Lo editado dice «editado».
- **Borrar:** el autor o quien tiene `chat.moderar`, con diálogo por URL (`?panel=borrar-mensaje&mensaje=<id>`; uno no cargado o que ya no
  se puede borrar avisa y se limpia). No se deshace: queda «Mensaje eliminado» para todos.

### Empresa (estados propios)

- **Entrar:** `empresa.ajustes.gestionar` o `empresa.tipos_cambio.gestionar`; cada pestaña se edita con su permiso, sin él deshabilitada
  con el motivo arriba; sin ninguno, «sin permiso».
- **Empresa:** un «Guardar». Color sin contraste, logo inválido y moneda base con datos: motivo junto al campo. Sin conexión, lo tipeado
  queda y se repone con «Descartar».
- **Tipos de cambio:** cada uno abre su panel con el valor listo y su historial. El por defecto no se desactiva; nada se borra.
  **Integraciones:** apibara no se activa sin su clave, que nunca se muestra («Reemplazar»).

### Vehículos (estados propios)

- **Entrar:** `vehiculos.ver` en algún origen; pestañas = orígenes donde lo tiene, también desactivados («Inactivo»); sin ninguno, «sin
  permiso» diciendo a quién pedírselo. Origen desactivado: se edita lo que hay; «Nuevo», `N` y `?panel=nuevo` no abren nada.
- **Lista:** esqueleto; vacío de primera vez con la frase del origen y «Nuevo» si puede; vacío por filtro con «Limpiar filtros»; error.
  Filtros: los «filtrables» del origen más fase, categoría y año; lo inválido en la URL se ignora; cambiar de pestaña suelta los filtros.
- **Alta y edición (panel):** «Datos principales», «Precio» y un bloque por grupo del layout (con obligatorio nace abierto; con error se
  abre solo); rechazos junto al campo (VIN o lote repetido también). Conflicto: quién y cuándo, «Ver cómo quedó» y «Recargar».
- **Fotos:** elegir (selector, soltar o cámara) las deja en una bandeja sin subir que dice lo que no entra y por qué (no es foto, > 25 MB,
  repetida, pasa de 24). «Subir N fotos» con avance; un fallo se dice entero con «Reintentar las N que faltan». Reordenar con botones o
  `Alt+←/→`; eliminar con «Deshacer».
- **Vitrina:** «Publicar en la web…» en el «⋯» (en la ficha, sin permiso, apagado con motivo). Panel `?panel=vitrina`: interruptor, precio
  público (vacío = «Consultar»), rango, nota, destacado y «Así lo verá el visitante». Si la fase no publica o la web está apagada,
  «Publicado, no visible».
- **Papelera:** enviar no pregunta: se hace con «Deshacer» 10 s, desde el «⋯» o eligiendo filas (casilla sólo en las que puede). El
  resultado se dice entero; lo publicado se despublica; lo que no puede ir (vinculado a un lead, fuera de su fase inicial) va apagado con
  motivo. Pantalla por lote; restaurar vuelve sin publicar; purgar (`vehiculos.papelera.purgar`) nombra lo que borra y un lote de varios
  pide tipear «purgar N»; si otra persona ya actuó, no se purga nada.
- **Limpieza automática** (importados de subasta, con el interruptor encendido): dentro de 3 días, banner en la ficha con «Conservar»;
  conservado, «Quitar». Listado: filtro «Se limpiará pronto» e insignia con fecha.
- **Situación** (`<BadgeDeSituacion>`, en la tabla, la tarjeta, la ficha, el resumen y el panel de logística): la fase con su color, o
  «En subasta», «Sin resolver» o «No ganada» con su texto cuando la subasta manda. Las no ganadas no salen en el inventario por defecto.
  **Aviso de la ficha** (bajo la cabecera, sólo «Sin resolver» y «No ganada»): «La subasta terminó y sigue en «<fase>». ¿La ganamos?»
  (o «…y todavía no tiene fase.») con «La ganamos» (enlace al mover de logística en su modo) y «No la ganamos» (hecho con «Deshacer» 10 s);
  enviando, «Guardando…» apagado. Sin permiso de mover en el origen, el texto sin botones y «Para resolverla hace falta poder mover de fase
  en «<origen>»: pídeselo a quien administra los roles.». Conflicto: el texto de la base con el nombre, «No se cambió nada.» y «Recargar».
  Error: «No pudimos guardar el resultado. Intenta de nuevo.»; sin red, el aviso de siempre. No ganada: «No ganada · la marcó <nombre> el
  <fecha>. Ya no cuenta en logística ni en Inicio.» (sin el nombre si no se pudo leer) con «Deshacer». En subasta o en su fase, sin aviso.
- **Resumen (`?vehiculo=<id>`):** portada, identificación, situación (su fase o «Sin fase»), «Editar» (abre el panel encima y vuelve al resumen al día) y
  «⋯»; pestañas `?pestana=fotos|interesados` que se leen al elegirlas. Inexistente, en la papelera o de otro origen: «Este vehículo ya no
  está disponible: no existe o ya no tienes acceso.».

### Leads: configuración (estados propios)

- **Campos** (`leads.configurar`; sin él, sin permiso y sin tarjeta en el hub): activos agrupados como en el formulario, con tipo, clave e
  interruptores («En la tabla», «Filtrable», «Solo la cartera») que guardan solos; desactivados plegados con «Reactivar»; «De fábrica».
  Fijos: teléfono, nombre, tipo y que el lead tenga origen.
- **Impacto, siempre con números y dentro del panel:** volver requerido (cuántos leads no podrán guardarse hasta completarlo); cambiar el
  tipo o eliminar con datos; sacar una opción en uso; dejar de ser «solo la cartera». Conflicto con «Recargar».
- **Orígenes del lead, tipos de lead y tipos de seguimiento** (`?seccion=origenes|tipos|seguimientos`, patrón de `shared/ui/lista`): icono
  y nombre, «Subir»/«Bajar» (con teclado), estado y «⋯» (Editar · Activar/Desactivar con «Deshacer» · Eliminar); lo imposible, apagado con
  motivo. Modal por URL (nombre ≤ 40, sin repetidos). Eliminar, apagado si algo lo usa (la papelera cuenta). Tope 100.
- **Origen por defecto:** a lo sumo uno, siempre activo; no se apaga ni elimina mientras lo sea. **Tipo de lead:** su clase
  («Prospecto»/«Cliente») se elige al crear y no cambia; el último activo de una clase no se desactiva ni elimina. **Tipo de seguimiento:**
  cualquiera se apaga.
- **Dónde se nota:** el alta ofrece los activos (si el elegido se apaga mientras se escribe, el guardado falla y lo demás queda); la ficha
  conserva uno apagado como «(inactivo)»; el CSV acepta nombre o clave de un activo y nunca crea.

### Flujos: configuración (estados propios)

- **Entrada:** con alguna de las tres claves, la tarjeta «Flujos» en el hub; sin ninguna, sin permiso. Con sólo
  `logistica.catalogos.gestionar`, sólo la pestaña «Documentos»; sin ninguna pestaña, «Por ahora no hay nada que configurar aquí con tus
  permisos.».
- **Selector:** una pestaña por flujo configurable, con el nombre del origen («(inactivo)») y «Repuestos» al final. `?ambito=repuestos`
  gana sobre `?origen=`; una URL inválida o ajena abre la primera, nunca un error. Elegir una borra `?fase=`. Vacíos: ningún flujo
  configurable; flujo que desapareció.
- **Lista de fases** (patrón de `shared/ui/lista`): en el orden de la base, nombre con su color (texto y color, nunca sólo color) y las
  marcas «Inicial», «Final» y «Jubilada»; la fila abre el inspector. Vacía, su frase; tope 200 con aviso.
- **Inspector de fase** (`?fase=<id>`, `<Drawer>` por URL; sobrevive a recargar, «atrás» y Esc lo cierran): «Datos», «Salidas y quién
  mueve» y «Requisitos para entrar». Los roles por nombre («otro rol» si no estaba entre los 100 leídos). Un id ajeno al flujo se ignora.
- **Conflicto:** «Otra persona cambió este flujo · Recargar» arriba cuando una escritura choca (`PT409`); se va al llegar la versión nueva.
  En un modal, «Recargar» va dentro y lo escrito queda.
- **Estados:** esqueleto (`loading.tsx` y el del `Suspense`), error con «Reintentar» (el de `(app)`), sin permiso. Una URL escrita a mano
  que no apunta a algo que existe se avisa y se limpia.

### Flujos: revisar (estados propios)

- **Lugar:** franja sobre el selector, sólo en «Fases» y con un flujo leído.
- **Cerrada (al entrar):** resumen con icono y color («Revisar: Todo en orden», «Revisar: 1 error y 3 avisos»; la información no cuenta;
  más de 200, «Más de 200 avisos»). Sin filas, el resumen es texto, no botón.
- **Abierta:** cada aviso con icono y la **palabra** del nivel (nunca sólo color) y el texto de la base, error › aviso › información; uno
  de una fase lleva «Abrir la fase» (suma al historial). Tope 200 con aviso.
- **Tras guardar** se relee sola, sin esqueleto y sin cerrarse; cambiar de flujo la cierra. Primera lectura, una línea «Revisando el
  flujo…»; si falla, su línea con «Reintentar» (lo ya leído queda).
- **No frena:** avisa y abre; nunca impide guardar (un flujo a medio armar siempre tiene avisos). No arregla solo.

### Flujos: tipos de documento (estados propios)

Configuración › Flujos › Documentos (`?seccion=documentos`). Hermana de «Tipos de seguimiento» (patrón de `shared/ui/lista`, orden con
teclado, «⋯», modal por URL), con **dos grupos**, **sólo lectura con motivo** y **una lista que se relee** (ninguna RPC la devuelve).

- **Grupos:** «De toda la empresa» (`logistica.catalogos.gestionar`) y, bajo el selector, «Sólo de este flujo» (`flujos.configurar` o
  `repuestos.configurar`), cada uno con su orden, tope («N de 100 tipos posibles.») y «Nuevo tipo».
- **Filas:** nombre, insignias con texto («Renueva cada 365 días», «Pide fecha», «Portal», «Desactivado»), estado y uso acotado («más de
  50»; «—» a quien no puede cambiar el grupo). **Con uso, «Eliminar» está apagado**: se desactiva en lugar de eliminarse.
- **Sin permiso sobre un grupo:** crear, editar y ordenar apagados con su motivo y un aviso de quién lo cambia; una URL escrita a mano no
  abre el modal: avisa y se limpia.
- **Modal** (`?panel=nuevo-tipo&de=empresa|flujo`, `editar-tipo&tipo=<id>`): nombre, descripción, formatos (al menos uno), vencimiento («No
  vence», «Quien lo sube escribe la fecha», «Vence tantos días después de subido») con días de vigencia y de aviso (cambiar de modo vacía
  los que ya no aplican), «Se puede mostrar en el portal» (lo ya mostrado sigue) y, al editar, «Activo». Borrador en `sessionStorage` por
  grupo y tipo.
- **Eliminar** (`?panel=eliminar-tipo&tipo=<id>`, `<Confirmar>`): sólo uno sin uso; si entre tanto llegó uso, la base lo desactiva y el
  aviso lo dice.
- **Conflicto:** «Recargar» y lo escrito queda; uno que otra persona eliminó con el modal abierto lo dice. Esqueleto de dos bloques.

### Flujos: fases (estados propios)

Lo que la lista de fases y el inspector › Datos suman a «Flujos: configuración». Mismo patrón que «Tipos de documento».

- **Nueva fase** (`?panel=nueva-fase`): nombre, color de una paleta cerrada (con su nombre en texto) y tipo (Intermedia, Inicial, Final);
  se crea al final del flujo. Nombre repetido, junto al campo. Con 200 fases, apagado con su motivo.
- **Filas:** «Subir/Bajar X» (el foco sigue en el botón al llegar el orden nuevo) y el «⋯»: activa → Editar · Jubilar o eliminar;
  jubilada → Editar · Reactivar (sin «Deshacer»).
- **Jubilar o eliminar** (`?panel=eliminar-fase&quitar=<id>`, `<Confirmar>`): al abrirse lee qué usa la fase. Sin unidades ni historial se
  elimina (no se deshace); con ellas se jubila (siguen en ella, deja de ser destino, se puede reactivar). Bloqueada (otras fases la
  esperan, única inicial activa): el motivo y «Confirmar» apagado. Si el uso cambió en el medio, decide la base y el aviso lo dice.
- **Inspector › Datos** (`?fase=<id>`, `bloques.datos`): cinco bloques plegables: **Identidad** (abierto: nombre, descripción, color,
  icono), **En el flujo** (inicial, final, pide nota al entrar, es logística, «Es la subasta»: apagado con «Sólo en el flujo de un origen de
  subasta.» fuera de uno), **Alerta por demora** (días: vacío usa la de la empresa, 0
  la apaga; repetir cada 1 a 720 horas), **Transporte y aduana** (permite contenedor, permite aduana, llegada de repuestos) y **Web y
  portal** (se publica en la web, visible en el portal, nombre y descripción para el cliente). Manda sólo lo que cambió y queda abierto.
  - Errores junto a su campo, con el bloque abierto y el foco en el primero (inicial y final a la vez; portal sin nombre para el cliente).
    Marcar «Es inicial» no desmarca a la otra: avisa.
  - Una regla del flujo apagada (Aduana, Logística, Vitrina web, Portal del cliente) deja su interruptor deshabilitado con el motivo; en
    repuestos, «No existe en el flujo de repuestos.». Uno ya encendido siempre se puede apagar.
  - Borrador en `sessionStorage` por fase («Recuperamos…»); sin conexión, sale al volver. Una jubilada también se edita, con su aviso.

### Flujos: requisitos para entrar (estados propios)

Bloque del inspector (`?fase=<id>`): el resumen («Datos: 1 (bloquea)»), la lista y «Agregar requisito».

- **Fila:** descripción en una línea («Pagos confirmados: 50 % del precio», «Título · 1 a 3 archivos · PDF, JPG»; clave desconocida, «Dato:
  <clave>»), notas, interruptor «Bloqueante» (`aria-label` con la descripción), `<Badge>` «Bloqueante» o «Informativo», orden y «⋯» con
  Editar y Quitar. Los tipos de documento se nombran al llegar (una lectura por flujo, `leerOpcionesDeRequisitos`).
- **Agregar** (`?agregar=nuevo&forma=elegir|dato|documento|espera`): selector Dato / Documento / Espera («Dato» apagado si ya los pide
  todos; «Espera» si la regla «Esperas» está apagada) y la forma en línea (un modal no abre otro). **Dato:** las claves del ámbito que aún
  no pide; «Pagos confirmados» pide porcentaje (1 a 100); se ofrece aunque su regla esté apagada, con la nota de que nadie podrá cumplirlo.
  **Documento:** tipo (activos; los del flujo marcados; sin ninguno, enlace a Documentos), mínimo y máximo de archivos (enteros ≥ 1, máximo
  ≥ mínimo), formatos (ninguno = los del tipo). **Espera:** una fase activa del otro flujo (un vehículo espera a sus repuestos y viceversa).
  Nace informativo y lo dice. Motivos junto al campo; lo escrito queda.
- **Editar** (`?editar=requisito&requisito=<id>`): el formulario de su tipo en el lugar de «Agregar»; manda sólo lo que cambió (sin
  cambios no llama a la base); no cambia clave, tipo ni «Bloqueante». Una sola forma abierta.
- **Bloqueante:** apagar guarda directo. Encender lee antes cuántas unidades quedarían fuera de regla: sin ninguna guarda; con alguna,
  confirma en línea (no destruye nada) diciendo cuántas y que no se mueven, quedan marcadas («Más de 50…»; si la base revisó 1.000, lo
  dice). Recargar descarta el aviso; el foco vuelve al interruptor.
- **Fuera de regla** (`?panel=fuera-de-regla`): sobre la lista de fases, «N unidades fuera de regla» (acotado) con «Ver cuáles»: por fase,
  el título y cuántos requisitos le faltan; «Verlas en el inventario» (`/vehiculos?origen=&fase=`, no en repuestos). Lo oculto dice «Un
  vehículo que no puedes ver». Tope 50 con aviso. Sólo lista.
- **Quitar** (`?eliminar=requisito&quitar=<id>`, `<Confirmar>`): irreversible.
- **Estados:** sin requisitos, tope de 500 con aviso, error al leer los tipos, conflicto (el aviso del flujo), sin permiso (`42501`).

### Flujos: salidas y quién mueve (estados propios)

Bloque del inspector (`?fase=<id>`) y los chips de la fila. «Salida» es una transición que sale de la fase; «entrada», una que llega.

- **Quién puede mover a esta fase:** «Hoy pueden mover: Dueño, Logística» o «Cualquiera con el permiso de mover», con la nota de que quien
  puede mover a cualquier fase siempre puede. Selector de roles (vacío = cualquiera con el permiso) y «Guardar quién mueve». Un rol fuera
  de los 100 leídos se dice «otro rol» y se conserva.
- **Entradas:** «Se llega desde: …»; sin ninguna, lo dice (distinto en una inicial).
- **Fila de salida:** «Embarcar → Embarcado» (sin acción, «Mover → …»), quién mueve por ella (su lista, «(los de la fase)» o cualquiera),
  «Pide nota» y «Jubilada» como `<Badge>`, «Editar» y «Quitar» (`aria-label` con el destino).
- **Agregar salida** (estado local, en línea): destino (activas, distintas, que aún no son salida), acción (≤ 40; vacía, «Mover») y «Pide
  nota al mover». Sin destino posible, apagado con su motivo.
- **Editar una salida** (en el lugar de la fila): el destino no cambia (para otro, quitar y crear); acción, nota y «Quién puede mover por
  esta salida» (vacío = la lista de la fase destino). Un «Guardar» manda lo que cambió; el foco vuelve a «Editar»; mientras, lo demás
  espera. Si acción y nota entraron y los roles no, sigue abierta con el motivo y otro «Guardar» manda lo que falta.
- **Quitar** (`?eliminar=salida&salida=<id>`, `<Confirmar>`): irreversible, no mueve a nadie.
- **Chips:** «→ Embarcado · Embarcar» con el color del destino y texto; hasta 3 y «+N más»; no son enlaces.
- **Estados:** sin salidas, tope de 500 con aviso, conflicto, sin permiso (`42501`), red caída (el reintento repite el id: «ya existe» se
  toma por hecho). Cerrar el inspector con algo escrito pregunta.

### Flujos: reglas y oferta de transporte (estados propios)

Configuración › Flujos › Reglas (`?seccion=reglas`): las reglas del flujo y, con «Transporte» encendida, la oferta. Escribe quien configura
el flujo; la base vuelve a decidir.

- **Reglas:** una fila por regla del ámbito (repuestos no tiene «Vitrina web», «Portal del cliente» ni «Aduana») con su interruptor
  (`role="switch"`, nombre = la regla), qué permite y qué enciende. Sigue a lo que lee el servidor: un apagado que no se hace no «salta»;
  con un envío en vuelo todos se apagan.
- **Apagar con uso:** no escribe; bajo la regla dice qué fases o requisitos de espera la usan («más de 50») con un enlace a cada inspector.
- **Sin uso:** apaga al momento con toast y «Deshacer» (también al encender), que usa la última versión conocida del flujo.
- **Oferta de transporte:** casillas de puertos de origen, de destino y navieras (activos), «Guardar oferta» y «Ofrecer todos»; sin
  marcar ninguno, se ofrecen todos. Uno guardado y luego desactivado se ve «(inactivo)» para poder quitarlo. Tope 200 con aviso. Las
  marcas sin guardar sobreviven a cambiar otra regla.
- **Vacíos:** sin navieras o puertos (se cargan en Logística), sin flujos configurables, flujo que ya no existe.
- **Conflicto:** «Recargar» arriba (lo marcado queda mientras la oferta guardada no cambie). Una regla que dejó de poder cambiarse se dice
  con un toast y se relee. **Sin permiso:** todo apagado con su aviso.

### Logística: estados propios

El panel de la unidad (`<PanelDeLaUnidad>`) se dibuja igual en `/logistica/vehiculo/<id>` y, dentro de un drawer, en `/logistica?vehiculo=<id>`.

- **Entrada:** la unidad se lee bajo la RLS de `vehiculos` y se pide `logistica.ver` en su origen; sin esa clave, «No tienes permiso para
  ver esto». Lo que no existe, está en la papelera, no se ve o trae un id inválido: «Este vehículo ya no está disponible» con «No existe o
  ya no tienes acceso.» e «Ir a Logística» (nunca «sin permiso»: confirmaría que existe). En el drawer, el mismo estado va dentro.
- **Panel de la unidad:** cabecera con título, origen, situación (`<BadgeDeSituacion>`: la fase, «Sin fase», «En subasta» o «Sin resolver»), «Desde hace N días en esta fase» y «Abrir
  ficha». Debajo, un bloque plegado por hueco (qué falta, documentos, transporte, aduana, gastos, pagos, margen, notas, historial), en ese
  orden, que lee al abrirse con la sesión de quien mira y sólo aparece con su permiso en el origen y su regla del flujo encendida. Si el
  flujo del origen no se pudo leer, los bloques que piden una regla no se dibujan y una línea lo dice; el resto sigue. La ficha del
  vehículo lleva «Ver en logística» (antes de «Editar», con `logistica.ver`) a `/logistica/vehiculo/<id>`.
- **«Qué falta» y mover** (abierto al inicio, el primero): una tarjeta por destino (las salidas de la fase actual; sin fase, las iniciales)
  con cada requisito y su estado **dicho con texto** («Cumplido» / «Falta»), «Obligatorio» / «Informativo», su detalle («1 de 2
  aprobados») y, en una falta obligatoria, el enlace al hueco que la resuelve. «Elegir» abre en el bloque la nota interna (obligatoria si
  la fase o la salida la piden) y el botón con la acción de la salida; apagado, su motivo va escrito debajo («Falta: BL aprobado.», rol,
  nota, permiso del origen). `Ctrl/Cmd+Enter` envía. Al lograrlo la tarjeta cambia de columna y el foco vuelve al título del panel.
  **«La ganamos»** (`?ganada=si`, desde la ficha o desde la línea «La subasta terminó y nadie dijo si la ganamos.» · «La ganamos» de este
  bloque): cabecera «La ganamos: elige a qué fase pasa. Se anota como ganada al moverla.», sólo los destinos que no son la subasta, el
  primero abierto con su vista previa; mover la anota ganada en la misma operación y avisa «La ganamos: <título> pasó a «X».». Ya no sin
  resolver: «Esta subasta ya no está sin resolver.» y la lista de siempre. Sin destinos fuera de la subasta: «Desde aquí no hay una fase
  después de la subasta.» o, sin fase, «Primero muévela a su fase inicial; después, «La ganamos» ofrece la siguiente.». Rechazos y
  conflicto, como al mover.
  **Conflicto:** dentro del formulario, quién la movió y cuándo, «No se movió nada.», «Ver cómo quedó» (otra pestaña) y «Recargar», que
  conserva la nota. Una unidad **fuera de regla** lo dice arriba. Estados: esqueleto, error con «Reintentar», sin fase, sin destinos, tope
  de 12 destinos con aviso, «Actualizando…» al releer (al volver el foco, mínimo 5 s entre lecturas); sin permiso de mover, la lista sin
  «Elegir».
- **Hueco «Transporte»:** «Ruta» (naviera, puertos de origen y destino), «Contenedor y booking» (en mayúsculas y sin espacios) y «Fechas y
  notas» (zarpe, ETA, arribo, notas ≤ 2.000) con un «Guardar» que manda sólo lo que cambió (apagado sin cambios, guardando o sin permiso).
  El selector ofrece la oferta del flujo (vacía = todo lo activo) y siempre lo guardado, rotulado «(inactiva)» o «(fuera de la oferta)».
  Rechazos junto a su campo (ETA antes del zarpe, la fase no permite o exige contenedor) con el foco al primero; conflicto dentro del
  formulario con «Recargar», que conserva lo escrito. Sin `logistica.transporte.editar` del origen, campos apagados con su motivo. Vacíos:
  sin transporte cargado; sin navieras (con `logistica.catalogos.gestionar`, «Cargar navieras»). Guardar relee «Qué falta». Una unidad de
  repuesto: `TEXTO_DE_REPUESTO`.
- **Notas e historial** (plegados): «Notas» con «Escribir una nota» (`<Textarea>`, contador de 2.000, «Guardar nota», `Ctrl/Cmd+Enter`; el
  error junto al botón y el texto queda) y las notas de la más nueva: quién, cuándo, texto; la que dejó un cambio de fase dice «al pasar a
  «<fase>»» y no se edita. «Editar» sólo la propia, en el lugar. **No hay «Borrar»**: la base no deja el borrado suave por `update` (pide
  una RPC). «Historial», sólo lectura: una línea por cambio, quién («Sistema» sin persona), cuándo y la nota. Las dos: de a 20 con «Ver
  más» hasta 500 (`<AvisoDeTope>`), «Ir a una fecha» y «Volver a los más recientes»; esqueleto, vacíos y error dentro del bloque.
- **Lote** — con `flujos.mover` en el origen, cada tarjeta lleva casilla de 44 px y cada columna «Elegir los de esta columna» (lo cargado y
  filtrado, hasta 200). Una sola fase: elegir en otra vacía la selección y lo dice. Con elegidos, barra fija abajo («N elegidos en «F»»,
  «Limpiar», «Mover a…») que abre `?panel=lote` (claves `destino`, `contenedor`, `booking`; la selección no sobrevive a recargar). El
  drawer: un botón por salida; con destino, «N listas, M no pueden entrar» y una línea por unidad (las primeras 20 con «Mostrar todas»), la
  nota común, «Mover los N que pueden» (apagado con motivo si ninguna puede) y «Elegir otro destino». El resultado se dice entero («Se
  movieron 6 de 8.», una línea por unidad que no pasó), con «Reintentar los 2» (vuelve a la vista previa con esas) y «Cerrar».
  `?contenedor=` o `?booking=` abre el mismo drawer con las unidades del grupo que estén en una misma fase, y dice cuántas quedan fuera.
- **Drawer de `/logistica`:** `?vehiculo=<id>` lo abre al cargar; Esc, ✕ o «atrás» lo cierran y quitan el parámetro; sólo muestra, así que
  cerrar no pregunta.
- **`/logistica` (la cadena):** pestañas de origen (con uno solo no se dibujan; cambiar suelta filtros, fase y panel), `<FilterShell>` y las
  columnas en el orden de la base. Estados: esqueleto de tablero; origen sin fases (con «Configurar los flujos» si tiene
  `flujos.configurar`); ningún origen con la logística encendida; vacío por filtro con «Limpiar» y columna vacía; error con «Reintentar» y
  «No se pudo comprobar N origen(es).». **Columna:** nombre sobre el color de la fila, «Sin fase» (la pone la base, primera y sólo con
  tarjetas), «Jubilada» en texto, número acotado (`50+`); «Ver más» hasta 500 y en el tope «Mostrando las 500 que llevan más tiempo en la
  fase.»; un fallo de «Ver más» deja la columna como estaba. **Tarjeta:** identidad «<principal> · <título>» como enlace, VIN y lote, días
  en la fase, «En subasta» o «Sin resolver» si la subasta manda (una no ganada no está en la cadena), «Demorado» en texto (lo calcula la base), contenedor y ETA; sin foto. **Dónde está** (con `q` válido): hasta 10 de todos tus
  orígenes con su fase, cada una a su origen con el panel abierto, y «Hay más: escribe más para afinar.». **Celular:** una fase a la vez
  (`?fase=`). La sub-navegación (Cadena · Embarques · Aduana · Gastos) dibuja sólo lo que la persona puede ver; con uno solo, nada.
- **Listas de `/logistica/*`** (gastos, embarques, aduana): por cursor de a 50, sin selector, sin total y sin «Anterior» (la base camina
  sólo hacia adelante: «Siguiente» y «Volver al principio»); filtros en la URL; estados: esqueleto de lista, vacío de primera vez, por
  filtro con «Limpiar filtros», página sin filas con «Volver al principio» y error con «Reintentar». Sin permiso, «No tienes permiso para
  ver esto».
- **`/logistica/gastos`** (`logistica.ver` y `logistica.gastos.ver` o `pagos.ver`): vista `?ver=gastos|pagos` (sólo con las dos claves;
  cambiar no conserva filtros); filtros origen (con dos o más), categoría, «Sin confirmar» y rango de fecha; **ninguna suma**. La fila abre
  el panel de la unidad (`?vehiculo=`) sin perder filtros ni página y la lista se relee al cerrarlo. El pago confirmado dice «Confirmado»
  con su fecha (quién, en el sello del panel). «Ver todos en Gastos» sale del tope de los huecos «Gastos» y «Pagos», filtrado por origen.
- **`/logistica/embarques`** (`logistica.ver`): `?grupo=embarques|contenedores`; filtros naviera, puertos (de los catálogos activos),
  estado («En tránsito», «Ya llegaron») y búsqueda por booking o contenedor (3). Fila: la clave (abre el resumen), naviera, ruta, zarpe,
  ETA, arribo y unidades acotadas («200+»; «Hay unidades que no ves.»); lo que difiere entre unidades dice «Varias», lo que ninguna tiene
  «—». Si la base revisó una parte sin llenar la página, lo dice y «Siguiente» sigue buscando. **Resumen** (`?booking=` o `?contenedor=`,
  `<Drawer>` que sólo muestra): una fila por unidad con título (enlace si es vehículo), fase, ETA y arribo, con avisos de tope y de ocultas;
  debajo, plegados y cada uno con su permiso (la base lo exige por unidad): «Mover el grupo», «Subir un documento a las unidades» y
  «Prorratear un gasto entre las unidades». **«Editar grupo»** (con `logistica.transporte.editar` o `repuestos.editar`; `?panel=editar-grupo`
  **tapa** al resumen): ruta, contenedor y booking, fechas; un campo común sale con su valor, uno que difiere sale vacío con «Varios» y
  dejarlo así no lo toca. «Guardar» manda lo tocado a todas o a ninguna («Se aplicó a las N unidades.»; conflicto «No se cambió ninguna:
  <motivo>» con «Recargar»; el rechazo de una unidad junto a su campo con su título). Más de 200 unidades, ocultas o no editables: botón
  apagado con su motivo.
- **`/logistica/aduana`** (`logistica.ver` lee, `logistica.aduana.gestionar` escribe): filtros `canal`, `pagada` y `q` por número. Fila:
  número (abre el resumen), canal en `<Badge>` con texto, fecha aceptada, tributos («Pagada» o «Faltan los tributos de N», con «y de
  unidades que no ves»; «Sin vehículos»), unidades acotadas y vencimiento en texto (vencida, hoy, mañana, en N días hasta 7, si no la
  fecha; una pagada no se alarma). Resumen en `?declaracion=<id>` (datos y vehículos con «Tiene/Falta el tributo»; sin montos). El hueco
  «Aduana» del panel (regla `aduana`): la declaración vigente, canal, vencimiento y «Tributos pagados: sí|no» con «Ir a Gastos». **Escribir:**
  «Nueva declaración» (`?panel=nueva-declaracion`: número obligatorio y único, fechas, despachante, depósito, notas; borrador) y «Editar»
  (`?panel=editar-declaracion&declaracion=<id>`, no convive con el resumen; conflicto con «Recargar» que conserva lo escrito). «Vehículos
  de la declaración»: «Quitar» marca (con «Deshacer»), buscador (3, hasta 10) con «Agregar» y «Guardar vehículos» manda todo junto (hasta
  200); con canal queda todo apagado: la composición queda fija. «Asignar canal» es un `<Confirmar>` en `?panel=canal` con el selector
  adentro; pide al menos un vehículo. El canal no se quita.
- **Configuración › Logística:** sin `logistica.catalogos.gestionar`, «No tienes permiso para ver esto»; sin ningún catálogo lleno, «Por
  ahora no hay nada que configurar aquí.». **Categorías de gasto:** esqueleto, vacío, error con «Reintentar»; el «⋯» lleva Editar,
  Activar/Desactivar y Eliminar (`?panel=eliminar-categoria&categoria=<id>`; con gastos el diálogo dice que está en uso, propone
  desactivarla y no se cierra); el orden es un número del modal; una de propósito «Tributos» no cambia de propósito (Aduana la lee).
  **Prorratear** (hueco del resumen de un grupo, `?panel=prorratear`): muestra cuánto le toca a cada unidad y la suma antes de confirmar;
  sin unidades no hay nada que repartir; más de 200 no se reparte; el equivalente en base lo calcula la base.
- **Estados:** esqueleto de detalle (`loading.tsx` y el del `Suspense`), error con «Reintentar» (el de `(app)`), sin permiso y no
  disponible.

### Tablero: estados propios

- **`/tablero`** (`tablero.metricas.ver`; sin él, «No tienes permiso para ver esto» y sin entrada en el menú; Inicio lo enlaza con «Ver el
  tablero»): período en la URL (`?periodo=mes|mes-anterior|90d`; uno desconocido cae en «Este mes»), tres enlaces con `aria-current`. Cada
  widget con su `<Suspense>` y esqueleto; si falla, «Reintentar» sólo en ése; uno sin permiso no se muestra ni se ofrece.
- **Cifras:** leads creados, convertidos, tasa, cotizaciones, finales; cada una un grupo «Título: valor». Una tasa nula dice «Sin datos»,
  nunca «0 %»; sin leads, «Todavía no hay leads en este período» (con `leads.crear`, «Nuevo lead»).
- **Gráficas** (barras por día de leads y cotizaciones; rankings de leads por origen y por persona y de cotizaciones por origen): leyenda en
  texto, «Ver como tabla» con todos los números, tope dicho (10 orígenes, 20 personas), vacío y error por widget.
- **«Margen del mes»** (con `logistica.margen.ver` en algún origen; suma sólo esos): monto por `<Monto>` en un grupo llamado sólo «Margen
  del mes» (Modo Live lo oculta entero), nulo «Sin venta registrada»; nota con venta, real y cotizado y cuántos vehículos entran y cuántos
  no tienen venta.
- **«Cola de la web»** (con `web.cola.gestionar`): turnos, tasa de contacto (sin los directos; nula «Sin datos»), mediana hasta «Contacté»,
  la cuenta por estado y «Turnos por persona» con «Ver como tabla».
- **«Personalizar»** (`?panel=personalizar`, conserva el período): una fila por widget visible con «Mostrar X» («Visible» / «Oculto» en
  texto) y «Subir/Bajar X»; guarda al cambiar, sin «Guardar», con los controles apagados mientras guarda; «Restablecer» vuelve al de
  fábrica (apagado si ya está así). Todos ocultos: «Ocultaste todos los widgets».

### Cotización: niveles de acceso (estados propios)

Configuración › Cotización (`?seccion=niveles`). Hermana de «Tipos de seguimiento»; **un nivel retirado se deshace** y **el motivo de por
qué no se elimina viene de la base**.

- **Quién entra:** `equipo.roles.ver` o `equipo.roles.gestionar` (cada nivel es un permiso de la matriz de Roles); sin ninguno, «No tienes
  permiso para ver esto». Con sólo `ver` se lee: sin «Nuevo nivel», «⋯» ni clic.
- **Lista:** el fijo «Todos» (sin «⋯» ni clic) y los niveles en uso; debajo «Retirados». Fila: estado y «Sin uso»/«En uso»; pie «N de 10
  niveles posibles.». «⋯»: Renombrar · Retirar/Restaurar (guardan solos, con «Deshacer») · Eliminar. «Costos» se renombra y retira, no se
  elimina.
- **Eliminar con uso:** apagado, con lo que dice la base; sin uso confirma nombrándolo (`?panel=eliminar-nivel&nivel=<id>`). Nuevo y
  renombrar: modal por URL (`?panel=nuevo-nivel`, `renombrar-nivel&nivel=<id>`); vacío, > 40 o repetido se rechaza junto al campo. **Tope**
  10 contando «todos» y retirados. Estados: esqueleto, error con «Reintentar», lista llena.
- **Dónde se nota:** cada nivel son **dos permisos por origen** (`Ver el nivel «X»`, `Editar el nivel «X»`) en Roles; el dueño los recibe
  al nacer.

### Cotización: comentarios (estados propios)

La sección «Comentarios» bajo la hoja de una cotización guardada: un nivel de respuestas, los adjuntos arriba; favorita, reportar y moderar
en la cabecera.

- **Cuándo se lee:** la lista llega la primera vez que la sección está a la vista (o enseguida si la URL trae `?panel=borrar-comentario` o
  `quitar-adjunto`). Esqueleto con el campo dibujado y apagado; vacío; error con «Reintentar»; sin acceso, sin campo.
- **Comentar y responder:** campo arriba (lo más nuevo primero) y «Comentar», `Ctrl/Cmd+Enter`. «Responder» sólo en una raíz (también
  eliminada), al pie de sus respuestas. Vacío o > 4.000: el motivo sin pedir nada; un rechazo deja lo escrito y lo dice bajo el campo.
- **Editar y borrar:** «Editar» sólo lo propio y vivo (`Esc` cancela sin preguntar; conflicto con «Recargar» que conserva lo escrito).
  «Borrar» lo propio o, con `cotizaciones.moderar`, lo ajeno, por `?panel=borrar-comentario&comentario=<id>`; cita el comienzo y, en una
  raíz con respuestas, «Las respuestas quedan.»: queda «Comentario eliminado.» y se va con su última respuesta. Una URL que no abre avisa y
  se limpia.
- **Cuántos:** de a 20 raíces con sus primeras 20 respuestas («Ver más comentarios», «Ver más respuestas») hasta 500; ahí aviso de tope
  con «Ir a una fecha» y «Volver a los más recientes». Sin tiempo real: lo ajeno aparece al recargar.
- **Adjuntos:** leídos con la primera página (esqueleto, vacío, error propio). Quien puede guardar la cotización ve «Adjuntar archivo» (PDF,
  imágenes o Word, ≤ 25 MB, hasta 20 por cotización; imágenes a WebP ≤ 1600 px); en el tope, apagado con su motivo. Lo que no se puede
  subir se dice uno por línea. Cada archivo sube de a uno con su fila; un fallo deja la fila con el mensaje de la base, «Reintentar» y
  «Descartar». Cada adjunto: icono, nombre, tamaño, quién y cuándo; «Descargar» pide una URL firmada al tocarlo (60 s); «Quitar» (quien lo
  subió y aún puede adjuntar, o quien modera) por `?panel=quitar-adjunto&adjunto=<id>`. Sin miniaturas.
- **Favorita, reportar y moderar** (cabecera, tras «Revisiones»): «Favorita» (marca privada, optimista; si la base la rechaza vuelve y
  avisa), «Reportar…» (`?panel=reportar`: motivo con contador `n/500`; con uno propio, «Cambiar el motivo» y «Retirar mi reporte» con
  «Deshacer») y, sólo para quien modera (`cotizaciones.moderar` y, en una final, `cotizaciones.final.gestionar` del origen), «Invalidar…»
  en una activa, «Descartar los reportes…» si tiene y «Reactivar…» en una inválida. Insignia «Inválida» (todos) o «Reportada» (sólo quien
  modera: el autor no se entera de un reporte sin juzgar). Moderar: `?panel=moderar&accion=invalidar|descartar|reactivar`, un
  `<Confirmar>` con los motivos (hasta 20) y lo que hace (invalidar: deja de valer y no ancla al vehículo; descartar: borra los reportes;
  reactivar: vuelve a valer y borra los reportes; invalidar y reactivar descartan lo no guardado de la hoja). Entró: aviso y se relee;
  conflicto: el texto de la base con «Recargar»; una acción que ya no corresponde avisa y se limpia. Si la lectura falla, la cabecera sigue
  sin nada de esto.

### Cotización: fórmula (estados propios)

Configuración › Cotización (`?seccion=formula&origen=<id>`): ver, publicar, revertir, descartar y editar la fórmula de un origen.

- **Quién entra:** `cotizaciones.configurar` en algún origen, aunque no tenga los permisos de los niveles (entonces «Fórmula» es la única
  pestaña y `?seccion=niveles` la abre). La base vuelve a decidir: la policy `formulas: leer` sólo deja ver los orígenes con la clave.
- **Origen:** los que tienen la clave, en el orden del catálogo, también los inactivos («(inactivo)»). Con más de uno, el selector escribe
  `?origen=`; uno ajeno o inexistente abre el primero; cambiar de pestaña lo limpia. Sin ninguno, su vacío.
- **Arriba:** la publicada (versión, nota, quién y cuándo) o, sin ella, que no se puede cotizar en el origen; el borrador si hay (de quién,
  cuándo, nota, versión sobre la que empezó y, si se publicó otra después, que publicarlo dará conflicto).
- **Versiones:** publicadas y archivadas de la más nueva (sin autor: «Alguien»), de a 20 hasta 500; en el tope, «Ir a la versión» (un
  número) que lee desde ahí hacia atrás con «Volver a la más nueva»; la posición no va a la URL. Estados: esqueleto, error con
  «Reintentar», vacío, vacío desde la N y fallo de «Ver más» sin perder lo cargado.
- **Publicar** (`?panel=publicar-formula`, sólo con el borrador al día): nota obligatoria (≤ 2.000, el motivo junto al campo sin pedir
  nada). Entró: la publicada nueva, sin borrador y la lista desde la primera página. Conflicto (otra persona publicó o guardó el borrador
  después de leerlo): el texto de la base con «Recargar», que conserva la nota; si con lo nuevo el borrador ya no está o quedó atrasado, el
  modal lo dice y no deja publicar. Una regla de la base (falta el diseño, un nivel retirado) va arriba del modal y la nota queda. Por URL
  sin borrador o con uno atrasado: avisa y limpia.
- **Revertir** (`?panel=revertir-formula&version=<id>`, en cada archivada si hay publicada): publica una copia de la N con su diseño; el
  borrador no cambia (queda atrasado). Nota propuesta «Vuelve a la versión N.». Conflicto como al publicar. Por URL: sin publicada, la
  publicada misma o una versión que no está en lo cargado, avisa y limpia. Cambiar de pestaña limpia `panel` y `version`.
- **Descartar** (`?panel=descartar-borrador`, `<Confirmar>`; al día **y atrasado**): borra el borrador sin deshacer; publicada y lista no
  cambian. Lo que no entró queda en el diálogo con el mensaje de la base o, sin respuesta, «No sabemos si se descartó: recarga para verlo.»
  (sin reintento solo). Por URL sin borrador: avisa y limpia.
- **Editar** (`?panel=editar-formula`): «Editar» en el borrador (también atrasado) o «Editar en un borrador» en la publicada; sin ninguna,
  la URL avisa y se limpia. El editor ocupa el lugar de la sección, con «Volver a la fórmula» («atrás» también); lee la versión desde el
  navegador (esqueleto, error con «Reintentar», versión que ya no se abre). Cada fila: etiqueta, id y tipo; un cálculo o una constante,
  su texto vigente (tras un ⚙, el reescrito con su aviso) y «Editar», que abre su texto (una fila a la vez; «Aplicar» o `Ctrl/Cmd+Enter`
  compila, Esc cierra; el error queda bajo el texto; pisar un valor del ⚙ pide «Pisar el valor»; un rechazo de la fórmula entera va a la
  fila que nombra). Lo aplicado se repone al volver o recargar, con «Descartar», hasta guardar. Hasta 500 filas con aviso y «Buscar fila».
- **Vista previa y filas nuevas:** «Vista previa» con «Cifras de prueba.» y qué se supuso (datos en 0, opciones apagadas, variante por
  defecto, tipos de cambio y tablas de hoy): esqueleto, error, fórmula inválida, sin cálculo posible y, calculada, los totales por
  `<Monto>` con avisos de lo que no se pudo leer (tabla inexistente o de 1.000 filas o más, tipo de cambio inactivo). Cada fila suma su
  cifra o por qué no la tiene. «Sumar fila debajo de <etiqueta>»: etiqueta, tipo (Cálculo o Constante), nombre (propuesto desde la
  etiqueta; una constante nueva no aparece en la hoja hasta colocarla en el diseño) y texto; errores junto al campo. Una sola cosa abierta
  a la vez. Una fila existente no cambia de nombre.
- **Guardar el borrador:** espera si hay una fila abierta, si no valida o sin cambios (un cambio del ⚙ cuenta). Sin confirmación. Sobre la
  publicada crea el borrador con su diseño; sobre el borrador lo pisa con su hora, sin releer. Conflicto: el texto de la base con
  «Recargar» (lo aplicado y no guardado se pierde); regla de la base, sin permiso, sin respuesta y otro error, cada uno con su mensaje. Lo
  que el diseño no muestra (una constante sin celda) se avisa: «Para publicar, el diseño de la hoja tiene que mostrar: «…». Puedes guardar
  igual.»; sin diseño, todavía no se puede publicar.
- **Grupos:** con grupos, una tarjeta por grupo en el orden de la fórmula (hasta `TOPE_DE_LO_CARGADO`): etiqueta, id, plazo, tono, tipo de
  cambio (bucket), filas y «Editar». Sin grupos no se dibuja; no se suman ni quitan grupos (la plantilla de la tarjeta los nombra). El
  formulario: etiqueta, plazo de pago (opcional), tono (del catálogo, leído al montarse; «Aplicar» espera a que llegue), tipo de cambio (el
  bucket; con modos, cada modo elige el de cada bucket) y «Filas del grupo» con «Quitar» (sin grupo, una fila no entra en el total) y
  «Sumar una fila». Aplicar recalcula la vista previa y cuenta como cambio; un rechazo (`grupo_vacio`…) va a su tarjeta. Cada fila con
  grupo dice «Grupo: <etiqueta>».

### Cotización: tarjeta (estados propios)

Configuración › Cotización (`?seccion=tarjeta&origen=<id>`): edita el **borrador** de la plantilla de la tarjeta, lo publica con nota y lo
descarta.

- **Quién entra:** `cotizaciones.configurar` en algún origen; la pestaña va después de «Fórmula» (sin la clave, `?seccion=tarjeta` abre la
  primera de las suyas). **Origen:** como en «Fórmula». Sin orígenes, su vacío; **sin fórmula publicada**, no hay editor: «Falta publicar
  la fórmula de <Origen>: la tarjeta se arma con sus grupos.» con «Ir a «Fórmula»».
- **Arriba:** «Tarjeta de <Origen>» y de dónde nace (el borrador guardado, la versión publicada o los grupos de la fórmula) y, si hay
  publicada, su versión, fecha y nota.
- **Avisos** (en este orden): lo corregido al abrir (un grupo que la fórmula ya no tiene se quita, uno nuevo se suma al final sin tono, la
  etiqueta de un nodo sin lugar se quita; **no se guarda solo**), un tono que ya no está en el catálogo, «Con esto no se podría publicar:
  <motivo>» (no apaga «Guardar») y lo que pasó al guardar.
- **Bloques:** «Grupos» (el tono de cada uno; «Del grupo (<tono>)» quita la clave; uno que ya no está sale «<clave> (ya no está)»),
  «Total» (etiqueta y leyenda), «Filas» (plegado; etiqueta y leyenda de cada nodo, «Buscar fila», hasta 500 con aviso) y «Pie y columnas»
  (plegado: nota, logo, leyenda, plazo, tipo de cambio). Cada campo dice «n de <tope>» (sin `maxLength`) y su motivo junto a él.
- **Vista previa en vivo:** «Vista previa de la tarjeta» con «Cifras de ejemplo.» sigue a la plantilla de trabajo (guardada o no); desde
  `xl` al costado y pegada arriba, si no debajo del editor. Corta cada grupo en 4 filas y lo dice. Esqueleto de alto fijo; sin conexión, el
  aviso con «Reintentar» y el editor sigue; sin grupos, sólo el total. No es interactiva ni anuncia nada al tipear.
- **Guardar:** activo de entrada sin borrador; con borrador, sólo si algo cambió; apagado con la forma rechazada, un envío en curso o un
  conflicto. Entra: «Se guardó el borrador.» y los campos se apagan hasta que llega lo guardado.
- **Conflicto (PT409):** el mensaje de la base, «Ver cómo quedó» (otra pestaña, sin perder lo tipeado) y «Recargar» (descarta lo escrito);
  se va **al llegar** la versión nueva. **Sin conexión:** lo escrito queda, sale solo al volver, con «Reintentar». Lo tipeado sin guardar
  vuelve tras recargar o cambiar de pestaña, con «Recuperamos lo que habías escrito y no guardaste.» y «Descartar».
- **Publicar** (`?panel=publicar-tarjeta`): en la fila de «Guardar», apagado con su motivo a la vista sin borrador o con cambios sin
  guardar (se publica lo guardado). Nota obligatoria (≤ 2.000). Entra: el encabezado dice «Publicada: versión N». PT409: el mensaje de la
  base, «No se publicó nada.» y «Recargar» (la nota queda); sin borrador, «Publicar» apagado. Una regla de la base contra la fórmula, arriba
  del modal. Por URL sin borrador: «No hay borrador para publicar.»
- **Descartar** (`?panel=descartar-plantilla`): sólo con borrador, también con cambios sin guardar; se borra sin deshacer y el editor parte
  de la publicada. PT409 con «Recargar»; sin respuesta, «No sabemos si se descartó: recarga para verlo.» (no reintenta solo). Por URL sin
  borrador: «No hay borrador para descartar.»

### Cotización: tablas (estados propios)

Configuración › Cotización (`?seccion=tablas&origen=<id>`): editar y publicar las filas de las tablas de referencia
(`tabla_referencia_publicar()`).

- **Quién entra y origen:** como «Fórmula»; el selector escribe `?origen=` y borra `?tabla=`.
- **Lista:** las tablas activas del origen y las compartidas, por clave: nombre como enlace a `?tabla=<id>`, clave, «Compartida» y
  «Tapada por la de <Origen>» (`<Badge>`) y «Versión N · <persona> · <cuándo>». Vacía: «<Origen> no tiene tablas de referencia.» y «Las
  tablas nuevas y sus columnas todavía no se crean desde aquí.». Tope 100 con aviso. Esqueleto y error de la ruta.
- **Abrir una:** sólo si está en la lista del origen elegido; si no, o si ya no está o pasa de 2.000 filas, su motivo con «Volver a las
  tablas». El editor (con `diferido()`) ocupa el lugar de la lista: «Volver a las tablas» (no pregunta: el borrador conserva lo hecho),
  versión y, si es compartida o tapada, a quién le cambia publicarla.
- **Editor:** la tabla entera en memoria, de a 100 filas («Desde la fila 101»…, sin total; «Anterior» y «Siguiente»; la página no va a la
  URL). Un campo por columna declarada, con su etiqueta en la primera fila y el nombre «<Etiqueta>, fila n» en todas; números y años con el
  locale de la empresa (en es-BO «9.200,5» es 9200,5 y «1.5» es un aviso). Se aplica al salir del campo o con Enter; lo que no se lee queda
  escrito con su motivo y la fila conserva el valor de antes. «Subir», «Bajar» y el «⋯» con «Sumar una fila debajo», «Mover al
  principio/al final» y «Quitar la fila» (sin preguntar, con «Deshacer»); «Sumar una fila» al pie; tope 2.000 filas. Mover lo anuncia.
- **Primer error:** el de la fila más temprana (texto sin leer o celda que la base no acepta) arriba, con «Ir a la celda» (cambia de página
  y pone el foco); una columna que la tabla no declara no tiene campo: «Descartar los cambios».
- **Borrador:** cada cambio queda en la pestaña del navegador con la versión leída. Al volver, «Recuperamos tus cambios sin publicar.» con
  «Descartar»; si la tabla se publicó después, no se recuperan y lo dice. Al pie, que los cambios viven en esta pestaña hasta publicar o
  descartar, y «Descartar los cambios» (con «Deshacer»), o «Sin cambios que publicar.».
- **Publicar** (`?panel=publicar-tabla`; apagado sin cambios o con una celda marcada): las fórmulas publicadas que la usan pasan a su
  versión siguiente con estas filas; lo guardado de cada cotización no cambia. Nota como en «Fórmula». Por URL sin cambios o con una celda
  marcada, no se manda. Entró: el aviso con la versión y el editor se vuelve a montar. Conflicto: el texto de la base con «Recargar» (los
  cambios no vuelven); una celda rechazada, su mensaje con «Ir a la celda»; sin permiso (una compartida pide configurar cada origen que la
  usa) y lo demás, arriba del modal.

### Cotización: ajustes (estados propios)

Configuración › Cotización (`?seccion=ajustes`): la vigencia y el vehículo obligatorio al cotizar, una fila para todas las cotizaciones.

- **Quién:** la pestaña (la última) la ve quien tiene `cotizaciones.configurar` en algún origen; la cambia quien la tiene en todos (la
  concesión sin origen). Sin eso, los campos apagados con su motivo arriba y sin «Guardar». La base lo vuelve a exigir en
  `empresa_guardar_ajustes_de_cotizacion()`.
- **Formulario:** bloque «Vigencia y vehículo» con «Vigencia (días)» (1 a 365; fuera de rango, el motivo junto al campo con el foco) y el
  interruptor «Vehículo obligatorio al cotizar». Sin borrador. Esqueleto; si la lectura falla, el error de la ruta (nunca los de fábrica).
- **Guardar:** «Guardando…» con los campos apagados; entró: aviso y el formulario se monta con lo guardado. Otra persona cambió la fila
  (aquí o en Empresa): el texto de la base con «Recargar» y lo tipeado queda; igual sin conexión o sin permiso.
- **Dónde se nota:** la vigencia mueve «Vencida», «vence el», la tarjeta y el PDF de todas las cotizaciones, también las guardadas (se
  calcula al leer); el vehículo obligatorio rige en la hoja que se abre después (apagado, una preventa se guarda sin vehículo; una final
  siempre lo pide).

### Cotización: diseño (estados propios)

Configuración › Cotización (`?seccion=diseno&origen=<id>`): secciones, celdas, ítems, cabecera y tarjeta del total de la hoja, y su vista
previa.

- **Quién entra:** `cotizaciones.configurar` en algún origen (la pestaña va después de «Fórmula»); sin ninguno, su vacío. Selector
  «Origen» con 2 o más, como «Fórmula».
- **Qué abre:** el borrador o, sin él, la publicada. Sin versión o sin diseño lo dice (aquí no se crea uno). Cargando,
  `EsqueletoFormulario`; una lectura que falla sube al «Reintentar» de la ruta.
- **Secciones y celdas:** por sección, «Título» (≤ 80; vacío lo quita), «Dónde va» (Principal | Avanzado), «Quién la ve» y «Quién la
  edita»; por celda, «Ancho» (Completo | Mitad | Un tercio), «Quién la ve» y «Quién la edita». Niveles: «Todos» y los vivos; uno retirado
  que el diseño usa se muestra «(retirado)». Elegir quién ve alinea quién edita. **Lo que no admite nivel** (el total y lo que va aparte,
  o una sección que los tiene): «Quién la ve» apagado con su motivo.
- **Ítems que no son celda:** por celda, «Ayuda con una tabla» (las que nombra la fórmula) o «Ayuda con un texto» (≤ 300): una quita la
  otra. Atajos: «Columna de los chips» y «Cuántos chips (1 a 12)». Interruptor: «Habilita» (apagado, deshabilita lo que condiciona) o
  «Muestra» (apagado, no lo dibuja). Variante y subtotal se ven y no se editan.
- **Cabecera de la hoja:** «Ofrecer «Ver total en moneda local»» (la hoja lo muestra apagado) y los modos de tipo de cambio: nombre, «Tipo
  de cambio de <bucket>» por bucket de la fórmula, «Total en» y «Quitar el modo» (sin confirmar: es borrador). «Sumar un modo» copia los
  tipos de cambio de la fórmula, con la clave derivada del nombre (no cambia al renombrar). Sin total en moneda local o sin tipos de cambio
  en la fórmula, «Sumar» se apaga con su motivo y los modos existentes siguen editables.
- **Tarjeta del total:** lo que muestran el resumen y el PDF (repite lo que la hoja dibuja): «Total» (los nodos marcados como total; con
  uno solo, apagado) y «Mostrar «<nodo>» junto al total» por cada nodo «aparte»; uno elegido que dejó de ser «aparte» se sigue mostrando
  para poder quitarlo.
- **Avisos** (`role="status"`, no apagan «Guardar»): lo que alguien sin un nivel puede deducir restando («Quien no tiene el nivel «X»
  puede deducir «Y»…», 3 y «Y N más.») y «Revisa el diseño: <regla de la base>» cuando lo aplicado no pasaría al publicar.
- **Guardar el borrador:** «No hay cambios por guardar.», «Guardando…» (los campos esperan), «Se guardó el borrador.». Conflicto: el texto
  de la base con «Recargar» (lo no guardado se pierde); sin permiso, sin respuesta, regla y error, cada uno con su mensaje. Lo no guardado
  vuelve al volver a la pestaña, con «Recuperamos…».
- **Vista previa:** el botón «Vista previa» (`aria-expanded`) abre la hoja dibujada con el diseño **en edición** (lo aplicado aunque no se
  haya guardado) y escribe `?vista=412|1280|200` (otro valor, cerrada; recargar la conserva; cambiar el ancho no suma al historial). «Ancho
  de la vista previa»: 412 px, 1.280 px y 200 % (`aria-pressed`, 44 px). Es el mismo componente de la hoja dentro de un marco que se
  desplaza de costado (la página no se ensancha): a 412 el resumen va debajo, a 1.280 al costado, 200 % es el celular con el texto al
  doble. Con cifras de prueba (datos en 0; si la fórmula aún no calcula, se dibuja sin cifras). Es la de quien lo ve todo y sólo se ve: sin
  foco, sin acciones, sin tocar la URL de la hoja. Las secciones «Avanzado» no se dibujan y se dice cuántas. Diseño vacío: «No hay nada que
  dibujar.» Su código se pide al abrirla (`diferido()`); un tono que no llega deja la hoja sin colores.
- **200 %:** la fila de campos de una celda va en columna bajo `@container` estrecho (el resto, `.claude/rules/ui.md`).

### Cotización: tonos (estados propios)

Configuración › Cotización (`?seccion=tonos`): el catálogo de colores de los grupos de una fórmula. Es de **toda la empresa**, no de un
origen, y **se guarda al instante** (cada tono es una escritura propia; no entra en el borrador del diseño).

- **Quién entra:** `cotizaciones.configurar` en algún origen (la pestaña va después de «Diseño»). Leer, cualquiera con sesión; la base
  pide la clave en cada escritura.
- **Lista:** por nombre, hasta 24 (tope de la base). Fila: nombre, clave en texto suave (no cambia nunca: la nombran los grupos), dos
  muestras «Aa» («Claro» y «Oscuro», con los colores de ese tema sea cual sea el de quien mira) y «Editar» y «Eliminar» con el nombre en el
  `aria-label`. No se muestra cuántos hay.
- **Nuevo y editar** (modal): «Nombre» (≤ 40, único) y, por tema claro y oscuro, «Fondo», «Borde» y «Tinta» (selector de color y campo
  `#rrggbb` con el mismo valor). Debajo, la muestra y el contraste de la tinta sobre el fondo **en vivo** (cumple AA o, en rojo, cuánto da
  y cuánto hace falta; truncado a un decimal, como la base). **«Guardar» no se apaga por el AA:** al enviar, el motivo queda junto al campo
  y nada sale; lo que la base rechaza (nombre repetido, conflicto) vuelve junto a su campo o como aviso. Sin cambios, «Guardar» cierra sin
  escribir; cerrar con algo escrito pregunta; un conflicto conserva lo escrito con «Recargar».
- **Eliminar** (`<Confirmar>`): la lista no sabe cuáles están en uso; si alguna versión de una fórmula lo nombra, la base responde cuál, sale
  como aviso y el diálogo se cierra. No se deshace.
- **Vacío** con «Nuevo tono»; **con 24**, «Nuevo tono» apagado con su motivo. `EsqueletoFormulario`; una lectura que falla sube al
  «Reintentar» de la ruta. Sin conexión lo escrito queda y sale al volver.
- **200 %:** cada fila apila nombre, muestras y botones; el modal es `ModalDeFormulario`.

### Leads: listado (estados propios)

- **Entrar:** `leads.ver`; sin él, sin permiso (a quién pedirlo) y sin consulta. «Propios», sólo la cartera; «todos», todo, con el teléfono
  enmascarado («+591 •••••01») y «Solo la cartera» en los datos privados de lo ajeno. Limbo y papelera no aparecen para nadie.
- **Columnas:** nombre y su número («N.º 1.234» con `leads.numero_global.ver`; «Tu n.º 12» sin él), teléfono, tipo, origen, «Último
  seguimiento» (su tipo con el icono del catálogo, su título y «hace 3 días»; si es privado de otra persona, sólo «hace 3 días»; un clic abre la
  ficha en sus seguimientos), «Recordatorio» (el próximo pendiente de quien mira: «en 2 días»; vencido, resaltado y «vencido hace 1 día»; un clic lo
  abre) y campos «en la tabla». Sin seguimientos: «Sin seguimientos» y «Anotar seguimiento»; sin recordatorio: «—» y «Programar» (ambos sólo con el
  lead en la cartera y `leads.editar`). Lo relativo se refresca cada minuto. Tarjeta: nombre, número, tipo, teléfono, origen, esos dos datos y hasta dos más.
- **Filtros y búsqueda:** por nombre o número (`#124`), nunca por teléfono; sobre un campo «solo la cartera», quien ve «todos» lee que
  sólo busca en sus leads. Una vista guardada con un campo o etiqueta que ya no existe se aplica sin ese filtro y avisa.
- **Tus marcas (privadas, «Solo las ves tú.»):** «Tachados» (ocultarlos por defecto · mostrarlos también · sólo los tachados),
  «Favoritos», «Etiquetas». No reordenan. Una línea dice cuántos coincidentes ocultan los tachados, con «Mostrarlos». **Mientras se busca
  no se ocultan.**
- **«⋯» de la fila** (la misma lista, en este orden, en fila, kanban, resumen y ficha): «Agendar recordatorio…» y «Anotar seguimiento…»
  (cartera y `leads.editar`, abren el modal de la ficha con `?panel=…&para=<id>`) · «Etiquetas…», «Favorito», «Tachado» (con «Deshacer») ·
  «Enviar a la papelera» (`leads.eliminar`).
- **Vacíos:** sin leads, con «Nuevo lead» y «Ver todos» según permiso; por filtro, con «Limpiar filtros». Esqueleto; error.
- **Resumen (`?lead=`):** tipo, marcas, «Editar» (cartera y `leads.editar`), «Abrir ficha», «⋯»; pestañas
  `?pestana=seguimientos|recordatorios` que se piden al elegirlas; nombre, número, tipo, teléfono tal como lo entrega la vista, origen y
  campos activos. Uno que deja de verse: «Este lead ya no está disponible: no existe o ya no tienes acceso.».

### Leads: ficha (estados propios)

- **Entrar:** `leads.ver`. Inexistente, en la papelera, en limbo o ajeno **se ven igual** («No encontramos este lead o no tienes acceso.»
  con «Ir a Leads»): ni nombre ni número en la página.
- **Cabecera:** nombre, números, tipo, origen («(inactivo)»), teléfono principal tal como lo entrega la base y quién lo tiene (enmascarado
  fuera de la cartera). «Favorito», «Tachado» y «Etiquetas…» en el «⋯»; tope 20 etiquetas por lead; `?panel=etiquetas` las gestiona
  (renombrar, color, eliminar con confirmación si está en uso).
- **Datos:** principales, «Teléfonos» (principal y extras con etiqueta y país) y un bloque por grupo del layout. **Editar** sólo con
  `leads.editar` y el lead **en la cartera** (con «todos» se ve y no se edita); `Ctrl/Cmd+S` guarda y cierra. Conflicto: quién y cuándo,
  «Ver cómo quedó» y «Recargar»; un seguimiento nuevo, compartir o transferir no dan conflicto.
- **Quién lo tiene:** nombres y tipo de acceso («Dueño», «Compartido»); nunca correo ni teléfono. «Compartir» y «Transferir»
  (`?panel=compartir-lead`/`transferir-lead`) sólo para el dueño o, con el permiso en «todos», para quien lo ve; nunca se ofrecen a quien
  mira. «Quitar acceso» con «Deshacer»; «Salir de este lead» confirma. Al dueño se le transfiere, no se le quita.
- **Enviar a la papelera:** último ítem del «⋯» (`leads.eliminar`); sin preguntar, con «Deshacer» 10 s. Con un vehículo vinculado visible,
  apagado con motivo y «Ir a «Vehículos»»; si lo frena uno que no se ve, la base rechaza nombrando al lead, no al vehículo.
- **Vehículos** (`?seccion=vehiculos`, con `vehiculos.ver`): «Vinculados», «Interesados» (con nota) y «Vínculos anteriores», sólo lo que
  quien mira ve. «Agregar vehículo» (cartera y `leads.editar`): busca por título, VIN, lote o #número, «Vincular» y nota de interés ≤ 500.
  «Desvincular» (quien edita el vehículo): con la cartera, con «Deshacer»; sin ella, confirma.

### Leads: papelera, importar y teléfonos (estados propios)

- **Papelera** (`/leads/papelera`): para `leads.eliminar`, `leads.crear` (ve lo que envió) o `leads.papelera.purgar` (ve todo). Enviar es
  todo o nada (hasta 200). Por lote, con nombre y número; **nunca teléfono ni datos privados**. Restaurar no reabre el portal; un lead cuyo
  teléfono tomó otro queda adentro con motivo. Purgar (`leads.papelera.purgar`) nombra lo que borra y un lote de varios pide «purgar N»;
  vehículo vinculado, pagos o portal vigente lo impiden.
- **Importar:** vista previa en grilla alineada (contenedor ≥ 42 rem; si no, nombre sobre motivo). «País» vacío se completa con el del
  teléfono. **Deshacer importación** (24 h): el diálogo cuenta cuántos leads van a la papelera y el resultado cuántos se movieron y cuántos
  quedaron, nunca nombres ni teléfonos.
- **Teléfonos de la ficha:** sólo con la cartera y `leads.editar`; si no, enmascarados y sin botones. «Cambiar el principal»
  (`?panel=cambiar-telefono`): el actual pasa a extra «Anterior»; el nuevo se verifica al tipear y uno existente, ajeno o el mismo
  deshabilitan el botón con su frase. Extras (`?panel=agregar-telefono`, ≤ 10): número con país y etiqueta ≤ 40, «Quitar» con «Deshacer».

### Leads: seguimientos y recordatorios (estados propios)

- **Quién ve qué:** un seguimiento nace privado, sólo para su autor; «Visible para el cliente» lo muestra a quienes ven el lead y al
  portal. Ni el co-asesor ni quien ve «todos» leen lo privado ajeno, y la pantalla no lo insinúa (sin conteo ni «último seguimiento»).
- **Anotar** (cartera y `leads.editar`): modal `?panel=anotar-seguimiento` con los campos del alta más «Visible para el cliente».
  `Ctrl/Cmd+Enter` o `Ctrl/Cmd+S` guardan; recargar lo reabre con lo escrito; «atrás» deja un borrador; sin tipos activos, apagado con
  motivo. **Editar/eliminar** sólo lo propio (`?panel=editar-seguimiento&seguimiento=<id>`); eliminar con «Deshacer». Conflicto con
  «Recargar», conservando lo escrito.
- **Línea de tiempo:** de a 20 hasta 500; «Ir a una fecha» (no va a la URL) trae ese día y lo anterior; vacío.
- **Tus recordatorios:** sólo los propios; «Agendar recordatorio» (cartera); vencidos primero con «Vencido»; «Completados» plegados;
  «Completar»/«Reabrir», «Editar», «Eliminar» con «Deshacer». Modal por URL (`?panel=agendar-recordatorio`,
  `editar-recordatorio&recordatorio=<id>`): «De qué es», «Cuándo» y «Vehículo (opcional)»; no se agenda en el pasado.

### Totales y topes (`.claude/rules/escala.md`)

Un número que se muestra nunca es el total exacto: se cuenta hasta un tope y se dice «más de N» (en una frase) o «N+» (en una cabecera).
Toda lista que crece dibuja a lo sumo un tope y lo dice, con un camino a lo antiguo.

- **Listado de leads y vehículos:** sin total ni «página 3 de 800»: Anterior y Siguiente y, arriba, «Los más recientes» o «Creados hasta
  el 2 sep 2026» con «Volver al principio». Para lo antiguo, **filtrar** o **buscar**.
- **Exportar:** con más de 5.000 leads en los filtros no exporta y pide filtrar más.
- **Embudo:** cabecera de columna y pestaña dicen «37» o «500+». Una columna dibuja a lo sumo 500 y ahí ofrece «Buscar en el embudo»
  (`?q=`, desde 2 caracteres; busca título y nombre del lead en todas las columnas; es de la vista de embudo).
- **Vehículos y ficha:** los bloques de vínculos, interesados y «Agregar vehículo» dicen su tope al pie con `<AvisoDeTope>`;
  «Oportunidades» muestra las 10 más recientes (abiertas primero) con «Ver más» de a 20 desde el navegador, hasta 500 (en el tope,
  «Buscarlas en tu embudo»).
- **Papeleras:** de a 5 lotes por página (`?cursor=`); un lote trae hasta 200 y muestra 20 con «Mostrar los 200». Sin «Ítems por página»:
  su unidad es el lote.
- **Sin red:** abrir un modal, panel o pestaña nunca pedidos dice «Sin conexión. No se pudo abrir esto.» con «Reintentar»; paginar sin red
  no navega y lo dice.

### Repuestos: listado (estados propios)

- **Estados:** esqueleto de lista (8 filas, 6 columnas); vacío de primera vez con «Nuevo proyecto» si hay `repuestos.editar` (con el
  filtro «Abiertos» aclara que los cerrados no se muestran); vacío por filtro con «Limpiar filtros»; cursor fuera de rango con «Volver al
  principio»; error de `(app)`; sin `repuestos.ver`, «No tienes permiso».
- **Sin «Anterior»:** «Siguiente» y, con cursor, «Volver al principio». Más de 200 ítems se escribe «200+».
- **Vista «Stock»:** enlaces «Proyectos» y «Stock» arriba (cambiar no conserva filtros ni página; «Nuevo proyecto» sólo en «Proyectos»).
  Columnas: ítem, proyecto (`#N` · vehículo, con «Cerrado»), en stock y desde; sin filtros, por cursor. Vacío: «No hay repuestos en
  stock.» con «Lo que sobra de un ítem se pasa a stock desde la hoja de su proyecto.». La fila abre el ítem en la hoja de su proyecto con
  su panel de stock. El «⋯» (sólo con `repuestos.editar`, también con el proyecto cerrado): «Reasignar a un proyecto» (destino abierto,
  distinto del de origen, y cantidad), «Vender suelto» y «Devolver al proveedor» (cantidad y nota); cada uno un drawer con URL que, si el
  ítem ya no está en la página, avisa y limpia la URL. Tras el éxito se cierra, la página se relee y un aviso lo dice (reasignar, con «Ver
  proyecto»).
- **Nuevo proyecto:** «De un vehículo» (buscador del inventario) o «Externo» (vehículo, VIN, cliente, teléfono y, con `leads.ver`, lead);
  un `?vehiculo=` que no se ve abre como «Externo» con un aviso.

### Repuestos: proyecto (estados propios)

- **Estados:** cabecera y lista esqueleto (6 filas, 6 columnas); sin `repuestos.ver`, «No tienes permiso»; error de `(app)`. No existe,
  eliminado o sin acceso se dicen igual: «Este proyecto ya no está disponible: no existe o ya no tienes acceso.» con «Volver a Repuestos».
- **Hoja:** tabla desde 768 px y tarjetas debajo; cada celda se guarda sola (Enter o al salir; la lista, al elegir). Cantidad y precio son
  `XCell`; la fase es de lectura. Un precio sin moneda lleva la primera activa. Enter en la fila nueva agrega el ítem y deja el foco en la
  siguiente. No filtra: hasta 200 ítems (con 200, sin fila nueva y con `<AvisoDeTope>`). Vacía: «Este proyecto todavía no tiene ítems.» y,
  con `repuestos.editar`, la fila nueva.
- **Sólo lectura:** sin `repuestos.editar` o con el proyecto cerrado («El proyecto está cerrado: reábrelo para editar los ítems.»), texto
  plano, sin fila nueva ni «Eliminar».
- **Conflicto:** «Otra persona cambió este ítem. Recarga para ver lo nuevo.» con «Recargar»; lo escrito no se guarda. **Eliminar:**
  `<Confirmar>` con URL que nombra el ítem; uno con historial, documentos, compras, gastos o stock dice por qué y no se elimina.
- **Cerrar:** sin confirmación; toast con «Deshacer».
- **Imágenes del ítem:** «Imágenes» en las acciones de cada fila, también sin `repuestos.editar`; abre `?panel=imagenes&item=<id>` (se
  recarga; «atrás» lo cierra y el foco vuelve al botón). Esqueleto, error con «Reintentar», vacío (con permiso, la zona de subir). Con
  imágenes: «3 de 8 imágenes» (exacto: el tope es duro), rejilla de 2 a 4 columnas que enlaza al original, «Quitar» de 44 px con
  «Deshacer». Lleno: zona apagada con su motivo. Sólo lectura (o proyecto cerrado): sin zona ni «Quitar». Sin conexión: zona apagada.
  Elegir sube al momento; lo repetido dice «ya estaba».
- **Compras:** pestaña sólo con `repuestos.costos.ver` (sin él no se dibuja y `?pestana=compras` abre «Ítems»).
  - «Margen del proyecto»: una tarjeta por moneda con precios, compras y margen (`<Monto>`; Modo Live los oculta); con algún ítem sin
    precio o sin moneda, «Sin precio en N ítems» («más de 200»), nunca 0; sin nada, su vacío.
  - Lista de la más reciente: proveedor («Sin proveedor»), fecha, ítem («Sin ítem»), monto y, fuera de la moneda base, «Equivale a …».
    Esqueleto, vacío, tope 200 con aviso, error de `(app)`.
  - **Escribir:** «Registrar compra» arriba (también con la lista vacía); sin `repuestos.costos.editar` o con el proyecto cerrado, apagado
    con su motivo al lado y la fila sin «⋯». Drawer `?panel=compra&compra=<id|nueva>` (se recarga, «atrás» lo cierra, una que ya no está
    avisa): ítem, proveedor, moneda, monto, fecha, comprobante (PDF o imagen ≤ 10 MB, se sube al elegir, «Ver comprobante» y «Quitar») y
    notas; el equivalente en la base lo calcula el sistema al guardar. Motivos junto a su campo; conflicto con «Recargar»; sin conexión,
    sale al volver; cerrar con algo escrito pregunta. Guardar relee lista y margen. «⋯» → «Editar» y «Eliminar» (sin preguntar, con
    «Deshacer»). «Ver comprobante» pide una URL de 60 s al tocarlo.
- **Stock del ítem:** «Stock» en las acciones de cada fila, también sin `repuestos.editar` y con el proyecto cerrado; al lado, «En stock: N»
  (`<Badge>` de texto; con 0 nada). Abre `?panel=stock&item=<id>` (se recarga; «atrás» lo cierra; un ítem que ya no está avisa). Arriba
  «En stock: N de <cantidad>»; con `repuestos.editar` (también con el proyecto cerrado: los sobrantes nacen al terminar), «Pasar a stock»
  con cantidad (entero ≥ 1, no más que la del ítem; el tope exacto lo dice la base junto al campo) y nota (≤ 500); tras pasar, el panel
  queda abierto, el formulario se vacía y el historial se relee. Sin permiso: sólo los movimientos. **Movimientos**, del más nuevo:
  esqueleto, error, vacío; cada uno con motivo («Pasar a stock», «Vender suelto», «Devolver al proveedor», «Ajuste», «Reasignado»),
  cantidad con signo, fecha, quién y nota; de a 20 hasta 500. Conflicto (el stock cambió): toast con «Recargar».

### Equipo y roles (estados propios)

- **Equipo:** sólo tú (aviso con invitación); con más de 100 personas, las 100 primeras por nombre; sobre la cuenta propia el menú dice por
  qué no se puede bloquear ni dar de baja. Dar de baja confirma nombrando a la persona y cuántos leads van al limbo (hasta 1.000); con
  muchos sigue por lotes («Pasando sus leads…»). Invitar: si el correo falla, el enlace queda a la vista.
- **Roles:** «Recibir turnos de la web» es un interruptor más de la matriz; un rol sin él vende igual pero no recibe turnos. Rol que no
  dominas: columna de sólo lectura con motivo; permiso que no tienes: celda deshabilitada con motivo; conflicto «Otra persona cambió este
  rol · Recargar».

## Decisiones de UX

- Inicio = bandeja de trabajo por rol, no dashboard; el tablero analítico vive en `/tablero`.
- El teléfono principal se verifica al tipear, no al guardar: el duplicado no cuesta un formulario entero.
- Mover de fase con el mismo panel de requisitos desde la cadena y desde la ficha; nunca drag & drop (oculta el porqué del rechazo).
  Documentos se suben al confirmar, nunca al elegir el archivo.
- Chat con menciones `#` que abren el drawer de la entidad sin salir; referenciar no otorga acceso.
- Los roles de una persona se cambian con un interruptor por rol (permisos = unión de sus roles); la matriz guarda cada celda sola.
- Los campos de los leads y los nombres de orígenes, fases, tipos de documento y categorías salen de la base: ningún texto fijo los nombra.
  «Solo la cartera» se recorta en la base, no en la pantalla.
- Empresa es una pantalla con pestañas: quien tiene uno de sus dos permisos ve la otra parte deshabilitada con motivo. El tipo de cambio se
  cambia en un panel con su historial a la vista.
- La situación de un vehículo (su fase, o «En subasta», «Sin resolver» o «No ganada») se ve en el inventario, la ficha y logística; la fase
  se cambia en logística y la subasta se resuelve desde la ficha. Un vehículo nace en la fase inicial cuando hay una sola; si no,
  «Sin fase».
- `Ctrl/Cmd+Enter` en un alta guarda y deja el panel listo para otro; `Ctrl/Cmd+S` guarda y cierra, salvo en «Nuevo lead», donde guarda y
  deja el drawer listo.
