# Plan por fases

Regla: **una fase por sesión de trabajo**, y al terminar se para y se reporta. Construir varias
fases de corrido es cómo se acumulan errores que después cuestan tres veces más arreglar. El
alcance es todo el brief; no hay MVP: hay orden.

Cada fase tiene un criterio de terminado verificable — no «que funcione bien» sino algo que se
puede correr y ver. Las metas de las tareas de oro de `docs/UX.md` son criterio de terminado de su
fase y se miden con un e2e.

---

## Fase 0 — Cimientos

`setup.sh` ya corrió. Verificar que lint, typecheck, test y `db:probar` pasan en vacío; probar que
los hooks bloquean (un `any`, una promesa sin await, un import a tripas de otro módulo); crear
`src/shared/lib/supabase/{server,browser,admin,proxy}.ts`, `src/proxy.ts`,
`safe-action.ts`, `permisos.ts` (claves tipadas desde `seed.sql`), `formato.ts`, `fechas.ts`,
`errores.ts`; `src/app/globals.css` con los tokens de `design/tokens.css` y modo oscuro;
`src/app/manifest.ts` + `public/sw.js`; `supabase start`, `db:reset`, `db:types`; `docs/MAPA.md`
limpio; primer commit.

**Terminado cuando:** el proyecto arranca, lint y typecheck pasan en vacío, hay un test que corre,
`pnpm db:probar` pasa, `scripts/mapa.sh --check` pasa sin pendientes, y el primer commit está hecho.

## Fase 1 — Equipo, empresa y shell de la app

Módulos `equipo` y `empresa` completos: login email+contraseña y Google, recuperar contraseña,
registro on/off (la UI esconde el botón; la base ya lo bloquea), invitación por API admin
(`invitado: true`), perfil propio, equipo (lista, roles, bloquear, dar de baja con aviso de cuántos
leads van al limbo), matriz de roles × permisos con origen y alcance (RPC `rbac_*`, dominancia
visible: lo que no tenés aparece deshabilitado con el motivo), ajustes de la empresa (marca, logo,
país, locale, zona horaria, monedas, tipos de cambio con historial, integraciones, retenciones;
«Regenerar íconos» a partir del logo, ver `design/ICONOS.md`).
Shell: layout con sidebar por permisos, topbar con TC y buscador (placeholder), modo oscuro,
densidad, transiciones, `estados/` y `esqueletos/` compartidos, `<Monto>` y Modo Live,
`<Drawer>`, `<Modal>`, `<Bloque>`, `<Confirmar>`, toasts. Inicio = bandeja vacía con bloques por permiso.

**Terminado cuando:** una persona nueva se registra (si está abierto) o entra invitada, nace con el
rol que le dieron, ve sólo los módulos que sus permisos permiten, y el dueño puede crear un rol,
darle permisos acotados a un origen y bloquear a alguien; e2e de login + matriz de roles en verde.

## Fase 2 — Orígenes y vehículos

Módulos `origenes` y `vehiculos`: CRUD de orígenes con tipo subasta/manual (los triggers crean el
flujo y los campos), editor del layout de campos (orden, grupo, requerido, en tarjeta, filtrable,
público) y categorías; listado de vehículos por origen con `FilterShell` (chips, panel lateral,
bottom-sheet móvil, filtros derivados de `origenes_campos.filtrable`, estado en URL con `nuqs`,
vistas guardadas); ficha por layout; alta y edición en drawer con bloques; fotos (≤ 24,
compresión WebP, portada, reordenar, hash + refcount); interesados y vínculo activo; vitrina
(RPC) con precio público; papelera (enviar, listar, restaurar, purgar); integración apibara
(`supabase/functions/apibara` + alta por link/lote con mapeo por `clave_apibara`, activable desde
integraciones); subastas próximas en la ficha.

**Terminado cuando:** se crea un origen «Corea» manual y uno de subasta, cada uno nace con su
flujo y sus campos; un vehículo de subasta se da de alta pegando un link (o a mano si apibara está
apagado); los filtros reflejan los campos filtrables del origen y sobreviven a recargar; la vitrina
sólo publica con permiso y por RPC; e2e del alta por link y de la papelera en verde.

## Fase 3 — Leads

