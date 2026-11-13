# web

Lo que el CRM configura para la web pública y el portal del cliente: ajustes del sitio, guías, FAQs, testimonios con consentimiento, cola web round-robin («turnos»), vistas y RPC del esquema `web`, revalidación on-demand.

Abiertos que la tocan: la IP real tras la reescritura del sitio, **8-05a** (vincular una solicitud ya contactada) y **8-14a** (los turnos de Inicio con
sólo `web.cola.participar`), en `docs/PENDIENTES.md`.

## Entra y sale

- Entra: Configuración › Sitio web, editor de guías y legales (un documento de ProseMirror con lista blanca: el HTML lo deriva la base, nunca se guarda HTML escrito), «Contacté» desde la campana, disponibilidad desde el perfil; desde afuera, el repo del sitio llama `web.solicitar_asesor`, `web.portal_login`, `web.portal_snapshot`.
- Sale: `leerDireccionPublica()` (`ajustes_web.direccion_publica`, nula si nadie la configuró; la usa el WhatsApp del portal en la página del lead).
  `areas/sitio/index.ts`: `leerAjustesDelSitio()`, `leerVehiculosQueDejanDeVerse(orígenes)`, `AjustesDelSitio`. `areas/portal/index.ts` (para
  `app/api/portal/*`): `ipDelPedido()`, `mismoOrigenDelPortal()`, `portalDisponible()`, `firmarSesionDelPortal()`, `leerSesionDelPortal()`,
  `contarIntentoDelPortal()`, `ingresarAlPortal()`, `leerEstadoDelPortal()`, `urlDeDocumentoDelPortal()`, `cambiarClaveDelPortal()`,
  `direccionDelSitioParaElPortal()`, `COOKIE_DEL_PORTAL`, `DURACION_DE_LA_SESION_S`, `opcionesDeLaCookieDelPortal()`, `SesionDelPortal`.
  `areas/turnos/index.ts`: `leerMisTurnos({ tope })`, `confirmarContacto`; `areas/turnos/client.ts`: `<TarjetaTurno>`, `<ActualizarAlVolver>`,
  `confirmarContacto` y las claves de URL del panel (los usan el bloque de Inicio de `tablero` y la campana).
- Depende de: `vehiculos`, `leads`, `equipo`.

## Archivos clave

- **Áreas**: `sitio`, `contenido`, `cola`, `turnos`, `portal` y el `nucleo`, en `features|entities|infra/<área>/`, `areas/<área>/{index,client,composicion}.ts`
  y `pantallas/<área>.ts`; las entradas de la raíz sólo hacen `export *` de cada área. Lo nuevo va en su área; **un área no importa otra y el núcleo no
  importa ningún área** (lo vigila `scripts/guardas/areas-b/areas-de-web.test.ts`). Una pantalla cuyo nombre no dice su área (`perfil` → `turnos`,
  `sitio-legales|guias|faqs|testimonios` → `contenido`) va en `PANTALLAS_DE_AREA` de la guarda.
- **Pestañas de Configuración › Sitio web**: un hueco por pestaña en `pantallas/sitio-{ajustes,legales,guias,faqs,testimonios}.ts` (`PESTANA_DE_<X>`, tipo
  `HuecoDePestana<Props>`, que admite `null`: una pestaña nula no se dibuja y, sin ninguna, «Sitio web» no figura en el hub). El cuerpo se registra en
  `src/app/(app)/configuracion/web/seccion-abierta.tsx`.
- `turnos`: `infra/turnos/mis-turnos.ts` lee `limit 6` **filtrado por `usuario_id` a mano** (la RLS deja ver todas a quien gestiona la cola); el título sale
  de `web.vehiculos` (un vehículo que dejó de ser público va sin título). «Contacté» va en un toque sin «Deshacer»; «Vincular a lead» por
  `?panel=vincular-turno&turno=`, montado en `src/app/(app)/_inicio/vincular-turno.tsx` con el panel de `leads`. En `/perfil` (`pantallas/perfil.ts`):
  `cambiarDisponibilidad` escribe sólo `cola_web_asesores.disponible` de la fila propia (apagado con `motivoSinInterruptor`); `guardarFicha` escribe
  directo bajo la RLS seis columnas de `perfiles` con `actualizado_en` como versión; `entities/turnos/ficha.ts` (`esWhatsapp`, `esHandle`) espeja el
  check de la base.
