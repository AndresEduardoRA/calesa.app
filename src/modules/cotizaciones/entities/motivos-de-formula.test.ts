import { describe, expect, it } from 'vitest'
import { REGLAS_DE_FORMULA, rechazoDeFormula } from './motivos-de-formula'

describe('rechazoDeFormula', () => {
  it.each(REGLAS_DE_FORMULA)('%s tiene su mensaje, que nombra dónde', (regla) => {
    const r = rechazoDeFormula(regla, {
      donde: 'nodo_x',
      ref: 'ref_y',
      grupo: 'g',
      bucket: 'b',
      clave: 'k',
      otro: 'o',
      n: 2,
    })
    expect(r.regla).toBe(regla)
    expect(r.donde).toBe('nodo_x')
    expect(r.mensaje.length).toBeGreaterThan(10)
  })

  it('sólo la forma lleva la ruta del dato, y sin donde no inventa uno', () => {
    expect(rechazoDeFormula('forma', { campo: 'definicion.nodos.0.tipo' })).toEqual({
      regla: 'forma',
      mensaje: 'La fórmula no tiene la forma esperada en «definicion.nodos.0.tipo».',
      campo: 'definicion.nodos.0.tipo',
    })
    expect(rechazoDeFormula('ciclo', { campo: 'x' })).not.toHaveProperty('campo')
    expect(rechazoDeFormula('grupos_sin_total_en', {})).not.toHaveProperty('donde')
  })

  it('habla sin voseo', () => {
    const textos = REGLAS_DE_FORMULA.map((r) => rechazoDeFormula(r, {}).mensaje).join(' ')
    expect(textos).not.toMatch(/\b(tenés|podés|usá|poné|recargá|revisá)\b/)
  })
})
