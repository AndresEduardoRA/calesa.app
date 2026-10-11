# Experiencia de uso — importadora

Lo hoy reemplazado: planillas de Excel por asesor (cotizaciones, repuestos), WhatsApp entre áreas y
el prototipo `ip`. La regla: ninguna tarea de oro puede ser más lenta que la planilla que reemplaza.

## Roles

Los roles son libres (el dueño los crea); la interfaz se arma por **permisos**, no por nombre de rol.
Estos son los perfiles de referencia para diseñar:

| Rol de referencia | Quién es                                                    | Intensidad          | Dispositivo                                  | Pantalla de inicio                                                             |
| ----------------- | ----------------------------------------------------------- | ------------------- | -------------------------------------------- | ------------------------------------------------------------------------------ |
| Asesor            | Vende: leads, cotizaciones, turnos de la web                | Todo el día         | Escritorio + celular                         | Bandeja: recordatorios de hoy, turnos web sin confirmar, leads sin seguimiento |
| Logística         | Mueve vehículos por el flujo, documentos, embarques, aduana | Todo el día         | Escritorio; celular en puerto/aduana (fotos) | Bandeja: vehículos trabados, documentos por aprobar, alertas por demora        |
| Repuestos         | Proyectos e ítems de repuestos, compras, stock              | Medio día           | Escritorio                                   | Bandeja: ítems por mover, esperas que destraban vehículos                      |
| Dueño / admin     | Configura todo, mira métricas, resuelve conflictos          | Varias veces al día | Escritorio                                   | Tablero operativo + accesos a configuración                                    |
| RRHH / equipo     | Alta, roles, bloqueo y baja de usuarios                     | Esporádico          | Escritorio                                   | Equipo                                                                         |

## Tareas de oro

| #   | Tarea                                             | Rol       | Frecuencia          | Meta                                                                                                              | Error que no puede pasar                                                             |
| --- | ------------------------------------------------- | --------- | ------------------- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| 1   | Registrar lead y anotar un seguimiento            | Asesor    | ~30/día por asesor  | ≤ 25 s desde `N` hasta lead guardado con seguimiento; duplicado detectado al terminar de tipear el teléfono       | Crear un lead con un teléfono que ya es de otro; perder lo tipeado                   |
| 2   | Cotizar un vehículo para un lead                  | Asesor    | ~15/día por asesor  | ≤ 90 s con link de subasta o vehículo del inventario; cada celda editable con teclado; PDF en 1 clic              | Guardar con una constante vencida sin saberlo; que el total no cuadre con las líneas |
| 3   | Mover vehículos de fase con documentos            | Logística | ~40 movimientos/día | Mover 1 en ≤ 15 s; marcar llegada de un contenedor de 8 en ≤ 60 s; ver _antes_ de confirmar qué falta en cada uno | Mover sin el documento bloqueante; perder un archivo subido; pisar el cambio de otro |
| 4   | Atender un turno de la web y dar acceso al portal | Asesor    | ~5/día por asesor   | Confirmar «contacté» en 2 toques desde el celular; otorgar portal desde la ficha del lead en ≤ 30 s               | Dejar vencer un turno sin aviso; que el código del portal no se pueda dictar         |

### Flujo 1 — Registrar lead y seguimiento

1. En cualquier pantalla `N` → drawer «Nuevo lead» (no página). Foco en **Teléfono principal** (es la clave).
2. Al completar el teléfono (debounce 400 ms) se consulta `verificar_telefono`: si existe y es mío → «Ya existe: Ana Quispe · Abrir»; si es de otro → «Lo tiene Diego Vargas · Escribirle por chat» (sin mostrar nada más del lead); si está en limbo → «Sin dueño · Tomar lead» y al guardar se adopta con registro.
3. Nombre, origen (último usado por defecto), tipo (prospecto), ciudad (la de la empresa por defecto). Todo lo demás plegado en «Más datos».
4. `Ctrl/Cmd+Enter` guarda y abre el bloque «Primer seguimiento» en el mismo drawer: tipo (WhatsApp por defecto), resumen, recordatorio opcional (fecha+hora con atajos «mañana 9:00», «en 3 días»).
5. Guardar → toast «Lead #124 creado» con «Abrir ficha»; el drawer queda listo para el siguiente (`N` de nuevo).

Estados propios: teléfono en verificación (spinner dentro del campo, el resto sigue editable); sin
permiso para crear leads (el botón no aparece); conexión caída al guardar (el drawer conserva
todo y reintenta).

### Flujo 2 — Cotizar

1. Desde la ficha del lead, el drawer de un vehículo o `Ctrl/Cmd+K → «Nueva cotización»`. Elegir origen (si hay más de uno).
2. Si el origen es de subasta: pegar link o lote → `apibara` llena la ficha y las fotos; si es manual: buscar en inventario o cargar a mano. El lead viene preseleccionado si se abrió desde su ficha.
3. La hoja de cálculo: secciones según la fórmula publicada del origen; cada línea es un **XCell** (`Tab` avanza, tipear abre edición, `Esc` cancela). Las sugeridas de tabla llevan punto; las modificadas, anillo y «revertir».
4. Resumen fijo al pie: total por moneda, modo de tipo de cambio, toggle **Live**.
5. `Ctrl/Cmd+S` guarda (preventa); «Vista previa» abre el PDF con la plantilla publicada; «Compartir» copia texto + descarga PDF.

