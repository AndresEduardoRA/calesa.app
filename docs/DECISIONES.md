# Decisiones

Las decisiones de diseño **vigentes**, agrupadas por área: lo que una sesión podría deshacer o volver a discutir si no lo supiera. No es
un registro: cuando una decisión cambia, se edita o se quita su viñeta (la historia está en git; la anterior a 2026-11-13, en la
etiqueta `fases-0-9`). Lo que es regla de construcción está en `.claude/rules/*`; el contrato de cada módulo, en su `CLAUDE.md`;
las trampas, en `docs/LECCIONES.md`.

**Una decisión nueva** va en su área, en una viñeta: `- **Título corto.** Qué se eligió y por qué (y qué se descartó, si evita reabrirlo).`

## Stack y arquitectura

- **Lo descartado del arranque.** TS 7, Biome, husky y Serwist se descartaron a propósito; boundaries va con la sintaxis v7 (`policies`, elementos como carpetas): la legacy muere en la v8.
- **Sin paquetes nuevos para lo que se resuelve con lo que hay.** Gráficas en HTML y SVG propio, la cookie del portal con `node:crypto`, el barrido AA por CDP (sin `@axe-core/playwright`). Sumar una dependencia lo decide la persona.
- **Fuera a propósito.** Editor de artes (Konva) y directorio de contactos: navieras es un catálogo plano y los proveedores son texto en gastos.
- **Componer desde `src/app` por ranuras.** Un módulo no importa otro para dibujar algo ajeno: la página pasa un `ReactNode` o datos serializables (el historial en la barra del vehículo, el lector de opciones de cotizaciones).
- **El motor de campos es de `shared`.** `shared/lib/campos` (puro) y `shared/ui/campos`; en SQL, `_campo_*` sin leer tablas. Cada módulo conserva su política; `shared` no sabe qué es un lead. Íconos: catálogo cerrado en `shared/lib/iconos.ts`.
- **Una action desde una pantalla a medio tipear no revalida ni refresca.** En Next 16, `revalidatePath`/`revalidateTag`/`updateTag`/`refresh` redibujan la página que llama y la `key` remonta la hoja o el editor (el ⚙, crear cotización, comentarios, la hoja de ítems de repuestos). Excepción a «revalidar tras mutar».
- **Una regla que vive en SQL y en TS se prueba como espejo.** Los mismos casos corren en Vitest y en `db:probar` (fórmula del cotizador y de repuestos, `shared/lib/campos/rango.ts`, `portal-mensaje.ts`, `normalizar_telefono`); decide la base. Cambiar un lado exige cambiar el otro.
- **Las funciones edge (Deno) no importan de `src/`: llevan una copia exacta.** `importar-csv` con `leer.ts` y `plantillas.ts`; una guarda exige copias idénticas y la misma versión de `papaparse`.
- **Stack local por variables de entorno.** La CLI lee `SUPABASE_PROJECT_ID` y los puertos del entorno (`.env.carril`); no se genera un `config.toml` por worktree.

## Base de datos y permisos

- **Las migraciones son la única fuente.** Se descartó conservar `supabase/schemas/` como estado declarativo: dos fuentes, y el diff declarativo no lleva policies ni grants.
- **Catálogo de permisos fijo, roles libres.** `roles_permisos(rol, clave, origen_id NULL=todos, alcance propios|todos)`, unión sin herencia, dominancia y guardián diferido; `dueno` nunca pierde `equipo.*` y un permiso nuevo de `equipo` se le otorga en la misma migración.
- **`puede()` vive en `shared/lib/permisos.ts`.** Misma semántica que `tiene_permiso()`/`alcance_de()`; un test compara el catálogo con la base. Los niveles de cotización se reconocen por patrón (`esClaveDeNivel()`), no por lista.
- **Un solo orden de candados entre RPC.** Lead (`for no key update`) → vehículo (`for key share`) → cotización y sus vivas por id → hijas (la cotización antes que sus reportes, la raíz antes que la respuesta). Purgar y restaurar toman en el mismo orden; invertirlo da 40P01.
- **«No existe» y «no la ves» dan el mismo error.** Una lectura o escritura por id de algo que quien llama no puede ver responde igual que si no existiera (P0002, 42501 o PT409 según el área), para no filtrar que existe.
- **Escritura directa bajo RLS en tablas que no otorgan permisos.** FAQs, testimonios (salvo `consent_*`), guías, categorías, tramos, cajas, preferencias y catálogos de logística van sin RPC; con versión, `.eq('actualizado_en', esperado)` y 0 filas se relee: conflicto, «ya no existe» o sin permiso.
- **Sin versión, gana la última escritura.** Categorías, tramos, cajas, puertos, navieras y `cola_web_asesores` no tienen `actualizado_en`: decenas de filas que edita una persona a la vez. Ponerles versión es otra RPC; no se reabre sin un caso real.
- **Reordenar renumera 0…n−1 y escribe sólo las filas que cambian.** Con todas en 0 por defecto, intercambiar dos no ordenaría. No es atómico (aceptado); si la lista está cortada por el tope, mover se apaga con su motivo.
- **La base no guarda secretos para llamar afuera.** `storage-gc` y `push` se disparan desde la base con un pase de un uso; las claves viven en Vault o en la función.
- **RLS no esconde claves de un jsonb.** No hay marca «sensible» en campos: ocultar un dato exige columna más vista o RPC que recorte. Los costos van por logística bajo sus permisos.
- **Las funciones `sql` que se inlinean quedan sin `set search_path`**, con motivo (`_lead_visible_para`, `_motor_*`): un `SET` impide inlinear. `storage_refcount()` conserva `execute` para `authenticated` mientras `quitarSiHuerfano()` corra en el navegador.
- **Advisors en cero con una sola lista de motivos.** `supabase/tests/advisors-con-motivo.json`, la misma para PGlite y la base real; splinter con los schemas de `[api]` (si no, no ve `web`). Único ERROR admitido: `security_definer_view` de `web`. Las RPC de `anon` van fijadas por `md5(prosrc)`.
- **La semilla analiza.** `seed.sql` termina con `analyze` de `public` y `web`: sin estadísticas, la primera importación es lenta.

## Interfaz (transversal)

