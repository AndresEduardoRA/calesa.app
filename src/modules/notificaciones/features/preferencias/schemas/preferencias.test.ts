import { describe, expect, it } from 'vitest'
import { esquemaGuardarPreferenciaDePush } from './preferencias'

describe('esquemaGuardarPreferenciaDePush', () => {
  it.each(['tarea_asignada', 'mensaje', 'a', 'turno_web2'])('acepta el tipo %s', (tipo) => {
    expect(esquemaGuardarPreferenciaDePush.safeParse({ tipo, encendido: false }).success).toBe(true)
  })

  it.each(['', 'Mensaje', '1mensaje', 'con espacio', '__proto__', 'a'.repeat(61), "x'; drop"])(
    'rechaza el tipo %j',
    (tipo) => {
      expect(esquemaGuardarPreferenciaDePush.safeParse({ tipo, encendido: true }).success).toBe(
        false,
      )
    },
  )

  it('pide un booleano', () => {
    expect(
      esquemaGuardarPreferenciaDePush.safeParse({ tipo: 'mensaje', encendido: 'si' }).success,
    ).toBe(false)
  })
})