Estados propios: fórmula del origen sin publicar (pantalla bloqueada con «Falta publicar la fórmula
de <origen>» y enlace a configuración si tiene permiso); link de subasta inválido o sin datos (se
puede seguir a mano); constante cambiada por el dueño mientras edito (banner «la fórmula cambió,
esta cotización usa la versión N»).

### Flujo 3 — Mover de fase

1. `/logistica` abre la **cadena**: columnas por fase del flujo del origen elegido, tarjetas con alerta por demora, filtros en URL.
2. Clic en vehículo → panel lateral con «Qué falta para pasar a …» (requisitos evaluados en vivo: documentos aprobados/faltantes, datos, esperas de repuestos).
3. Subir documento desde el panel (arrastrar o cámara en celular); el archivo se sube al confirmar, nunca antes; queda «subido» hasta que alguien con permiso lo aprueba.
4. «Mover a <fase>» pide nota interna (obligatoria si la fase lo exige) → RPC con `fase_esperada`; conflicto → «Lo movió Rosa hace 1 min · Recargar».
5. Lote: seleccionar N por filtro → «Marcar llegó» → vista previa por unidad (ok / falta X) → confirmar → resultado parcial explícito con reintento de los fallidos.

### Flujo 4 — Turno de la web

1. Notificación push/campana «Turno web #WEB-4F2K · Toyota RAV4» → abre la tarjeta con dos acciones grandes: **Contacté** y **Vincular a lead** (buscador; «crear lead» adentro).
2. Contar regresiva visible del vencimiento; al vencer, aviso y reasignación.
3. En la ficha del lead: «Acceso al portal» → modal con clave (≥ 8) → código `IPV-XXXXX` en grande con «Copiar» y texto listo para WhatsApp. «Revocar» al lado.

## Pantallas

Navegación de primer nivel (hasta 7, filtrada por permisos): Inicio · Leads · Vehículos · Cotizaciones ·
Logística · Agenda · Chat. Repuestos aparece como entrada propia sólo con permiso. Configuración,
Actividad y Datos viven en el menú del usuario y en `Ctrl/Cmd+K`.

| Pantalla       | Ruta                                  | Patrón                                      | Roles                             | Notas                                                                                                          |
| -------------- | ------------------------------------- | ------------------------------------------- | --------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Inicio         | `/`                                   | Bandeja por rol + widgets opcionales        | todos                             | Bloques por permiso; cada contador lleva a la lista filtrada                                                   |
| Leads          | `/leads`                              | Tabla + drawer rápido                       | con `leads.*`                     | Filtro por defecto: míos, no tachados; vistas guardadas; `?vista=embudo` kanban                                |
| Lead           | `/leads/[id]`                         | Detalle con pestañas                        | con acceso al lead                | Seguimientos, recordatorios, vehículos, cotizaciones, portal, historial                                        |
| Vehículos      | `/vehiculos`                          | Tabla + panel de filtros Copart + drawer    | con `vehiculos.*`                 | Pestaña por origen; chips; `?origen=`; papelera en `/vehiculos/papelera`                                       |
| Vehículo       | `/vehiculos/[id]`                     | Detalle con pestañas                        | según origen                      | Ficha por layout del origen, fotos (≤ 24), fase, documentos, cotizaciones, repuestos                           |
| Cotizaciones   | `/cotizaciones`                       | Tabla + drawer                              | con `cotizaciones.*`              | Filtro: mías, preventa; `nuevo` abre wizard                                                                    |
| Cotizar        | `/cotizaciones/nuevo`, `/[id]/editar` | Formulario hoja (XCell)                     | con `cotizaciones.crear`          | `?origen=&lead=&vehiculo=&returnTo=`                                                                           |
| Logística      | `/logistica`                          | Cadena (kanban por fase) + panel lateral    | con `logistica.*`                 | `?origen=`; `/logistica/vehiculo/[id]`, `/embarques`, `/aduana`, `/gastos`                                     |
| Repuestos      | `/repuestos`                          | Tabla proyectos + detalle con ítems         | con `repuestos.*`                 | Stock, compras, cotizador propio                                                                               |
| Agenda         | `/agenda`                             | Calendario mes/semana/día + drawer          | todos                             | Eventos, tareas, recordatorios, subastas del inventario                                                        |
| Chat           | `/chat`                               | Maestro-detalle (conversaciones / mensajes) | con `chat.participar`             | Menciones `#` de vehículo/lead/cotización, `/tarea`, `/evento`; widget flotante fuera de `/chat`               |
| Notificaciones | `/notificaciones`                     | Lista                                       | todos                             | Campana con las que piden acción                                                                               |
| Actividad      | `/actividad`                          | Tabla agrupada por día + drawer diff        | con `actividad.ver`               | 14 días                                                                                                        |
| Configuración  | `/configuracion/*`                    | Hub + formularios en bloques                | por permiso de cada sección       | empresa, equipo, roles, orígenes, cotización (fórmulas, tablas, tarjeta), flujos, web, cola web, integraciones |
| Datos          | `/datos`                              | Importación/exportación                     | propio: todos; todo: `datos.todo` | Plantilla CSV, mapeo, vista previa por fila                                                                    |
| Buscador       | `Ctrl/Cmd+K`                          | Paleta                                      | todos                             | Resultados por tipo, acotados a permisos; acciones («nuevo lead»)                                              |