- **Una sola vista por lista, elegida en el servidor.** Cookie `ancho` (o user-agent), `anchoDeEstaPeticion()` y `useAlMenos(corte)`; cortes 640/768/1024.
- **Paginación por cursor sin «página N».** Arriba se dice «Los más recientes» o «Creados hasta el …» con «Volver al principio».
- **La navegación se declara entera.** `navegacion.ts` lista todas las pantallas; un test falla si `disponible` no coincide con la existencia de `page.tsx`.
- **El «⋯» con sprite SVG.** `<svg><use/></svg>` con `<SimbolosDeLista>` montado una vez en el layout: 3 nodos por botón.
- **Formularios que aparecen al pulsar algo son `ModalDeFormulario`.** Un envío a la vez, conflicto hasta la versión nueva, revisión al abrir; la guarda `modales-con-salida.ts` registra todo `<Modal>` que no lo es.
- **Vuelta del foco tras recargar y «atrás».** `abrirConVuelta()` deja la ficha en `history.state` (respaldo en `sessionStorage`) y `useVueltaDelFoco` la recuerda; desde un menú vuelve al «⋯». La guarda `paneles-con-vuelta` lo exige en todo `history: 'push'`.
- **Reintento sólo al volver la conexión.** `useReintentoAlVolver` reenvía en la transición sin red → con red; con red presente se ofrece «Reintentar»: no se martilla un servidor caído.
- **Al volver la red, la suscripción se remonta con `key`.** `useVueltaDeLaRed` (campana y chat): una barra «Sin conexión» que no se va tapa la pantalla. Se arregla en la app, no esperando en el spec.
- **Números tipeados.** Un solo lector `leerNumeroTipeado(texto, locale)` y escritores con `formatearParaEditar(n, { locale })`; el CSV es la excepción.
- **Un monto o una cifra desconocidos son nulos, nunca 0.** Se dicen con «Sin datos», «Sin venta registrada» o «Sin precio en N ítems»; una tasa nula nunca es «0 %». `<Monto moneda={null}>` dibuja el número sin inventar moneda.
- **Foco visible.** `--shadow-focus` = 2 px de `primario-ink` y `--ring` en `.dark` = `primario-ink` (el `-soft` daba 1,2:1). Los tokens se corrigen hacia la tinta en los dos temas, nunca hacia el fondo.
- **El `h1` de un listado es `sr-only` y va en el `page.tsx`, fuera del `<Suspense>`.** Está también cargando y sin permiso. Toda página lleva su `loading.tsx` con la forma de su `<Suspense>` (lo vigila `scripts/guardas`).
- **Barrido de accesibilidad por CDP con reglas propias.** Las rutas salen de `src/app/**/page.tsx` (el mapa no existe en CI). 44 px es regla del proyecto (AA pide 24); los blancos chicos de `shared/ui` viven en `BLANCOS_CONOCIDOS` con `max` por ruta.
- **Tonos de las papeleras.** «Enviar a la papelera» es `outline` (reversible); «Purgar» es `destructive` en las tres papeleras, siempre después de «Restaurar».
- **Visor de imágenes: uno solo, con su URL aparte (`?visor=`).** Así se abre sobre un drawer o un panel sin cerrarlos. En su lugar se ve la portada que ya trae la fila y el resto se pide recién al acercarse (puntero, foco o toque), una vez; la grande, sólo al abrir, la actual y sus vecinas. Donde el lugar mide menos de 160 px (la fila de la tabla, la tarjeta de hoy) no caben flechas de 44 px: la foto abre el visor directo. La barra de la hoja de cotizar sigue con la miniatura fija (su JS está en el tope).
- **Avisos con acciones: la base dice la causa con una clave, la UI la traduce.** El rechazo lleva la causa en `hint` (`_vehiculo_bloqueo()` → `{causa, motivo}`) y cada módulo la convierte en acciones en `entities/` (`resolverAcciones()`): de 1 a 3, **la que destraba primero** («Quitar el vínculo» antes que «Ver el lead»). Sin permiso para la que resuelve, el aviso dice «pídeselo a quien administra los roles» (no hay una persona a quien pedirle en todos los casos); la que sólo informa se oculta. En un lote no hay acciones: se listan los motivos. Tras «Quitar el vínculo» (`?luego=papelera`) el aviso **ofrece** la papelera, no la envía solo.
- **PWA.** `id: '/'` igual que `start_url` (cambiarlo reinstala la app a todos); sin aviso que invite a instalar; los atajos del manifest no se filtran por permiso (se pide sin sesión). Íconos, tarjeta y PDF salen del logo normal; el oscuro lo elige el CSS.

## Equipo

- **«Visto» en su tabla, no en `visitados`.** `visitados` es la lista corta del buscador (tope 50, cualquier módulo); `vistos` es por módulo y
  crece con lo que cada persona abre: PK `(usuario, módulo, tipo, id)`, escritura por RPC con antirrebote de 30 s en la base y un techo de
  20.000 filas por persona (el id no se valida contra su tabla), lectura de los ids de la página que se dibuja (una llamada) y purga cada hora
  por la retención de cada persona, en un orden que rota. Qué está
  visto lo pone `equipo` en un contexto de `@/shared/ui/lista`; la fila y la tarjeta lo leen con `idDeVisto`, sin pasar props por cada nivel.

- **El guardián cuenta la unión de roles.** Debe quedar una persona operativa (activa, sin bloqueo, invitación aceptada) cuyos roles sumen los permisos de administración.
- **Dominancia sobre la persona.** Bloquear, desbloquear, dar de baja y asignar/quitar roles exigen dominarla (`rol_dominado()`); el dueño (rol de clave `dueno`) domina a todos. Orden: `_dominancia_tomar()` → permiso → propia → perfil `for update` → dominancia (42501) → estado (PT409).
  `_dominancia_tomar()` es un candado de transacción común, el primero de toda RPC que comprueba la dominancia y de `nivel_crear` (suma
  permisos al rol `dueno`, que además toma `for no key update`): lo de quien llama puede cambiar mientras actúa (dos que se bloquean o se
  recortan los roles a la vez), y un candado por fila de quien llama y de lo que toca formaría ciclos (40P01). Dar de baja lo toma
  compartido, para que dos bajas sigan corriendo a la vez, y entre bajas toma las dos cuentas por id (la propia `for share`).
- **Lo no dominado se dibuja apagado con motivo, nunca escondido.** `dominada` se lee con `personas_dominadas(p_ids)`, no dentro de `equipo_lista()`; si falla, las acciones se apagan (un error nunca habilita). Sobre la propia cuenta no se mira.
- **«Ver como» sólo dibuja.** Cookie `perspectiva`; `mi_sesion(p_perspectiva)` da `permisos_efectivos()` (míos ∩ del rol) sólo con `equipo.roles.gestionar`. RLS, RPC y `actionClient` siguen con los reales; lo que escribe en la cuenta real (`/perfil`) queda de sólo lectura.
- **`mi_sesion()`: la sesión en una ida.** RPC definer con cuenta, perfil, roles, concesiones y preferencias, envuelta en `cache()`. Un dato nuevo del shell sobre la persona se suma ahí.
- **La versión de un rol cubre sus concesiones.** `roles.actualizado_en` la reciben otorgar, revocar y eliminar (PT409); asignar/quitar rol es idempotente; bloquear y baja usan el estado de la cuenta como precondición.
- **Baja en dos tiempos.** `equipo_dar_de_baja` hace lo instantáneo y el primer lote; el job `equipo-bajas` sigue con `skip locked`. Mientras dura, `_bajas_en_curso()` hace que toda regla vea el estado final (lo vigila `humo.sql`).
- **La vista previa de una baja sólo cuenta.** `equipo_vista_previa_baja()` comparte `_leads_al_limbo_de()` con la baja; nadie confirma sin ver el número.
- **Invitación.** Un solo enlace vigente por persona; si el correo falla se muestra el enlace; «Copiar enlace» genera uno nuevo, invalida el anterior y exige dominar sus roles. Vence a las 24 h en la nube (1 h local).
- **Registro cerrado al cerrar la transacción.** `auth_registro_permitido()` es constraint trigger diferido (Auth pone `app_metadata` después del insert); `registroDisponible()` lo repite en TS.
- **Auth sin variables de la app.** `/auth/callback` acepta `code` (Google) y `token_hash` (correos); el botón de Google sale sólo si `/auth/v1/settings` dice que está encendido.
- **Los formularios de auth van con `method="post"`.** Enviados antes de hidratar iban por GET, con la contraseña en la URL.
- **`handle` en minúsculas, 3 a 30 de `a-z0-9._-`.** La base sólo pide unicidad; el formato lo da la app.

## Empresa

- **Empresa se escribe sólo por RPC.** `ajustes_empresa`, `monedas`, `tipos_cambio` e `integraciones` sin policies de escritura; cada edición es una RPC definer con permiso y versión. Monedas y tipos se desactivan, no se borran.
- **Lo que se ve sin sesión sale de `web.ajustes_acceso()`.** Nombre, logo, locale, moneda, registro abierto y `primer_registro`; lo que haga falta antes de ingresar se suma ahí.
- **Secretos de la interfaz en Vault.** `integracion_guardar_secreto()` con permiso e `integracion_secreto()` sólo para `service_role`; la app lee `secreto_guardado_en`. La dirección de apibara sólo puede ser de `apibara.tech`.
- **Color de marca con contraste.** Se rechaza el color sobre el que ni blanco ni tinta oscura llegan a 4,5:1; el mejor va a `--color-sobre-primario`. Entra por un `<style>`, no por `<html style>`.
- **Íconos y logo.** Íconos dibujados con Canvas en el navegador, subidos a `marca/iconos/<hash>.png` y servidos por el manifest (sin `sharp`). El logo no se comprime como foto: SVG sin código ≤ 200 KB; raster ≤ 1024 px o PNG sin pérdida; tope 1 MB.
- **Monedas y tipos de cambio.** Moneda base + N tipos de cambio nombrados con historial; la fórmula declara buckets → clave de TC y la cotización congela los TC usados. El modo Live oculta cifras y símbolos en toda la app.
- **Ajustes de cotización aparte.** Vigencia y vehículo obligatorio los cambia sólo `cotizaciones.configurar` concedida sin origen, por `empresa_guardar_ajustes_de_cotizacion` (dos permisos no se mezclan en una RPC); comparte versión con Empresa y revalida las dos pantallas.

