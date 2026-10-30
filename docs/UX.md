# Experiencia de uso — importadora

Versión completa (historia, mediciones, relatos): `docs/archivo/UX.md`, sólo con grep.

Reemplaza planillas de Excel por asesor, WhatsApp entre áreas y el prototipo `ip`. Regla: ninguna tarea de oro puede ser más lenta que la planilla que reemplaza.

## Roles

Los roles son libres (el dueño los crea); la interfaz se arma por **permisos**, no por nombre de rol. Perfiles de referencia y su inicio:

- **Asesor:** leads, cotizaciones, turnos de la web; escritorio y celular. Inicio: recordatorios de hoy, turnos web sin confirmar, leads sin seguimiento.
- **Logística:** vehículos por el flujo, documentos, embarques, aduana; celular en puerto o aduana. Inicio: vehículos trabados, documentos por aprobar, alertas por demora.
- **Repuestos:** proyectos e ítems, compras, stock. Inicio: ítems por mover, esperas que destraban vehículos.
- **Dueño / admin:** configura, mira métricas, resuelve conflictos. Inicio: tablero operativo.
- **RRHH / equipo:** alta, roles, bloqueo y baja. Inicio: Equipo.

## Tareas de oro

- **1. Registrar lead y anotar un seguimiento** (asesor, ~30/día). Meta: ≤ 25 s desde `N` hasta lead guardado (seguimiento opcional); duplicado detectado al terminar de tipear el teléfono. Nunca: crear un lead con teléfono ajeno; perder lo tipeado.
- **2. Cotizar un vehículo para un lead** (asesor, ~15/día). Meta: ≤ 90 s con link de subasta o vehículo del inventario; cada celda editable con teclado; PDF en 1 clic (el tramo de la hoja, `e2e/cotizar-tarea-de-oro.spec.ts`; el panel del vehículo y el PDF suman el suyo en el 4.14 y el 4.18). Nunca: guardar con una constante vencida sin saberlo; un total que no cuadre con las líneas.
- **3. Mover vehículos de fase con documentos** (logística, ~40/día). Meta: mover 1 en ≤ 15 s; marcar llegada de un contenedor de 8 en ≤ 60 s; ver _antes_ de confirmar qué falta en cada uno. Nunca: mover sin el documento bloqueante; perder un archivo subido; pisar el cambio de otro.
- **4. Atender un turno de la web y dar acceso al portal** (asesor, ~5/día). Meta: «contacté» en 2 toques desde el celular; otorgar portal desde la ficha en ≤ 30 s con sólo el teclado (`e2e/leads-portal-acceso.spec.ts`). Nunca: dejar vencer un turno sin aviso; un código que no se pueda dictar.

### Flujo 1 — Registrar lead y seguimiento

1. «Nuevo lead» en la barra superior, o `N` donde la pantalla no tiene un «nuevo» propio → drawer (no página), `?panel=nuevo-lead`. **Se abre al instante** y lee orígenes, tipos y layout desde el navegador: esqueleto con la forma del formulario, listo, o error («No se pudo cargar el formulario.» con «Reintentar»). **Un solo panel**: se desliza una vez y los estados cambian dentro (`e2e/leads-alta-un-drawer.spec.ts`). Foco en **Teléfono principal**.
2. Al completar el teléfono (debounce 400 ms) se consulta `verificar_telefono`. Es mío: «Ya existe: Ana Quispe (Tu n.º 12), y es tuyo». Es de otro: «Lo tiene Diego Vargas», nada más. En limbo: «Sin dueño» y «Tomar lead» (se adopta al guardar, queda constancia). Existente o ajeno no deja seguir. Debajo, cómo quedará y de qué país («Se guardará como +54 91155550000 · Argentina»), sin pedir nada al servidor; «País» (en «Más datos») se llena solo mientras esté vacío; lo escrito no se pisa.
3. Nombre, origen (el último usado, por persona), tipo (el primero activo de la clase prospecto) y los **requeridos** del layout, en su orden; el resto plegado en «Más datos» con su valor por defecto. Volver requerido un campo suma un paso: Configuración lo avisa (desde el cuarto, la meta cuesta).
4. `Ctrl/Cmd+Enter` valida y abre «Primer seguimiento (opcional)» en el mismo drawer, sin guardar; `Ctrl/Cmd+S` o «Guardar lead» guardan desde cualquier paso; `Esc` vuelve a los datos. Mismos campos que el redactor de la ficha; se escribe seguimiento sólo si hay algo escrito.
5. El pie dice lo que pasará, sin diálogo («Se creará sin primer seguimiento…» / «Se guardará con el primer seguimiento que escribiste.»). Guardar crea lead, seguimiento y próximo contacto en una transacción → toast «Lead #124 creado»; el drawer queda listo para el siguiente, foco en el teléfono. «Abrir ficha» → `/leads/[id]`.

Estados propios: teléfono en verificación (spinner, resto editable); sin permiso (ni botón, ni atajo, ni URL); conexión caída al guardar (conserva todo y guarda solo al volver; el intento lleva su id, reintentar no duplica); cerrar o recargar con datos (borrador con «Descartar»); dato inválido (motivo junto al campo); ningún origen activo (campo deshabilitado con motivo).

### Flujo 2 — Cotizar

La hoja es **configurable por origen** (D7, `docs/COTIZADOR.md` › «El diseño de la hoja»): la semilla trae un diseño igual al cotizador actual (`docs/referencias/cotizador-actual.md`) y otro al Excel (`docs/referencias/excel-de-cotizacion.md`).

