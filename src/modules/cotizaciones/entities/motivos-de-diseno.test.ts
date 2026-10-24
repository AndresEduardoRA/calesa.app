import { describe, expect, it } from 'vitest'
import { REGLAS_DE_DISENO, rechazoDeDiseno, fallo } from './motivos-de-diseno'

describe('motivos-de-diseno', () => {
  it('son 29 reglas, sin repetir, con la forma primero', () => {
    expect(REGLAS_DE_DISENO).toHaveLength(29)
    expect(new Set(REGLAS_DE_DISENO).size).toBe(29)
    expect(REGLAS_DE_DISENO[0]).toBe('forma')
  })

  it('cada regla tiene un mensaje, y nombra donde cuando lo hay', () => {
    for (const regla of REGLAS_DE_DISENO) {
      const r = rechazoDeDiseno(regla, { donde: 'xyz', ref: 'ref', nivel: 'niv', campo: 'a.b' })
      expect(r.mensaje.length, regla).toBeGreaterThan(10)
      expect(r.donde, regla).toBe('xyz')
      expect(r.campo !== undefined, regla).toBe(regla === 'forma')
    }
    expect(rechazoDeDiseno('modo_incompleto', {})).not.toHaveProperty('donde')
  })

  it('los mensajes hablan de tú, no de vos', () => {
    for (const regla of REGLAS_DE_DISENO) {
      const { mensaje } = rechazoDeDiseno(regla, { donde: 'a', ref: 'b', nivel: 'c', campo: 'd' })
      expect(mensaje, regla).not.toMatch(/\b(elegí|escribí|mirá|recargá|tenés|usá)\b/i)
    }
  })

  it('fallo devuelve un rechazo con ok en falso', () => {
    expect(fallo('seccion_duplicada', { donde: 'a' })).toMatchObject({
      ok: false,
      error: { regla: 'seccion_duplicada', donde: 'a' },
    })
  })
})