- `contenido`: `entities/contenido/doc.ts` (+ `doc-nodos.ts`): `htmlDelDocumento()`, espejo de `_web_doc_html()` (la lista blanca del documento y su
  HTML); `doc.casos.ts` corre contra los dos en `doc.test.ts` (PGlite). Imagen = `{ruta, alt}` relativa al bucket `web`: sale `<img data-ruta alt>` y el
  sitio arma la URL. `documento-limpio.ts` reduce lo de Tiptap a esa lista (la frontera sigue siendo la base). **El editor** es propio del área
  (`features/contenido/editor/`, `EditorDeDocumento`, diferido; no importa el de `leads`; los legales lo usan con `imagenes={false}`): la imagen sólo va en
  el primer nivel y sólo lee `img[data-ruta]`.
- `contenido` › guías: `/configuracion/web/guias/[id]` (`pantallas/guia.ts`, `web.contenido.gestionar`; publicar, programar y despublicar piden además
  `web.guias.publicar`, que la action comprueba antes). `infra/contenido/guias-escritura.ts`: `update … where actualizado_en = <esperado>` (cero filas =
  conflicto o «ya no existe»), nunca manda `cuerpo_html` ni `minutos_lectura`. Al guardar o eliminar se quitan del bucket `web` las imágenes y la portada
  que ya no están (`quitarSiHuerfano`); una subida nunca guardada queda huérfana (deuda aceptada). Categorías: panel `?panel=categorias` de «Guías»;
  legales: `?seccion=legales` (`web.ajustes.gestionar`, `guardarLegales`).
- `contenido` › FAQs y testimonios: lecturas con tope 100 + 1; actions con `web.contenido.gestionar`. La foto de un testimonio
  (`foto-de-testimonio.client.ts`) va a WebP, sube por hash al bucket `web` y se limpia con `quitarSiHuerfano`.
- `cola`: `/configuracion/cola-web` (`pantallas/cola.ts`). `entities/cola/orden-de-la-rueda.ts` (`ordenDeLaRueda`) es **espejo documentado** del paso 5
  de `web.solicitar_asesor`, con test: la base decide, esto sólo dibuja. La política se lee en `infra/cola/` porque un área no importa `sitio`. «Agregar a
  la rueda» (`?panel=agregar-a-la-rueda&q=`; la búsqueda la lee `src/app` con `leerEquipo` sólo con el panel abierto y si quien mira ve el equipo) y
  «Quitar» con «Deshacer» van por `cola_web_configurar`, que acepta todo `smallint` en prioridad y orden (los rangos angostos son del formulario).
- `portal`: `infra/portal/{cookie,secreto,rpc}.ts`, `entities/portal/{sesion,ip}.ts`; rutas `app/api/portal/{ingresar,estado,documentos/[id],clave,salir}`
  (con `_comun.ts`; las recorre `e2e/portal-api.spec.ts`).
- Revalidar lo hace la base (cola `interno.web_revalidar_pendiente`, triggers `web_revalidar`, job `web-revalidar`); sin `infra/revalidar.ts` ni variables
  de entorno. Dirección (`integraciones.config.revalidar_url`) y secreto (Vault `integracion:web_publica`) se cargan en Configuración › Empresa ›
  Integraciones › Web pública (módulo `empresa`, que también hace «Probar»).