1. **Entrada:** desde la ficha del lead, el resumen de un vehículo o el listado. Arriba, pestañas de orígenes (nombres de la base; «Oficina» es un origen) y los **modos** de tipo de cambio del diseño (Aduana, Paralelo, Unificado…; se eligen con dos o más, la hoja abre con el primero marcado y con uno solo no se elige: el resumen lo nombra). `Ctrl/Cmd+K → «Nueva cotización»` llega con el buscador (Fase 7).
2. **Pasos:** **la hoja** (preventa o final), **vehículo**, **cliente**, **vista previa**; no hay paso «Oficina».
   - **Vehículo:** título; pegar link o lote (`apibara` llena ficha y fotos), buscar por nombre o «+» a mano; **ambas crean el vehículo en el inventario** (D3); pestañas «Últ. cotización» y «Cierre subasta»; el elegido muestra su historial (plegado, se lee al desplegarlo y avanza con «Ver más»); la barra dice «Cotizado (n)».
   - **Cliente:** búsqueda desde 3 letras o `#n`; sin buscar, «míos» por actividad; pestañas por clase; «+» abre «Nuevo lead». Los dos paneles van por cursor (Anterior y Siguiente), nunca «Página N de M».
   - **El lead es obligatorio siempre** (preseleccionado desde su ficha). El vehículo, salvo que el ajuste «Vehículo obligatorio al cotizar» diga que no; una final lo exige siempre.
3. **La hoja:** secciones en el orden declarado; cada monto en una **XCell** (`Tab` avanza, tipear abre edición, `Esc` cancela) con el tono de su grupo, ayuda y ⚙ si el permiso lo da. Lo **sugerido** lleva un punto; sobrescrito queda **modificado** (anillo y ↺). Atajos (chips de año), **variante** (Moto, Auto Gasolina…), **interruptores** (habilitar fila, mostrar garantía). **Una celda que quien mira no puede ver no se dibuja ni llega**; una que no puede editar va con candado y su motivo. La **ayuda** de una celda (botón «Ayuda de X») abre un panel de sólo lectura con su texto o con su tabla de referencia (la de la hoja abierta; cargando, sin filas, tope de 1.000 filas y fallo con «Reintentar» o «Recargar»); con Modo Live sus cifras se tapan como las de la celda. **Recalcula en la base** 150 ms después de la última tecla. En el celular y al 200 %, una columna en el mismo orden.
4. **Resumen fijo:** total (y el total en moneda local si se pidió: «Ver total en moneda local», apagado al nacer y sólo si la versión da su moneda), garantía si está a la vista, modo de tipo de cambio y toggle **Live**; al pie en el celular (alto máximo del 40 % de la ventana) y al costado, pegado bajo la barra, desde 56 rem de la hoja (el 200 % lo pasa al pie). `Ctrl/Cmd+S` guarda (preventa); «Vista previa» abre la tarjeta; «Compartir» copia el texto y descarga el PDF.

Estados propios:

- **Fórmula del origen sin publicar:** pantalla bloqueada «Falta publicar la fórmula de <origen>», con enlace a configuración si hay permiso. **Link de subasta inválido o sin datos:** se sigue a mano.
- **Desactualizada** (D2): al guardar una nueva, la fórmula o un tipo de cambio cambió desde que se abrió; el resumen ofrece «Usar la versión nueva» o «Guardar con la versión N». Editar una vieja usa SU versión. **Vencida** (D1): pasó la vigencia de la empresa; se dice en listado, tarjeta y PDF, y se recotiza encima.
- **Guardar:** la hoja pasa a la tarjeta «Cotización n.º N guardada» con total y «Cotizar otra». Sin lead, apagado («Para guardar, abre la hoja desde un lead.»); con el total nulo o recalculando, también. El borrador vuelve al recargar.
- **El recálculo falla o no hay red:** conserva lo tipeado, «No se pudo recalcular» con «Reintentar», no deja guardar con un total viejo; si la fórmula cambió, «Recargar». El mensaje de la base nunca se muestra (puede nombrar lo que quien mira no ve). Una celda apagada por una bandera que el nivel esconde dice «Está apagada en esta hoja.» sin nombrarla; «Sin total» dice «Revisa las celdas con aviso.» o «Falta un dato que esta hoja no muestra.».
- **Puede cotizar pero no ve la hoja** (`cotizaciones.crear` sin `cotizaciones.ver`): «No puedes ver esta hoja». **Par con monto calculado:** bloqueado («Se calcula con los demás datos.»); su porcentaje editable llega con el candado por lado (4.13-3).

### Flujo 3 — Mover de fase

1. `/logistica` abre la **cadena**: columnas por fase del flujo del origen, tarjetas con alerta por demora, filtros en URL.
2. Clic en un vehículo → panel lateral «Qué falta para pasar a …» (documentos aprobados/faltantes, datos, esperas de repuestos, en vivo).
3. Subir documento desde el panel (arrastrar o cámara); se sube al confirmar, nunca antes; queda «subido» hasta que alguien con permiso lo aprueba.
4. «Mover a <fase>» pide nota interna (obligatoria si la fase lo exige) → RPC con `fase_esperada`; conflicto: «Lo movió Rosa hace 1 min · Recargar».
5. Lote: seleccionar N por filtro → «Marcar llegó» → vista previa por unidad (ok / falta X) → confirmar → resultado parcial explícito con reintento de los fallidos.

### Flujo 4 — Turno de la web

