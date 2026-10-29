# web

Lo que el CRM configura para la web pública y el portal del cliente: ajustes del sitio, guías, FAQs, testimonios con consentimiento, cola web round-robin («turnos»), vistas y RPC del esquema `web`, revalidación on-demand.

## Entra y sale

- Entra: Configuración › Sitio web, editor de guías (Tiptap saneado), «Contacté» desde la campana, disponibilidad desde el perfil; desde afuera, el repo del sitio llama `web.solicitar_asesor`, `web.portal_login`, `web.portal_snapshot`.
- Sale: `leerDireccionPublica()` (`ajustes_web.direccion_publica`, nula si nadie la configuró: la compone la página del lead para el texto de WhatsApp del portal; la columna no tiene pantalla hasta Configuración › Sitio web). Pendiente: `estadoColaWeb()`, `confirmarContacto(ref)`, `<TarjetaTurno>`. Lo consumirán `tablero`, `notificaciones`, `leads` (vincular turno a lead).
- Depende de: `vehiculos`, `leads`, `equipo`.

## Archivos clave

- Existe: `entities/repositorios.ts`, `entities/rueda.ts` (`puedeEstarEnLaRueda`, los dos textos), `features/rueda/components/estado-en-la-rueda.tsx` (la sección «Turnos de la web» de `/perfil`, por `pantallas/perfil.ts`), `infra/queries/sitio.ts` (`getDireccionPublica`), `composicion.ts`. Lo demás llega con la Fase 8.
- `entities/cola.ts` — **todavía no existe** (Fase 8): reglas de la rueda (orden, cupo, pegajoso, prioridad) documentadas y testeadas como espejo de `web.solicitar_asesor` (la base decide). Lo que sí existe es `entities/rueda.ts`, el espejo de «¿el rol recibe turnos?».
- `infra/revalidar.ts` — trigger → POST a `WEB_PUBLICA_REVALIDAR_URL` con secreto de Vault; `app/api/portal/*` firma la cookie del portal.
- `features/sitio/`, `features/guias/`, `features/faqs/`, `features/testimonios/`, `features/cola/`.

## Tablas

`ajustes_web`, `web_categorias_guias`, `web_guias`, `web_faqs`, `web_testimonios`, `cola_web_asesores`, `solicitudes_contacto_web`, `eventos_web`. Vistas `web.vehiculos`, `web.asesores`, `web.guias`, `web.faqs`, `web.testimonios`, `web.ajustes`; `public.estado_cola_web`.
RPC: `puede_estar_en_la_rueda(uuid)`, `web.solicitar_asesor`, `web.registrar_evento`, `web.portal_login/snapshot/documento_ruta/cambiar_clave`, `web_confirmar_contacto`, `web_expirar_solicitudes`, `cola_web_configurar`.

## No se rompe

- El `WHERE` y la lista de columnas de cada vista `web.*` **son** la frontera de seguridad (security_invoker = false, grant a `anon`): nunca exponer costos, teléfono, VIN ni rutas de un bucket privado. Las rutas que sí salen (`imagen`, `miniatura`, `logo_ruta`, avatares, portadas) son de buckets públicos. Las RPC del portal sólo a `service_role`.
- `web.vehiculos` no define nada: es `interno.vitrina_vehiculos where visible` (en la base, `supabase/migrations/20261028180656_base.sql`). Esa vista interna es la única definición de «qué es público de un vehículo», y de ella sale también la vista previa del CRM (`vehiculo_vitrina_previa()`). Columnas: `id, numero, origen, origen_nombre, titulo, marca, modelo, anio, categoria, precio, precio_hasta, precio_nota, destacado, atributos` (sólo los campos `publico_web` activos del layout), `imagen` y `miniatura` (la portada), `actualizado_en`. Una columna más es una columna a la vista de cualquiera: va con su razón en `docs/DECISIONES.md`.
- Un vehículo se ve si está publicado (`vehiculo_vitrina()`, que vive en `vehiculos`), no está en la papelera, su fase está activa y publica, su origen está activo y en `ajustes_web.origenes_visibles`, y la integración `web_publica` está activa.
- La rueda avanza al asignar; el asesor que no confirma en `ajustes_web.ttl_contacto_minutos` pierde el turno y se reasigna a quien no estuvo en la cadena. `unassigned` es la métrica que más importa.
- Guías, FAQs y testimonios nacen despublicados; un testimonio exige consentimiento registrado.
- `eventos_web` no guarda IP ni user agent: sólo el token anónimo; purga a 12 meses.

## Ojo

- El sitio es otro repo (`sitio-marketing`) sobre el mismo Supabase; cambiar una columna de `web.*` rompe su tipado a propósito: avisar en `docs/DECISIONES.md`.
- El esquema `interno` no se expone en PostgREST y ningún rol de la app tiene `usage`: ahí vive lo que comparten la web y el CRM. Nada de `interno` se lee desde la app si no es por una función `definer` o una vista de `web`.
- `web_expirar_solicitudes` está escrita para correr cada 5 minutos, pero su job no está programado todavía (se programa con este módulo, Fase 8).
- **El contrato del portal** (firmas de `web.portal_*`, la cookie con `otorgado_en`, el límite por IP, las respuestas idénticas del login, lo que el cliente nunca ve) está en `docs/DECISIONES.md` («Contrato del portal para la Fase 8», 2026-10-15). Las cuatro reciben el `otorgado_en` que devolvió el login y no entregan nada si el acceso cambió; `portal_documento_ruta` devuelve una ruta privada: el handler la firma o la sirve, nunca la manda al navegador.
- **Quién está en la rueda** = `habilitado` (decisión sobre la persona, de `cola_web_configurar`) **y** `web.cola.participar` por alguno de sus roles (decisión del rol, en la matriz de Roles), con la cuenta activa y sin bloqueo, WhatsApp cargado y, para recibir un turno nuevo, `disponible`. La regla del rol y de la cuenta es **una sola función**, `puede_estar_en_la_rueda(uuid)`, y la consultan la rueda (5), el pegajoso (4), la reasignación al vencer, el turno ya abierto (3: si quien lo tiene no puede, el reloj no se reinicia y vence a su hora) y `estado_cola_web`. Se evalúa **al repartir**: quitar el permiso saca a la persona al instante sin tocar `habilitado`, y devolverlo la reincorpora. Un turno ya asignado sigue hasta su cierre (`web_confirmar_contacto` no mira el permiso). Quien no lo tiene conserva todo su `leads.*`. El contacto directo por handle (`es_directa`) no es la rueda: lo gobierna `publico_web`. Una función nueva que reparta a alguien **debe** llamar `puede_estar_en_la_rueda` (lo comprueba `supabase/tests/rueda-por-rol.sql`).
- **`web.solicitar_asesor` responde lo que escribió** (8-2): con un turno abierto, el paso 3 reinicia `vence_en` con `returning * into s` y `expira_en` sale de esa fila, no de la leída antes; una rama que reinicie un reloj lo hace igual, y `rueda-por-rol.sql` exige `expira_en` = `vence_en` de la tabla.
