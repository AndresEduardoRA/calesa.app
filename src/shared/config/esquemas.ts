import { z } from 'zod'

// Las variables de entorno, en un solo lugar: qué pide cada entorno y qué falta. Puro (sin `process.env` ni `server-only`): lo usan
// la app al arrancar y al compilar, y `pnpm env:check` (scripts/env-check.ts). Qué es cada una y dónde vive: docs/ENTORNOS.md.

const texto = z.string().trim().min(1, { error: 'falta' })
const url = z.url({ error: 'no es una URL' })
const opcional = <T extends z.ZodType>(esquema: T) =>
  z.preprocess((v) => (v === '' ? undefined : v), esquema.optional())

export const PROVEEDORES_DE_EMAIL = ['ninguno', 'mailpit', 'resend', 'cloudflare'] as const
export type ProveedorDeEmail = (typeof PROVEEDORES_DE_EMAIL)[number]

// Lo que pide cada proveedor además del remitente; las claves de otro proveedor no se piden ni se rechazan.
const CLAVES_DEL_PROVEEDOR = {
  ninguno: [],
  mailpit: ['MAILPIT_URL'],
  resend: ['RESEND_API_KEY'],
  cloudflare: ['CLOUDFLARE_ACCOUNT_ID', 'CLOUDFLARE_API_TOKEN'],
} as const satisfies Record<
  ProveedorDeEmail,
  readonly ('MAILPIT_URL' | 'RESEND_API_KEY' | 'CLOUDFLARE_ACCOUNT_ID' | 'CLOUDFLARE_API_TOKEN')[]
>

// Viajan al navegador: el nombre literal `NEXT_PUBLIC_*` (Next sólo incrusta las que se escriben así).
export const esquemaPublico = z.object({
  NEXT_PUBLIC_SUPABASE_URL: url,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: texto,
  // Fase 7 (push web): opcional hasta que exista la función `push`.
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: opcional(texto),
})

// Sólo servidor. Las que dicen «Fase N» son opcionales hasta que esa fase tenga código que las lea.
export const esquemaDelServidor = z
  .object({
    SUPABASE_SECRET_KEY: texto,
    VAPID_PRIVATE_KEY: opcional(texto), // Fase 7
    VAPID_SUBJECT: opcional(
      z.string().regex(/^(mailto:|https:\/\/)/, { error: 'empieza con mailto: o https://' }),
    ), // Fase 7
    EMAIL_PROVEEDOR: z
      .enum(PROVEEDORES_DE_EMAIL, { error: `es uno de ${PROVEEDORES_DE_EMAIL.join(', ')}` })
      .default('ninguno'),
    EMAIL_REMITENTE: opcional(z.email({ error: 'no es un correo' })),
    EMAIL_REMITENTE_NOMBRE: opcional(texto),
    MAILPIT_URL: opcional(url),
    RESEND_API_KEY: opcional(texto),
    CLOUDFLARE_ACCOUNT_ID: opcional(
      z.string().regex(/^[0-9a-f]{32}$/, {
        error: 'son 32 caracteres hexadecimales (el ID de cuenta de Cloudflare)',
      }),
    ),
    CLOUDFLARE_API_TOKEN: opcional(texto),
    // Fase 8 (portal): firma la cookie de sesión del portal; sin ella, api/portal/* responde 503 (8.07-3).
    PORTAL_COOKIE_SECRETO: opcional(z.string().min(32, { error: 'al menos 32 caracteres' })),
  })
  .superRefine((e, ctx) => {
    if (e.EMAIL_PROVEEDOR === 'ninguno') return
    for (const clave of ['EMAIL_REMITENTE', 'EMAIL_REMITENTE_NOMBRE'] as const) {
      if (!e[clave])
        ctx.addIssue({
          code: 'custom',
          path: [clave],
          message: `falta (EMAIL_PROVEEDOR=${e.EMAIL_PROVEEDOR})`,
        })
    }
    for (const clave of CLAVES_DEL_PROVEEDOR[e.EMAIL_PROVEEDOR]) {
      if (!e[clave])
        ctx.addIssue({
          code: 'custom',
          path: [clave],
          message: `falta (EMAIL_PROVEEDOR=${e.EMAIL_PROVEEDOR})`,
        })
    }
  })

// `.env.demo`: lo que leen `scripts/demo/*.sh` para resetear y sembrar la demo. Nunca lo lee la app.
export const esquemaDeLaDemo = z.object({
  DEMO_SUPABASE_URL: url,
  DEMO_CLAVE_PUBLICA: texto,
  DEMO_CLAVE_SECRETA: texto,
  DEMO_SITE_URL: url,
  // El equipo de Vercel, para el comodín de los previews (`https://*-<equipo>.vercel.app/**`, sólo demo).
  DEMO_VERCEL_EQUIPO: opcional(
    z
      .string()
      .regex(/^[a-z0-9-]+$/, { error: 'es el slug del equipo (minúsculas, números y guiones)' }),
  ),
  DEMO_DUENO_EMAIL: z.email({ error: 'no es un correo' }),
  DEMO_DUENO_CLAVE: z.string().min(12, { error: 'al menos 12 caracteres' }),
  DEMO_CLAVE_USUARIOS: z.string().min(12, { error: 'al menos 12 caracteres' }),
  // El SMTP de los correos de Auth (Resend hoy). Sin él, Supabase manda con su SMTP de prueba (pocos correos por hora).
  SMTP_HOST: opcional(texto), // el puerto va fijo en config.toml: 465, el de Resend y Cloudflare
  SMTP_USUARIO: opcional(texto),
  SMTP_CLAVE: opcional(texto),
  EMAIL_REMITENTE: opcional(z.email({ error: 'no es un correo' })),
  EMAIL_REMITENTE_NOMBRE: opcional(texto),
  SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID: opcional(texto),
  SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET: opcional(texto),
  APIBARA_CLAVE: opcional(texto),
})

