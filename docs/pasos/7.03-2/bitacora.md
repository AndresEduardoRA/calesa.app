## 2026-11-11 — Paso 7.03-2: push web, la función (parte 2 de 2 del 7.03: cierra el paso)

- **Hecho:** `supabase/functions/push/` (`index.ts`, `vapid.ts`, `cifrar.ts`, `enviar.ts`, `deno.json`) y `[functions.push] verify_jwt = false` en
  `config.toml`. La función canjea el pase con `push_abrir` antes de mirar las claves (un pase inválido da 401 y no dice si el push está configurado);
  sin claves VAPID responde `sin_claves` (con un formato malo, `claves_invalidas`) y no manda nada; con claves firma VAPID (RFC 8292) y cifra aes128gcm
  (RFC 8291) con Web Crypto propio, envía en paralelo (10 s por suscripción) sin seguir redirecciones, vuelve a validar el host (la lista de
  `_push_host_permitido()`), clasifica 2xx/404-410/lo demás y anota con `push_resultado`. README de funciones (la fila de `push` decía webhook,
  `x-push-secret` y `web-push`: corregida, y sección `push`), `docs/ENTORNOS.md` (la privada y el sujeto viven sólo en la función) y la ficha.
- **Verificación** (`.piloto/salidas/7.03-2/`): `supabase/tests/push-contrato.test.ts` (firma verificada con `node:crypto` y la pública de `k=`; cifrado
  descifrado por `http_ece` e igual byte a byte a `http_ece.encrypt` con la misma sal y remitente; clasificación; proxy abierto sin `fetch`) y
  `push-funcion.test.ts` (pase sin forma, pase rechazado sin claves → 401, las tres variables y la privada corta, camino feliz 201/410/503 con uuid):
  31 ✓ (`contrato-5.txt`). Recorrido en el stack del carril: una notificación con `push_web` activa dispara, la función local responde 200
  `sin_claves`, el pase queda usado sin resultado y reusarlo da 401 (`recorrido-funcion.txt`). `scripts/guardas` 1.061 ✓; typecheck exit 0;
  `nivel.mjs`: Nivel 1 en esta parte (el PR del 7.03 es Nivel 2 por las migraciones de la 7.03-1).
- **Para la 7.04:** quitar `VAPID_PRIVATE_KEY` y `VAPID_SUBJECT` de `esquemaDelServidor` (`src/shared/config/esquemas.ts:18,26`, que dice «opcional
  hasta que exista la función `push`») y de `.env.example:9-10`: con Web Crypto en la función, Next no firma nada y la privada no va a Vercel.
- **Para el coordinador:** `docs/ESTADO.md` (líneas 59-60) y la fila de inventario de `docs/PLAN.md` (línea 1494) todavía cuentan `notificaciones.push`
  sin enforcement (lo dijo la 7.03-1). La fila 7.03 queda terminada con esta parte.
- e2e completo: no (7.03-2, Nivel 1 en esta parte; el completo lo corre el CI del PR)