Módulo `leads`: **campos configurables** (Configuración › Leads › Campos: crear, apagar, renombrar, ordenar, agrupar, requerido, filtrable, en la tabla, valor por defecto y «solo la cartera»; son el layout que leen el alta, la ficha, el listado y el CSV); listado con filtros, drawer rápido y ficha con pestañas; drawer «Nuevo lead» con
verificación del teléfono al tipear (`verificar_telefono`: libre / existe y es mío / de otro con
CTA al chat / en limbo → adopta); seguimientos con Tiptap saneado, tipos configurables,
visibilidad pública/privada; recordatorios con atajos de fecha; favoritos, tachados (ocultos
por defecto, filtro de 3 estados) y etiquetas por usuario; compartir, transferir, revocar; oportunidades
en embudos por usuario con kanban (`?vista=embudo`); portal del cliente (otorgar con código en
grande y texto para WhatsApp, revocar); papelera; exportar/importar CSV de lo propio (vista previa
por fila, importa las válidas, con deshacer durante 24 horas).

**Avance (por partes, una por sesión):** hechas la 1 (campos configurables), 2 (alta rápida), 3
(listado), 4 (ficha y teléfonos), 5 (seguimientos, recordatorios, favoritos, tachados y etiquetas) y
6a (auditoría de todas las RPC y policies de leads, cartera —compartir, transferir, quitar acceso y
salir— y papelera de leads) y **6b (sección «Vehículos» de la ficha: vincular, desvincular, interesados;
`vehiculo_id` en seguimientos y recordatorios; la prueba de carreras con dos conexiones)** y **7a (embudos
personales, oportunidades con kanban y sección en la ficha, transferir con oportunidades)** y **7b (el acceso del
cliente del lado del equipo —la sección «Portal»— y el endurecimiento de `web.portal_*`)**. **8a (exportar la cartera e importar con vista previa, por lotes)** y **8b (deshacer una importación durante 24 h, con «Tus importaciones recientes»)** y **9a (el país del teléfono: se dice al tipear, llena «País» y se ve en la ficha y en la importación; tabla estática, sin SQL)** y **9b (el primer seguimiento del alta, opcional y enriquecido: el mismo editor y los mismos campos que la ficha, «Cuándo fue» y «Próximo contacto» plegado; una migración que amplía `_lead_crear`)** y **9c (los formularios que aparecían al pulsar algo, en modales con su URL)** y **9d (un solo modal de seguimiento en la ficha, el drawer y la tabla; la pestaña «Seguimientos» del drawer; anotar o agendar desde el «⋯» de una fila)** y **9d-2 (el drawer con tres pestañas, «Resumen», «Seguimientos» y «Recordatorios»; las listas de un lead por páginas, con tope, «Ir a una fecha» y «Recargar» de costo fijo; la regla de escala, `.claude/rules/escala.md`)** y **9e (la escala de toda la app medida con 50.000 leads y 100.000 filas por purgar: números acotados, kanban y papeleras con tope, jobs por lotes, el shell delgado, `diferido()` y las guardas)** y **9f-2 (la numeración de los leads: número propio por creador y número global sólo con un permiso, enmascarado por filas en la base; se ve bajo el nombre, en la ficha y el drawer, y se busca con `#n`)** y **9f-1 (el origen del lead configurable: una pestaña en Configuración › Leads para crear, renombrar, ordenar, activar y desactivar los orígenes; se escriben sólo por RPC con `leads.configurar`; uno con leads no se elimina; el alta, la ficha, el listado y el CSV los leen de la base)**.

**Lo que queda de la Fase 3, en este orden** (una parte por sesión, cada una se detiene a reportar):