1. Notificación push/campana «Turno web #WEB-4F2K · Toyota RAV4» → tarjeta con **Contacté** y **Vincular a lead** (buscador; «crear lead» adentro). Cuenta regresiva visible; al vencer, aviso y reasignación.
2. Ficha del lead, pestaña «Portal» (`?seccion=portal`; lead en la cartera y `leads.portal.gestionar`): «Dar acceso» → diálogo (`?panel=otorgar-portal`) con el campo de la clave (8 a 64) y **un solo botón principal** que dice lo que hará («Generar clave y dar acceso» con el campo vacío; «Dar acceso con esta clave» con algo escrito) → código `MII-4F2K9` en grande y dicho símbolo por símbolo, la clave **una sola vez** y el texto para WhatsApp. Mientras otorga el diálogo no se cierra; al cerrarse la clave se olvida.
3. Con acceso, la sección muestra estado (activo, bloqueado, revocado), código, quién lo otorgó y último ingreso, con «Volver a otorgar» (avisa que el código anterior y la sesión abierta dejan de valer), «Revocar» (confirma nombrando el código, `?panel=revocar-portal`) y «Desbloquear».

## Pantallas

Navegación de primer nivel (hasta 7, filtrada por permisos): Inicio · Leads · Vehículos · Cotizaciones · Logística · Agenda · Chat; Repuestos sólo con permiso. Configuración, Actividad y Datos van en el menú del usuario y en `Ctrl/Cmd+K`, con «Mi perfil», «Ver como» (quien gestiona roles), tema, densidad y «Cerrar sesión». Declarada en `src/app/(app)/_shell/navegacion.ts`.

- **Acceso** — `/ingreso`, `/registro`, `/recuperar` (sin sesión): `?returnTo=`, `?aviso=`; `/registro` sólo con registro abierto o sin equipo; `/auth/nueva-contrasena` tras el enlace del correo.
- **Inicio** — `/` (todos): bandeja por rol + widgets opcionales; bloques por permiso; cada contador lleva a la lista filtrada.
- **Leads** — `/leads` (`leads.ver`): tabla + resumen. «Míos» por defecto; con alcance «todos», `?alcance=`. Filtros del layout (`a.<campo>`), tipo, origen, `?q=`, `?cursor=`, vistas guardadas; resumen `?lead=` (`?pestana=seguimientos|recordatorios`); marcas `?tachados=`, `?favoritos=`, `?etiqueta=`; `?panel=etiquetas`. «Lista | Embudo»: `?vista=embudo&embudo=<id>` es el kanban de las oportunidades propias (`?etapa=` en el celular; `?panel=etapas`, `?panel=nuevo-embudo`).
- **Lead** — `/leads/[id]` (`leads.ver` y acceso): «Datos» (`?panel=editar-lead`), «Seguimientos» (`?seccion=seguimientos`; `?panel=anotar-seguimiento`, `editar-seguimiento&seguimiento=<id>`), «Vehículos» (`vehiculos.ver`; `?panel=agregar-vehiculo`), «Oportunidades» (`?panel=nueva-oportunidad`, `editar-oportunidad&oportunidad=<id>`) y «Portal». Ninguna pestaña se dibuja vacía.
- **Vehículos** — `/vehiculos` (`vehiculos.*`): tabla + panel de filtros + resumen. Pestaña por origen (`?origen=`); filtros en URL (`q`, `fase`, `categoria`, `anio.min`, `a.<campo>`…), `?cursor=`, vistas guardadas; resumen `?vehiculo=<id>` (`?pestana=fotos|interesados`); alta `?panel=nuevo`; edición `?editar=`; `?vitrina=si|no`, `?limpieza=si|no`. `/vehiculos/papelera` (por lote).
- **Vehículo** — `/vehiculos/[id]` (según origen): cabecera con portada y fase de sólo lectura; «Publicar en la web» en `?panel=vitrina`; `?seccion=`: «Ficha» (por layout del origen; edición `?editar=`; banner de limpieza; «Vínculo e interesados» con «Desvincular» confirmado) y «Fotos» (≤ 24, portada, orden).
- **Cotizaciones** — `/cotizaciones` (`cotizaciones.*`): tabla + resumen `?cotizacion=`; filtro mías, clase (preventa o final), origen; «Vencida» en la fila; `nuevo` abre la hoja.
- **Cotizar** — `/cotizaciones/nuevo`, `/cotizaciones/[id]/editar` (`cotizaciones.crear`): formulario hoja (XCell); `?origen=&lead=&vehiculo=&returnTo=` (se validan y se llevan; el vehículo va al recálculo); sin entrada en la navegación. Ver Flujo 2.
- **Logística** — `/logistica` (`logistica.*`): cadena (kanban por fase) + panel lateral; `?origen=`; `/logistica/vehiculo/[id]`, `/embarques`, `/aduana`, `/gastos`.
- **Repuestos** — `/repuestos` (`repuestos.*`): proyectos + detalle con ítems; stock, compras, cotizador propio.
- **Agenda** — `/agenda` (todos): calendario mes/semana/día + drawer; eventos, tareas, recordatorios, subastas.
- **Chat** — `/chat` (`chat.participar`): maestro-detalle; menciones `#` de vehículo/lead/cotización, `/tarea`, `/evento`; widget flotante fuera de `/chat`.
- **Notificaciones** — `/notificaciones` (todos): lista; la campana trae las que piden acción.
- **Perfil** — `/perfil` (todos): nombre, foto, preferencias (tema, densidad, ítems por página) y «Turnos de la web» en sólo lectura («Tu rol no recibe turnos de la web.»). El interruptor de disponibilidad (Fase 8) nace ahí.
- **Actividad** — `/actividad` (`actividad.ver`): tabla agrupada por día + drawer de diff; 14 días.
- **Configuración** — `/configuracion/*` (permiso de cada sección): hub + bloques: empresa, equipo, roles, orígenes, leads, cotización, flujos, web, cola web, integraciones.
- **Leads (config)** — `/configuracion/leads` (`leads.configurar`): lista agrupada + panel lateral. `?seccion=campos` (`?campo=`), `origenes` (`?panel=nuevo-origen`/`editar-origen&origen=<id>`), `tipos` (`?panel=nuevo-tipo`/`editar-tipo&tipo=<id>`/`eliminar-tipo&tipo=<id>`), `seguimientos`. Sin el permiso no se entra.
- **Empresa** — `/configuracion/empresa` (`empresa.*`): bloques + `?seccion=empresa|monedas|integraciones`; `?tc=`, `?moneda=`, crear en `?panel=`.
- **Orígenes** — `/configuracion/origenes`, `/[id]` (`origenes.gestionar`; lectura con `flujos.configurar` o `cotizaciones.configurar`): `?panel=nuevo`; `/[id]?seccion=datos|campos|categorias`, `?campo=`, `?categoria=`; sin permiso, todo deshabilitado con motivo.
- **Equipo** — `/configuracion/equipo` (`equipo.usuarios.*`): tabla desde 768 px, tarjetas debajo, panel lateral. `?q=&estado=` se resuelven en el servidor («jose» encuentra «José»); dibuja las 100 primeras por nombre y lo dice al pie; la persona se gestiona desde su «⋯», sin resumen. `?panel=invitar`; `?persona=`; `?baja=`.
- **Roles** — `/configuracion/roles` (`equipo.roles.*`): matriz roles × permisos por módulo; desde 768 px la columna «Permiso» queda pegada a la izquierda; cada celda guarda sola. En móvil, un rol a la vez (`?rol=`) y como lista (permiso, explicación y control debajo). `?panel=nuevo-rol`, `?eliminar=`.
- **Datos** — `/datos` (propio: todos; todo: `datos.todo`): importación/exportación; plantilla CSV, mapeo, vista previa por fila.
- **Buscador** — `Ctrl/Cmd+K` (todos): paleta; resultados por tipo acotados a permisos; acciones («nuevo lead»).

