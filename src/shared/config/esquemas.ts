import { z } from 'zod'

// Las variables de entorno, en un solo lugar: qué pide cada entorno y qué falta. Puro (sin `process.env` ni `server-only`): lo usan
// la app al arrancar y al compilar, y `pnpm env:check` (scripts/env-check.ts). Qué es cada una y dónde vive: docs/ENTORNOS.md.

const texto = z.string().trim().min(1, { error: 'falta' })
const url = z.url({ error: 'no es una URL' })
const opcional = <T extends z.ZodType>(esquema: T) =>
  z.preprocess((v) => (v === '' ? undefined : v), esquema.optional())

export const PROVEEDORES_DE_EMAIL = ['ninguno', 'mailpit', 'resend', 'cloudflare'] as const
export type ProveedorDeEmail = (typeof PROVEEDORES_DE_EMAIL)[number]

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
    WEB_PUBLICA_REVALIDAR_URL: opcional(url), // Fase 8
    WEB_PUBLICA_REVALIDAR_SECRETO: opcional(texto), // Fase 8
    EMAIL_PROVEEDOR: z
      .enum(PROVEEDORES_DE_EMAIL, { error: `es uno de ${PROVEEDORES_DE_EMAIL.join(', ')}` })
      .default('ninguno'),
    EMAIL_REMITENTE: opcional(z.email({ error: 'no es un correo' })),
    EMAIL_REMITENTE_NOMBRE: opcional(texto),
    MAILPIT_URL: opcional(url),
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
    if (e.EMAIL_PROVEEDOR === 'mailpit' && !e.MAILPIT_URL) {
      ctx.addIssue({
        code: 'custom',
        path: ['MAILPIT_URL'],
        message: 'falta (EMAIL_PROVEEDOR=mailpit)',
      })
    }
    if (e.EMAIL_PROVEEDOR === 'resend' || e.EMAIL_PROVEEDOR === 'cloudflare') {
      ctx.addIssue({
        code: 'custom',
        path: ['EMAIL_PROVEEDOR'],
        message: `${e.EMAIL_PROVEEDOR} todavía no tiene adaptador (Fase 7, docs/PLAN.md); hoy: ninguno o mailpit`,
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

// Un mensaje para cortar el arranque o el build, con cada variable y su motivo.
export function mensajeDeProblemas(donde: string, problemas: readonly Problema[]): string {
  return [
    `El entorno de ${donde} está incompleto (docs/ENTORNOS.md):`,
    ...problemas.map((p) => `  - ${p.variable}: ${p.motivo}`),
  ].join('\n')
}
