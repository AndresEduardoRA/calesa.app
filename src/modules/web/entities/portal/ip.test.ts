import { describe, expect, it } from 'vitest'
import { agruparIp, ipDelPedido } from './ip'

function cabeceras(valores: Record<string, string>) {
  return { get: (nombre: string) => valores[nombre] ?? null }
}

describe('agruparIp: la clave del límite por IP del portal', () => {
  it('K6 · una IPv6 cuenta por su /64, escrita como se escriba', () => {
    const clave = '2001:db8:0:0::/64'
    expect(agruparIp('2001:db8::1')).toBe(clave)
    expect(agruparIp('2001:0db8:0000:0000:ffff:ffff:ffff:fffe')).toBe(clave)
    expect(agruparIp('2001:DB8::ABCD')).toBe(clave)
    expect(agruparIp('[2001:db8::7]')).toBe(clave)
    expect(agruparIp('fe80::1%eth0')).toBe('fe80:0:0:0::/64')
    expect(agruparIp('  2001:db8::2  ')).toBe(clave)
    expect(agruparIp('2001:db8:0:1::1')).toBe('2001:db8:0:1::/64')
    expect(agruparIp('2001:db8:0:1::1')).not.toBe(clave)
    expect(agruparIp('::1')).toBe('0:0:0:0::/64')
    expect(agruparIp('64:ff9b::192.0.2.33')).toBe('64:ff9b:0:0::/64')
  })

  it('K6 · una IPv4, también mapeada en IPv6, cuenta como sí misma', () => {
    expect(agruparIp('203.0.113.7')).toBe('203.0.113.7')
    expect(agruparIp('203.000.113.007')).toBe('203.0.113.7')
    expect(agruparIp('::ffff:203.0.113.7')).toBe('203.0.113.7')
    expect(agruparIp('::FFFF:cb00:7107')).toBe('203.0.113.7')
  })

  it('K6 · lo que no es una IP da null', () => {
    const basura = [
      null,
      undefined,
      '',
      '   ',
      'desconocida',
      '256.1.1.1',
      '1.2.3',
      '1.2.3.4.5',
      '1:2:3:4:5:6:7:8:9',
      '1::2::3',
      '2001:db8::g',
      '12345::1',
      '1:2:3:4:5:6:7',
      `${'a'.repeat(65)}`,
      '203.0.113.7, 10.0.0.1',
    ]
    for (const b of basura) expect(agruparIp(b), String(b)).toBeNull()
  })
})

describe('ipDelPedido: qué IP cuenta el límite del portal', () => {
  it('K1 · la primera entrada de x-forwarded-for, sin espacios', () => {
    expect(ipDelPedido(cabeceras({ 'x-forwarded-for': '203.0.113.7, 10.0.0.1' }))).toBe(
      '203.0.113.7',
    )
    expect(ipDelPedido(cabeceras({ 'x-forwarded-for': '  203.0.113.7  ,10.0.0.1' }))).toBe(
      '203.0.113.7',
    )
    expect(
      ipDelPedido(cabeceras({ 'x-forwarded-for': '2001:db8::1', 'x-real-ip': '198.51.100.2' })),
    ).toBe('2001:db8::1')
  })

  it('K1 · sin x-forwarded-for, o vacía, cae a x-real-ip', () => {
    expect(ipDelPedido(cabeceras({ 'x-real-ip': ' 198.51.100.2 ' }))).toBe('198.51.100.2')
    expect(ipDelPedido(cabeceras({ 'x-forwarded-for': '', 'x-real-ip': '198.51.100.2' }))).toBe(
      '198.51.100.2',
    )
    expect(ipDelPedido(cabeceras({ 'x-forwarded-for': ' , ', 'x-real-ip': '198.51.100.2' }))).toBe(
      '198.51.100.2',
    )
  })

  it('K1 · sin ninguna da null; lo que no es una IP pasa tal cual (la agrupa contarIntento)', () => {
    expect(ipDelPedido(cabeceras({}))).toBeNull()
    expect(ipDelPedido(cabeceras({ 'x-forwarded-for': ' ', 'x-real-ip': '  ' }))).toBeNull()
    expect(ipDelPedido(cabeceras({ 'x-forwarded-for': 'basura, 10.0.0.1' }))).toBe('basura')
  })
})