## Permisos (matriz de referencia; el catálogo real vive en `permisos.ts` y se siembra en SQL)

- **Asesor:** crear lead y ver mis leads; cotizar; crear y ver vehículos (por origen); chat y tareas; importar leads (`leads.crear`); deshacer mi importación (24 h).
- **Logística:** crear y ver vehículos; mover de fase y aprobar documentos (por origen); chat y tareas.
- **Repuestos:** proyectos, costos y cotizador de repuestos; chat y tareas.
- **Dueño:** todo lo anterior, más leads de otros (teléfono enmascarado), fórmulas, costos y margen, vitrina web y guías, equipo/roles/bloqueo/registro, exportar e importar todo, exportar mi cartera (`leads.exportar`).

## Reglas transversales

- **Estados obligatorios en toda pantalla:** cargando (esqueleto propio por patrón), vacío primera vez, vacío por filtro, error con reintentar, sin permiso — `.claude/rules/ui.md`.
- **Destructivas:** papelera (vehículos, cotizaciones, leads) = hacer + toast con deshacer 10 s; purga y baja de usuario = diálogo que nombra el objeto; masivas irreversibles = confirmación tipeada.
- **Formatos:** `Intl` con locale y moneda de la empresa (`es-BO` por defecto); montos con cifras tabulares; fechas cruzan servidor↔cliente como ISO y se muestran en la zona de la empresa. **Modo Live** oculta cifras sensibles **y** símbolos de moneda. Voz: español neutro con tuteo. Densidad: compacta en escritorio (filas 36–40 px), cómoda en táctil (48 px), recordada por usuario.
- **Atajos:** `Ctrl/Cmd+K` buscar/comandos · `N` nuevo, lo propio de la pantalla (vehículo en vehículos; si no hay, un lead; «Nuevo lead» siempre tiene botón) · `Ctrl/Cmd+S` guardar · `Ctrl/Cmd+Enter` guardar y seguir · `Esc` cerrar panel o volver un paso · `?` atajos (sin dibujar). En un alta de vehículo `Ctrl/Cmd+S` guarda y cierra; en «Nuevo lead» deja el drawer listo para el siguiente.
- **Filtros:** panel lateral plegable si el listado mide 40 rem o más (si no, hoja inferior) + chips activos + «limpiar»; esquema declarativo por listado; estado en URL (nuqs, `shallow:false`); vistas guardadas por usuario. Formularios en drawer/modal con bloques plegables; `returnTo` para volver.
- **Patrón de lista** (`.claude/rules/ui.md`): toda lista de registros (hoy leads y vehículos) se dibuja igual. Desde 768 px, tabla con **nombre pegado a la izquierda** (entero hasta 16 rem; más largo, «…» y completo en `title`) y **«⋯» a la derecha**, que se desplaza de costado dentro de su tarjeta, nunca la página; por debajo, tarjetas. Una sola vista, la que dice el servidor. **Un clic en cualquier parte de la fila o tarjeta abre su resumen**, salvo casilla, «⋯», enlace o botón. Teclado: una parada de Tab por fila (el nombre, «Abrir Ana Rojas»); Enter o Espacio abren; al cerrar el resumen el foco vuelve a él. El «⋯» («Más acciones de …») mide 44 px en el celular; lo que no se puede hacer no aparece, y un ítem visible pero imposible dice por qué. Una guarda falla si una lista nueva no usa el patrón sin motivo registrado.
- **Texto al 200 % (reflujo, WCAG 1.4.10):** ninguna lista ensancha la página; «⋯» y casilla miden 44 px; una tarjeta de menos de 16 rem apila sus piezas; los botones chicos crecen con el texto. Los avisos (22,25 rem) crecen con el texto sin pasar de la pantalla menos 1 rem por lado y suben sobre el pie de un panel abierto.
- **Paneles y modales con formulario:** cerrar con algo escrito (Esc, ✕, clic afuera, «Cancelar») pregunta **en el mismo modal o panel** («Tienes cambios sin guardar.» con «Seguir editando», con el foco, y «Descartar»); sin cambios cierra directo; «atrás» cierra sin preguntar (el borrador vuelve al reabrir). La acción de un aviso que deja la pantalla («Abrir ficha», «Recargar») con algo escrito pregunta lo mismo en el pie del panel; la que actúa en el lugar («Deshacer») no. Mientras guarda, los campos se apagan y no se cierra. El rechazo de un campo se dice **junto a su campo**, con el foco ahí. Sin conexión lo escrito queda y se guarda al volver.
- **Un modal nunca abre otro modal:** segundo nivel = panel lateral o página. En el celular al 200 %: título y pie fijos, **la descripción se desplaza con el cuerpo**, botones del pie de 44 px (`e2e/modales-celular-200.spec.ts`: pie ≤ 26 % de la pantalla, cuerpo ≥ 45 % del modal).
- **Confirmaciones con URL** (`?panel=mover-oportunidad&oportunidad=<id>&destino=<id>`, `salir-lead`, `purgar&lote=<id>`, `deshacer-importacion&importacion=<id>`, `desvincular`, `etapas&eliminar=embudo`, `eliminar-origen`): «atrás» las cierra, recargar las reabre, Esc devuelve el foco, no se cierran mientras actúan. Si lo que nombra ya no existe, avisa y limpia la URL.
- **Barra de un listado (`<FilterShell>`):** búsqueda, «Filtros», «Vistas», acciones y «Ítems por página». Con contenedor de 48 rem o más las acciones van a la derecha; si no, cada pieza envuelve a la izquierda. **El marcador de búsqueda es corto** («Nombre o número», «Título, VIN o lote», «Título o lead») para caber al 200 % en el celular.
- **Mínimo para buscar por nombre:** 3 letras o dígitos seguidos; un número (`5`, `#5`) busca por número desde un dígito. Mientras no alcanza, el campo lo deja escrito, dice «Escribe al menos 3 letras» y **no escribe `?q=`, no pide nada, no deja chip ni toca los tachados**; un `?q=ab` por URL igual (`e2e/leads-listado-busqueda-minima.spec.ts`).
- **Ítems por página:** en cada lista con Anterior/Siguiente y filtros (leads, vehículos), selector «Ítems por página» (10, 25, 50, 100) en la barra desde `md` y, por debajo, arriba de la lista (`<select>` de 44 px). Se guarda en la cuenta (`listas.por_pagina`, también en el perfil); `?por=` la fija para esa página; cada lista tiene un máximo (hoy 100). Cambiarlo vuelve a la primera página y conserva filtros y búsqueda. No lo llevan el kanban ni las papeleras (`docs/RENDIMIENTO.md`).
- **Barra superior:** tipo de cambio por defecto a la vista y, al abrirlo, los vigentes con su último cambio (Modo Live lo oculta). En el celular menú, Live y avatar miden 44 px y la barra cabe al 200 %; el tipo de cambio sólo se dibuja con 24 rem o más. El buscador (icono «Buscar» de 44 px) está deshabilitado hasta la Fase 7.
- **Permisos en UI:** ocultar lo que nunca va a usar; deshabilitar con motivo lo que espera poder hacer (**dominancia**: lo que no puede dar nunca se esconde). RLS es la seguridad. **«Ver como»:** banner fijo «Viendo como <rol> · Salir»; cambia lo que se ve, no lo que se puede.
- **Conflictos:** todo formulario de edición manda `actualizado_en` esperado; `PT409` → «X cambió esto hace N min · ver / recargar». Barras que se desplazan: degradado en el borde por donde siguen. Transiciones con View Transitions y `prefers-reduced-motion`.