- **Contrato con el sitio** (revalidar): `POST <revalidar_url>` con `Content-Type: application/json` y `Authorization: Bearer <secreto>`; cuerpo
  `{"etiquetas": [...]}` con `guias|faqs|testimonios|ajustes|asesores|vehiculos`, ordenadas y sin repetir; `{"etiquetas": []}` es «Probar». El receptor
  compara el secreto en tiempo constante y responde 2xx. A lo sumo un pedido por minuto y sólo a `https://`; sin reintentos; apagar la integración no avisa.

## Tablas

`ajustes_web`, `web_categorias_guias`, `web_guias`, `web_faqs`, `web_testimonios`, `cola_web_asesores`, `solicitudes_contacto_web`, `eventos_web`; `interno.portal_intentos` (el límite por IP del portal: huella con sal, sin la IP). Vistas `web.vehiculos`, `web.asesores`, `web.guias`, `web.faqs`, `web.testimonios`, `web.ajustes`; `public.estado_cola_web`.
RPC: `web_ajustes_guardar`, `web_testimonio_consentir`, `web_testimonio_retirar`, `puede_estar_en_la_rueda(uuid)`, `web.solicitar_asesor`, `web.registrar_evento`, `web.portal_login/snapshot/documento_ruta/cambiar_clave`, `web.portal_intento(ip)` y `web.portal_direccion_publica()` (sólo `service_role`), `portal_intentos_purgar` (job `portal-intentos-purgar`, cada 5 min), `web_confirmar_contacto` (sólo escribe `lead_id` en `asignada`/`vencida`), `web_expirar_solicitudes` (job `web-expirar-solicitudes`, cada 5 min, 200 por corrida; desde la app sólo `service_role`), `cola_web_configurar`, `cola_web_tablero` y `cola_web_solicitudes(estado, cursor)` (las dos con `web.cola.gestionar`, `{filas, hay_mas}`; el tablero trae **todas** las habilitadas con `en_la_rueda` y `cuenta_activa` aparte, sin el WhatsApp; las solicitudes por `solicitudes_contacto_web_estado_creado_idx`, título desde `web.vehiculos`, sin token, UTM ni lead).

## No se rompe

- El `WHERE` y la lista de columnas de cada vista `web.*` **son** la frontera de seguridad (security_invoker = false, grant a `anon`): nunca exponer costos,
  teléfono, VIN ni rutas de un bucket privado. Las rutas que sí salen (`imagen`, `miniatura`, `logo_ruta`, avatares, portadas) son de buckets públicos. Las
  RPC del portal sólo a `service_role`.
- `web.vehiculos` es `interno.vitrina_vehiculos where visible`: esa vista interna es la única definición de «qué es público de un vehículo», y de ella sale
  también la vista previa del CRM (`vehiculo_vitrina_previa()`). Columnas: `id, numero, origen, origen_nombre, titulo, marca, modelo, anio, categoria,
precio, precio_hasta, precio_nota, destacado, atributos` (sólo los campos `publico_web` activos del layout), `imagen` y `miniatura` (la portada),
  `actualizado_en`. Una columna más es una columna a la vista de cualquiera: va con su razón en `docs/DECISIONES.md`.
- Un vehículo se ve si está publicado (`vehiculo_vitrina()`, de `vehiculos`), no está en la papelera, su fase está activa y publica, su origen está activo
  y en `ajustes_web.origenes_visibles`, y la integración `web_publica` está activa.
- La rueda avanza al asignar; quien no confirma en `ajustes_web.ttl_contacto_minutos` pierde el turno y se reasigna a quien no estuvo en la cadena.
  `unassigned` es la métrica que más importa.
- Guías, FAQs y testimonios nacen despublicados. Un testimonio exige consentimiento: `consent_*` sólo lo escriben `web_testimonio_consentir` y
  `web_testimonio_retirar` (con versión; retirar despublica), y `trg_web_testimonio_consentimiento` rechaza publicar sin el trío (22023 hint `publicado`).
  Cambiar `cliente`, `texto` o `foto_ruta` de uno consentido anula el consentimiento y lo despublica; cambiar `ciudad` o `vehiculo` apaga su permiso. La
  interfaz avisa antes y no manda `publicado` en ese caso (lo apaga el trigger). Sin orden manual ni trigger de limpieza de la foto.
