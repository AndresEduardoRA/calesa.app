import { describe, expect, it } from 'vitest'

import {
  esquemaDeLaDemo,
  esquemaDelServidor,
  esquemaPublico,
  mensajeDeProblemas,
  problemasDe,
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

  it('resend y cloudflare todavía no tienen adaptador: lo dice en vez de fallar al primer correo', () => {
    const p = problemasDe(esquemaDelServidor, {
      ...base,
      EMAIL_PROVEEDOR: 'resend',
      EMAIL_REMITENTE: 'a@b.co',
      EMAIL_REMITENTE_NOMBRE: 'X',
    })
    expect(p).toHaveLength(1)
    expect(p[0]?.motivo).toContain('Fase 7')
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