## Orígenes

- **Comunes como columnas, el resto en `atributos`.** `vehiculos` tiene columnas para lo común y `atributos jsonb` validado por trigger; un campo que necesite índice o unicidad se promueve a columna por migración.
- **El tipo de un origen (subasta o manual) no cambia.** Lo impide un trigger; decide campos preconfigurados, regla `aduana` y `clave_apibara`. Uno equivocado y sin uso se elimina y se recrea.
- **Desactivar antes que eliminar.** Un origen con uso se desactiva; se elimina sólo sin vehículos (papelera incluida), cotizaciones ni fórmula publicada, tipeando el nombre. Un campo con datos se desactiva: no cambia de tipo ni se elimina.
- **Nombre, sustantivo y género son datos de la fila.** La concordancia sale de reglas puras (`pluralDe`, `contados`, `frasePorVacio`…); no hay columna de plural.
- **Orden por botones y movimiento relativo.** «Subir/Bajar» con la RPC recibiendo «después de X» (nulo = primero), renumerando 10, 20, 30 bajo candado; sin arrastrar (sin dnd-kit).
- **Sin `origenes.ver`.** Configuración › Orígenes la abre `origenes.gestionar`; `flujos.configurar` o `cotizaciones.configurar` la ven de sólo lectura. Sin enforcement no se crea permiso.
- **«De fábrica», no «de sistema».** Un campo preconfigurado (`es_sistema`) se edita, apaga y renombra pero no se elimina ni cambia de tipo; «Sistema» nombra al rol dueño.
- **Campo principal.** Marcar otro desmarca el anterior en la misma llamada; un campo `moneda` no puede ser principal. Acompaña al título en logística y lo reemplaza en fila, tarjeta y resumen; la página del vehículo, el PDF, la web, la hoja y la bandeja siguen con el título.
- **Orden de candados origen → campo (`for no key update`)** al guardar, crear y mover campos: sin 40P01 y sin frenar el `key share` de las FK.

## Vehículos

- **Se escriben sólo por RPC.** `vehiculo_crear(p_id…)` idempotente con id del navegador y `vehiculo_guardar` con versión; el alta entra a la fase inicial sólo si no hay nada que decidir (si no, «Sin fase»).
- **El alta dice desde dónde (`p_contexto`) y la base exige el permiso de ese contexto.** `vehiculos.crear` (alta suelta) y
  `vehiculos.crear.desde_cotizar` son dos claves por origen; `vehiculo_crear(…, p_contexto)` pide la que corresponde y la deja en
  `creado_desde`. Es un límite de flujo, no de seguridad dura: quien tiene la de cotizar crea vehículos marcados «cotizar» (queda en la columna y
  en la actividad). Se descartó crear el vehículo recién al guardar la cotización (`cotizacion_crear(p_vehiculo_nuevo)`, que también pasa
  `'cotizar'`): la hoja necesita el vehículo elegido antes. Sin la suelta pero con la de cotizar, «Nuevo» se ve apagado con «Cotizar un vehículo nuevo».
- **Un esquema Zod desde el layout.** `esquemaDeVehiculo(fuentes)` lo usan formulario y action. Tipo de campo nuevo = `ESQUEMA_POR_TIPO`, `CONTROL_DE_TIPO`, `LECTOR_POR_TIPO` y `FILTRO_POR_TIPO`.
- **VIN único global entre vivos.** La RPC responde con `hint = 'vin'`; el mensaje dice que existe, no de cuál vehículo.
- **Fotos.** Bucket público `vehiculos/<vehiculo_id>/<sha-256>`; dos tamaños hechos en el navegador (≤ 1600 y miniatura 480) sin optimizador; versión propia (`vehiculos_imagenes_version`), tope 24; duplicado por hash del original.
- **Storage de vehículos se limpia por cola.** La app no borra objetos de `vehiculos`; la limpieza reclama con candado y recuento y borra con ≥ 24 h; el barrido de huérfanos va por cursor por bucket.
- **Vitrina: una sola definición de lo público.** `interno.vitrina_vehiculos` calcula condiciones y `visible`; `web.vehiculos` y `vehiculo_vitrina_previa()` salen de ella. Publicar lleva versión y manda el estado entero; despublicar apaga el destacado.
- **Vitrina desde la lista: lo que «falta» es el precio público.** La base no exige nada para publicar (sin precio, la web dice «Consultar»); desde
  la fila, un toque publica lo que ya tiene precio o saca de la web, con «Deshacer»; sin precio, un panel chico (`?panel=vitrina-rapida&para=`)
  pide sólo eso, con «Publicar sin precio». El «hasta», la nota, el destacado y la vista previa siguen en el panel de la ficha.
- **Papelera.** Una sola lista de bloqueo (`_vehiculo_motivo_de_bloqueo`) para enviar y purgar; envío por lote con versión por vehículo y resultado parcial; restaurar vuelve sin publicar. Purga manual y automática son la misma función.
- **apibara: la llamada vive en la edge function y la hace el navegador.** La función guarda el bruto en `apibara_consultas` y el navegador manda una referencia (de quien llama, < 24 h). Ningún test llama a la API real.
- **La zona de una subasta sale del estado del patio, en el navegador.** apibara no da la zona de la subasta, pero sí el estado de la ubicación
  (`location.state` → `ubicacion_estado`); `zonaDelPatio()` lo traduce (estados de EE. UU., Canadá, Puerto Rico; uno con dos zonas, la de la
  mayoría) y la pantalla dice «hora del patio». Sin estado, sólo la zona de quien mira y la de la empresa: nunca una inventada.
  `vehiculos.subasta_zona` sigue sin uso. Las fechas de subasta se ven en la zona de quien mira (`/perfil`), con su abreviatura; lo demás,
  en la de la empresa.
- **Refrescar no pisa lo editado.** `fusionarRefresco(previo, nuevo, actual)` toma el valor nuevo sólo si lo guardado es lo que la API dijo antes; los campos de subasta siempre se actualizan.
- **Fotos de subasta en primer plano.** Sólo de `cs.copart.com`/`vis.iaai.com`, por la tubería del navegador; primeras 24 y «Traer las que faltan». Sin job en segundo plano (se reabre sólo con reportes de fotos perdidas).
- **Los textos dicen «subasta».** «apibara» aparece sólo donde se configura; el nombre de la plataforma sale del dato.
- **Limpieza automática en SQL.** La regla vive sólo en `_limpieza_*` y `limpieza_el(vehiculos)`; día local desde las 03:00, una vez por día, lotes ≤ 200 con `skip locked`. «Conservar» es marca aparte sin versión; aviso con 3 días; interruptor apagado lo borra todo.
- **`cotizado_en` no mueve la ficha.** La escribe sólo el trigger de `cotizaciones` y nunca retrocede; `trg_actualizado_en` y `trg_auditar_cambio` la excluyen para no dar PT409 a quien edita ni mover la vitrina.
- **«Cierre subasta» es columna generada.** `cierre_subasta_en`, porque PostgREST no ordena por expresión; descartados RPC invocadora e índice de expresión.
- **Inventario de «propios» por rutas.** `vehiculos_inventario()` plpgsql invocadora (origen / creado / cartera corta), filtros en SQL dinámico con valores por `using`; filtros rechazados (22023) van por la tabla.
- **Sin Zod para `p_filtros`.** Excepción a «Zod en todo límite»: las condiciones salen de un esquema ya validado y la base las valida; un contrato de tipos en `inventario.test.ts` ata cada `Condicion['tipo']` a su `when` en SQL.

