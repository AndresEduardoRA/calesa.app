import { describe, expect, it } from 'vitest'

import { pedidoSimulado } from '../src/shared/lib/email/adaptadores/pedido-simulado.soporte'
import { probar } from './email-probar'

const CLAVE = 're_clave_secreta_123'
const base = {
  SUPABASE_SECRET_KEY: 's',
  EMAIL_REMITENTE: 'avisos@correo.ejemplo.com',
  EMAIL_REMITENTE_NOMBRE: 'Importadora',
}
const resend = { ...base, EMAIL_PROVEEDOR: 'resend', RESEND_API_KEY: CLAVE }
const cloudflare = {
  ...base,
  EMAIL_PROVEEDOR: 'cloudflare',
  CLOUDFLARE_ACCOUNT_ID: '0123456789abcdef0123456789abcdef',
  CLOUDFLARE_API_TOKEN: 'cf_token_secreto',
}
const texto = (s: { salida: string[] }) => s.salida.join('\n')

describe('pnpm email:probar', () => {
  it('un destino que no es un correo no manda nada', async () => {
    const { pedir, llamadas } = pedidoSimulado(Response.json({ id: 'x' }))
    const s = await probar('no-es-correo', resend, pedir)
    expect(s.codigo).toBe(1)
    expect(texto(s)).toContain('El destino no es un correo')
    expect(llamadas).toEqual([])
  })

  it('una configuración incompleta nombra las variables y nunca un valor', async () => {
    const { pedir, llamadas } = pedidoSimulado(Response.json({ id: 'x' }))
    const s = await probar('ana@ejemplo.com', { ...base, EMAIL_PROVEEDOR: 'resend' }, pedir)
    expect(s.codigo).toBe(1)
    expect(texto(s)).toContain('RESEND_API_KEY: falta (EMAIL_PROVEEDOR=resend)')
    expect(llamadas).toEqual([])
    const conClaveMala = await probar(
      'ana@ejemplo.com',
      { ...cloudflare, CLOUDFLARE_ACCOUNT_ID: 'mi-cuenta' },
      pedir,
    )
    expect(texto(conClaveMala)).toContain('CLOUDFLARE_ACCOUNT_ID')
    expect(texto(conClaveMala)).not.toContain('mi-cuenta')
  })

  it('con el correo apagado no hay nada que probar', async () => {
    const s = await probar('ana@ejemplo.com', { SUPABASE_SECRET_KEY: 's' })
    expect(s.codigo).toBe(1)
    expect(texto(s)).toContain('EMAIL_PROVEEDOR=ninguno')
  })

  it('con resend manda un solo correo y dice el id, sin la clave', async () => {
    const { pedir, llamadas } = pedidoSimulado(Response.json({ id: 'rs_9' }))
    const s = await probar('ana@ejemplo.com', resend, pedir)
    expect(s).toEqual({
      codigo: 0,
      salida: ['✓ resend aceptó el correo (id rs_9) para ana@ejemplo.com.'],
    })
    expect(llamadas).toHaveLength(1)
    expect(llamadas[0]?.cuerpo).toMatchObject({ to: ['ana@ejemplo.com'] })
  })

  it('el rechazo del proveedor sale como ✗ con el motivo, sin la clave', async () => {
    const { pedir } = pedidoSimulado(Response.json({ name: 'invalid_api_key' }, { status: 401 }))
    const s = await probar('ana@ejemplo.com', resend, pedir)
    expect(s.codigo).toBe(1)
    expect(texto(s)).toContain('✗ El correo no salió: Resend rechazó la clave (401)')
    expect(texto(s)).not.toContain(CLAVE)
  })

  it('con cloudflare agrega la nota de que no se verificó con un envío real', async () => {
    const { pedir } = pedidoSimulado(
      Response.json({ success: true, errors: [], result: { delivered: ['ana@ejemplo.com'] } }),
    )
    const s = await probar('ana@ejemplo.com', cloudflare, pedir)
    expect(s.codigo).toBe(0)
    expect(texto(s)).toContain('cloudflare aceptó el correo')
    expect(texto(s)).toContain('no con un envío real')
    expect(texto(s)).not.toContain('cf_token_secreto')
  })
})
