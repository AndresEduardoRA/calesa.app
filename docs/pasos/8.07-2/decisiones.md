# 8.07-2: decisiones (2026-11-12)

- **D1 · `acciones.md` sin `jose` entra aquí y no en el 8.07-3.** La cookie con `node:crypto` llega en esta parte y la regla no puede contradecir el código.
- **D2 · `ipDelPedido(headers)` queda entero en el 8.07-3.** Qué cabecera es de fiar depende de la medición D6 del 8.07-1. `contarIntentoDelPortal`
  aplica `agruparIp` adentro: ningún handler puede olvidarla.
- **D3 · IPv6 por su /64.** Es lo mínimo que se asigna a un cliente: recorrerlo no salta el límite ni llena la tabla. Una IPv4 mapeada cuenta como su
  IPv4; lo que no es IP va como `''` y la base lo cuenta como `'desconocida'`, un solo balde.
- **D4 · La firma se compara como texto base64url.** 32 bytes en base64url dejan dos bits sueltos en el último carácter: comparar los bytes
  decodificados aceptaría ese carácter cambiado. Antes, las dos partes tienen que ser del alfabeto base64url, así `timingSafeEqual` nunca lanza.
- **D5 · `urlDeDocumentoDelPortal` une `portal_documento_ruta` y `createSignedUrl` de 60 s.** La ruta privada no llega a `src/app` como dato: lo
  garantiza la forma, no la disciplina del handler. Sí viaja dentro de la URL firmada (así la arma Supabase), que sin el token no abre nada.
- **D6 · Toda respuesta de RPC que se interpreta pasa por Zod** y acepta nulo donde la base puede darlo, aunque el tipo generado diga `string`. El
  snapshot va tal cual (`unknown`): lo interpreta el sitio.
- **D7 · Los nombres públicos llevan «DelPortal»:** `web/index.ts` hace `export *` de todas las áreas y `sitio` ya exporta `leerDireccionPublica`.
- **D8 · Sin prueba unitaria para el esquema del entorno ni para `rpc.ts`:** son envoltorios; `rpc.ts` lo recorre el e2e del 8.07-3 contra la base.
- **D9 · `leerSesion` descarta un valor de más de 1024 caracteres** antes de calcular nada (una cookie válida ronda los 170).
- **D10 · `cookie.ts` es puro:** recibe el secreto y la hora, y se prueba sin mocks del entorno. El secreto se lee en `secreto.ts` (`server-only`).
- **D11 · Un cliente admin nuevo por llamada,** creado dentro de cada función de `rpc.ts` (nunca global).
- **D12 · Lo que entra a `rpc.ts` lo validan los handlers** con Zod en la frontera HTTP (8.07-3); `rpc.ts` valida lo que vuelve de la base.
- **D13 · El secreto no sale del área:** `composicion.ts` lo ata a la firma y a la lectura; `src/app` sólo ve `portalDisponible()`.