## Leads

### Identidad y alta

- **Teléfono único global y enmascarado.** Índice único parcial entre vivos; `leads_vista` enmascara con `telefono_lead()` incluso al dueño. El código de país es de la empresa y no se adivina un «+».
- **Alta en una sola RPC.** `crear_lead(p_id, p_lead, p_seguimiento, p_recordatorio)` idempotente; existe/de_otro/limbo son valores. Tomar un lead del limbo exige `adoptar = true` y no pisa datos.
- **Dos números.** Propio (consecutivo del creador, nunca reutilizado) y global, sólo con `leads.numero_global.ver`; `#n` se resuelve con `leads_ids_del_numero()`. Nunca se busca por teléfono.
- **Teléfonos extra por función.** `leads_telefonos` sin grant, se lee por `lead_telefonos()`; hasta 10, sin verificar contra otros leads; el principal cambia con `cambiar_telefono_lead` y el anterior queda como «Anterior».
- **Tipos de lead con clase fija.** Clase «prospecto»/«cliente» inmutable; el sistema razona por la clase, nunca por nombre; siempre queda uno activo de cada clase.
- **Alta rápida.** Un solo `<Drawer>` montado cerrado que cambia de cuerpo; el primer seguimiento es opcional; Ctrl/Cmd+Enter avanza, Ctrl/Cmd+S guarda. `N` abre lo propio de la pantalla y cae a «Nuevo lead».

### Campos y visibilidad

- **Seis columnas pasaron a atributos.** Edad, ciudad, país, dirección, género y notas son campos de fábrica; `leads_vista` nace en `_leads_vista_crear()`. Tipos propios `correo` y `documento`; nacen «solo la cartera».
- **Privados recortados al leer.** `leads.atributos` sin grant; `atributos_lead()` da todo a la cartera, lo no privado a quien sólo ve y nada a quien no ve. La visibilidad se escribe una vez en `_lead_visible_para()` sobre copias derivadas por trigger.
- **«La de la empresa» es columna.** `leads_campos.valor_defecto_empresa` (ciudad o país), resuelto al leer el layout; «País» sigue al teléfono mientras esté vacío o puesto por el sistema.
- **El rango se valida sólo en lo que cambia.** Un valor igual al guardado no se rechaza por rango ni por opción retirada (`_atributos_rango`, `esquemaDeValor` con lo guardado); el impacto avisa cuántos quedan fuera, sin bloquear.
- **El impacto de un campo privado no lee valores ajenos.** `lead_campo_impacto` cuenta la presencia (con valor, sin valor) en todos los leads, porque frena cambiar el tipo o eliminar; fuera de rango y por opción de un campo `solo_cartera`, sólo en la cartera de quien llama, como `atributos_lead()`.
- **`leads.configurar` gobierna toda la configuración de leads.** Orígenes de lead, tipos y tipos de seguimiento por RPC con tope 100; el origen por defecto no se apaga ni elimina; el CSV nunca crea orígenes.

### Escritura y acceso

- **`lead_guardar` es la única puerta.** Atributos como parche (`{clave: null}` quita); inexistente, limbo, papelera y sin acceso dan el mismo 42501. `lead_version()` se mueve sólo por lo que la ficha edita.
- **Tres clases de RPC que reciben un lead.** 1 contenido (cartera + permiso, `puede_actuar_lead`), 2 quién lo tiene (dueño o «todos»), 3 papelera; `auditoria-leads.sql` falla si una no está clasificada. La clase 1 autoriza, bloquea el lead y vuelve a autorizar.
- **`lead_id` en otras tablas se valida por trigger.** `lead_visible_al_escribir` en pagos, tareas, eventos, mensajes, repuestos y testimonios.
- **Seguimientos.** Sólo por RPC idempotentes; privado = sólo su autor; público lo ven quien ve el lead y el portal. El detalle es JSON de ProseMirror validado contra lista blanca en la base, nunca HTML; la actividad registra sin contenido.
- **Recordatorios.** Crear exige la cartera; si se pierde el lead, sigue siendo de su dueño con lead nulo. `vehiculo_id` se valida sólo cuando cambia; si deja de verse, se conserva.
- **Marcas por persona.** Favorito, tachado y etiquetas son «poner(valor)» que exigen ver el lead (no la cartera); `leads_vista` las expone como columnas de quien mira. Tachados se ocultan salvo al buscar. Paleta de ocho claves en tokens.

### Listas, embudos y plantillas

- **Todo lead nuevo nace con su oportunidad base**, en la misma transacción (`_lead_crear` → `_lead_oportunidad_base`): etapa inicial del embudo por
  defecto de quien lo crea (que nace ahí si no existía), título = el nombre del lead. Un lead adoptado del limbo no es nuevo: no suma una. Deshacer
  una importación no cuenta la base intacta (abierta, con alta y versión a la misma hora) como trabajo; otra oportunidad, o la base tocada, sí.
  Basta `leads.crear`: la base es parte del alta, no una oportunidad que alguien abre (`oportunidad_crear` sigue pidiendo `leads.editar`).
  Consecuencia: la etapa inicial de un embudo no se quita mientras tenga bases abiertas (`embudo_guardar` ya frena quitar una etapa con
  oportunidades); se mueven primero.

- **«Míos» y búsqueda por candidatos.** «Propios» lee por `leads_cartera_vista`; «todos» por la cartera si es corta (`leads_cartera_corta()`, ≤ 5.000). Nombre desde 3 alfanuméricos seguidos; no se paga índice de n-gramas cortos.
- **Oportunidades y embudos.** Embudos personales (3–12 etapas, ≥ 1 ganada y ≥ 1 perdida) por RPC; una oportunidad sólo la ve su dueña con el lead en su cartera. Transferir lleva las abiertas al embudo del destino; la baja las cancela.
- **Kanban con tope.** 50 por columna con «Ver más», hasta 500; lo antiguo se busca con «Buscar en el embudo» (`p_buscar`).
- **Plantillas por empresa con dos versiones.** `embudo_actualizado_en` y `portal_actualizado_en`, secciones independientes. Null = la de fábrica; guardar el texto de fábrica tal cual envía null para que le llegue un cambio futuro.
- **El mensaje del portal rechaza toda `{…}` desconocida.** Una errata no sale literal al cliente; `{codigo}` y `{clave}` obligatorias. Decide `_portal_mensaje_normalizar`; TS es su espejo.
- **CSV.** Exportar fuerza la cartera, tope 5.000, 5 por hora. Importar se valida en el navegador con `validarAlta()` en lotes de 50; no adopta ni nombra a nadie. Deshacer: sólo lo intacto, 24 h, quien importó.

## Cotizaciones

### Estructura y reglas de base

- **Áreas y núcleo.** El módulo se parte en `areas/<área>/{index,client,composicion}.ts` más un núcleo que no importa áreas (guarda en `areas-de-cotizaciones.test.ts`); segundas pantallas en `pantallas/<área>-<pantalla>.ts`.
- **Reglas de base.** Vencida = `creado_en` + `vigencia_dias` por día en la zona de la empresa (sin estado); desactualizada al publicar una fórmula nueva; lead obligatorio; número global por empresa.
- **Lo que no se ve no viaja.** `cotizaciones` con grant por columna; `cotizacion_leer/revisiones/tabla/evaluar` recortan por nivel sin ser oráculo; un detector sobre `pg_proc` exige registrar toda función que devuelva contenido.
- **Niveles.** `cotizaciones.nivel.<clave>.ver|editar`, tope 10, sólo estrechan; recortan con `_nodos_visibles()`; ver restringido + editar abierto se rechaza. La fórmula sólo viaja a `cotizaciones.configurar`.
- **Crear y guardar sólo por RPC.** `cotizacion_crear` (única alta) y `cotizacion_guardar` (calcula con SU versión, conserva lo oculto, intento + huella). `_cotizacion_puede_guardar()` decide antes y después del candado; quien no ve recibe 42501 antes de todo.
- **Listado por rutas e invocador.** `cotizaciones_listado()` deja decidir a la RLS; «Mías» = `creado_por`; salen todas las versiones; `p_lead`/`p_vehiculo` filtran fuera del esquema de filtros. Máx. 100. Lead no visible = «—».

