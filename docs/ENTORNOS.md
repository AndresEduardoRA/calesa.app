# Entornos

Toda la configuración, dónde vive y quién la pone. Ningún valor secreto entra en git ni en un log: los archivos `.env*` están
ignorados y negados a las sesiones de IA (`.claude/settings.json`). `pnpm env:check` dice qué falta en `.env.local` y `.env.demo`
sin imprimir valores; la app cae al compilar si falta una pública y al arrancar si falta una del servidor (`src/shared/config/`).

## Los entornos

- **Local:** la principal usa el stack de Supabase en 546xx y la app en el 3000; cada carril de Orca tiene el suyo (etapa 5 de
  `docs/PREPARACION.md`). `.env.local` sale de `supabase status -o env` más lo que no es de Supabase.
- **Demo = producción:** Supabase Pro (`calesa.app`, ref `fjvrjndglytyhvlxifeb`) y Vercel. **Sin datos reales**: se resetea cuando
  hace falta con `scripts/demo/restaurar.sh`. Registro apagado; el dueño lo crea el script.
- **Previews de Vercel** (uno por PR): apuntan a la misma demo. Nunca aplican migraciones: eso pasa sólo al integrar en `main`.

## Variables y ajustes

| Variable o ajuste                                                | Para qué                                           | Dónde vive                                  | Secreta           | Quién la pone                                            |
| ---------------------------------------------------------------- | -------------------------------------------------- | ------------------------------------------- | ----------------- | -------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`                                       | La API de Supabase                                 | `.env.local`; Vercel prod y preview         | no                | `preparar.sh` en local; la persona en Vercel             |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`                           | Clave publicable                                   | ídem                                        | no                | ídem                                                     |
| `SUPABASE_SECRET_KEY`                                            | API de admin de Auth (invitar)                     | ídem                                        | **sí**            | ídem                                                     |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY`                                   | Push web (Fase 7)                                  | `.env.local`; Vercel                        | no                | la persona                                               |
| `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`                             | Push web (Fase 7)                                  | `.env.local`; Vercel; función `push`        | la privada **sí** | la persona                                               |
| `WEB_PUBLICA_REVALIDAR_URL`, `…_SECRETO`                         | Revalidar la web pública (Fase 8)                  | Vercel prod; Vault                          | el secreto **sí** | la persona                                               |
| `EMAIL_PROVEEDOR`                                                | `ninguno`, `mailpit` (resend y cloudflare: Fase 7) | `.env.local`; Vercel                        | no                | la persona                                               |
| `EMAIL_REMITENTE`, `…_NOMBRE`                                    | Remitente de la app y de Auth                      | `.env.local`; Vercel; `.env.demo`           | no                | la persona                                               |
| `MAILPIT_URL`                                                    | Correo local (`http://127.0.0.1:54624`)            | `.env.local`                                | no                | `preparar.sh`                                            |
| `SMTP_HOST`, `SMTP_USUARIO`, `SMTP_CLAVE`                        | SMTP de los correos de Auth                        | `.env.demo` → Supabase Auth                 | la clave **sí**   | la persona                                               |
| `SUPABASE_AUTH_EXTERNAL_GOOGLE_*`                                | Google OAuth                                       | `.env.demo` → panel de Auth                 | el secret **sí**  | la persona                                               |
| Site URL y Redirect URLs                                         | Enlaces de los correos y OAuth                     | `config.toml` › `[auth]` y `[remotes.demo]` | no                | `restaurar.sh`                                           |
| `otp_expiry`                                                     | Vida de una invitación                             | ídem (local 3600, demo 86400)               | no                | `restaurar.sh`                                           |
| Plantillas de correo                                             | Los 6 correos de Auth en español                   | `supabase/templates/`                       | no                | `restaurar.sh`                                           |
| `url_proyecto` (Vault)                                           | La URL que usan los jobs                           | Vault                                       | no                | el seed (local), `resetear.sh` (demo)                    |
| `cotizacion:abierta` (Vault)                                     | Firma de la hoja abierta                           | Vault                                       | **sí**            | la base, al azar                                         |
| `integracion:apibara` (Vault)                                    | Clave de apibara                                   | Vault                                       | **sí**            | la persona en Empresa › Integraciones, o `APIBARA_CLAVE` |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY` | Las funciones edge                                 | runtime de Supabase                         | la service **sí** | Supabase (las inyecta)                                   |
| URLs de las funciones                                            | `apibara`, `storage-gc`, `avatares-miniaturas`     | `<API>/functions/v1/<nombre>`               | no                | —                                                        |
| `DEMO_*`                                                         | Resetear y sembrar la demo                         | `.env.demo`                                 | las claves **sí** | la persona                                               |
| `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`                  | Migrar la demo desde CI                            | secretos de GitHub                          | **sí**            | la persona (etapa 6)                                     |

## `.env.demo`

Lo leen `scripts/demo/*.sh` (nunca la app). Plantilla, sin valores:

```bash
DEMO_SUPABASE_URL=https://fjvrjndglytyhvlxifeb.supabase.co
DEMO_CLAVE_PUBLICA=          # sb_publishable_… de la demo
DEMO_CLAVE_SECRETA=          # sb_secret_… de la demo (sólo la API de admin de Auth)
DEMO_SITE_URL=               # la URL de producción en Vercel
DEMO_VERCEL_EQUIPO=          # el slug del equipo, para el comodín de los previews (opcional)
DEMO_DUENO_EMAIL=
DEMO_DUENO_CLAVE=            # 12 o más caracteres
DEMO_CLAVE_USUARIOS=         # la de los usuarios de demo por rol, 12 o más
SMTP_HOST=smtp.resend.com    # Cloudflare: smtp.mx.cloudflare.net
SMTP_USUARIO=resend          # Cloudflare: api_token
SMTP_CLAVE=                  # la API key de Resend (o el token de Cloudflare)
EMAIL_REMITENTE=             # p. ej. avisos@correo.<dominio>
EMAIL_REMITENTE_NOMBRE=
SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID=   # opcional
SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET=      # opcional
APIBARA_CLAVE=               # opcional
```

## Auth en la nube

`restaurar.sh` sube `[remotes.demo]` de `supabase/config.toml` con `supabase config push`, si `.env.demo` trae el SMTP:

- **Site URL:** `DEMO_SITE_URL`. **Redirect URLs:** `DEMO_SITE_URL/**`, `https://*-<DEMO_VERCEL_EQUIPO>.vercel.app/**` y los
  `http://localhost:3000|3100|3200/**` de los carriles. **El comodín de los previews es sólo de la demo: se quita en la instalación de
  un cliente.**
- **`otp_expiry`:** 86400 (24 h). **SMTP:** el de `SMTP_*`, puerto 465 fijo (TLS implícito: Resend y Cloudflare). **Plantillas:** las 6
  de `supabase/templates/` (confirmación, recuperación, invitación, cambio de correo, enlace de ingreso, reautenticación).
- **Si `config push` no alcanza** (o se quiere a mano), en el panel de Supabase: Authentication › URL Configuration (Site URL y
  Redirect URLs); Authentication › Emails › SMTP Settings (host, 465, usuario, clave, remitente y nombre); Authentication › Emails ›
  Templates (asunto y cuerpo de cada plantilla, copiados de `supabase/templates/`); Authentication › Providers › Email (vencimiento del
  enlace: 86400); Authentication › Providers › Google (client id y secret).

## Registro

El candado es de la base: `auth_registro_permitido()`, un trigger diferido sobre `auth.users`, rechaza una cuenta nueva si ya hay
otras, el registro está cerrado (`ajustes_empresa.registro_abierto`) y la cuenta no trae `app_metadata.invitado` (que sólo pone la
secret key). Lo cubre también Google y el `signUp` directo a la API. La primera cuenta pasa y queda dueña: por eso `restaurar.sh` crea
al dueño apenas resetea. Las invitaciones (`createUser` con la marca y después `inviteUserByEmail`) y la recuperación de contraseña
siguen funcionando con el registro cerrado.

## Vercel

Producción (desde `main`) y cada preview usan la demo: las tres públicas y `SUPABASE_SECRET_KEY` de la demo, en «Production» y
«Preview». **Las migraciones se aplican a la demo sólo al integrar en `main`** (el job de CI de la etapa 6, o `restaurar.sh` a mano);
un preview nunca migra, y un PR con migraciones se verifica en local y en CI.

## Correo

- **Correos de Auth** (confirmación, invitación, recuperación): los manda Supabase Auth por SMTP (arriba).
- **Correos de la app:** `enviarEmail()` de `src/shared/lib/email/`, el único lugar que manda correo, con un adaptador por proveedor por su
  API REST elegido por `EMAIL_PROVEEDOR`. Hoy: `mailpit` (local). `resend` y `cloudflare` llegan en la Fase 7 (`docs/PLAN.md`). ESLint
  prohíbe importar el SDK de un proveedor. Las plantillas viven en el repo; nada se guarda en el panel del proveedor.
- **Un subdominio sólo para enviar** (`correo.<dominio>`): el SPF, el DKIM y el DMARC de cada proveedor viven ahí, y cambiar de proveedor
  no toca el dominio principal.
- **Recomendación: el DNS del dominio en Cloudflare desde ya.** Email Sending sólo acepta un dominio que sea una zona de tu cuenta de
  Cloudflare y configura solo sus registros (MX y SPF en `cf-bounce.<dominio>`, DKIM en `cf-bounce._domainkey.<dominio>`, DMARC en
  `_dmarc.<dominio>`); con el DNS ya allí, la migración es un clic. El plan gratuito alcanza.

### Cambiar de Resend a Cloudflare

1. **DNS:** en Cloudflare › Email Service › Email Sending, «Onboard domain» con el dominio (o el subdominio de envío, si lo admite al
   migrar) y dejar que agregue los registros; esperar a que figuren verificados. Los de Resend se quedan hasta el paso 5.
2. **Token:** Cloudflare › API Tokens, un token de cuenta con el permiso **Email Sending: Edit**.
3. **Variables:** en `.env.demo`, `SMTP_HOST=smtp.mx.cloudflare.net`, `SMTP_USUARIO=api_token`, `SMTP_CLAVE=<el token>`;
   `EMAIL_REMITENTE` con el dominio dado de alta. Si la app ya manda correo (Fase 7), en Vercel `EMAIL_PROVEEDOR=cloudflare` y su token.
4. **Subir y probar:** `bash scripts/demo/restaurar.sh` (o sólo `supabase config push`) y pedir una recuperación de contraseña; la app,
   con `pnpm email:probar <destino>` (Fase 7).
5. **Volver atrás:** las mismas variables con los valores de Resend y subir de nuevo; con los dos dados de alta, el cambio es inmediato.
   Cuando Cloudflare lleve una semana sin rebotes, borrar los registros de Resend.
