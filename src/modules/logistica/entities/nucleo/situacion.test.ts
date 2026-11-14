import { describe, expect, it } from 'vitest'
import { migracionesEnOrden } from '../../../../../scripts/lib/definicion-sql'
import {
  esquemaDeSituacionDeLaUnidad,
  SITUACIONES_DE_LA_UNIDAD,
  textoDeSituacion,
} from './situacion'

describe('la situación en logística', () => {
  it('los valores son los del check de vehiculos.situacion', () => {
    const texto = migracionesEnOrden()
      .map((m) => m.texto)
      .join('\n')
    const check = /vehiculos_situacion_check check \(situacion in \(([^)]*)\)\)/.exec(texto)?.[1]
    expect(check?.split(',').map((v) => v.trim().replaceAll("'", ''))).toEqual([
      ...SITUACIONES_DE_LA_UNIDAD,
    ])
  })

  it('sólo se dice aparte cuando la subasta manda; una desconocida es su fase', () => {
    expect(textoDeSituacion('sin_resolver')).toBe('Sin resolver')
    expect(textoDeSituacion('en_subasta')).toBe('En subasta')
    expect(textoDeSituacion('fase')).toBeNull()
    expect(esquemaDeSituacionDeLaUnidad.parse('otra')).toBe('fase')
  })
})