1. **El recorrido de la IA con dos cuentas** (dueño y asesor) por las tareas de oro de leads: reemplaza la prueba manual (nadie prueba a mano; toda verificación es un test o un recorrido de la IA).
2. ~~**9f-2 — la numeración de los leads**~~ **hecha:** número propio (por creador) y número global (con `leads.numero_global.ver`), enmascarado por filas en la base y probado por todas las rutas (`docs/DECISIONES.md`, 2026-10-17). **Para la Fase 9:** la pantalla de Actividad lee el diff por una función que recorta según la cartera; esa función **no** reintroduce los números (`actividad.antes/despues` no los guardan y la matriz lo asserta con un patrón), y todo lo nuevo que devuelva el número de un lead entra al inventario de `numero-global.sql`.
3. ~~**9g — ítems por página configurables en toda la app**~~ **hecha:** «Ítems por página» (10, 25, 50, 100) en el listado de leads y el inventario de vehículos, la recuerda la cuenta (`listas.por_pagina`) y manda `?por=`; el tamaño sale de `src/shared/lib/paginacion.ts` y cada RPC lo acota en la base con `_acotar_pagina` (`docs/DECISIONES.md`, 2026-10-17). **El máximo del listado de leads es 50, no 100** (a 100 el plan de la cartera de «todos» deja el índice: 518 ms contra 13); el inventario cabe con 100. **Para la 9h:** al arreglar la estimación, `MAXIMO_DE_PAGINA_DE_LEADS` sube a 100 y `db:medir:volumen` lo asserta.
4. ~~**9h — la cartera de «todos» a escala**~~ **hecha** (`docs/DECISIONES.md`, 2026-10-17): la causa era la estimación de la policy de `leads` (0,37 % de la cartera viva: la rama «todos» dentro de un `or` valía 0,005 y el limbo, un SubPlan por fila, 0,5) y el costo por fila de `atributos_lead()`. La cartera y los atributos públicos van en la fila del lead (`leads.cartera`, `leads.atributos_publicos`, mantenidas por triggers y comparadas con su fuente en `derivados-leads.sql`), la regla de visibilidad está escrita una vez (`_lead_visible_para()`, inlineada en la policy, `puede_lead()` y `atributos_lead()`) en una forma que se estima en ~1, cambiar la privacidad de un campo va por lotes, un campo público se filtra por su copia y el máximo de leads por página es 100. Con 50.000: un filtro sin resultados de la dueña 4,4 s → 21 ms, una etiqueta 717 → 42 ms, «míos» 870 → 10 ms, una página profunda 390 → 11 ms. **Quedan como candidatos:** ~~la baja de una persona por lotes~~ (hecha en el cierre 1); la búsqueda por nombre con `pg_trgm` a través de una `definer` si la cartera pasa de ~300.000 (hoy, 185 ms con 200.000); filtrar por un campo privado cuesta lo que suma la cartera de quien filtra (~66 µs por lead).
5. **El cierre de la fase**, en tres partes (cada una se detiene a reportar). **Cierre 1 hecho** (`docs/DECISIONES.md`, 2026-10-17, «Cierre 1»): lo que la escala dejó con número. Pendientes:
   - «Mover a…» con motivo y los `Confirmar` sin URL (salir, desvincular, purgar, deshacer importación, eliminar embudo);
   - los presupuestos de JS de `/leads`, `/perfil` y `/vehiculos` ya están fijados (9e, `e2e/soporte/presupuestos.ts`);
   - **de la 9e:** (a) una pantalla paga todo lo que reexporta el `index.ts` del módulo que importa (`/perfil`, 25 KB por `ListaEquipo` y `MatrizDeRoles`; `/leads`, la ficha y el importador): partir los barriles por pantalla o servir lo grande con `diferido()` y SSR; ~~(c) un avatar chico~~ (cierre 1: miniatura de 96 px y su relleno); ~~(d) el cursor de `storage-gc`~~ (cierre 1); ~~(e) avisar el tope en vínculos, interesados, tipos de cambio y el selector de vehículos~~ (cierre 1: `<AvisoDeTope>`); ~~(f) el lote de papelera de 20, la búsqueda del kanban~~ (cierre 1) y el «página N» (**descartado** en el cierre 1: con cursor no hay un número verdadero; arriba se dice «Los más recientes» o «Creados hasta el …»);
   - ~~**de la 9g:** las papeleras al selector; la tabla y las tarjetas a la vez; el selector al pie en el celular~~ (cierre 1: las papeleras **no** entran al selector —su unidad es el lote—; una sola vista elegida en el servidor; el selector arriba de la lista en el celular);
   - ~~**de la 9h:** la baja de una persona con ~100.000 leads~~ (cierre 1: por lotes reanudables, termina con 200.000);
   - la ventana de pérdida de lo tecleado en el panel de tipos de cambio;
   - decidir qué pasa con un clic sobre un aviso con un panel abierto;
   - fechar las entradas del repo con la fecha del sistema;
   - el Nivel 2 solo en escritorio, con `--project` en `test:e2e:completo`;
   - los 105 s de `beforeAll`/`afterAll`;
   - y lo de siempre: presupuestos, recorte de la ficha, índice de DECISIONES, tabla de criterios.

