import { describe, expect, it, vi } from 'vitest'

import type { Pedir } from './lectura'
import {
  codigoDeSalida,
  informeDeProduccion,
  refDeSupabase,
  revisarProduccion,
  type Entrada,
} from './produccion'

const TOKEN_V = 'TOKEN-VERCEL-PRUEBA'
const TOKEN_S = 'TOKEN-SUPABASE-PRUEBA'
const SECRETOS = [
  'VALOR-SECRETO-1',
  'HASH-2',
  'CLAVE-3',
  'https://sitio-simulado.example',
  TOKEN_V,
  TOKEN_S,
]
const CONFIG = '[remotes.demo]\nproject_id = "refdemo123"\n\n[remotes.demo.auth]\nsite_url = "x"\n'
const AUTH_COMPLETO = {
  site_url: 'https://sitio-simulado.example',
  uri_allow_list: 'https://sitio-simulado.example/**',
  smtp_host: 'CLAVE-3',
  smtp_user: 'CLAVE-3',
  smtp_pass: 'CLAVE-3',
  smtp_admin_email: 'CLAVE-3',
  smtp_sender_name: 'CLAVE-3',
  mailer_templates_confirmation_content: 'CLAVE-3',
  mailer_templates_recovery_content: 'CLAVE-3',
  mailer_templates_invite_content: 'CLAVE-3',
  mailer_templates_email_change_content: 'CLAVE-3',
  mailer_templates_magic_link_content: 'CLAVE-3',
  mailer_templates_reauthentication_content: 'CLAVE-3',
  mailer_otp_exp: 86400,
}
const VARIABLES_DE_PRODUCCION = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  'SUPABASE_SECRET_KEY',
  'PORTAL_COOKIE_SECRETO',
  'NEXT_PUBLIC_VAPID_PUBLIC_KEY',
  'EMAIL_PROVEEDOR',
  'EMAIL_REMITENTE',
  'EMAIL_REMITENTE_NOMBRE',
  'RESEND_API_KEY',
]

type Nube = { vercel?: unknown; secretos?: unknown; auth?: unknown; estado?: number }
const nubeCompleta = (): Nube => ({
  vercel: {
    envs: VARIABLES_DE_PRODUCCION.map((key) => ({
      key,
      target: key === 'NEXT_PUBLIC_VAPID_PUBLIC_KEY' ? ['production'] : ['production', 'preview'],
      value: 'VALOR-SECRETO-1',
    })),
  },
  secretos: ['VAPID_PRIVATE_KEY', 'VAPID_SUBJECT', 'NEXT_PUBLIC_VAPID_PUBLIC_KEY'].map((name) => ({
    name,
    value: 'HASH-2',
  })),
  auth: AUTH_COMPLETO,
})

function simulada(nube: Nube) {
  const pedir = vi.fn<Pedir>((url) => {
    const cuerpo = url.includes('vercel.com')
      ? nube.vercel
      : url.endsWith('/secrets')
        ? nube.secretos
        : nube.auth
    return Promise.resolve(new Response(JSON.stringify(cuerpo), { status: nube.estado ?? 200 }))
  })
  return pedir
}

const entrada = (pedir: Pedir, env: Entrada['env'] = {}): Entrada => ({
  env: {
    VERCEL_TOKEN: TOKEN_V,
    VERCEL_PROJECT_ID: 'prj_1',
    SUPABASE_ACCESS_TOKEN: TOKEN_S,
    ...env,
  },
  configToml: CONFIG,
  pedir,
})