### Empresa (estados propios)

- **Entrar:** `empresa.ajustes.gestionar` o `empresa.tipos_cambio.gestionar`; cada pestaña se edita con su permiso, sin él se ve deshabilitada con el motivo arriba; sin ninguno, «sin permiso».
- **Empresa:** un «Guardar». Color sin contraste, logo inválido y moneda base con datos: motivo junto al campo. Sin conexión: lo tipeado queda y se repone con «Descartar».
- **Tipos de cambio:** tocar uno abre su panel con el valor listo y su historial debajo. El por defecto no se desactiva; nada se borra. **Integraciones:** apibara no se activa sin su clave, que nunca se muestra («Reemplazar»).

### Vehículos (estados propios)

- **Entrar:** `vehiculos.ver` en algún origen; pestañas = orígenes donde lo tiene, también desactivados («Inactivo»); sin ninguno, «sin permiso» diciendo a quién pedírselo. Origen desactivado: se edita lo que tiene, «Nuevo» apagado con motivo, `N` y `?panel=nuevo` no abren nada.
- **Lista:** esqueleto con la forma del listado; vacío de primera vez con la frase del origen («Ningún vehículo en Corea todavía») y «Nuevo» sólo si puede; vacío por filtro con «Limpiar filtros»; error con reintentar. Filtros: los «filtrables» del origen más fase, categoría y año; lo inválido en la URL se ignora; al cambiar de pestaña no se arrastran filtros.
- **Alta y edición (panel):** «Datos principales», «Precio» y un bloque por grupo del layout (con obligatorio nace abierto; con error se abre solo); lo que no pasa se dice junto al campo (VIN o lote repetido también). Conflicto: «Rosa Mamani cambió este vehículo hace 3 min» con «Ver cómo quedó» y «Recargar».
- **Fotos:** elegir (selector, soltar o cámara) las muestra en una bandeja sin subir y ahí se dice lo que no entra y por qué (no es foto, > 25 MB, repetida, pasa de 24). «Subir N fotos» con avance «5 de 8»; si algo falla se dice entero con «Reintentar las N que faltan». Reordenar con botones o `Alt+←/→`; eliminar con «Deshacer».
- **Vitrina:** «Publicar en la web…» es un ítem del «⋯»; en la ficha, sin el permiso va apagado con motivo; en fila y resumen no aparece. Panel `?panel=vitrina`: interruptor, precio público (vacío = «Consultar»), rango, nota, destacado y «Así lo verá el visitante». Si la fase no publica o la web está apagada, la insignia es «Publicado, no visible».
- **Papelera:** enviar no pregunta: se hace y ofrece «Deshacer» 10 s, desde el «⋯» o eligiendo filas (casilla sólo en las que puede). El resultado se dice entero («Se enviaron 3 de 4… No se envió «X»: …»); lo publicado se despublica. Lo que no puede ir (vinculado a un lead, fuera de su fase inicial) va apagado con motivo. Pantalla: por lote; restaurar vuelve sin publicar; purgar (`vehiculos.papelera.purgar`) nombra lo que se borra y un lote de varios pide tipear «purgar N»; si otra persona ya actuó, no se purga nada.
- **Limpieza automática** (sólo vehículos importados de subasta, con el interruptor encendido): dentro de 3 días, banner en la ficha con «Conservar» (quien edita, sin preguntar); conservado, «Quitar». Listado: filtro «Se limpiará pronto» e insignia con fecha.
- **Resumen (`?vehiculo=<id>`):** portada, identificación, fase («Sin fase»), «Editar» y «⋯»; pestañas `?pestana=fotos|interesados` que se leen al elegirlas. «Editar» abre el panel encima y vuelve al resumen al día. Inexistente, en la papelera o de otro origen: «Este vehículo ya no está disponible: no existe o ya no tienes acceso.».