// Producción, por API (`pnpm env:check produccion`): se mira qué NOMBRES hay en cada lugar, nunca un valor. Quien lee arma un registro
// donde cada nombre presente vale `'presente'` (y, de Auth, `'distinto'` si el ajuste no es el esperado); estos esquemas dicen qué falta.
const hay = z.literal('presente', { error: 'falta' })
const nombresDeVercel = {
  NEXT_PUBLIC_SUPABASE_URL: hay,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: hay,
  SUPABASE_SECRET_KEY: hay,
  PORTAL_COOKIE_SECRETO: hay,
}
// Un preview no manda correo ni push: sólo lo que arranca la app.
export const esquemaDePreview = z.object(nombresDeVercel)

type ClaveDeProveedor = 'RESEND_API_KEY' | 'CLOUDFLARE_ACCOUNT_ID' | 'CLOUDFLARE_API_TOKEN'
const sinValor = z.literal('presente').optional()
export const esquemaDeProduccion = z
  .object({
    ...nombresDeVercel,
    NEXT_PUBLIC_VAPID_PUBLIC_KEY: hay,
    EMAIL_PROVEEDOR: hay,
    EMAIL_REMITENTE: hay,
    EMAIL_REMITENTE_NOMBRE: hay,
    RESEND_API_KEY: sinValor,
    CLOUDFLARE_ACCOUNT_ID: sinValor,
    CLOUDFLARE_API_TOKEN: sinValor,
  })
  .superRefine((e, ctx) => {
    // El valor de EMAIL_PROVEEDOR no se lee: basta un juego completo de cualquier proveedor real.
    const completo = (claves: readonly ClaveDeProveedor[]) =>
      claves.every((c) => e[c] === 'presente')
    if (!completo(CLAVES_DEL_PROVEEDOR.resend) && !completo(CLAVES_DEL_PROVEEDOR.cloudflare))
      ctx.addIssue({
        code: 'custom',
        path: ['EMAIL_PROVEEDOR_CLAVE'],
        message:
          'falta la clave de un proveedor de correo: RESEND_API_KEY, o CLOUDFLARE_ACCOUNT_ID y CLOUDFLARE_API_TOKEN',
      })
  })

// Secretos de las funciones de Supabase: sólo `push` los lee. Las `SUPABASE_*` las inyecta Supabase.
export const esquemaDeLasFunciones = z.object({
  VAPID_PRIVATE_KEY: hay,
  VAPID_SUBJECT: hay,
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: hay,
})

// Auth de Supabase: lo que sube `scripts/demo/restaurar.sh` (docs/ENTORNOS.md). `mailer_otp_exp` es lo único que se compara.
export const VIDA_DE_LA_INVITACION = 86400
export const esquemaDeAuth = z.object({
  site_url: hay,
  uri_allow_list: hay,
  smtp_host: hay,
  smtp_user: hay,
  smtp_pass: hay,
  smtp_admin_email: hay,
  smtp_sender_name: hay,
  mailer_templates_confirmation_content: hay,
  mailer_templates_recovery_content: hay,
  mailer_templates_invite_content: hay,
  mailer_templates_email_change_content: hay,
  mailer_templates_magic_link_content: hay,
  mailer_templates_reauthentication_content: hay,
  mailer_otp_exp: z.literal('presente', {
    error: (i) => (i.input === undefined ? 'falta' : `distinto de ${VIDA_DE_LA_INVITACION}`),
  }),
})

export type Problema = { variable: string; motivo: string }

// Lo que falta o está mal en `entorno` según `esquema`, sin los valores (nunca se imprime un valor).
export function problemasDe(
  esquema: z.ZodType,
  entorno: Record<string, string | undefined>,
): Problema[] {
  const r = esquema.safeParse(entorno)
  if (r.success) return []
  return r.error.issues.map((i) => ({
    variable: i.path.map(String).join('.') || '(entorno)',
    motivo: i.code === 'invalid_type' && i.input === undefined ? 'falta' : i.message,
  }))
}

// Si `next.config.ts` valida las públicas: sólo en `next build`. `next typegen` (el `pnpm typecheck`) carga la configuración con la
// misma fase y no las necesita; se reconoce por su subcomando.
export function validaLaCompilacion(fase: string, argv: readonly string[]): boolean {
  return fase === 'phase-production-build' && !argv.includes('typegen')
}

// Un mensaje para cortar el arranque o el build, con cada variable y su motivo.
export function mensajeDeProblemas(donde: string, problemas: readonly Problema[]): string {
  return [
    `El entorno de ${donde} está incompleto (docs/ENTORNOS.md):`,
    ...problemas.map((p) => `  - ${p.variable}: ${p.motivo}`),
  ].join('\n')
}