- **Los ajustes de la web se escriben sólo por `web_ajustes_guardar(versión, cambios)`** (`authenticated` no tiene `update` sobre `ajustes_web`): claves
  ausentes no cambian; las del sitio piden `web.ajustes.gestionar`, las de la política de la cola (`cola_activa`, `ttl_contacto_minutos`, `dias_pegajoso`,
  `max_abiertas_default`, `max_intentos`) `web.cola.gestionar` o `web.ajustes.gestionar`; `PT409`; errores 22023 con la clave en `hint`. `legales` =
  `{terminos|privacidad: {titulo, doc, html, actualizado_en}}`: `trg_web_ajustes_legales` rehace `html` y `actualizado_en`, escriba quien escriba.
- Cada formulario manda sólo sus claves y comparten la versión de la fila (guardar en otra pestaña da conflicto y «Recargar»): **la política de la cola**,
  siempre sus cinco y ninguna del sitio (`cambiosDePolitica`: con sólo `web.cola.gestionar`, una clave del sitio daría 42501); **los legales**, sólo
  `legales`, con los documentos que tienen texto; **«Ajustes»**, sólo las del sitio y todas las que edita, conservando un origen visible inactivo
  (`origenesAGuardar`). En «Ajustes», el `PT409` va con `<AvisoDeConflicto>` y «Recargar» borra el borrador (sólo textos; la versión es la `key`); el aviso
  de un origen apagado cuenta de `web.vehiculos` (`limit 51`: con la web apagada no avisa); el formulario viaja diferido porque el hub importa el hueco.
- «Agregar a la rueda» relee `puede_estar_en_la_rueda` tras `cola_web_configurar` para avisar «Quedó habilitada, pero su rol no recibe turnos de la web.»
- El **orden de las categorías** reescribe `orden` 0..n−1 con un `upsert` sin versión (la última gana); borrar una categoría con guías lo impide la action,
  no la base (`on delete set null`).
- **El HTML de una guía lo deriva la base**: el editor escribe `web_guias.cuerpo_doc` y `trg_web_guia_cuerpo` pone `cuerpo_html` y `minutos_lectura` con
  `_web_doc_html()` y `_web_doc_minutos()` (lo que llegue en `cuerpo_html` se pisa; publicar recalcula). Una guía sin documento conserva su HTML
  despublicada. Las imágenes del cuerpo cuentan en `storage_refcount('web', …)`.
- **FAQs y testimonios se escriben directo bajo la RLS con la versión esperada** (`.eq('actualizado_en', …)`; 0 filas = relee y dice conflicto, ya no
  existe o sin permiso), salvo `consent_*`. La respuesta de una FAQ es texto plano (el sitio la escapa) y la categoría, texto libre; mover renumera 0…n−1
  en el servidor (no atómico).
- `eventos_web` no guarda IP ni user agent: sólo el token anónimo; purga a 12 meses.
- **El límite por IP del portal no guarda la IP**: `web.portal_intento(p_ip)` la guarda como huella HMAC-SHA256 con la sal `portal:sal` de Vault, que
  nunca sale de la base; 10 intentos por ventana fija de 15 min (cuenta todo intento, también los buenos), el 11.º da `false`. Lo prueba
  `supabase/tests/areas/portal/limite-por-ip.sql`. La IP es la primera de `x-forwarded-for` (`ipDelPedido`): **supone Vercel** o un proxy que pise la
  cabecera; con otro alojamiento el cliente la elige y el límite se salta.

## Ojo

