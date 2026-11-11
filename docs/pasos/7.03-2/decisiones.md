## 2026-11-11 — Paso 7.03-2: push web, la función

- **D15 · Web Crypto propio, no `web-push` en Deno** (duda 2 de la fila; confirma D2 de la 7.03-1): `webpush.sendNotification` hace su propio pedido
  `https` de Node y no admite el `fetch` inyectado que pide la fila; la decisión no depende de si `npm:web-push` carga en el runtime. `web-push` y su
  `http_ece` quedan como oráculo de la prueba de contrato (sin instalar nada).
- **D16 · Primero el pase, después las claves:** con `verify_jwt = false` cualquiera puede llamar; si las claves se miraran antes, un anónimo sabría si
  el push está configurado. Que el pase quede usado sin resultado no cuesta nada: `push_abrir` lo limpia al día.
- **D17 · `{ ok: false, error: { codigo: 'sin_claves', mensaje } }` con HTTP 200:** la convención de errores como valores del README y de `storage-gc`.
  La fila decía `{ ok: false, codigo }` de corrido; el código es el mismo y nadie más lo consume (`pg_net` sólo lo guarda). Desvío dicho.
- **D18 · Sólo 404/410 caducan:** 3xx, 400, 403, 413, 429 y 5xx son `fallo`; no se borra una suscripción buena por un error nuestro (un 403 es otra
  clave VAPID).
- **D19 · Carga ≤ 3000 bytes, `TTL` de 24 h, sin `Urgency` ni `Topic`:** lejos del límite de 4096 del registro; un aviso de más de un día ya está en la
  campana. `ruta` viaja sólo si empieza por `/` y no por `//`.
- **D20 · En paralelo, 10 s por suscripción:** ≤ 10 suscripciones en ≤ 10 s, debajo de los 30 s de `pg_net`.
- **D21 · `push` no entra a la guardia de funciones del e2e ni a la lista del CI:** ningún spec la llama y `push_web` nace apagada.
- **D22 · La lista de hosts vive dos veces** (SQL y `enviar.ts`) a propósito: es la segunda defensa contra el proxy abierto.
- **D23 · `redirect: 'manual'`** (auditoría del plan): un 307/308 de un host permitido reenviaría el `POST` con su cuerpo a un host que la lista no
  revisó; todo 3xx es `fallo`.
- **D24 · La prueba de la función va en su archivo** (`push-funcion.test.ts`) y no en `push-contrato.test.ts`: juntas pasaban las 300 líneas.
