import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import type { EntornoDelServidor } from '../../config/servidor'
import { crearAdaptadorMailpit } from './adaptadores/mailpit'
import { enviarEmail } from './index'

const mensaje = {
  para: 'ana@ejemplo.com',
  asunto: 'Hola',
  html: '<p>Hola</p>',
  texto: 'Hola',
  etiquetas: { tipo: 'prueba' },
}
const remitente = { email: 'avisos@correo.ejemplo.com', nombre: 'Importadora' }
const entorno = (extra: Partial<EntornoDelServidor>): EntornoDelServidor =>
  ({ SUPABASE_SECRET_KEY: 's', EMAIL_PROVEEDOR: 'ninguno', ...extra }) as EntornoDelServidor

function pedidoSimulado(respuesta: Response | Error) {
  const llamadas: { url: string; cuerpo: unknown }[] = []
  const pedir = vi.fn((url: string | URL | Request, init?: RequestInit) => {
    llamadas.push({ url: String(url), cuerpo: JSON.parse(String(init?.body)) as unknown })
    return respuesta instanceof Error ? Promise.reject(respuesta) : Promise.resolve(respuesta)
  }) as unknown as typeof fetch
  return { pedir, llamadas }
}

describe('el adaptador de Mailpit (contrato con su API)', () => {
  it('manda POST /api/v1/send con remitente, destinatarios, asunto, HTML, texto y etiquetas, y devuelve el id', async () => {
    const { pedir, llamadas } = pedidoSimulado(Response.json({ ID: 'abc123' }))
    const r = await crearAdaptadorMailpit('http://127.0.0.1:54624/', pedir)(
      { ...mensaje, para: ['a@b.co', 'c@d.co'] },
      remitente,
    )
    expect(r).toEqual({ ok: true, data: { id: 'abc123' } })
    expect(llamadas).toEqual([
      {
        url: 'http://127.0.0.1:54624/api/v1/send',
        cuerpo: {
          From: { Email: 'avisos@correo.ejemplo.com', Name: 'Importadora' },
          To: [{ Email: 'a@b.co' }, { Email: 'c@d.co' }],
          Subject: 'Hola',
          HTML: '<p>Hola</p>',
          Text: 'Hola',
          Tags: ['tipo:prueba'],
        },
      },
    ])
  })

  it('una respuesta de error o sin id es un valor de error, no una excepción', async () => {
    const malo = await crearAdaptadorMailpit(
      'http://m',
      pedidoSimulado(new Response('x', { status: 500 })).pedir,
    )(mensaje, remitente)
    expect(malo).toMatchObject({ ok: false, error: { codigo: 'inesperado' } })
    const sinId = await crearAdaptadorMailpit('http://m', pedidoSimulado(Response.json({})).pedir)(
      mensaje,
      remitente,
    )
    expect(sinId).toMatchObject({ ok: false })
  })

  it('sin red dice que Mailpit no respondió', async () => {
    const r = await crearAdaptadorMailpit(
      'http://m',
      pedidoSimulado(new Error('ECONNREFUSED')).pedir,
    )(mensaje, remitente)
    expect(r).toEqual({
      ok: false,
      error: { codigo: 'inesperado', mensaje: 'El correo no salió: Mailpit no respondió.' },
    })
  })
})

describe('enviarEmail()', () => {
  it('con EMAIL_PROVEEDOR=ninguno no manda nada y lo dice', async () => {
    const { pedir, llamadas } = pedidoSimulado(Response.json({ ID: 'x' }))
    const r = await enviarEmail(mensaje, { entorno: entorno({}), pedir })
    expect(r).toMatchObject({ ok: false, error: { codigo: 'regla' } })
    expect(llamadas).toEqual([])
  })

  it('con mailpit usa su adaptador y el remitente de la configuración', async () => {
    const { pedir, llamadas } = pedidoSimulado(Response.json({ ID: 'x' }))
    const r = await enviarEmail(mensaje, {
      entorno: entorno({
        EMAIL_PROVEEDOR: 'mailpit',
        MAILPIT_URL: 'http://127.0.0.1:54624',
        EMAIL_REMITENTE: 'avisos@correo.ejemplo.com',
        EMAIL_REMITENTE_NOMBRE: 'Importadora',
      }),
      pedir,
    })
    expect(r).toEqual({ ok: true, data: { id: 'x' } })
    expect(llamadas[0]?.cuerpo).toMatchObject({ From: { Email: 'avisos@correo.ejemplo.com' } })
  })

  it('un mensaje inválido no sale', async () => {
    const { pedir, llamadas } = pedidoSimulado(Response.json({ ID: 'x' }))
    const r = await enviarEmail(
      { ...mensaje, para: 'no-es-correo' },
      { entorno: entorno({ EMAIL_PROVEEDOR: 'mailpit', MAILPIT_URL: 'http://m' }), pedir },
    )
    expect(r).toMatchObject({ ok: false, error: { codigo: 'validacion' } })
    expect(llamadas).toEqual([])
  })

  it('resend y cloudflare todavía no tienen adaptador (Fase 7)', async () => {
    const r = await enviarEmail(mensaje, { entorno: entorno({ EMAIL_PROVEEDOR: 'resend' }) })
    expect(r).toMatchObject({ ok: false, error: { codigo: 'regla' } })
    expect(r.ok ? '' : r.error.mensaje).toContain('Fase 7')
  })
})
