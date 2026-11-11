# 8.06-2: decisiones (2026-11-11)

- **D10 · El loopback se prueba sólo si la base del despliegue es local.** «Probar» acepta `http(s)://localhost|127.x` sólo si
  `NEXT_PUBLIC_SUPABASE_URL` también es de loopback (local, CI, e2e). No se corta por `NODE_ENV`: el e2e de CI corre `next start` y se rechazaría
  también ahí. Tampoco hace falta una variable nueva: la base local ya dice «esto no es la nube». Un despliegue propio con Supabase en el mismo host
  (`http://127.0.0.1` tras un proxy) dejaría probar contra el loopback: es aceptable, `docs/ENTORNOS.md` da Vercel con la base en la nube.
- **D11 · SSRF: se acotan las IP literales, no lo que resuelve el DNS.** La app rechaza el loopback (salvo D10), las redes internas escritas tal cual
  (`0/8`, `10/8`, `100.64/10`, `169.254/16`, `172.16/12`, `192.168/16`), IPv6 literal, usuario y clave, y mira el host ya normalizado por WHATWG
  (`2130706433` y `0x7f.1` son `127.0.0.1`) y sin el punto final (`localhost.`). Un nombre que resuelve a una IP interna no se ataja: no hay
  dependencia para fijar la IP resuelta y un `dns.lookup` previo no evita el rebinding. Lo limitan el permiso `empresa.ajustes.gestionar`, el cuerpo
  fijo, no seguir redirecciones y que sólo vuelve el código. Tampoco se rechazan las redes reservadas que no son del servidor (`192.0.0.0/24`,
  `198.18.0.0/15`, multicast `224.0.0.0/4`, `240.0.0.0/4`): no apuntan a la red del servidor y «Probar» sólo devuelve el código.
- **D12 · No se rechaza el loopback al guardar.** La base lo acepta (D3 del 8.06-1), el job no lo usa (sólo manda a `https://`) y «Probar» lo corta
  (D10). El esquema del formulario corre también en el navegador y no lee el entorno.
- **D13 · La app es más estricta que la base.** La regex de `integracion_guardar` queda como está: lo que la app rechaza (redes internas, IP en decimal)
  no llega; lo que entra por RPC directa lo acota D3 del 8.06-1.
- **D14 · Apagar la web pública no lleva «Deshacer» ni confirmación.** Es el patrón de apibara, se revierte con el mismo interruptor y la ayuda dice
  antes del clic cuántos vehículos dejan de verse.
- **D15 · Mensajes del secreto neutros** («Tiene al menos 8 caracteres.») para las dos integraciones: un solo esquema, sin texto por clave.
- **D16 · «Probar» no guarda el resultado** (sin columna ni evento): es una comprobación a pedido, no un estado.
- **D17 · Segunda excepción del cliente admin.** `integracion_secreto()` sólo la ejecuta `service_role`; «Probar» corre en el servidor de Next
  (no en pg_net, que no devuelve el código a la pantalla). `probarRevalidacion()` comprueba el permiso con el cliente de quien prueba, lee y valida la
  dirección guardada y recién entonces crea el admin para esa única llamada. El lint, `.claude/rules/datos.md` y `admin.ts` la nombran.

## Contrato con el sitio

`POST <revalidar_url>` con `Content-Type: application/json` y `Authorization: Bearer <secreto>`; cuerpo `{"etiquetas": [...]}` con
`guias|faqs|testimonios|ajustes|asesores|vehiculos`, ordenadas y sin repetir. `{"etiquetas": []}` es «Probar» y no revalida nada. El receptor compara el
secreto en tiempo constante y responde 2xx. A lo sumo un pedido por minuto y sólo a `https://`; sin reintentos (lo cubre la caducidad propia del
sitio); apagar la integración no avisa (D6 del 8.06-1). Ninguna variable de entorno: dirección y secreto en Configuración › Empresa › Integraciones ›
Web pública.