### Leads: configuración (estados propios)

- **Campos** (`leads.configurar`; sin él «No tienes permiso» y sin tarjeta en el hub): activos agrupados como los verá el formulario, con tipo, clave e interruptores («En la tabla», «Filtrable», «Solo la cartera») que guardan solos; desactivados plegados con «Reactivar»; los de fábrica llevan «De fábrica». Fijos: teléfono, nombre, tipo y que el lead tenga origen.
- **Impacto, siempre con números y dentro del panel:** volver requerido («2 leads no tienen este dato: no podrán guardarse hasta completarlo»); cambiar el tipo o eliminar con datos; sacar una opción en uso; dejar de ser «solo la cartera». Conflicto con «Recargar».
- **Orígenes del lead, tipos de lead y tipos de seguimiento** (`?seccion=origenes|tipos|seguimientos`, patrón de `shared/ui/lista`): icono y nombre, «Subir»/«Bajar» (con teclado), estado y «⋯» («Editar» · «Activar»/«Desactivar» con «Deshacer» · «Eliminar»). Lo que no se puede va apagado con motivo. Nuevo/editar: modal por URL (nombre ≤ 40 caracteres, sin repetidos). Eliminar: apagado si algo lo usa (la papelera cuenta). Tope 100.
- **Origen por defecto:** a lo sumo uno, siempre activo; no se apaga ni elimina mientras lo sea. **Tipo de lead:** su clase («Prospecto»/«Cliente») se elige al crear y no cambia; el último activo de una clase no se desactiva ni elimina, con el motivo visible. **Tipo de seguimiento:** cualquiera se apaga.
- **Dónde se nota:** el select del alta ofrece los activos (si el elegido se apaga mientras se escribe, el guardado falla y lo demás queda); la ficha conserva uno apagado como «(inactivo)»; el CSV acepta nombre o clave de un activo y nunca crea.

### Cotización: niveles de acceso (estados propios)

Configuración › Cotización (`/configuracion/cotizacion?seccion=niveles`). Hermana de «Tipos de seguimiento», con lo propio de que **un nivel retirado se deshace** y de que **el motivo de por qué no se elimina viene de la base**.

- **Quién entra:** `equipo.roles.ver` o `equipo.roles.gestionar` (cada nivel es un permiso de la matriz de Roles); sin ninguno, «No tienes permiso para ver esto». Con sólo `ver` se lee: sin «Nuevo nivel», sin «⋯», sin clic.
- **Lista:** primero el fijo «Todos» (sin «⋯» ni clic) y los niveles en uso; debajo «Retirados». Cada fila: estado y «Sin uso»/«En uso». Pie «N de 10 niveles posibles.». «⋯»: Renombrar · Retirar/Restaurar (guardan solos, con «Deshacer») · ─ · Eliminar. «Costos» se renombra y retira, no se elimina.
- **Eliminar con uso:** apagado, con lo que dice la base; sin uso confirma nombrándolo (`?panel=eliminar-nivel&nivel=<id>`). Nuevo y renombrar: modal por URL (`?panel=nuevo-nivel`, `renombrar-nivel&nivel=<id>`); vacío, > 40 o repetido se rechaza junto al campo. **Tope** 10 contando «todos» y retirados. Estados: esqueleto, error con «Reintentar», lista llena.
- **Dónde se nota:** cada nivel son **dos permisos por origen** (`Ver el nivel «X»`, `Editar el nivel «X»`) en la matriz de Roles; el dueño los recibe al nacer. La tabla de escritorio tiene dos columnas, «Nombre» y «⋯» (estado y uso bajo el nombre).

### Leads: listado (estados propios)

