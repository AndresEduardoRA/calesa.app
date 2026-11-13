# Entornos

Toda la configuración, dónde vive y quién la pone. Ningún valor secreto entra en git ni en un log: los archivos `.env*` están
ignorados y negados a las sesiones de IA (`.claude/settings.json`). `pnpm env:check` dice qué falta en `.env.local` y `.env.demo` y, con
`produccion`, en Vercel y Supabase sin imprimir valores; la app cae al compilar si falta una pública y al arrancar si falta una del
servidor (`src/shared/config/`). El orden de un despliegue y qué mirar en cada paso: `docs/DESPLIEGUE.md`.

## Los entornos

- **Local:** la pila de Supabase de la principal o la de un carril (abajo, «Pilas locales»). `.env.local` sale de
  `supabase status -o env` más lo que no es de Supabase, copiado de la principal.
- **Demo = producción:** Supabase Pro (`calesa.app`, ref `fjvrjndglytyhvlxifeb`) y Vercel. **Sin datos reales**: se resetea cuando
  hace falta. Registro apagado; el dueño lo crea el script. `.github/workflows/demo.yml` le aplica las migraciones y las funciones al
  integrar en `main` (antes alinea el historial con `scripts/demo/alinear-historial.sh`, por si se aplastaron).
  `bash scripts/demo/restaurar.sh` la deja de cero (lee `.env.demo`); con `--local` hace lo mismo con la pila local.
- **Previews de Vercel** (uno por PR): apuntan a la misma demo. Nunca aplican migraciones: eso pasa sólo al integrar en `main`.

### Pilas locales

Un carril es un worktree con su propia pila de Supabase: `scripts/worktree/preparar.sh` lo arma y escribe `.env.carril` (no se edita a
mano), `scripts/worktree/quitar.sh` lo desarma. En un carril, `pnpm dev`, `pnpm funciones` y `pnpm db:*` ya usan su pila; `supabase`
suelto, no.

| Pila      | Stack             | API   | Base  | Correo | App  | e2e  |
| --------- | ----------------- | ----- | ----- | ------ | ---- | ---- |
| principal | `*_importadora`   | 54621 | 54622 | 54624  | 3000 | 3210 |
| carril a  | `*_importadora-a` | 54721 | 54722 | 54724  | 3100 | 3310 |
| carril b  | `*_importadora-b` | 54821 | 54822 | 54824  | 3200 | 3410 |
| carril c  | `*_importadora-c` | 54921 | 54922 | 54924  | 3300 | 3510 |

Cada pila de carril ocupa ≈ 0,85 GB de RAM. El candado de la base (`scripts/candado.sh`) es uno por pila.

## Variables y ajustes

