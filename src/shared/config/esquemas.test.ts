import { PHASE_DEVELOPMENT_SERVER, PHASE_PRODUCTION_BUILD } from 'next/constants'
import { describe, expect, it } from 'vitest'

import {
  esquemaDeAuth,
  esquemaDeLaDemo,
  esquemaDeLasFunciones,
  esquemaDePreview,
  esquemaDeProduccion,
  esquemaDelServidor,
  esquemaPublico,
  mensajeDeProblemas,
  problemasDe,
  validaLaCompilacion,
} from './esquemas'

describe('el entorno: lo público', () => {
  it('pide la URL y la clave publicable de Supabase; VAPID es opcional hasta la Fase 7', () => {
    expect(problemasDe(esquemaPublico, {})).toEqual([
      { variable: 'NEXT_PUBLIC_SUPABASE_URL', motivo: 'falta' },
      { variable: 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', motivo: 'falta' },
    ])
    expect(
      problemasDe(esquemaPublico, {
        NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54621',
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'x',
      }),
    ).toEqual([])
  })

  it('una URL que no es URL o una clave vacía se nombran', () => {
    expect(
      problemasDe(esquemaPublico, {
        NEXT_PUBLIC_SUPABASE_URL: 'nada',
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: ' ',
      }),
    ).toEqual([
      { variable: 'NEXT_PUBLIC_SUPABASE_URL', motivo: 'no es una URL' },
      { variable: 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', motivo: 'falta' },
    ])
  })
})

describe('el entorno: el servidor', () => {
  const base = { SUPABASE_SECRET_KEY: 'x' }

  it('sólo la secret key es obligatoria; sin EMAIL_PROVEEDOR no se manda correo', () => {
    expect(problemasDe(esquemaDelServidor, {})).toEqual([
      { variable: 'SUPABASE_SECRET_KEY', motivo: 'falta' },
    ])
    expect(problemasDe(esquemaDelServidor, base)).toEqual([])
    expect(esquemaDelServidor.parse(base).EMAIL_PROVEEDOR).toBe('ninguno')
  })

  it('con un proveedor de correo pide el remitente; mailpit pide además su URL', () => {
    expect(
      problemasDe(esquemaDelServidor, { ...base, EMAIL_PROVEEDOR: 'mailpit' }).map(
        (p) => p.variable,
      ),
    ).toEqual(['EMAIL_REMITENTE', 'EMAIL_REMITENTE_NOMBRE', 'MAILPIT_URL'])
    expect(
      problemasDe(esquemaDelServidor, {
        ...base,
        EMAIL_PROVEEDOR: 'mailpit',
        EMAIL_REMITENTE: 'avisos@correo.ejemplo.com',
        EMAIL_REMITENTE_NOMBRE: 'Importadora',
        MAILPIT_URL: 'http://127.0.0.1:54624',
      }),
    ).toEqual([])
  })

  it('resend y cloudflare piden sus claves con su proveedor y no las del otro', () => {
    const remitente = { EMAIL_REMITENTE: 'a@b.co', EMAIL_REMITENTE_NOMBRE: 'X' }
    const falta = (extra: Record<string, string>) =>
      problemasDe(esquemaDelServidor, { ...base, ...remitente, ...extra }).map((p) => p.variable)
    expect(falta({ EMAIL_PROVEEDOR: 'resend' })).toEqual(['RESEND_API_KEY'])
    expect(falta({ EMAIL_PROVEEDOR: 'resend', RESEND_API_KEY: 're_x' })).toEqual([])
    expect(falta({ EMAIL_PROVEEDOR: 'cloudflare' })).toEqual([
      'CLOUDFLARE_ACCOUNT_ID',
      'CLOUDFLARE_API_TOKEN',
    ])
    const cuenta = '0123456789abcdef0123456789abcdef'
    expect(
      falta({
        EMAIL_PROVEEDOR: 'cloudflare',
        CLOUDFLARE_ACCOUNT_ID: cuenta,
        CLOUDFLARE_API_TOKEN: 't',
        RESEND_API_KEY: 'sobra',
      }),
    ).toEqual([])
  })

  it('un ID de cuenta de Cloudflare que no son 32 hexadecimales se rechaza', () => {
    const p = problemasDe(esquemaDelServidor, {
      ...base,
      EMAIL_PROVEEDOR: 'cloudflare',
      EMAIL_REMITENTE: 'a@b.co',
      EMAIL_REMITENTE_NOMBRE: 'X',
      CLOUDFLARE_ACCOUNT_ID: 'mi-cuenta',
      CLOUDFLARE_API_TOKEN: 't',
    })
    expect(p).toEqual([
      { variable: 'CLOUDFLARE_ACCOUNT_ID', motivo: expect.stringContaining('32') as string },
    ])
  })

  it('un proveedor que no existe se nombra con los que hay', () => {
    expect(
      problemasDe(esquemaDelServidor, { ...base, EMAIL_PROVEEDOR: 'sendgrid' })[0]?.motivo,
    ).toContain('mailpit')
  })
})

describe('el entorno: la demo', () => {
  it('pide lo que necesitan resetear y sembrar; SMTP, Google y apibara son opcionales', () => {
    expect(problemasDe(esquemaDeLaDemo, {}).map((p) => p.variable)).toEqual([
      'DEMO_SUPABASE_URL',
      'DEMO_CLAVE_PUBLICA',
      'DEMO_CLAVE_SECRETA',
      'DEMO_SITE_URL',
      'DEMO_DUENO_EMAIL',
      'DEMO_DUENO_CLAVE',
      'DEMO_CLAVE_USUARIOS',
    ])
  })

  it('una clave corta del dueño se rechaza', () => {
    const p = problemasDe(esquemaDeLaDemo, { DEMO_DUENO_CLAVE: 'corta' }).find(
      (x) => x.variable === 'DEMO_DUENO_CLAVE',
    )
    expect(p?.motivo).toBe('al menos 12 caracteres')
  })
})

describe('el mensaje', () => {
  it('lista cada variable con su motivo y nunca un valor', () => {
    expect(mensajeDeProblemas('la app', [{ variable: 'X', motivo: 'falta' }])).toBe(
      'El entorno de la app está incompleto (docs/ENTORNOS.md):\n  - X: falta',
    )
  })
})

// next.config.ts valida las públicas sólo en `next build`: `next typegen` (pnpm typecheck) llega con la misma fase y en CI no hay
// `.env.local` (así cayó el Nivel 1 del PR de la preparación).
describe('cuándo valida la compilación', () => {
  it('en next build sí; en next typegen y en desarrollo no', () => {
    expect(validaLaCompilacion(PHASE_PRODUCTION_BUILD, ['node', 'next', 'build'])).toBe(true)
    expect(validaLaCompilacion(PHASE_PRODUCTION_BUILD, ['node', 'next', 'typegen'])).toBe(false)
    expect(validaLaCompilacion(PHASE_DEVELOPMENT_SERVER, ['node', 'next', 'dev'])).toBe(false)
  })
})

const presentes = (...nombres: string[]) => Object.fromEntries(nombres.map((n) => [n, 'presente']))
const DE_VERCEL = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  'SUPABASE_SECRET_KEY',
  'PORTAL_COOKIE_SECRETO',
  'NEXT_PUBLIC_VAPID_PUBLIC_KEY',
  'EMAIL_PROVEEDOR',
  'EMAIL_REMITENTE',
  'EMAIL_REMITENTE_NOMBRE',
]
const MOTIVO_CORREO =
  'falta la clave de un proveedor de correo: RESEND_API_KEY, o CLOUDFLARE_ACCOUNT_ID y CLOUDFLARE_API_TOKEN'

describe('producción: qué pide Vercel (sólo nombres)', () => {
  it('con todo presente, y con Resend o con Cloudflare completo, no falta nada', () => {
    expect(problemasDe(esquemaDeProduccion, presentes(...DE_VERCEL, 'RESEND_API_KEY'))).toEqual([])
    expect(
      problemasDe(
        esquemaDeProduccion,
        presentes(...DE_VERCEL, 'CLOUDFLARE_ACCOUNT_ID', 'CLOUDFLARE_API_TOKEN'),
      ),
    ).toEqual([])
  })

  it('sin PORTAL_COOKIE_SECRETO lo nombra', () => {
    const sin = DE_VERCEL.filter((n) => n !== 'PORTAL_COOKIE_SECRETO')
    expect(problemasDe(esquemaDeProduccion, presentes(...sin, 'RESEND_API_KEY'))).toEqual([
      { variable: 'PORTAL_COOKIE_SECRETO', motivo: 'falta' },
    ])
  })

  it('sin proveedor de correo, o con medio juego de Cloudflare, dice cuál falta', () => {
    expect(problemasDe(esquemaDeProduccion, presentes(...DE_VERCEL))).toEqual([
      { variable: 'EMAIL_PROVEEDOR_CLAVE', motivo: MOTIVO_CORREO },
    ])
    expect(
      problemasDe(esquemaDeProduccion, presentes(...DE_VERCEL, 'CLOUDFLARE_API_TOKEN')),
    ).toEqual([{ variable: 'EMAIL_PROVEEDOR_CLAVE', motivo: MOTIVO_CORREO }])
  })

  it('un entorno vacío nombra todo lo que falta', () => {
    const vars = problemasDe(esquemaDeProduccion, {}).map((p) => p.variable)
    expect(vars).toEqual(expect.arrayContaining(DE_VERCEL))
  })

  it('un preview no pide correo ni VAPID', () => {
    const cuatro = DE_VERCEL.slice(0, 4)
    expect(problemasDe(esquemaDePreview, presentes(...cuatro))).toEqual([])
    expect(problemasDe(esquemaDePreview, {}).map((p) => p.variable)).toEqual(cuatro)
  })
})

describe('producción: funciones y Auth de Supabase', () => {
  it('las funciones piden las tres de push y no las SUPABASE_* (las inyecta Supabase)', () => {
    const tres = ['VAPID_PRIVATE_KEY', 'VAPID_SUBJECT', 'NEXT_PUBLIC_VAPID_PUBLIC_KEY']
    expect(problemasDe(esquemaDeLasFunciones, presentes(...tres))).toEqual([])
    expect(
      problemasDe(esquemaDeLasFunciones, presentes('VAPID_SUBJECT')).map((p) => p.variable),
    ).toEqual(['VAPID_PRIVATE_KEY', 'NEXT_PUBLIC_VAPID_PUBLIC_KEY'])
  })

  const DE_AUTH = [
    'site_url',
    'uri_allow_list',
    'smtp_host',
    'smtp_user',
    'smtp_pass',
    'smtp_admin_email',
    'smtp_sender_name',
    'mailer_templates_confirmation_content',
    'mailer_templates_recovery_content',
    'mailer_templates_invite_content',
    'mailer_templates_email_change_content',
    'mailer_templates_magic_link_content',
    'mailer_templates_reauthentication_content',
    'mailer_otp_exp',
  ]

  it('Auth completo no falta nada; sin smtp_host lo nombra', () => {
    expect(problemasDe(esquemaDeAuth, presentes(...DE_AUTH))).toEqual([])
    expect(
      problemasDe(esquemaDeAuth, presentes(...DE_AUTH.filter((n) => n !== 'smtp_host'))),
    ).toEqual([{ variable: 'smtp_host', motivo: 'falta' }])
  })

  it('la vida de la invitación distinta de 86400 se dice sin escribir el número leído', () => {
    const r = problemasDe(esquemaDeAuth, { ...presentes(...DE_AUTH), mailer_otp_exp: 'distinto' })
    expect(r).toEqual([{ variable: 'mailer_otp_exp', motivo: 'distinto de 86400' }])
  })
})
