import { describe, expect, it } from 'vitest'

import { crearAdaptadorCloudflare } from './cloudflare'
import { pedidoSimulado } from './pedido-simulado.soporte'

const CUENTA = '0123456789abcdef0123456789abcdef'
const TOKEN = 'cf_token_secreto_456'
const remitente = { email: 'avisos@correo.ejemplo.com', nombre: 'Importadora' }
const mensaje = {
  para: 'ana@ejemplo.com',
  asunto: 'Hola',
  html: '<p>Hola</p>',
  texto: 'Hola',
  etiquetas: { tipo: 'prueba' },
}
const exito = (
  result: unknown = { delivered: ['ana@ejemplo.com'], permanent_bounces: [], queued: [] },
) => Response.json({ success: true, errors: [], messages: [], result })
const fallida = (codigo: number, estado: number) =>
  Response.json(
    { success: false, errors: [{ code: codigo, message: 'texto con ana@x.com' }], result: null },
    { status: estado },
  )
const enviar = (respuesta: Response | Error, m = mensaje) => {
  const { pedir, llamadas } = pedidoSimulado(respuesta)
  return crearAdaptadorCloudflare(CUENTA, TOKEN, pedir)(m, remitente).then((r) => ({ r, llamadas }))
}
const mensajeDe = (r: { ok: boolean }) =>
  r.ok ? '' : (r as { error: { mensaje: string } }).error.mensaje

describe('el adaptador de Cloudflare (contrato con su API)', () => {
  it('manda POST .../email/sending/send con el token, `from` {address,name} y `to` como arreglo, sin etiquetas', async () => {
    const { r, llamadas } = await enviar(exito(), { ...mensaje, para: ['a@b.co', 'c@d.co'] })
    expect(r).toEqual({ ok: true, data: { id: 'sin-id' } })
    expect(llamadas).toHaveLength(1)
    expect(llamadas[0]).toMatchObject({
      url: `https://api.cloudflare.com/client/v4/accounts/${CUENTA}/email/sending/send`,
      metodo: 'POST',
      cabeceras: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
      cuerpo: {
        from: { address: 'avisos@correo.ejemplo.com', name: 'Importadora' },
        to: ['a@b.co', 'c@d.co'],
        subject: 'Hola',
        html: '<p>Hola</p>',
        text: 'Hola',
      },
    })
    expect(llamadas[0]?.cuerpo).not.toHaveProperty('tags')
  })

  it('sin nombre, `from` lleva sólo la dirección; la cuenta se codifica en la ruta', async () => {
    const { pedir, llamadas } = pedidoSimulado(exito())
    await crearAdaptadorCloudflare('a/b', TOKEN, pedir)(mensaje, { email: 'x@y.co', nombre: '' })
    expect((llamadas[0]?.cuerpo as { from: unknown }).from).toEqual({ address: 'x@y.co' })
    expect(llamadas[0]?.url).toContain('/accounts/a%2Fb/email/sending/send')
  })

  it('un envío en cola cuenta como aceptado', async () => {
    const { r } = await enviar(exito({ delivered: [], permanent_bounces: [], queued: ['a@b.co'] }))
    expect(r).toMatchObject({ ok: true })
  })
})

describe('el adaptador de Cloudflare: lo que sale mal', () => {
  it('una clave rechazada dice qué variables revisar, sin el token ni la cuenta', async () => {
    const { r } = await enviar(fallida(10101, 401))
    expect(r).toMatchObject({ ok: false, error: { codigo: 'inesperado' } })
    expect(mensajeDe(r)).toContain('rechazó la clave (401)')
    expect(mensajeDe(r)).toContain('CLOUDFLARE_API_TOKEN')
    expect(mensajeDe(r)).not.toContain(TOKEN)
    expect(mensajeDe(r)).not.toContain(CUENTA)
  })

  it('un 400 lleva el código numérico y no el texto libre', async () => {
    const texto = mensajeDe((await enviar(fallida(10001, 400))).r)
    expect(texto).toBe('El correo no salió: Cloudflare respondió 400 (10001).')
  })

  it('el límite de pedidos pide esperar', async () => {
    expect(mensajeDe((await enviar(fallida(10004, 429))).r)).toContain('pidió esperar (429)')
  })

  it('HTTP 200 con success:false es un fallo', async () => {
    const { r } = await enviar(Response.json({ success: false, errors: [{ code: 10001 }] }))
    expect(r).toMatchObject({ ok: false, error: { codigo: 'inesperado' } })
    expect(mensajeDe(r)).toContain('Cloudflare no aceptó el pedido (10001)')
  })

  it('si todos los destinatarios rebotaron es un fallo; si sólo uno, el envío salió', async () => {
    const rebote = await enviar(
      exito({ delivered: [], permanent_bounces: ['ana@ejemplo.com'], queued: [] }),
    )
    expect(mensajeDe(rebote.r)).toBe('El correo no salió: Cloudflare rechazó al destinatario.')
    const parcial = await enviar(
      exito({ delivered: ['a@b.co'], permanent_bounces: ['c@d.co'], queued: [] }),
    )
    expect(parcial.r).toMatchObject({ ok: true })
  })

  it('una respuesta sin JSON es un fallo', async () => {
    const { r } = await enviar(new Response('no es json', { status: 200 }))
    expect(r).toMatchObject({ ok: false, error: { codigo: 'inesperado' } })
  })

  it('un error de red es un fallo que no nombra el token', async () => {
    const { r } = await enviar(new Error(`fallo con ${TOKEN} en ${CUENTA}`))
    expect(mensajeDe(r)).toBe('El correo no salió: Cloudflare no respondió.')
  })
})