describe('env:check produccion', () => {
  it('con todo en su lugar, los cuatro lugares están completos y sale 0', async () => {
    const lugares = await revisarProduccion(entrada(simulada(nubeCompleta())))
    expect(informeDeProduccion(lugares)).toBe(
      [
        '✓ Vercel · producción: completo',
        '✓ Vercel · preview: completo',
        '✓ Funciones de Supabase · secretos: completo',
        '✓ Auth de Supabase: completo',
      ].join('\n'),
    )
    expect(codigoDeSalida(lugares)).toBe(0)
  })

  it('nombra lo que falta en cada lugar y sale 1', async () => {
    const nube = nubeCompleta()
    nube.vercel = {
      envs: VARIABLES_DE_PRODUCCION.filter((k) => k !== 'RESEND_API_KEY').map((key) => ({
        key,
        target: key === 'PORTAL_COOKIE_SECRETO' ? ['production'] : ['production', 'preview'],
      })),
    }
    nube.secretos = [{ name: 'VAPID_SUBJECT' }]
    nube.auth = { ...AUTH_COMPLETO, smtp_host: '', mailer_otp_exp: 3600 }
    const lugares = await revisarProduccion(entrada(simulada(nube)))
    const texto = informeDeProduccion(lugares)
    expect(texto).toContain(
      '✗ Vercel · producción:\n    EMAIL_PROVEEDOR_CLAVE: falta la clave de un proveedor',
    )
    expect(texto).toContain('✗ Vercel · preview:\n    PORTAL_COOKIE_SECRETO: falta')
    expect(texto).toContain('    VAPID_PRIVATE_KEY: falta')
    expect(texto).toContain('    NEXT_PUBLIC_VAPID_PUBLIC_KEY: falta')
    expect(texto).toContain('    smtp_host: falta')
    expect(texto).toContain('    mailer_otp_exp: distinto de 86400')
    expect(codigoDeSalida(lugares)).toBe(1)
  })

  it('sin tokens lo dice por lugar, no llama a la red y sale 2', async () => {
    const pedir = simulada(nubeCompleta())
    const lugares = await revisarProduccion({ env: {}, configToml: CONFIG, pedir })
    expect(informeDeProduccion(lugares)).toBe(
      [
        '· Vercel · producción: no se pudo leer: falta VERCEL_TOKEN',
        '· Vercel · preview: no se pudo leer: falta VERCEL_TOKEN',
        '· Funciones de Supabase · secretos: no se pudo leer: falta SUPABASE_ACCESS_TOKEN',
        '· Auth de Supabase: no se pudo leer: falta SUPABASE_ACCESS_TOKEN',
      ].join('\n'),
    )
    expect(pedir).not.toHaveBeenCalled()
    expect(codigoDeSalida(lugares)).toBe(2)
  })
})

describe('env:check produccion · lo que no se pudo leer', () => {
  it('sin el proyecto de Vercel o sin el ref de Supabase, pide ese dato', async () => {
    const pedir = simulada(nubeCompleta())
    const lugares = await revisarProduccion({
      env: { VERCEL_TOKEN: TOKEN_V, SUPABASE_ACCESS_TOKEN: TOKEN_S },
      configToml: null,
      pedir,
    })
    const texto = informeDeProduccion(lugares)
    expect(texto).toContain('falta VERCEL_PROJECT_ID')
    expect(texto).toContain('falta SUPABASE_PROJECT_REF')
    expect(pedir).not.toHaveBeenCalled()
  })

  it('un lugar que no se pudo leer gana sobre una falta de otro: sale 2', async () => {
    const nube = nubeCompleta()
    nube.secretos = []
    const lugares = await revisarProduccion(entrada(simulada(nube), { VERCEL_TOKEN: '' }))
    expect(lugares.map((l) => l.estado)).toEqual([
      'no_se_pudo_leer',
      'no_se_pudo_leer',
      'falta',
      'completo',
    ])
    expect(codigoDeSalida(lugares)).toBe(2)
  })

  it('un 401 o un error de red se dicen sin cuerpo ni mensaje', async () => {
    const r401 = await revisarProduccion(entrada(simulada({ ...nubeCompleta(), estado: 401 })))
    expect(informeDeProduccion(r401)).toContain('no se pudo leer: la API respondió HTTP 401')
    const caida = await revisarProduccion(
      entrada(() => Promise.reject(new Error(`fallo con ${TOKEN_V} y VALOR-SECRETO-1`))),
    )
    const texto = informeDeProduccion(caida)
    expect(texto).toContain('no se pudo leer: sin respuesta')
    for (const secreto of SECRETOS) expect(texto).not.toContain(secreto)
    expect(codigoDeSalida(caida)).toBe(2)
  })

  it('ninguna salida, completa o con faltas, contiene un valor ni un token', async () => {
    const incompleta = nubeCompleta()
    incompleta.secretos = []
    incompleta.auth = { ...AUTH_COMPLETO, smtp_pass: '' }
    for (const nube of [nubeCompleta(), incompleta]) {
      const texto = informeDeProduccion(await revisarProduccion(entrada(simulada(nube))))
      for (const secreto of SECRETOS) expect(texto).not.toContain(secreto)
    }
  })

  it('el ref sale de SUPABASE_PROJECT_REF o del bloque [remotes.demo] de config.toml', () => {
    expect(refDeSupabase({}, CONFIG)).toBe('refdemo123')
    expect(refDeSupabase({ SUPABASE_PROJECT_REF: ' otro ' }, CONFIG)).toBe('otro')
    expect(refDeSupabase({}, '[auth]\nproject_id = "no"\n')).toBeUndefined()
    expect(refDeSupabase({}, null)).toBeUndefined()
  })
})