## Permisos (matriz de referencia; el catálogo real vive en `permisos.ts` y se siembra en SQL)

| Acción                                          | Asesor | Logística | Repuestos | Dueño |
| ----------------------------------------------- | ------ | --------- | --------- | ----- |
| Crear lead / ver mis leads                      | ✔      | –         | –         | ✔     |
| Ver leads de otros (teléfono enmascarado)       | –      | –         | –         | ✔     |
| Cotizar / configurar fórmulas                   | ✔ / –  | –         | –         | ✔ / ✔ |
| Crear vehículo / ver vehículos (por origen)     | ✔      | ✔         | –         | ✔     |
| Mover de fase / aprobar documentos (por origen) | –      | ✔         | –         | ✔     |
| Ver costos y margen                             | –      | –         | –         | ✔     |
| Vitrina web / publicar guías                    | – / –  | –         | –         | ✔     |
| Repuestos (proyectos, costos, cotizador)        | –      | –         | ✔         | ✔     |
| Chat global, dar tareas, recibirlas             | ✔      | ✔         | ✔         | ✔     |
| Equipo, roles, bloqueo, registro on/off         | –      | –         | –         | ✔     |
| Exportar/importar todo                          | –      | –         | –         | ✔     |

## Reglas transversales

- Estados obligatorios en toda pantalla: cargando (esqueleto propio por patrón), vacío primera vez, vacío por filtro, error con reintentar, sin permiso — ver `.claude/rules/ui.md`.
- Destructivas: papelera (vehículos, cotizaciones, leads) = hacer + toast con deshacer 10 s; purga y baja de usuario = diálogo que nombra el objeto; masivas irreversibles = confirmación tipeada.
- Formatos: `Intl` con el locale y la moneda de la empresa (`es-BO` por defecto); montos con cifras tabulares; fechas cruzan servidor↔cliente como ISO `YYYY-MM-DD`/`timestamptz` y se muestran en la zona horaria de la empresa.
- Modo Live: oculta cifras sensibles **y** símbolos de moneda en toda la app (clase en `<html>`), no sólo en el cotizador.
- Atajos globales: `Ctrl/Cmd+K` buscar/comandos · `N` nuevo (lead/vehículo/cotización según pantalla) · `Ctrl/Cmd+S` guardar · `Ctrl/Cmd+Enter` guardar y seguir · `Esc` cerrar panel · `?` lista de atajos.
- Densidad: compacta en escritorio (filas 36–40 px), cómoda en táctil (48 px); conmutable y recordada por usuario.
- Formularios en drawer/modal compactados en bloques plegables; crear desde cualquier contexto sin abandonar la tarea; `returnTo` para volver de donde se vino.
- Filtros: panel lateral plegable (bottom-sheet en móvil) + chips activos + «limpiar»; esquema declarativo por listado; estado en URL (nuqs, `shallow:false`); vistas guardadas por usuario.
- Transiciones entre páginas con View Transitions (`<Link>` + `view-transition-name` en el elemento compartido), con `prefers-reduced-motion`.
- Un modal nunca abre otro modal: segundo nivel = panel lateral o página.
- Permisos en UI: ocultar lo que nunca va a usar; deshabilitar con motivo lo que espera poder hacer. RLS es la seguridad.
- Conflictos: todo formulario de edición manda `actualizado_en` esperado; `PT409` → «X cambió esto hace N min · ver / recargar».

## Decisiones de UX

- Inicio = bandeja de trabajo por rol, no dashboard. El tablero analítico (métricas, gráficas, widgets personalizables) vive en `/tablero` → pedido del brief con «dashboards por rol», resuelto así para no violar la regla de inicio útil.
- El teléfono principal se verifica al tipear, no al guardar: es la única forma de que el duplicado no cueste un formulario entero → meta de la tarea 1.
- Cotizar es página, no drawer: hoja densa con decenas de celdas y vista previa → asumido.
- Mover de fase desde la cadena (kanban) y desde la ficha del vehículo con el mismo panel de requisitos; nunca drag & drop entre columnas (oculta el porqué del rechazo) → asumido.
- Documentos se suben al confirmar (commit diferido), nunca al elegir el archivo → regla de ip conservada.
- Chat con menciones por `#` que abren el drawer de la entidad sin salir; referenciar no otorga acceso → regla de ip conservada.
- Los nombres de orígenes, fases, tipos de documento y categorías salen de la base (con sustantivo y género); ningún texto fijo en la UI los nombra → asumido.
