# web

Lo que el CRM configura para la web pública y el portal del cliente: ajustes del sitio, guías, FAQs, testimonios con consentimiento, cola web round-robin («turnos»), vistas y RPC del esquema `web`, revalidación on-demand.

## Entra y sale

- Entra: Configuración › Sitio web, editor de guías (Tiptap saneado), «Contacté» desde la campana, disponibilidad desde el perfil; desde afuera, el repo del sitio llama `web.solicitar_asesor`, `web.portal_login`, `web.portal_snapshot`.
- Sale: `estadoColaWeb()`, `confirmarContacto(ref)`, `<TarjetaTurno>`. Lo consumen `tablero`, `notificaciones`, `leads` (vincular turno a lead).
- Depende de: `vehiculos`, `leads`, `equipo`.

## Archivos clave

- `entities/cola.ts` — reglas de la rueda (orden, cupo, pegajoso, prioridad) documentadas y testeadas como espejo de `web.solicitar_asesor` (la base decide).
- `infra/revalidar.ts` — trigger → POST a `WEB_PUBLICA_REVALIDAR_URL` con secreto de Vault; `app/api/portal/*` firma la cookie del portal.
- `features/sitio/`, `features/guias/`, `features/faqs/`, `features/testimonios/`, `features/cola/`.

## Tablas

`ajustes_web`, `web_categorias_guias`, `web_guias`, `web_faqs`, `web_testimonios`, `cola_web_asesores`, `solicitudes_contacto_web`, `eventos_web`. Vistas `web.vehiculos`, `web.asesores`, `web.guias`, `web.faqs`, `web.testimonios`, `web.ajustes`; `public.estado_cola_web`.
RPC: `web.solicitar_asesor`, `web.registrar_evento`, `web.portal_login/snapshot/documento_ruta/cambiar_clave`, `web_confirmar_contacto`, `web_expirar_solicitudes` (cron 5 min), `cola_web_configurar`.

## No se rompe

- El `WHERE` de cada vista `web.*` **es** la frontera de seguridad (security_invoker = false, grant a `anon`): nunca exponer costos, teléfono, VIN completo ni rutas de storage. Las RPC del portal sólo a `service_role`.
- La rueda avanza al asignar; el asesor que no confirma en `ajustes_web.ttl_contacto_minutos` pierde el turno y se reasigna a quien no estuvo en la cadena. `unassigned` es la métrica que más importa.
- Guías, FAQs y testimonios nacen despublicados; un testimonio exige consentimiento registrado.
- `eventos_web` no guarda IP ni user agent: sólo el token anónimo; purga a 12 meses.

## Ojo

- El sitio es otro repo (`sitio-marketing`) sobre el mismo Supabase; cambiar una columna de `web.*` rompe su tipado a propósito: avisar en `docs/DECISIONES.md`.
- Un asesor entra a la rueda sólo con perfil público, WhatsApp cargado, activo, no bloqueado y disponible (`perfil_cola_web`).
