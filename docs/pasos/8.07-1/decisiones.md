# 8.07-1: decisiones (2026-11-12)

- **D1 · `node:crypto`, no `jose`.** La cookie del portal (8.07-2) se firma con HMAC-SHA256 de `node:crypto`: firma lo mismo sin dependencia nueva.
- **D2 · El sitio reescribe `/api/portal/*` hacia el CRM.** Así la cookie queda de primera parte y alcanza `SameSite=Lax`. Va como contrato en el 8.07-3.
- **D3 · Sesión de 7 días.** Revocar o volver a otorgar la cortan antes, por `otorgado_en`.
- **D4 · `portal_intento` recibe la IP y calcula la huella adentro** con `HMAC-SHA256(ip, portal:sal)`, en vez de recibir una huella hecha
  (`p_huella`, como decía la fila). La sal nunca sale de Vault y no hace falta otra RPC para leerla. Es HMAC y no `digest` porque una sal como clave es la
  forma correcta de un hash con secreto (un sha256 sin clave de una IPv4 se adivina recorriendo 2^32 direcciones) y porque PGlite sólo trae el HMAC real.
  El assert «otra huella no» se prueba como «otra IP no» (L2).
- **D5 · Ventana fija de 15 minutos por huella, que cuenta todo intento.** El límite va antes del login, cuando todavía no se sabe si falla.
  `Retry-After: 900` fijo, el máximo: no hace falta otra lectura ni le dice a nadie cuánto falta. Reversible: la función puede devolver los segundos.
- **D6 · Qué IP llega detrás de la reescritura: pendiente de medir (no es contrato todavía).** Vercel reescribe el `x-forwarded-for` que llega de
  afuera: detrás de la reescritura del sitio todos los clientes podrían llegar con la IP de salida del sitio y, como se cuenta todo intento, el portal
  entero quedaría en 10 ingresos cada 15 minutos. Si nada pisa la cabecera, tomar su primera entrada deja saltarse el límite. La base de esta parte no
  depende de eso: `portal_intento(p_ip)` sirve igual. El 8.07-3 mide qué IP llega a través de la reescritura y elige entre una cabecera propia que el
  sitio firme con un secreto compartido, o limitar también por código cuando la IP no es de fiar (`docs/PLAN.md` › «La IP real tras la reescritura»).
  Mientras, la base sigue bloqueando por código (5 fallos, 15 minutos).
- **D7 · El `Origin` del sitio se lee con `web.portal_direccion_publica()`** (sólo `service_role`), que entra en «el admin sólo para `web.portal_*`».
  `direccion_publica` no se suma a la vista `web.ajustes`: cambiaría el tipado del sitio, que es otro repo.
- **D8 · La purga corre cada 5 minutos, de a 10.000**, sobre las ventanas vencidas, por el índice de `ventana_desde`.
- **D9 · Sin script en `scripts/carreras/`.** El contador es un solo `insert … on conflict do update` por la clave primaria: dos pedidos a la vez de la
  misma IP se serializan en esa fila y ninguno se pierde. No hay candado de aplicación ni numeración.
- **D10 · `otorgado_en` viaja en la cookie como el texto de la base**, con microsegundos. Un `Date` de JS lo redondearía a milisegundos y
  `_portal_vigente` (igualdad exacta) dejaría de reconocer la sesión.
- **D11 · Un cuerpo inválido en `ingresar` responde el mismo 401 que un login fallido.** Sólo el 429 (límite) y el 503 (sin secreto) se distinguen, a
  propósito.
- **El contrato del portal.** `docs/PLAN.md` pide leer `docs/archivo` (`rg -n 'Contrato del portal' docs/archivo`): esta sesión lo intentó y el permiso
  lo negó (también al auditor). El contrato vigente es `docs/DECISIONES.md` › «Contrato del portal para la Fase 8» (2026-10-15): no fija nombre de cookie,
  duración ni forma del límite; pide la cookie firmada con `lead_id` y `otorgado_en`, el login que responde igual a cualquier fallo y que nunca se vean
  costos, VIN completo ni privados. No contradice la fila.
- **Compuerta `datos`** (`security definer` y Vault): aprobada sola por `PILOTO_AUTO` (decisión vigente «aprobar»).
