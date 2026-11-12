## 2026-11-11 — Paso 7.05: correo de la app, adaptadores `resend` y `cloudflare` (7-1)

- **Hecho:** `enviarEmail()` manda por `resend` o `cloudflare` con sólo cambiar `EMAIL_PROVEEDOR` y sus claves; ningún código cambia.
  - `src/shared/lib/email/proveedor.ts` elige el adaptador (`adaptadorDe`, `remitenteDe`), sin `server-only`, para que `pnpm email:probar` lo use igual que la app.
  - `adaptadores/comun.ts` (pedido con tope de 10 s; errores como valores sin claves ni texto libre del proveedor), `resend-rest.ts` y `cloudflare.ts`.
  - `esquemas.ts`: `RESEND_API_KEY`, `CLOUDFLARE_ACCOUNT_ID` (32 hexadecimales) y `CLOUDFLARE_API_TOKEN`, cada una obligatoria sólo con su proveedor; se fue el rechazo «todavía no tiene adaptador».
  - `scripts/email-probar.ts` y `pnpm email:probar <destino>`; `docs/ENTORNOS.md`, `.env.example` y la ficha de `shared`.
- **Cierra 7-1.** La parte «mismo contrato en `supabase/functions/`» no aplica: ninguna función edge manda correo. Fuera del repo (`docs/PLAN.md` › Fase 7): el
  proveedor, el dominio y las claves reales; el paso deja adaptador, variables y `email:probar`.
- **API de Cloudflare verificada hoy** en su documentación pública (`developers.cloudflare.com/email-service/api/send-emails/rest-api/` y `…/examples/email-sending/recipients/`):
  `POST /accounts/{cuenta}/email/sending/send`, `from {address, name}`, `to` como arreglo, respuesta `result {delivered, permanent_bounces, queued}`
  **sin id de mensaje** (el plan suponía un `message_id`; ver D3). Nunca se llamó a Cloudflare ni a Resend con una clave real.
- **Commits:** `2d11aac9` (proveedor.ts), `2b12df12` (resend), `3ab1dd90` (cloudflare), `f67cdc71` (tipos de las pruebas), `fadd7ecd` (claves por proveedor y equivalencia), `d1fa525e` (`email:probar`) y el de docs.
- **Verificación** (`.piloto/salidas/7.05/`): `vitest-correo.txt`: 7 archivos, 52 ✓ (adaptadores, `email.test.ts`, `esquemas.test.ts`, `email-probar.test.ts`, `env-check`); `guardas.txt`:
  34 archivos, 1.065 ✓. `tsc --noEmit` y `eslint` sin errores. `pnpm email:probar no-es-correo` sale con 1 sin tocar la red. `nivel.mjs`: nivel 2 (`shared`).
- e2e completo: no (7.05, sólo src/shared/lib/email, config y scripts: lo prueba el CI del PR)