| Variable o ajuste                                                   | Para qué                                                               | Dónde vive                                                  | Secreta             | Quién la pone                                                                                           |
| ------------------------------------------------------------------- | ---------------------------------------------------------------------- | ----------------------------------------------------------- | ------------------- | ------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`                                          | La API de Supabase                                                     | `.env.local`; Vercel prod y preview                         | no                  | `preparar.sh` en local; la persona en Vercel                                                            |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`                              | Clave publicable                                                       | ídem                                                        | no                  | ídem                                                                                                    |
| `SUPABASE_SECRET_KEY`                                               | API de admin de Auth (invitar)                                         | ídem                                                        | **sí**              | ídem                                                                                                    |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY`                                      | Push web                                                               | `.env.local`; Vercel; función `push`                        | no                  | la persona                                                                                              |
| `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`                                | Push web                                                               | función `push` (secreto)                                    | la privada **sí**   | la persona                                                                                              |
| `PORTAL_COOKIE_SECRETO`                                             | Firma la cookie del portal                                             | `.env.local`; Vercel prod y preview                         | **sí**              | la persona; cambiarla cierra sesiones                                                                   |
| `EMAIL_PROVEEDOR`                                                   | `ninguno`, `mailpit`, `resend` o `cloudflare`                          | `.env.local`; Vercel                                        | no                  | la persona                                                                                              |
| `EMAIL_REMITENTE`, `…_NOMBRE`                                       | Remitente de la app y de Auth                                          | `.env.local`; Vercel; `.env.demo`                           | no                  | la persona                                                                                              |
| `MAILPIT_URL`                                                       | Correo local (`http://127.0.0.1:54624`)                                | `.env.local`                                                | no                  | `preparar.sh`                                                                                           |
| `RESEND_API_KEY`                                                    | Clave de Resend (con `EMAIL_PROVEEDOR=resend`)                         | `.env.local`; Vercel                                        | **sí**              | la persona                                                                                              |
| `CLOUDFLARE_ACCOUNT_ID`                                             | ID de cuenta de Cloudflare (32 hexadecimales)                          | `.env.local`; Vercel                                        | no                  | la persona                                                                                              |
| `CLOUDFLARE_API_TOKEN`                                              | Token con **Email Sending: Edit** (con `cloudflare`)                   | `.env.local`; Vercel                                        | **sí**              | la persona                                                                                              |
| `SUPABASE_PROJECT_ID`, `SUPABASE_*_PORT`, `PUERTO_APP`, `E2E_*`     | La pila, la app y el e2e de un carril                                  | `.env.carril` (sólo en un carril)                           | no                  | `preparar.sh`                                                                                           |
| `SMTP_HOST`, `SMTP_USUARIO`, `SMTP_CLAVE`                           | SMTP de los correos de Auth                                            | `.env.demo` → Supabase Auth                                 | la clave **sí**     | la persona                                                                                              |
| `SUPABASE_AUTH_EXTERNAL_GOOGLE_*`                                   | Google OAuth                                                           | `.env.demo` → panel de Auth                                 | el secret **sí**    | la persona                                                                                              |
| Site URL y Redirect URLs                                            | Enlaces de los correos y OAuth                                         | `config.toml` › `[auth]` y `[remotes.demo]`                 | no                  | `restaurar.sh`                                                                                          |
| `otp_expiry`                                                        | Vida de una invitación                                                 | ídem (local 3600, demo 86400)                               | no                  | `restaurar.sh`                                                                                          |
| Plantillas de correo                                                | Los 6 correos de Auth en español                                       | `supabase/templates/`                                       | no                  | `restaurar.sh`                                                                                          |
| `url_proyecto` (Vault)                                              | La URL que usan los jobs                                               | Vault                                                       | no                  | el seed (local), `resetear.sh` (demo), la persona en un proyecto nuevo (`docs/DESPLIEGUE.md` › «Vault») |
| `cotizacion:abierta` (Vault)                                        | Firma de la hoja abierta                                               | Vault                                                       | **sí**              | la base, al azar                                                                                        |
| `portal:sal` (Vault)                                                | Huella del límite por IP del portal (no guarda la IP)                  | Vault                                                       | **sí**              | la base, al azar                                                                                        |
| `integracion:apibara` (Vault)                                       | Clave de apibara                                                       | Vault                                                       | **sí**              | la persona en Empresa › Integraciones, o `APIBARA_CLAVE`                                                |
| `integracion:web_publica` (Vault)                                   | Secreto para revalidar la web pública                                  | Vault; la dirección, en `integraciones`                     | **sí**              | la persona en Empresa › Integraciones                                                                   |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`    | Las funciones edge                                                     | runtime de Supabase                                         | la service **sí**   | Supabase (las inyecta)                                                                                  |
| URLs de las funciones                                               | `apibara`, `storage-gc`, `avatares-miniaturas`, `importar-csv`, `push` | `<API>/functions/v1/<nombre>`                               | no                  | —                                                                                                       |
| `DEMO_*`                                                            | Resetear y sembrar la demo                                             | `.env.demo`                                                 | las claves **sí**   | la persona                                                                                              |
| `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`; `DEMO_PROJECT_REF` | Migrar la demo desde CI (`demo.yml`; sin la variable, el job se salta) | secretos de GitHub; la variable, en las variables de GitHub | los secretos **sí** | la persona                                                                                              |
| `VERCEL_TOKEN`, `VERCEL_PROJECT_ID`, `VERCEL_TEAM_ID`               | `env:check produccion` (leer nombres por API)                          | el entorno de tu terminal, nunca un archivo                 | el token **sí**     | la persona; `SUPABASE_ACCESS_TOKEN` y `SUPABASE_PROJECT_REF` también sirven aquí                        |

La clave pública VAPID también la lee el servidor de la app para dibujar el interruptor de `/perfil`: sin ella dice «Falta la clave
pública…» y no deja encender; el e2e usa una de prueba, sin privada (`playwright.config.ts`).

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

## `env:check produccion`

`pnpm env:check produccion` lee por API **los nombres, nunca los valores**, y dice qué falta en cuatro lugares: **Vercel · producción**
(las tres públicas de Supabase, la secreta del servidor, `PORTAL_COOKIE_SECRETO`, la VAPID pública, `EMAIL_PROVEEDOR`, el remitente y su
nombre, y la clave de un proveedor de correo real: Resend, o Cloudflare con cuenta y token), **Vercel · preview** (sólo las cuatro que
arrancan la app: ni correo ni push), **Funciones de Supabase · secretos** (`VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` y la VAPID pública; las
`SUPABASE_*` las inyecta Supabase) y **Auth de Supabase** (SMTP, las seis plantillas, Site URL, Redirect URLs y la vida de la invitación
en 86400). Qué pide cada uno: `src/shared/config/esquemas.ts` (`esquemaDeProduccion`, `esquemaDePreview`, `esquemaDeLasFunciones`,
`esquemaDeAuth`); los lectores, con `fetch` inyectado, están en `scripts/lib/entornos/`.

- **Entradas** (sólo del entorno de tu terminal): `VERCEL_TOKEN`, `VERCEL_PROJECT_ID` y `VERCEL_TEAM_ID` (opcional),
  `SUPABASE_ACCESS_TOKEN`. El ref de Supabase sale de `SUPABASE_PROJECT_REF` o de `[remotes.demo] project_id` de `supabase/config.toml`.
- **Salida:** `0` todo completo; `1` falta algo y todo se leyó; `2` algún lugar no se pudo leer (falta un token o un dato, HTTP distinto
  de 2xx, sin red), aunque otro lugar tenga faltas. Un lugar sin leer dice «no se pudo leer: falta VERCEL_TOKEN» y no llama a la red. Un
  fallo de la API dice sólo «HTTP n» o «sin respuesta»: ni el cuerpo ni la URL.
- **Sin argumento**, `pnpm env:check` es `local` y `demo`, sin red.
- **El ensayo** (`pnpm despliegue:en-seco`) lo corre sin entorno y no lee nada; con credenciales lo corre la persona, con
  `SUPABASE_PROJECT_REF` del proyecto que revisa (`docs/DESPLIEGUE.md` › «2. Lo que falta en Vercel y Supabase (primera pasada)»).
- **Sin verificar con la nube:** los contratos de las dos API (Vercel `GET /v10/projects/{id}/env`; Supabase
  `GET /v1/projects/{ref}/secrets` y `…/config/auth`) salen de su documentación pública y de respuestas simuladas. Si un corrido real da
  «respuesta con otra forma», se ajusta el lector.

## Auth en la nube

`restaurar.sh` sube `[remotes.demo]` de `supabase/config.toml` con `supabase config push`, si `.env.demo` trae el SMTP:

- **Site URL:** `DEMO_SITE_URL`. **Redirect URLs:** `DEMO_SITE_URL/**`, `https://*-<DEMO_VERCEL_EQUIPO>.vercel.app/**` y los
  `http://localhost:3000|3100|3200/**` de las pilas locales. **El comodín de los previews es sólo de la demo: se quita en la instalación
  de un cliente.**
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
«Preview». **Las migraciones se aplican a la demo sólo al integrar en `main`** (`demo.yml`, o `restaurar.sh` a mano); un preview nunca
migra, y un PR con migraciones se verifica en local y en CI.

## Correo

- **Correos de Auth** (confirmación, invitación, recuperación): los manda Supabase Auth por SMTP (arriba).
- **Correos de la app:** `enviarEmail()` de `src/shared/lib/email/`, el único lugar que manda correo, con un adaptador por proveedor por
  su API REST elegido por `EMAIL_PROVEEDOR`: `mailpit` (local), `resend` o `cloudflare`. ESLint prohíbe importar el SDK de un proveedor.
  Las plantillas viven en el repo; nada se guarda en el panel del proveedor.
- **Qué pide cada proveedor,** además de `EMAIL_REMITENTE` y `EMAIL_REMITENTE_NOMBRE`: `mailpit`, `MAILPIT_URL`; `resend`,
  `RESEND_API_KEY`; `cloudflare`, `CLOUDFLARE_ACCOUNT_ID` y `CLOUDFLARE_API_TOKEN`. La app no arranca si falta una.
- **Probarlo:** `pnpm email:probar <destino>` manda un correo de prueba con el proveedor de `.env.local`, por el mismo adaptador que la
  app, y dice el id o el motivo del rechazo; nunca imprime una clave. Es el único camino que manda un correo real.
- **Cloudflare, sin verificar con un envío real:** el contrato (`POST /accounts/{cuenta}/email/sending/send`, `from {address, name}`,
  `to` como arreglo, y una respuesta con `delivered`, `permanent_bounces` y `queued` pero **sin id de mensaje**, por lo que el id del
  contrato es `sin-id`) sale de la documentación pública y se prueba con `fetch` simulado. El primer `pnpm email:probar` con Cloudflare
  lo confirma (y repite este aviso hasta entonces).
- **Un subdominio sólo para enviar** (`correo.<dominio>`): el SPF, el DKIM y el DMARC de cada proveedor viven ahí, y cambiar de
  proveedor no toca el dominio principal.
- **Recomendación: el DNS del dominio en Cloudflare desde ya.** Email Sending sólo acepta un dominio que sea una zona de tu cuenta de
  Cloudflare y configura solo sus registros (MX y SPF en `cf-bounce.<dominio>`, DKIM en `cf-bounce._domainkey.<dominio>`, DMARC en
  `_dmarc.<dominio>`); con el DNS ya allí, la migración es un clic. El plan gratuito alcanza.

### Cambiar de Resend a Cloudflare

1. **DNS:** en Cloudflare › Email Service › Email Sending, «Onboard domain» con el dominio (o el subdominio de envío, si lo admite al
   migrar) y dejar que agregue los registros; esperar a que figuren verificados. Los de Resend se quedan hasta el paso 5.
2. **Token:** Cloudflare › API Tokens, un token de cuenta con el permiso **Email Sending: Edit**.
3. **Variables:** en `.env.demo`, `SMTP_HOST=smtp.mx.cloudflare.net`, `SMTP_USUARIO=api_token`, `SMTP_CLAVE=<el token>`;
   `EMAIL_REMITENTE` con el dominio dado de alta. En la app, en Vercel `EMAIL_PROVEEDOR=cloudflare`, `CLOUDFLARE_ACCOUNT_ID` y
   `CLOUDFLARE_API_TOKEN`: ningún código cambia.
4. **Subir y probar:** `bash scripts/demo/restaurar.sh` (o sólo `supabase config push`) y pedir una recuperación de contraseña; la app,
   con `pnpm email:probar <destino>`.
5. **Volver atrás:** las mismas variables con los valores de Resend y subir de nuevo; con los dos dados de alta, el cambio es inmediato.
   Cuando Cloudflare lleve una semana sin rebotes, borrar los registros de Resend.