**Candidatos que decide la persona (no entran solos):** (a) una pantalla para los **tipos de seguimiento** (hoy sólo están en `seed.sql`: sin pantalla, sin orden ni icono; sería la pestaña que sigue a «Orígenes del lead» en Configuración › Leads, con el mismo patrón); (b) un **icono** para el origen del lead y el tipo de seguimiento, que pide un catálogo cerrado en `shared` y dibujarlo (el de `tipos_seguimiento` hoy se guarda y no se muestra); (c) un origen del lead «por defecto» de la empresa (hoy el alta propone el último que usó la persona); (d) separar `leads.campos.gestionar` de `leads.configurar`.

**Terminado cuando:** cada empresa arma los campos de sus leads sin tocar SQL (crea «Signo zodiacal»,
apaga «Edad», marca uno «solo la cartera») y quien ve un lead sin estar en su cartera no recibe un
privado, ni por la vista ni filtrando; registrar lead + seguimiento ≤ 25 s desde `N` con el duplicado
detectado al terminar de tipear el teléfono (e2e lo mide); la dueña ve el lead ajeno con teléfono enmascarado;
dar de baja a un asesor manda sus leads al limbo y otro los adopta al registrar el teléfono; el
código del portal es dictable.

## Fase 4 — Cotizaciones

Módulo `cotizaciones`: motor del grafo en `entities/` (evaluación topológica, buckets por tipo de
cambio, `total`, `base_imponible`, `aparte`; tests contra la fórmula del seed); editor de la
fórmula en configuración (nodos, constantes, tablas de referencia editables inline, borrador /
publicar con nota / historial / revertir); `XCell` (núcleo de ip: valor, default, revertir,
secundario, sugerido, deshabilitado con motivo, ⚙ que publica N+1, teclado); wizard de cotizar
(origen → vehículo por link/inventario/manual → lead → hoja → resumen con modo de TC y Live);
guardar preventa con snapshot; editar recalcula con SU versión; cotizar encima (versión N+1);
plantilla de tarjeta versionada y PDF en servidor con `@react-pdf/renderer`; compartir (texto +
PDF); comentarios anidados, adjuntos, favoritos, reportes, revisiones con diff; marcar final
(RPC) y comprobantes de venta.

**Terminado cuando:** cotización completa ≤ 90 s con link de subasta y sólo teclado en la hoja;
el total del PDF es la suma de las líneas del snapshot (e2e lo verifica); cambiar una constante
desde el ⚙ publica v2 y la cotización abierta sigue usando v1 hasta recotizar; un vehículo tiene a
lo sumo una final activa.

## Fase 5 — Flujos (configuración)

Módulo `flujos`: configuración por origen (y el de repuestos): fases con todos sus atributos,
transiciones con acción y nota obligatoria, roles por fase y por transición, requisitos
(documento con tipo/min/max/formatos, dato con las claves del catálogo, espera a fase de otro
flujo), reglas del flujo (encender/apagar con impacto), tipos de documento globales y por flujo
con vencimiento, oferta de transporte, franja «Revisar» (`revisar_flujo`), jubilar/eliminar fase
(`fase_eliminar`), «fuera de regla» y el aviso de impacto antes de volver bloqueante un requisito.

**Terminado cuando:** el dueño arma desde cero un flujo de 5 fases con requisitos de los tres tipos
sin tocar SQL, «Revisar» marca una fase sin salida y una espera cruzada, y jubilar una fase con
historial la saca de los destinos sin romper nada.

## Fase 6 — Logística

Módulo `logistica`: cadena (kanban por fase con alerta por demora, filtros en URL), panel del
vehículo con «qué falta» (`previsualizar_cambio_fase`), mover con nota y `PT409`, lote con vista
previa por unidad y resultado parcial; documentos (subida con commit diferido, cámara en móvil,
aprobar/rechazar con motivo, vencimientos, visible en portal); transporte 1:1 y grupos
(embarques por booking, contenedores), editar grupo todo-o-nada; declaraciones aduaneras (DUI N:M,
canal de aforo, «pagada» derivada); gastos y pagos (confirmar sellado); notas; «dónde está»;
cotización final vs real y margen (`margen_vehiculo`); bandeja de logística en inicio;
alertas por demora (cron + notificación).

