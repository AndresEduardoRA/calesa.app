import { describe, expect, it } from 'vitest'

import type { Resultado } from '../../errores'
import type { MensajeDeEmail } from '../tipos'
import { pedidoSimulado } from './pedido-simulado.soporte'
import { crearAdaptadorResend } from './resend-rest'

const CLAVE = 're_clave_secreta_123'
const remitente = { email: 'avisos@correo.ejemplo.com', nombre: 'Importadora' }
const mensaje: MensajeDeEmail = {
  para: 'ana@ejemplo.com',
  asunto: 'Hola',
  html: '<p>Hola</p>',
  texto: 'Hola',
  etiquetas: { tipo: 'prueba', version: 'v1.2' },
}
const mensajeDe = (r: Resultado<unknown>) => (r.ok ? '' : r.error.mensaje)

describe('el adaptador de Resend (contrato con su API)', () => {
  it('manda POST /emails con la clave, el remitente, los destinatarios y las etiquetas, y devuelve el id', async () => {
    const { pedir, llamadas } = pedidoSimulado(Response.json({ id: 'rs_1' }))
    const r = await crearAdaptadorResend(CLAVE, pedir)(
      { ...mensaje, para: ['a@b.co', 'c@d.co'] },
      remitente,
    )
    expect(r).toEqual({ ok: true, data: { id: 'rs_1' } })
    expect(llamadas).toHaveLength(1)
    expect(llamadas[0]).toMatchObject({
      url: 'https://api.resend.com/emails',
      metodo: 'POST',
      cabeceras: { Authorization: `Bearer ${CLAVE}`, 'Content-Type': 'application/json' },
      cuerpo: {
        from: '"Importadora" <avisos@correo.ejemplo.com>',
        to: ['a@b.co', 'c@d.co'],
        subject: 'Hola',
        html: '<p>Hola</p>',
        text: 'Hola',
        tags: [
          { name: 'tipo', value: 'prueba' },
          { name: 'version', value: 'v1_2' },
        ],
      },
    })
  })

  it('sin etiquetas no manda `tags`, y sin nombre el remitente es sólo el correo', async () => {
    const { pedir, llamadas } = pedidoSimulado(Response.json({ id: 'rs_2' }))
    await crearAdaptadorResend(CLAVE, pedir)(
      { ...mensaje, etiquetas: undefined },
      { email: remitente.email, nombre: '' },
    )
    expect(llamadas[0]?.cuerpo).toEqual({
      from: 'avisos@correo.ejemplo.com',
      to: ['ana@ejemplo.com'],
      subject: 'Hola',
      html: '<p>Hola</p>',
      text: 'Hola',
    })
  })

  it('un nombre con comillas o saltos de línea no rompe la cabecera `from`', async () => {
    const { pedir, llamadas } = pedidoSimulado(Response.json({ id: 'rs_3' }))
    await crearAdaptadorResend(CLAVE, pedir)(mensaje, {
      email: remitente.email,
      nombre: 'A"B\r\n<C>',
    })
    expect((llamadas[0]?.cuerpo as { from: string }).from).toBe('"ABC" <avisos@correo.ejemplo.com>')
  })
})

describe('el adaptador de Resend: lo que sale mal', () => {
  it('el error del proveedor es un valor y no copia su texto libre', async () => {
    const { pedir } = pedidoSimulado(
      Response.json(
        { statusCode: 422, name: 'validation_error', message: 'el correo ana@x.com no es válido' },
        { status: 422 },
      ),
    )
    const r = await crearAdaptadorResend(CLAVE, pedir)(mensaje, remitente)
    expect(r).toMatchObject({ ok: false, error: { codigo: 'inesperado' } })
    expect(mensajeDe(r)).toContain('Resend respondió 422 (validation_error)')
    expect(mensajeDe(r)).not.toContain('ana@x.com')
  })

  it('una clave rechazada dice qué variable revisar, sin la clave', async () => {
    const { pedir } = pedidoSimulado(Response.json({ name: 'restricted_api_key' }, { status: 401 }))
    const r = await crearAdaptadorResend(CLAVE, pedir)(mensaje, remitente)
    expect(mensajeDe(r)).toContain('rechazó la clave (401)')
    expect(mensajeDe(r)).toContain('RESEND_API_KEY')
    expect(mensajeDe(r)).not.toContain(CLAVE)
  })

  it('el límite de pedidos pide esperar', async () => {
    const { pedir } = pedidoSimulado(
      Response.json({ name: 'rate_limit_exceeded' }, { status: 429 }),
    )
    expect(mensajeDe(await crearAdaptadorResend(CLAVE, pedir)(mensaje, remitente))).toContain(
      'pidió esperar (429)',
    )
  })

  it('un código raro del proveedor no se copia', async () => {
    const { pedir } = pedidoSimulado(
      Response.json({ name: 'Texto libre con ana@x.com' }, { status: 500 }),
    )
    const texto = mensajeDe(await crearAdaptadorResend(CLAVE, pedir)(mensaje, remitente))
    expect(texto).toBe('El correo no salió: Resend respondió 500.')
  })

  it('una respuesta 2xx sin id, o sin JSON, es un fallo', async () => {
    for (const respuesta of [Response.json({}), new Response('no es json', { status: 200 })]) {
      const { pedir } = pedidoSimulado(respuesta)
      const r = await crearAdaptadorResend(CLAVE, pedir)(mensaje, remitente)
      expect(r).toMatchObject({ ok: false, error: { codigo: 'inesperado' } })
      expect(mensajeDe(r)).toContain('Resend no devolvió el id')
    }
  })

  it('un error de red es un fallo que no nombra la clave', async () => {
    const { pedir } = pedidoSimulado(new Error(`connect ECONNREFUSED con ${CLAVE}`))
    const r = await crearAdaptadorResend(CLAVE, pedir)(mensaje, remitente)
    expect(mensajeDe(r)).toBe('El correo no salió: Resend no respondió.')
  })
})