### La fórmula

- **Grafo versionado validado en SQL.** Lista de nodos con operaciones cerradas; `validar_formula()` y `evaluar_formula()` son espejo exacto de `validar.ts`/`evaluar()` con corpus de paridad; un borrador y una publicada por origen; snapshot por cotización. Se escribe como texto compilado al grafo.
- **`HOY()` no se admite** (lo decidió la persona): el compilador da `hoy_no_soportado`. Si una fórmula real lo pide, compila a un nodo `fecha_cotizacion` congelado con la cotización, con paridad TS/SQL.
- **Sin «Sugerido: X» junto a un valor modificado.** La celda muestra el override con anillo y ↺, que lo quita. Si se reabre, `evaluar()` y `evaluar_formula()` devuelven `sugeridos[id]` sólo de nodos con override.
- **Publicar sin pisar el borrador.** El ⚙ y revertir publican la N+1 desde la publicada (`_publicar_version()`, candado por origen); publicar un borrador atrasado da PT409 con quién publicó; revertir a un nivel retirado se rechaza.
- **Versión esperada del borrador.** `formula_guardar_borrador`, `_descartar_` y `_publicar` la llevan al final con `default null`, sin sobrecargas; en guardar, nula = crear. Guardar devuelve `{id, actualizado_en}` y el editor sigue sin releer.
- **Orden en las RPC del borrador.** Permiso, validación (fuera del candado, es lo caro), candado del origen, borrador `for update`, esperadas y escritura. Descartar lo puede cualquiera con `configurar` del origen (limpia el olvidado de quien se fue).
- **Qué edita el editor en texto.** Sólo cálculos y constantes; el id de una fila no cambia; un negativo no se escribe en el texto; tope 2.000 por fila en UTF-16. La vista previa usa «Cifras de prueba» que no se guardan. `key` = `<origen>:<vuelta>`.
- **Grupos en el editor.** No se suman ni se quitan (la plantilla nombra exactamente los de la fórmula); `buckets` y `total_en` no se editan; una auxiliar nunca suma a un grupo.
- **Lo tipeado se normaliza a 15 cifras**, como la XCell: «1,1 %» manda 0,011. Las comparaciones con lo guardado también van a 15 cifras.
- **El ⚙ espera la publicada que leyó el panel**, nunca la versión que dibuja la hoja; si difieren, el panel lo dice. Lo enciende un proveedor y lo decide la base; sin proveedor no se registra el panel.
- **El ⚙ de un tipo de cambio.** `formula_tipo_cambio_del_nodo()` (definer, pide `empresa.tipos_cambio.gestionar` y ver el nodo; todo rechazo da `null`); manda sólo `{id, actualizadoEnEsperado, valor}`.

### La hoja

- **La hoja abierta la firma la base.** `cotizacion_hoja()` devuelve `abierta` con HMAC (clave en Vault); crear, evaluar y la ayuda de tabla reciben `p_abierta` y calculan con esa versión. Firma también la huella de las tarifas de la apertura, no sus valores: `crear` la compara con las que reconstruye del historial, porque un `cambiado_en` anterior a la apertura puede confirmar después. Cotizar pide `crear` y `ver` del origen.
- **Cotizar encima.** La N+1 nace al tocar (`cotizacion_encima`), siempre preventa, con lo guardado de la última de la cadena; índice parcial `cotizaciones_encima_unica`. Quien no ve la N+1 sólo sabe que existe.
- **Revisiones con totales por clave.** El diff se compara después de recortar (`_cotizacion_diff_recortado()`); «Ir a una fecha» es `p_hasta` exclusivo en `cotizacion_revisiones()`, anclando y paginando por id.
- **«Ver total Bs» se guarda con la cotización.** `ver_total_bs` validado contra el diseño de esa versión; `moneda_bs` sale del TC de `total_en`; si es nula no hay interruptor. El modo de TC es parte de las entradas.
- **La ayuda de tabla.** Si la celda es de dinero, cada cifra pasa por `<Monto>`; sólo columnas declaradas; tope 1.000 filas. `dato_del_vehiculo` (columna ← campo de texto) guarda en el vehículo por `vehiculo_guardar` y recarga.
- **Paneles de la hoja.** Vehículo y cliente leen desde el navegador y escriben su URL con `nuqs` + `replace`; elegir cliente conserva lo tipeado (borrador por persona, origen y vehículo); «Nuevo lead» es el del shell con `?elegir=`.

### Diseño, plantilla y tarjeta

- **Una auxiliar `<fila>__<n>` no pide celda.** La regla vive en `compilador-auxiliares.ts` con espejo `_diseno_auxiliares()`; una fila constante propia sí pide celda.
- **Tope de 40 ítems por diseño.** El borrador lo admite; publicar, el ⚙ y revertir lo rechazan (`_diseno_maximo_de_items()`). Como la cobertura obliga a dibujar inputs y banderas, una fórmula con más de 40 tampoco se publica.
- **«Se deduce restando» es sólo un aviso** sobre sumas directas; la autoridad es la visibilidad que compila la base al publicar.
- **La plantilla lee la fórmula con lo que mira `validarPlantilla()`** (`looseObject`, `lectura-sobre.ts`), no con `esquemaDefinicion`: no se rompe con cada cambio de la fórmula. Guardar valida la forma; lo que cruza con la fórmula lo rechaza publicar.
- **Con qué nace el editor de plantilla:** el borrador; si no hay, copia de la publicada; si no, la omisión. Una versión ilegible no se edita a medias. El PT409 no dice quién (la tabla no lo guarda).
- **Tarjeta declarativa, sin hex.** Tonos del catálogo y nodos por id: con hex nadie valida el contraste y un texto libre podría nombrar cualquier nodo. Sin subtotales por grupo: serían dinero calculado fuera de la base.
- **La tarjeta lee la moneda de SU versión y la plantilla publicada de hoy.** `cotizaciones.moneda_mostrar` y `cotizaciones.plantilla_id` quedan sin uso y se quitan juntas (4-45): no volver a darles uso.
- **PDF en servidor.** `@react-pdf/renderer` desde la plantilla versionada; la tarjeta en pantalla usa el mismo modelo de vista. Sin imágenes de cotización generadas en el cliente.

### Tablas de referencia

- **Qué orígenes afecta publicar una tabla.** Los que la usan en un nodo o en la copia de `params.tablas`, aunque estén inactivos; una compartida pide `configurar` en cada uno. Editar una tabla publica la N+1; las filas inactivas se borran.
- **Publicar una fórmula no congela las tablas.** Una versión anterior que leía la viva recalcula con las filas nuevas; lo guardado de una cotización no cambia.
- **Una celda sin tocar no se reaplica.** Sólo si el texto difiere del mostrado, para no redondear al pasar con Tab; nunca se publica un número distinto del escrito.

### Final, comprobantes y comentarios