**Terminado cuando:** mover 1 vehículo ≤ 15 s y marcar llegada de un contenedor de 8 ≤ 60 s con
vista previa por unidad; no se puede mover sin el documento bloqueante y el conflicto da `PT409`
legible (e2e); el margen muestra `null` como «Sin venta registrada», nunca $0.

## Fase 7 — Agenda, chat, notificaciones y buscador

Módulos `agenda` (calendario mes/semana/día con eventos, tareas, recordatorios y subastas;
visibilidad; reasignar tarea; vínculos a lead/vehículo/cotización), `chat` (directos deduplicados,
grupos, canal global por permiso, menciones `#` con drawer de la entidad, `/tarea` y `/evento`
desde el mensaje, realtime, widget flotante, editar/borrar), `notificaciones` (campana con
«requiere acción», realtime, push web con VAPID y `supabase/functions/push`, preferencias por
usuario), `buscador` (Ctrl/Cmd+K: RPC por sección con mínimo 3 caracteres y ámbito en servidor,
acciones, últimos abiertos).

**Terminado cuando:** una tarea dada desde el chat le llega como notificación y push al
responsable; una mención a un lead que no puedo ver muestra placeholder; el buscador nunca
devuelve algo que la RLS esconde ni busca por teléfono.

## Fase 8 — Web pública (contenido, cola y portal) y repuestos

Módulo `web`: ajustes del sitio (lema, redes, legales con editor, orígenes visibles, política de
la cola), guías con Tiptap y publicación por permiso, FAQs, testimonios con consentimiento,
tablero de la cola (`estado_cola_web`, `unassigned` destacado, prioridades y cupos), tarjeta de
turno con «Contacté» y «Vincular a lead» en 2 toques, interruptor de disponibilidad en el perfil,
revalidación de la web por trigger + `WEB_PUBLICA_REVALIDAR_URL`, route handlers del portal
(`api/portal/*` con cookie firmada y `web.portal_*`: el contrato está en `docs/DECISIONES.md`, «Contrato del portal
para la Fase 8», 2026-10-16). Módulo `repuestos`: proyectos e ítems,
imágenes, stock y movimientos, compras (permiso de costos), flujo de repuestos con la misma cadena,
esperas que destraban al vehículo, cotizador de repuestos (config append-only, tramos, cajas,
líneas importado/local, aceptar), catálogos.

**Terminado cuando:** confirmar un turno toma 2 toques en viewport móvil y la tasa de contacto se
actualiza; un visitante anónimo (test contra `web.solicitar_asesor`) recibe asesor, el mismo
asesor dentro del plazo pegajoso y respaldo cuando nadie está disponible; un repuesto en fase
«Recibido» cumple la espera del vehículo en «En taller».

## Fase 9 — Tablero, datos, PWA y pulido

Módulo `tablero` (métricas y gráficas por rol con widgets personalizables guardados en
`preferencias_usuario`, dataviz con los tokens), `datos` (exportar/importar de todo para el dueño
con `supabase/functions/importar-csv`), `actividad` (listado por día con diff), PWA (instalación,
push, `sw.js` mínimo), transiciones y esqueletos revisados pantalla por pantalla contra
`docs/UX.md`, auditoría de accesibilidad AA, e2e completo de las cuatro tareas de oro en móvil y
escritorio, `splinter` en verde, despliegue en Vercel con `supabase db push --dry-run` revisado.

**Terminado cuando:** las cuatro tareas de oro cumplen su meta en e2e móvil y escritorio, el
tablero del dueño muestra conversión de leads, cola web y margen del mes con datos reales,
splinter y los advisors están en cero errores, y la app está desplegada apuntando al proyecto Pro.

---

## Fuera de alcance

- Multiidioma. Offline real. Editor de artes (Konva). Directorio de contactos/empresas.
- API de WhatsApp/Meta. Multi-empresa por despliegue.
- La web pública en sí (repo aparte con `sitio-marketing` sobre el esquema `web`).

Si algo de esta lista se vuelve necesario, se discute y se agrega al plan explícitamente. No se
cuela dentro de otra fase.
