import { describe, expect, it } from 'vitest'
import { esquemaQuitarSuscripcion, esquemaSuscribirPush } from './push'

const claves = {
  p256dh: 'BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQ',
  auth: 'tBHItJI5svbpez7KI4CCXg',
}
const valido = { endpoint: 'https://fcm.googleapis.com/fcm/send/abc', claves, userAgent: null }

describe('esquemaSuscribirPush', () => {
  it('acepta lo que entrega el navegador', () => {
    expect(esquemaSuscribirPush.safeParse(valido).success).toBe(true)
  })

  it.each(['http://fcm.googleapis.com/x', 'no es una url', 'javascript:alert(1)', ''])(
    'rechaza el endpoint %j',
    (endpoint) => {
      expect(esquemaSuscribirPush.safeParse({ ...valido, endpoint }).success).toBe(false)
    },
  )

  it('rechaza claves que no son base64url', () => {
    expect(
      esquemaSuscribirPush.safeParse({ ...valido, claves: { ...claves, auth: 'con espacios!' } })
        .success,
    ).toBe(false)
    expect(
      esquemaSuscribirPush.safeParse({ ...valido, claves: { ...claves, p256dh: 'corta' } }).success,
    ).toBe(false)
  })
})

describe('esquemaQuitarSuscripcion', () => {
  it('pide un endpoint https', () => {
    expect(esquemaQuitarSuscripcion.safeParse({ endpoint: valido.endpoint }).success).toBe(true)
    expect(esquemaQuitarSuscripcion.safeParse({ endpoint: 'http://x.test' }).success).toBe(false)
  })
})