- **Final.** Crear o marcar toman lead → vehículo → cotizaciones; crear una final sobre otra activa da 23505 (no la reemplaza); una `reportada` o `invalida` no ocupa el lugar. Marcar no lleva versión esperada (aceptado).
- **El orden de los rechazos no delata.** Primero la cartera, después ver el vehículo y recién la ayudante: si no, un 23505 o 23514 diría si hay final, vínculo o preventas.
- **Qué congela un comprobante.** El recorte del nivel «todos», la cotización, el origen, la razón social y el NIT; del cliente y del vehículo sólo los ids. Emitir pide la versión. Una cotización con comprobante, anulado o no, no va a la papelera.
- **Reportar no mueve la versión.** «Descartar los reportes» modera a `activa`; las marcas de reporte se leen en el servidor (tras `<Suspense>`, con `cache()`). Tope de 20 adjuntos sin candado (pueden quedar 21; aceptado).
- **Adjuntos sin miniaturas.** La URL firmada se pide al hacer clic (60 s), nunca al leer la lista.

### Papelera

- **Papelera con permiso propio.** `cotizaciones.papelera.purgar`, global, aparte de la de vehículos; la policy de lotes tiene una rama por tipo sin `else` (un tipo nuevo no hereda claves).
- **Enviar mira ver antes de tomar la fila y otra vez después.** Quien no la ve recibe lo mismo que con una inexistente y nunca espera el candado.
- **Una cotización de la papelera frena la purga de lo que nombra.** Su lead, y su vehículo si está en otro lote (las del lote del vehículo se purgan
  con él): el `set null` cambiaría algo que todavía se restaura. A una viva, purgar su lead la deja sin cliente.
- **Quién restaura.** Quien envió el lote lo restaura entero aunque ya no vea alguna; los demás necesitan `purgar`. Restaurar es todo o nada; purgar no. Las genéricas `papelera_enviar|restaurar|purgar` siguen vivas sobre los mismos ayudantes.

## Flujos

- **Un solo motor de flujos.** Uno por origen + uno de repuestos, con fases, transiciones y requisitos; tablas hijas con dos FK nullable (`vehiculo_id` | `repuesto_id`) + CHECK y una única RPC `cambiar_fase`. Un origen nuevo es una fila y su flujo nace por trigger.
- **Versión por flujo, no por fila.** Toda RPC de configuración pasa por `_flujo_para_editar()`/`_flujo_tocar()`; dos personas en el mismo flujo chocan con PT409 (aceptable en pantalla de dueño). Renombrar un origen también la mueve: no se exceptúa.
- **Inexistente = PT409 «Recarga», no 42501**, mirado antes del permiso cuando el id no revela nada; el permiso se mira antes del candado: quien no puede no espera ni hace esperar.
- **Lo que la pantalla anuncia es lo que eliminar hace.** `fase_impacto` y `fase_eliminar` comparten `_fase_uso()`; las de impacto no toman candado ni devuelven versión; tope fijo 50 leyendo 51.
- **Mostrar de más es reversible; esconder, no.** Las paradas cuentan unidades en la papelera y las fases jubiladas cuentan como uso de una regla.
- **Mover sin cambio también mueve la versión** (`fase_mover`, `flujo_regla_cambiar`, `flujo_oferta_guardar`): una regla sola.
- **Un requisito nace informativo.** `bloqueante` o `espera_ambito` en `requisito_crear` dan 22023; `formatos: []` se rechaza (nunca se cumpliría), nulo = todos. Al editar se revalida sólo el grupo cuyo campo cambió.
- **`flujo_fuera_de_regla` es muestra, sólo para quien configura.** ≤ 1.000 unidades por fase y `revisadas` lo dice. No se ensancha a `logistica.ver`: lo de una unidad lo da `logistica_unidad`.
- **Reglas.** Encender una fuera del catálogo del ámbito da 22023; apagarla se permite siempre. La action pregunta el impacto antes de escribir (`en_uso`); los nombres humanos viven en TS, la base da mensajes genéricos.
- **La oferta de transporte es de `flujos`, sin PK** (unicidad por parciales; el INFO `no_primary_key` es esperado). Exige «transporte» encendida al guardar; apagarla no la borra.
- **«Revisar» avisa y nunca frena.** Quien no configura recibe cero filas, no 42501; una invitación sin aceptar cuenta como persona activa.
- **Crear fase no es idempotente por id** (repetir da 23505): la interfaz usa un id por apertura y relee antes de reintentar. Una transición sí toma «ya existe» como hecho.
- **Transiciones.** No cambian origen ni destino (cambiar el destino es eliminar y crear); poner roles no exige dominancia (no otorga nada); lista vacía hereda la de la fase destino.
- **`flujos.activo` no se edita ni se quita**: nadie lo lee ni lo escribe.
- **Un ítem «Perdido» no frena al vehículo**: la regla vive en `_repuesto_ante_espera`.
- **Tipos de documento.** `proposito` no se edita; una combinación inválida de vencimiento se rechaza, no se limpia; apagar `visible_portal_permitido` no oculta lo ya marcado; un tipo de flujo activo no repite el nombre de un global activo.

## Logística

### La cadena y la unidad

- **La cadena no ordena ni pliega columnas.** El orden es el de la base; «Sin fase» la pone la base (primera, sólo con tarjetas); cursor sólo por `id`.
- **Tarjeta sin foto, `<principal> · <título>`, armada en el servidor** (atributos por PK en tandas ≤ 100, bajo la RLS); «Ver más» es una Server Action de lectura para armarla igual.
- **Las lecturas de la cadena son `security definer`.** Las policies de `transportes`/`documentos` preguntan por fila; la definer resuelve el alcance una vez por origen (el menor de `logistica.ver` y `vehiculos.ver`).
- **Inexistente, en papelera o sin acceso: un solo texto y 42501 hint `acceso`.** El nombre de quien movió (PT409) sólo llega a quien pasó el acceso; sin acceso a la cadena, 42501, no cadena vacía.
- **Mover.** `cambiar_fase` toma la unidad `for no key update`; la esperada nula vale sólo para unidad sin fase. El lote no mezcla fases y mueve «los N que pueden»; sin actualización optimista.
- **«Qué falta» sin realtime.** Se relee al volver el foco (≥ 5 s) y con `logistica:unidad-cambio`; destinos desde `fases_transiciones`, tope 12. Un fallo al leer el flujo apaga sólo los huecos con regla.
- **Notas sin «Borrar».** Corregir sólo la propia, sin cambio de fase y sin versión (gana la última).
- **El ítem de repuesto entra al motor como `UnidadAbierta`**, sin volver nulo `Unidad.origenId`: el camino del vehículo no cambia.
- **«Trabado» = demorada a la que le falta un bloqueante para su fase siguiente**; se evalúan las primeras 50 demoradas visibles. Los jobs de alertas no toman candado: hacer esperar a quien mueve es peor.

### Documentos

- **Un objeto y N filas con la misma ruta** (hasta 100 unidades); ids `md5(p_id || ':' || unidad)::uuid` para reintento idempotente; eliminar es suave y no se deshace; el refcount cuenta filas vivas.
- **`visible_portal` lo marca sólo quien aprueba**, que puede aprobar lo propio (sin cuatro ojos). Mime y bytes salen de `storage.objects.metadata`, no del cliente.
- **Una foto de cámara es documento y no se comprime.** El tipo se elige antes que los archivos; uno por vez, cortando ante un fallo que se repetiría.

### Gastos y pagos

- **El tipo de cambio lo elige quien carga** y la base guarda valor e id; moneda→base multiplica, base→moneda divide; en moneda base un tipo es 22023. El equivalente lo calcula siempre la base.
- **Una confirmación de pago no se deshace: se anula** (`pago_anular`, motivo 1–500). Sello e inmutabilidad en triggers (ni `service_role` edita un confirmado). La «venta» del margen = suma de pagos confirmados.
- **Más de dos decimales es error**, mirado antes de asignar (`numeric(18,2)` redondea en silencio). Gasto ≥ 0, pago > 0; prorrateo en partes iguales, 1–200 vehículos; la suma exacta es la del monto.
- **Un comprobante se lee por la fila que lo nombra**, no por la carpeta: con la carpeta, quien ve pagos bajaría comprobantes de gastos.
- **Un pago se registra sin lead**: `trg_lead_visible` rechazaría al asesor sin acceso; el margen no depende del lead.
- **Listas de gastos y pagos sin sumas ni «Anterior».** La fila abre el panel de la unidad: las acciones, en un solo lugar.
- **Aduana y pagos no son por origen.** `logistica.aduana.gestionar` y `logistica.pagos.confirmar` quedan globales (cambiaría el catálogo y la matriz de Roles); las RPC acotan lo que se lee.