- El sitio es otro repo (`sitio-marketing`) sobre el mismo Supabase; cambiar una columna de `web.*` rompe su tipado a propósito: avisar en `docs/DECISIONES.md`.
- El esquema `interno` no se expone en PostgREST y ningún rol de la app tiene `usage`: ahí vive lo que comparten la web y el CRM. Nada de `interno` se lee
  desde la app si no es por una función `definer` o una vista de `web`.
- **El contrato del portal** (firmas de `web.portal_*`, la cookie con `otorgado_en`, las respuestas idénticas del login, lo que el cliente nunca ve) está
  en `docs/DECISIONES.md`. Las cuatro reciben el `otorgado_en` del login y no entregan nada si el acceso cambió; `portal_documento_ruta` devuelve una ruta
  privada: `urlDeDocumentoDelPortal` la firma por 60 s y la ruta nunca va en un cuerpo ni en un error (sí dentro de la URL firmada).
- **`infra/portal/rpc.ts` es el único archivo del portal con el cliente admin** (lo cuida el lint): sólo `web.portal_*` y la URL firmada de `documentos`;
  un admin nuevo por llamada. El secreto de la cookie lo ata `areas/portal/composicion.ts` y no sale del área.
- **El contrato HTTP del portal**: el sitio reescribe `/api/portal/*` hacia el CRM (cookie de primera parte); los POST exigen el `Origin` del CRM o el de
  `ajustes_web.direccion_publica`; todo fallo de `ingresar` da el mismo 401, el 11.º intento 429 con `Retry-After: 900`; una sesión que no vale, 401 y la
  cookie borrada; sin `PORTAL_COOKIE_SECRETO`, 503. Cada handler llama `connection()` antes que nada (si no, con `cacheComponents` un GET se
  prerenderizaría con el 503 del build).
- **La cookie lleva `otorgado_en` como texto**, tal cual lo dio `portal_login`: nunca por `Date` (perdería los microsegundos y `_portal_vigente` compara por
  igualdad). La firma se compara como texto base64url. La IP del límite se agrupa en `contarIntentoDelPortal` (IPv6 a su /64).
- **Quién está en la rueda** = `habilitado` (sobre la persona, de `cola_web_configurar`) **y** `web.cola.participar` por alguno de sus roles, con la cuenta
  activa y sin bloqueo, WhatsApp cargado y, para un turno nuevo, `disponible`. La regla del rol y de la cuenta es **una sola función**,
  `puede_estar_en_la_rueda(uuid)`: la consultan la rueda (5), el pegajoso (4), la reasignación al vencer, el turno ya abierto (3: si quien lo tiene no
  puede, el reloj no se reinicia y vence a su hora) y `estado_cola_web`. Se evalúa **al repartir**: quitar el permiso saca a la persona al instante sin
  tocar `habilitado`. Un turno ya asignado sigue hasta su cierre (`web_confirmar_contacto` no mira el permiso). El contacto directo por handle
  (`es_directa`) no es la rueda: lo gobierna `publico_web`. Una función nueva que reparta a alguien **debe** llamar `puede_estar_en_la_rueda` (lo comprueba
  `supabase/tests/rueda-por-rol.sql`).
- **`web.solicitar_asesor` responde lo que escribió**: con un turno abierto, el paso 3 reinicia `vence_en` con `returning * into s` y `expira_en` sale de
  esa fila, no de la leída antes; una rama que reinicie un reloj lo hace igual (`rueda-por-rol.sql` exige `expira_en` = `vence_en` de la tabla).
- **La ficha de la web comparte versión con «Tus datos»** (`perfiles.actualizado_en`): `/perfil` pone esa versión de `key` a `<FormularioPerfil>` y al
  formulario de la ficha, o el segundo guardado daría conflicto. `handle` va a minúsculas y pide 3 a 30 de `a-z0-9._-` (la base sólo pide unicidad; 23505 →
  «Ese identificador ya está en uso.»); `publico_web` sin WhatsApp lo rechaza el formulario, no la base. Con «Ver como» el interruptor y la ficha quedan de
  sólo lectura: escribirían en la cuenta real.
