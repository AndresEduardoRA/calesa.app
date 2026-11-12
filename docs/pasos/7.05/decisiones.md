## 2026-11-11 — Paso 7.05: correo de la app, adaptadores `resend` y `cloudflare` (7-1)

- **D1** · Variables: `RESEND_API_KEY`; `CLOUDFLARE_ACCOUNT_ID` y `CLOUDFLARE_API_TOKEN` (los nombres estándar de Cloudflare). Cada una se pide sólo con su proveedor;
  las de otro proveedor no se piden ni se rechazan si están. El ID de cuenta se valida como 32 hexadecimales y además va con `encodeURIComponent` en la ruta.
- **D2** · `pnpm email:probar` es `scripts/email-probar.ts` con `tsx`, no `.mjs` como decía `docs/PLAN.md`: los adaptadores son TypeScript y un `.mjs` no los
  importa. Mismo patrón que `env-check.ts`. La elección del adaptador sale de `index.ts` a `proveedor.ts` (sin `server-only`) por lo mismo.
- **D3** · Cloudflare, según su documentación (leída 2026-11-11): el REST no devuelve id de mensaje (sólo el binding de Workers). El contrato de `AdaptadorDeEmail`
  exige un id, así que el éxito devuelve `sin-id`; lo que importa es que la API aceptó el envío (`success: true`). Con varios destinatarios, uno en
  `permanent_bounces` no tumba el envío de los demás: sólo es fallo si ninguno quedó en `delivered` ni en `queued`. Las etiquetas del mensaje se ignoran (Cloudflare no las tiene).
  Sigue sin probarse con un envío real; `email:probar` y `ENTORNOS.md` lo dicen hasta que alguien lo confirme.
- **D4** · Sin reintentos ni idempotencia: un fallo es un valor y quien llama decide (las notificaciones y los jobs vendrán después).
- **D5** · Cada pedido tiene un tope de 10 s (`AbortSignal.timeout`); vencido = «no respondió».
- **D6** · Un mensaje de error nunca lleva la clave ni el texto libre del proveedor (puede traer correos de personas): a lo sumo un código corto (`validation_error`, `10001`).
  401/403 dicen qué variable revisar; 429, que se espere.
- **D7** · El archivo de Resend se llama `resend-rest.ts`, no `resend.ts`: el lint (`NINGUN_SDK_DE_CORREO`, patrón `resend`) rechaza importar cualquier ruta llamada así.
  Su prueba conserva el nombre `resend.test.ts`. No se tocó la regla de lint.