### Transporte, catálogos y aduana

- **Catálogos sin eliminar.** Puertos y navieras se desactivan; orden = número en «Editar», no flechas (serían dos escrituras sin transacción). Un inactivo guardado en una oferta se muestra «(inactivo)».
- **Contenedor y booking en mayúsculas sin espacios** (`A-Z 0-9 . / -`, ≤ 40), sin dígito de control ISO 6346. ETA/arribo ≥ zarpe.
- **Un grupo de transporte: ≤ 200 filas, todo o nada, permiso antes que versión.** Leer pide `logistica.ver`/`repuestos.ver` en algún origen (si no, se sondearían bookings); un campo «Varios» no se vacía.
- **El cursor de `transporte_grupos` es el id de una fila de `transportes`**, no la clave (con la clave se recorrían grupos no visibles); ≤ 2.000 filas por llamada con `cortada`.
- **Aduana.** El canal congela la composición (por cualquier camino); un vehículo vivo en otra declaración da 23514; agregar pide la regla `aduana`, quitar no. `pagada` es de todos los vivos; `faltan`, sólo de los vistos.

## Repuestos

- **Sin INSERT directo de proyectos**: quien tenía `repuestos.editar` creaba uno de un vehículo que no ve. La lista no trae lead ni teléfono; busca por etiqueta, VIN y cliente.
- **Un proyecto sólo se elimina vacío** (borrado suave con «Deshacer»); cerrado no recibe ítems. «Borrar sólo sin uso» de catálogos es un trigger `before delete`.
- **Stock: cantidad siempre positiva, el sentido sale del motivo** (`sobrante` entra; `vendido`, `devuelto`, `ajuste` salen; `reasignado` sólo por reasignar), validado en la RPC. «Vender suelto» no registra precio.
- **Una sola unidad en stock saca el ítem de la espera** (`en_stock_desde`); lo que entra por `sobrante` tiene tope.
- **La hoja de ítems guarda por celda con una cola por fila** (`colaPorClave`) y sin revalidar; sólo cantidad y precio son `XCell`.
- **Imágenes del ítem: tope 8 en la base con candado por ítem**, sin UPDATE; proyecto cerrado e ítem eliminado frenan el INSERT.
- **Nulo no es 0 en dinero.** Margen y total son nulos si a un ítem le falta precio o moneda; un total que no cabe en `numeric(18,2)` es error de la línea, no un recorte.
- **Pagos de proyecto por la RPC gemela `pago_registrar_proyecto`**, sin tocar la firma de `pago_registrar`; el lead queda nulo (también al corregirlo).
- **Un pago de proyecto se anula con el mismo `pago_anular`** y la clave de confirmar; como cualquier pago vivo cumple `proyecto.pago_cliente`, no se anula ni
  se elimina (`pago_eliminar`) el último mientras un ítem vivo (también en stock) esté en una fase que lo pide. Como confirmar, no mira si el proyecto está cerrado.
- **La cotización de repuestos se numera con `identity`, con huecos** (no es comprobante). Aceptar copia el unitario a `precio_cliente`; anular no lo revierte.

## Agenda

- **Tarea: el creador edita, elimina y reasigna; el responsable sólo completa y reabre.** Una tarea nacida en una conversación sólo va a sus miembros (`tareas.conversacion_id`, fija).
- **Publicar también para despublicar y eliminar.** `agenda.eventos.publicar` si el evento era o queda público/«seleccionados»; destinatarios sólo con «seleccionados». «Destinatario», nunca «invitado».
- **`p_datos`: clave presente = cambio, ausente = no toca, nulo = quita**; desconocida, 22023. Orden: `assert_activo()` → fila `for update` → permiso (42501) → `sin_cambios` → versión (PT409) → cambio.
- **Lecturas de invocador.** «Mi agenda» es filtro sobre la RLS; cada cosa entra por su fecha en `[desde, hasta)`, tope 200 por clase, rango ≤ 45 días; semana desde el lunes; días en la zona de la empresa.
- **Fechas.** Una tarea puede quedar «Sin fecha»; un evento puede empezar en el pasado; una tarea no vence en el pasado.

## Chat

- **La regla del canal global vive en `es_miembro()`.** La dueña no lee conversaciones donde no es miembro. Una directa no se deja, se silencia; el grupo lo administra quien lo creó (2 a 50).
- **Lista y no leídos son `security definer`** que repiten la regla de `es_miembro` una vez: bajo RLS, contar pagaba la regla por mensaje. Si la regla cambia, cambia en los tres lugares.
- **`chat_leer` recibe hasta dónde se leyó y enviar no mueve la lectura propia**: con `clock_timestamp()` se marcaría leído un mensaje ajeno de otra transacción con hora anterior.
- **Editar: 15 min con versión; borrar: autor o `chat.moderar`, sin versión**, vacía el cuerpo y conserva la ficha. Fichas de vehículo, lead o cotización pueden quedar sin referencia; tarea y evento no.
- **Mensaje con tarea o evento: primero la RPC de agenda y luego la del chat, en una transacción**; id del mensaje del navegador, el de la tarea del servidor, candado consultivo por id.
- **Envío optimista, de a uno y en orden.** Reintentar reusa id y cuerpo; la cita se lee en otra consulta por pk (el embed `mensajes→mensajes` da 400).
- **«Purgado» y «no lo veo» no se distinguen en una mención**: distinguirlo filtraría existencia.
- **El widget guarda su estado en local, no en la URL** (abrirlo no cambia la pantalla de atrás). En el celular la burbuja es un enlace a `/chat`; va `fixed` sobre el marco, con `z-40`.
- **`/chat?con=` se resuelve en el render con `chat_directa`**, no con una action: un enlace plano sirve con «atrás» y sin JS extra.

## Notificaciones

- **Las preferencias no apagan la campana.** La campana es el registro; las preferencias gobiernan sólo el push.
- **Abrir un aviso lo acciona sólo en `tarea_asignada`, `recordatorio` y `demora_fase`**; los demás, por su acción propia.
- **Ningún aviso nombra al lead** (puede llamarse como su teléfono, viaja por Realtime y queda tras perder el acceso): se abre por la `ruta`.
- **Repetir un aviso borra el abierto anterior y deja uno nuevo** (si no, el antispam se lo traga). Un destinatario sin perfil se descarta: avisar nunca hace fallar la operación.
- **«Ya avisado» de la limpieza es tabla propia** (`limpieza_avisos`): una columna en `vehiculos` movería `actualizado_en`; un `exists` sobre `notificaciones` se pierde al purgar.
- **El cuerpo no lleva fechas formateadas en SQL**; un mes en texto sale de un arreglo fijo, no de `lc_time`.
- **Push con un pase de un uso (10 min) atado a la notificación.** La privada VAPID vive sólo en la función `push`, que canjea el pase antes de mirar las claves; Next no firma nada. Tope 10 suscripciones por persona.
- **Web Crypto propio (RFC 8291/8292), no `web-push`** (no admite `fetch` inyectado). Sólo 404/410 caducan una suscripción; `redirect: 'manual'`.
- **El endpoint se valida dos veces** (`_push_endpoint_valido()` y la lista de hosts en la función): sólo `https`, sin puertos de servicio; la duplicación es a propósito, contra el proxy abierto.
- **Correo sin reintentos ni idempotencia**, tope 10 s; el error nunca lleva la clave ni el texto libre del proveedor. El archivo de Resend es `resend-rest.ts`: la regla `NINGUN_SDK_DE_CORREO` rechaza una ruta llamada `resend`.

## Actividad