- **Entrar:** `leads.ver`; sin él «No tienes permiso para ver leads. Pídeselo a quien administra los roles.», sin consulta. «Propios» sólo la cartera; «todos» todo, con el teléfono enmascarado («+591 •••••01») y «Solo la cartera» en los datos privados de lo ajeno. Limbo y papelera no aparecen para nadie.
- **Columnas:** nombre y debajo su número («N.º 1.234» con `leads.numero_global.ver`; «Tu n.º 12» sin él), teléfono, tipo, origen y campos «en la tabla». Tarjeta del celular: nombre, número, tipo, teléfono, origen y hasta dos datos.
- **Filtros y búsqueda:** por nombre o número (`#124`), nunca por teléfono; sobre un campo «solo la cartera», quien ve «todos» lee «Solo busca en tus leads…». Una vista guardada con un campo desactivado o eliminado, o una etiqueta inexistente, se aplica sin ese filtro y avisa con «Entendido».
- **Tus marcas (privadas, «Solo las ves tú.»):** «Tachados» (Ocultarlos por defecto · Mostrarlos también · Solo los tachados), «Favoritos», «Etiquetas». No reordenan. Una línea dice cuántos coincidentes ocultan los tachados, con «Mostrarlos». **Mientras se busca no se ocultan.**
- **«⋯» de la fila** (misma lista, en este orden, en fila, kanban, resumen y ficha): «Agendar recordatorio…» y «Anotar seguimiento…» (cartera y `leads.editar`) · ─ · «Etiquetas…», «Favorito», «Tachado» · ─ · «Enviar a la papelera» (`leads.eliminar`). Anotar y agendar abren el modal de la ficha (`?panel=…&para=<id>`). Tachar ofrece «Deshacer».
- **Vacíos:** sin leads, «Todavía no tienes leads en tu cartera» con «Nuevo lead» y «Ver todos» según permiso; por filtro, «Nada coincide con los filtros» con «Limpiar filtros». Esqueleto con la forma del listado; error con «Reintentar».
- **Resumen (`?lead=`):** arriba tipo, marcas, «Editar» (cartera y `leads.editar`), «Abrir ficha», «⋯»; pestañas `?pestana=seguimientos|recordatorios` que se piden al elegirlas. «Resumen» trae nombre, número, tipo, teléfono tal como lo entrega la vista, origen y campos activos. Un lead que deja de verse: «Este lead ya no está disponible: no existe o ya no tienes acceso.».

### Leads: ficha (estados propios)

- **Entrar:** `leads.ver`. Un lead inexistente, en la papelera, en limbo o ajeno **se ven igual**: «No encontramos este lead o no tienes acceso.» con «Ir a Leads»; ni nombre ni número en la página.
- **Cabecera:** nombre, números, tipo, origen («(inactivo)» si está apagado), teléfono principal tal como lo entrega la base y quién lo tiene (enmascarado si no está en la cartera). «Favorito», «Tachado» y «Etiquetas…» van en el «⋯»; tope 20 etiquetas por lead. `?panel=etiquetas` gestiona (renombrar, color, eliminar con confirmación si está en uso).
- **Datos:** principales, «Teléfonos» (principal y extras con etiqueta y país) y un bloque por grupo del layout. **Editar** sólo con `leads.editar` y el lead **en la cartera** (con «todos» se ve y no se edita); `Ctrl/Cmd+S` guarda y cierra. Conflicto: «Rosa Mamani cambió este lead hace 3 min» con «Ver cómo quedó» y «Recargar»; un seguimiento nuevo, compartir o transferir no dan conflicto.
- **Quién lo tiene:** nombres y tipo de acceso («Dueño», «Compartido»); nunca correo ni teléfono. «Compartir» y «Transferir» (`?panel=compartir-lead`/`transferir-lead`) sólo para el dueño o, con el permiso en «todos», para quien lo ve; nunca ofrecen a quien mira. «Quitar acceso» ofrece «Deshacer»; «Salir de este lead» confirma. Al dueño se le transfiere, no se le quita.
- **Enviar a la papelera:** último ítem del «⋯», para `leads.eliminar`; sin preguntar, con «Deshacer» 10 s. Con un vehículo vinculado visible va apagado con motivo y ofrece «Ir a «Vehículos»»; si lo frena uno que no se ve, la base rechaza nombrando al lead, no al vehículo.
- **Vehículos** (`?seccion=vehiculos`, sólo con `vehiculos.ver`): «Vinculados», «Interesados» (con nota) y «Vínculos anteriores», sólo lo que quien mira ve. «Agregar vehículo» (cartera y `leads.editar`): busca por título, VIN, lote o #número, «Vincular» y nota de interés ≤ 500. «Desvincular» (quien edita el vehículo): con la cartera ofrece «Deshacer»; sin ella confirma.

### Leads: papelera, importar y teléfonos (estados propios)

- **Papelera** (`/leads/papelera`): para `leads.eliminar`, `leads.crear` (ve lo que envió) o `leads.papelera.purgar` (ve todo). Enviar es todo o nada (hasta 200). Por lote, con nombre y número; **nunca teléfono ni datos privados**. Restaurar no reabre el portal; un lead cuyo teléfono tomó otro queda adentro con motivo. Purgar (`leads.papelera.purgar`): diálogo que nombra lo que se borra, un lote de varios pide «purgar N»; vehículo vinculado, pagos o portal vigente lo impiden.
- **Importar:** vista previa en grilla alineada (contenedor ≥ 42 rem; si no, nombre sobre motivo). «País» vacío se completa con el del teléfono. **Deshacer importación** (24 h): diálogo que cuenta cuántos leads van a la papelera; el resultado dice cuántos se movieron y cuántos quedaron, nunca nombres ni teléfonos.
- **Teléfonos de la ficha:** sólo con la cartera y `leads.editar`; sin ella, enmascarados y sin botones. «Cambiar el principal» (`?panel=cambiar-telefono`): el actual pasa a extra «Anterior»; el nuevo se verifica al tipear y uno existente, ajeno o el mismo principal deshabilitan el botón con su frase. Extras (`?panel=agregar-telefono`, ≤ 10): número con país y etiqueta ≤ 40, «Quitar» con «Deshacer».

