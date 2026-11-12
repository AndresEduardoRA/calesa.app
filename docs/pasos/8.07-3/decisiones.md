# 8.07-3: decisiones (2026-11-12)

## El contrato con el sitio

El sitio (repo `sitio-marketing`) reescribe `/api/portal/*` hacia el CRM, así la cookie `portal` es de primera parte (`HttpOnly`, `Secure`,
`SameSite=Lax`, `Path=/api/portal`, 7 días). Los POST llevan el `Origin` del sitio, que debe ser el de `ajustes_web.direccion_publica`
(Configuración › Sitio web). Toda respuesta lleva `Cache-Control: no-store`. Sin `PORTAL_COOKIE_SECRETO`, toda ruta responde 503.

| Ruta                  | Pide                                  | Responde                                                                                                                             |
| --------------------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `POST ingresar`       | `{ codigo, clave }`, `Origin`         | 200 `{ nombre, debe_cambiar_clave }` + cookie · 401 `{ error }` (todo fallo, el mismo cuerpo) · 403 · 429 + `Retry-After: 900` · 503 |
| `GET estado`          | cookie                                | 200 con el snapshot de `portal_snapshot` · 401 y la cookie borrada · 500 · 503                                                       |
| `GET documentos/[id]` | cookie                                | 302 a una URL firmada de 60 s · 401 y la cookie borrada · 404 (id inválido o ajeno, el mismo) · 500 · 503                            |
| `POST clave`          | `{ actual, nueva }`, cookie, `Origin` | 200 `{ ok: true }` · 400 `{ error }` · 401 · 403 · 500 · 503                                                                         |
| `POST salir`          | `Origin`                              | 204 y la cookie borrada · 403 · 503                                                                                                  |

La ruta del documento no sale en el cuerpo ni en un error; sí viaja dentro de la URL firmada de 60 s, como la arma Supabase.

## Decisiones

- **D1 · La IP del límite** (D6 de la 8.07-1). `ipDelPedido` toma la primera entrada de `x-forwarded-for` y, si falta, `x-real-ip`. En Vercel la
  plataforma pisa `x-forwarded-for` con la IP de quien se conecta; Next 16.4.3 conserva la que llega (`base-server.js`, `??=`). **El límite supone
  Vercel** (o un proxy que pise la cabecera): con `next start` sin proxy, o un proxy que agrega en vez de pisar, el cliente elige esa entrada y el
  límite se salta; sólo queda el bloqueo por código (5 fallos), que no frena probar una clave contra muchos códigos. Otro alojamiento cambia
  `ipDelPedido`. Qué IP ve el CRM detrás de la reescritura no se puede medir sin producción: si fuera la del sitio para todos, el límite (10 por
  15 min) frenaría el portal entero. Hoy el portal no tiene pantallas publicadas. **Abierto:** al publicarlo, mirar en los registros de Vercel la IP
  de `/api/portal/ingresar`; si es la del sitio, una cabecera propia firmada por el sitio con un secreto compartido (un solo archivo puro y una variable).
- **D2 · IPv6 al azar en el e2e.** Cada prueba usa un /64 al azar: `agruparIp` cuenta por /64 y una segunda corrida local no hereda la cuenta.
- **D3 · `Origin` obligatorio en los POST**, comparado por `URL.origin` contra el del pedido o la dirección pública del sitio (que se lee sólo si no
  es el propio). Más estricto que `leads/exportar`, que acepta un POST sin `Origin`: aquí no hay sesión de Supabase detrás.
- **D4 · Todo fallo de `ingresar` da el mismo 401**, también un error de la base (contador o login) y un cuerpo de más de 2 KB: falla cerrado y sin
  oráculo. Sólo 403, 429 y 503 se distinguen.
- **D5 · Una cookie inválida, vencida o revocada** responde 401 y la borra: el sitio sólo sabe «volver a ingresar».
- **D6 · El e2e manda la cookie a mano** en `Cookie`, con un contexto de `request` nuevo por pedido: no depende de si el almacén guarda una `Secure`
  sobre `http://localhost`.
- **D7 · La comparación del `Origin` es una función pura** (`mismoOrigenDelPortal`) con su prueba: es la puerta contra CSRF de un endpoint sin sesión.
- **D8 · Sin Vitest de los handlers** (envoltorios de HTTP sobre `rpc.ts`): los recorre el e2e contra la base real. El 503 no se prueba por e2e.
- **D9 · El secreto de prueba** va en `playwright.config.ts` con `||` (una variable vacía daría 503) y no en `.env.example`.
- **D10 · `salir` no revoca en la base:** la sesión es una cookie firmada sin estado; el corte del lado del CRM es «Volver a otorgar» o revocar.
- **D11 · `documentos/[id]` mira la cookie antes que el id:** sin sesión no se sondea qué ids existen.
- **D12 · `POST clave` no pasa por el límite por IP:** exige la cookie y la base bloquea a los 5 fallos de la clave actual.
- **D13 · Cada handler llama `await connection()` antes que nada.** Con `cacheComponents`, `next build` prerenderizaría un GET que sale por el 503 (el
  CI compila sin el secreto) y lo serviría estático aun con el secreto cargado (auditoría del plan). El build los marca `ƒ`.
- **D14 · `POST clave` con `false` responde 400 sin borrar la cookie**, aunque la causa sea una sesión que ya no vale (la RPC no las distingue): el
  sitio lo ve en el siguiente `estado`. Separarlo pide cambiar la base; no vale el costo.