- **Sólo las definer escriben y leen el detalle.** `registrar_actividad()` sin `execute` para `public`, `anon` ni `authenticated` (se podían inventar `antes`/`despues`); `actividad.detalle` sin `select` para la app (lleva teléfonos, el código del portal y montos).

## Web y portal

### Sitio público

- **La web pública es otro repo sobre el mismo Supabase.** Lee sólo el esquema `web`; ampliar `web.vehiculos` es deliberado, columna por columna, y `atributos` trae sólo campos `publico_web` activos.
- **Revalidación sin variables de entorno.** URL en `integraciones.config.revalidar_url`, secreto en Vault; cola + job por minuto con triggers por sentencia, sin índice único ni `on conflict` (serializaba escrituras de vehículos).
- **El job sólo envía a `https://`.** «Probar» acepta loopback sólo si la base del despliegue es loopback; la app rechaza IP internas literales. No se ataja lo que resuelve el DNS.
- **El HTML del sitio lo deriva la base** (`_web_doc_html()` sobre ProseMirror con lista blanca; fuera de ella 22023, no se recorta). `minutos_lectura` sólo en la base.
- **El `slug` sale del título al crear y después no lo sigue**: renombrar algo publicado no mueve su URL.
- **Publicar una guía pone `publicada_en = ahora − 60 s`**: el reloj de Next no es el de la base. «Programar» pide al menos un minuto adelante.
- **Categoría con guías no se borra** (la FK es `set null`, no falla sola): la action lo rechaza y la lista apaga «Eliminar» con motivo.
- **El consentimiento de un testimonio está atado al texto**: cambiar cliente, texto o foto lo anula y despublica; ciudad o vehículo apagan sólo su permiso.
- **La rueda por rol.** Entra quien está `habilitado` (nace en false), tiene `web.cola.participar` y cuenta activa (`puede_estar_en_la_rueda()`); prioridad ponderada y `max_intentos`.

### Portal del cliente

- **Acceso por RPC con `otorgado_en` como versión.** La clave la genera la base, bcrypt, nunca en claro ni en argumentos (`logging.serverFunctions: false`). Nunca costos, VIN completo ni privados.
- **Cookie HMAC de `node:crypto`, sesión de 7 días cortada por `otorgado_en`** (viaja como texto con microsegundos: un `Date` lo redondea). `salir` no revoca en la base: el corte es revocar u otorgar de nuevo.
- **Todo fallo de `ingresar` da el mismo 401** (error de base, cuerpo > 2 KB): sin oráculo. Límite por HMAC(ip, sal de Vault), 5 fallos = 15 min; `documentos/[id]` mira la cookie antes que el id.
- **El límite por IP supone Vercel.** `ipDelPedido` toma la primera de `x-forwarded-for` o `x-real-ip`; otro alojamiento cambia `ipDelPedido`.

## Buscador

- **Las tres secciones son RPC** (el mínimo vive en el servidor). `buscador_leads` devuelve ids y se hidrata con `leads_vista_por_ids`; `buscador_cotizaciones` no devuelve `lead_id`, `vehiculo_id` ni `creado_por`.
- **«Mis propias» con consultas estáticas**, no `execute … using` (planificada con el texto iba a Seq Scan); con > 1.000 coincidencias de título se toman 1.000 cualesquiera.
- **Un texto que parece teléfono no busca leads**; `#n` busca leads y cotizaciones, no vehículos.

## Tablero

- **Inicio sigue siendo la bandeja.** Los widgets personalizables viven sólo en `/tablero`; widgets en Inicio, exportar una gráfica y comparar períodos quedaron fuera.
- **Bloques de Inicio en el servidor**, cada uno tras su `<Suspense>`; 5 por bloque leyendo 6; un error apaga sólo su bloque. «Recordatorios de hoy» incluye los vencidos; «Sin seguimiento» = mi cartera, creado hace > 24 h.
- **La conversión cuenta por la clase del tipo de lead** y por `cliente_desde`, que sólo pone el paso de prospecto a cliente (un alta como cliente no infla la tasa); `conversion_desde` cubre a los clientes de antes. La tasa puede pasar de 1.
- **Ranking por dueño vigente**: sin dueño o en baja cuenta en el total y no en el ranking.
- **El margen del mes cuenta cada vehículo en el mes de su último pago confirmado vivo.** Un mes pasado cambia si se confirma o anula un pago: no se presenta como cerrado.
- **Gráficas en HTML y SVG propio.** Texto en HTML, el SVG sólo pinta barras (`preserveAspectRatio="none"`), tokens `--viz-*`; leyenda en texto y «Ver como tabla» en `<details>`.
- **Widgets por permiso, no por rol**, cada uno con su error. La preferencia guarda `orden` con las ocultas; una clave que ya no existe se ignora y un widget nuevo cae al final.

## Datos

- **Exportar lee con un token fijo** (`getSession()` verificado con `getClaims(token)`): refrescar tras responder rotaría el refresh token. Única excepción a «nunca `getSession()`».
- **Exportar: primero la constancia, después las filas.** `datos_exportacion_registrar` con conteo previo al mismo corte; el stream corta con error, nunca entrega un CSV que parezca entero. Un fallo gasta el cupo. Delimitador `;`.
- **Exportar lee de la tabla bajo la RLS**, no de las RPC de listado (cortan en 100): una pasada por PostgREST, sin definer nueva.
- **La importación total crea cada lead con la identidad del destino**: misma regla de duplicados y limbo que a mano. Idempotencia por `md5(importación:fila)::uuid` y `procesadas` bajo `for update`.
- **`service_role` actúa a nombre de quien importa con claims locales**, repuestos en cada salida; vuelve a mirar los permisos en cada lote (si se pierden, la importación queda `fallida`).
- **El navegador convierte y sube un CSV normalizado**; `importar-csv` sólo valida forma, trabaja ≤ 45 s sin `waitUntil` y el job retoma a los 2 min.

## Pruebas, CI y despliegue

- **Sin segunda pila local para el e2e completo.** La salida son los bloques del CI (cada uno con su pila); se reabre sólo con tiempos medidos (`docs/DESPLIEGUE.md`).
- **Sesión reusada por cuenta.** `entrarConSesion` inyecta cookies (30 min); quien cambia la persona o su acceso pide `{ fresco: true }`.
- **Cuentas en paralelo.** La dueña primero y las demás a la vez; se borran todas menos ella a la vez y ella al final (la base rechaza una asesora sola en empresa vacía).
- **Tareas de oro con KLM.** Se mide lo pulsado (tope de teclas de control), un reloj del robot generoso y KLM (0,28 s/tecla, 1,35 s/decisión) contra la meta.
- **Una medición que siembra lo suyo vacía su tabla dentro de su transacción revertida**: convive con `db:sembrar-volumen`; si la base trae filas ajenas, se niega.
- **`db:medir` y `db:medir:volumen` fuera del CI** (guarda `FUERA_DE_CI`): un runner de 2 vCPU los vuelve inestables. Entrar pide runner dedicado y 5 corridas con cada tiempo a ≤ 10 % de su mediana.
- **`db:carreras` entra al job `base` tras 5 corridas verdes seguidas** por `workflow_dispatch`, sin reintentos (un rojo vuelve la cuenta a 0). Hasta entonces, sólo el job `carreras` con `carreras: true` (9-6).
- **`deno check` fuera del CI.** Las funciones Deno siguen fuera de lint y typecheck: meterlas pide una dependencia nueva.
- **Volver atrás nunca deshace una migración en la nube**: se escribe una migración que la revierta, con el respaldo como último recurso (no guarda Storage). `restaurar.sh` y `resetear.sh` son sólo de la demo.
- **Un cliente se instala desde un clon aparte** con `SUPABASE_PROJECT_REF` obligatoria (`--linked` actúa sobre `supabase/.temp/project-ref`); Auth por el panel; el dueño es la primera cuenta por `/registro`, antes de compartir la URL.