### Leads: seguimientos y recordatorios (estados propios)

- **Quién ve qué:** un seguimiento nace privado y sólo lo ve su autor; «Visible para el cliente» lo muestra a quienes ven el lead y al portal. Ni el co-asesor ni quien ve «todos» lee lo privado ajeno, y la pantalla no lo insinúa (sin conteo ni «último seguimiento»).
- **Anotar** (cartera y `leads.editar`): modal `?panel=anotar-seguimiento` con los campos del alta más «Visible para el cliente». `Ctrl/Cmd+Enter` o `Ctrl/Cmd+S` guardan; recargar lo reabre con lo escrito; «atrás» deja un borrador («Tienes un seguimiento sin guardar»); sin tipos activos el botón se apaga con motivo. **Editar/eliminar** sólo lo propio (`?panel=editar-seguimiento&seguimiento=<id>`); eliminar ofrece «Deshacer». Conflicto con «Recargar» conservando lo escrito.
- **Línea de tiempo:** vacío «Todavía no hay seguimientos»; de a 20 con «Ver más» hasta 500; «Ir a una fecha» (un día, no va a la URL) trae ese día y lo anterior.
- **Tus recordatorios:** sólo los propios; «Agendar recordatorio» (cartera); vencidos primero con «Vencido»; «Completados» plegados; «Completar»/«Reabrir», «Editar», «Eliminar» con «Deshacer». Modal por URL (`?panel=agendar-recordatorio`, `editar-recordatorio&recordatorio=<id>`) con «De qué es», «Cuándo» y «Vehículo (opcional)»; no se agenda en el pasado.

### Totales y topes (9e, `.claude/rules/escala.md`)

Un número que se muestra nunca es el total exacto: se cuenta hasta un tope y se dice «más de N» (en una frase) o «N+» (en una cabecera). Toda lista que crece dibuja a lo sumo un tope y lo dice, con un camino a lo antiguo.

- **Listado de leads y vehículos:** sin total ni «página 3 de 800»: Anterior y Siguiente y, arriba, «Los más recientes» o «Creados hasta el 2 sep 2026» con «Volver al principio». Para lo antiguo, **filtrar** o **buscar**.
- **Exportar:** con más de 5.000 leads en los filtros no exporta y pide filtrar más.
- **Embudo:** cabecera de columna y pestaña dicen «37» o «500+». Una columna dibuja a lo sumo 500 y ahí ofrece «Buscar en el embudo» (`?q=`, desde 2 caracteres; busca título y nombre del lead en todas las columnas; es de la vista de embudo).
- **Vehículos y ficha:** los bloques de vínculos, interesados y «Agregar vehículo» dicen su tope al pie con `<AvisoDeTope>`; «Oportunidades» muestra las 10 más recientes (abiertas primero) con «Ver todas» (`?seccion=oportunidades&todas=1`, hasta 100).
- **Papeleras:** de a 5 lotes por página (`?cursor=`); un lote trae hasta 200 y muestra 20 con «Mostrar los 200». Sin «Ítems por página»: su unidad es el lote.
- **Sin red:** abrir un modal, panel o pestaña nunca pedidos dice «Sin conexión. No se pudo abrir esto.» con «Reintentar»; paginar sin red no navega y lo dice.

### Equipo y roles (estados propios)

- **Equipo:** sólo tú (aviso con invitación); con más de 100 personas, las 100 primeras por nombre; sobre la cuenta propia el menú dice por qué no se puede bloquear ni dar de baja. Dar de baja confirma nombrando a la persona y cuántos leads van al limbo (hasta 1.000); con muchos sigue por lotes («Pasando sus leads…»). Invitar: si el correo falla, el enlace queda a la vista.
- **Roles:** «Recibir turnos de la web» es un interruptor más de la matriz; un rol sin él vende igual pero no recibe turnos. Rol que no dominas: columna de sólo lectura con motivo; permiso que no tienes: celda deshabilitada con motivo; conflicto «Otra persona cambió este rol · Recargar».

## Decisiones de UX

- Inicio = bandeja de trabajo por rol, no dashboard; el tablero analítico vive en `/tablero`.
- El teléfono principal se verifica al tipear, no al guardar: el duplicado no cuesta un formulario entero.
- Mover de fase con el mismo panel de requisitos desde la cadena y desde la ficha; nunca drag & drop (oculta el porqué del rechazo). Documentos se suben al confirmar, nunca al elegir el archivo.
- Chat con menciones `#` que abren el drawer de la entidad sin salir; referenciar no otorga acceso.
- Los roles de una persona se cambian con un interruptor por rol (permisos = unión de sus roles); la matriz guarda cada celda sola.
- Los campos de los leads y los nombres de orígenes, fases, tipos de documento y categorías salen de la base: ningún texto fijo los nombra. «Solo la cartera» se recorta en la base, no en la pantalla.
- Empresa es una pantalla con pestañas: quien tiene uno de sus dos permisos ve la otra parte deshabilitada con motivo. El tipo de cambio se cambia en un panel con su historial a la vista.
- La fase de un vehículo se ve en el inventario y se cambia en logística. Un vehículo nace en la fase inicial cuando hay una sola; si no, «Sin fase».
- `Ctrl/Cmd+Enter` en un alta guarda y deja el panel listo para otro; `Ctrl/Cmd+S` guarda y cierra, salvo en «Nuevo lead», donde guarda y deja el drawer listo.
