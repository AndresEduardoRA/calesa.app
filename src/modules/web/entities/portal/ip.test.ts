import { describe, expect, it } from 'vitest'
import { agruparIp } from './ip'

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
