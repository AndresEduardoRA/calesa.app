import { describe, expect, it } from 'vitest'
import { impactoDesde, resumenDeImpacto, type ImpactoDeRequisito } from './impacto'

const vehiculos = { ambito: 'vehiculos', faseNombre: 'Embarcado' } as const
const impacto = (cambios: Partial<ImpactoDeRequisito>): ImpactoDeRequisito => ({
  fuera: 0,
  hayMas: false,
  revisadas: 10,
  ...cambios,
})

describe('impactoDesde', () => {
  it('lee lo que devuelve la base', () => {
    expect(impactoDesde({ fuera: 2, hay_mas: false, revisadas: 7 })).toEqual({
      fuera: 2,
      hayMas: false,
      revisadas: 7,
    })
  })

  it('no entiende lo que no es', () => {
    expect(impactoDesde(null)).toBeNull()
    expect(impactoDesde({ fuera: '2', hay_mas: false, revisadas: 7 })).toBeNull()
    expect(impactoDesde({ fuera: 2, revisadas: 7 })).toBeNull()
  })
})

describe('resumenDeImpacto', () => {
  it('sin unidades fuera no hay nada que confirmar', () => {
    expect(resumenDeImpacto(impacto({}), vehiculos)).toBeNull()
  })

  it('dice cuántos vehículos quedan fuera de regla y que no se mueven', () => {
    expect(resumenDeImpacto(impacto({ fuera: 2 }), vehiculos)).toEqual({
      bloquea: false,
      avisos: [
        '2 vehículos que ya están en «Embarcado» quedarán fuera de regla. No se mueven: quedan marcados.',
      ],
    })
  })

  it('concuerda en singular', () => {
    expect(resumenDeImpacto(impacto({ fuera: 1 }), vehiculos)?.avisos[0]).toBe(
      '1 vehículo que ya está en «Embarcado» quedará fuera de regla. No se mueve: queda marcado.',
    )
  })

  it('con más que el tope dice «Más de»', () => {
    expect(resumenDeImpacto(impacto({ fuera: 50, hayMas: true }), vehiculos)?.avisos[0]).toBe(
      'Más de 50 vehículos que ya están en «Embarcado» quedarán fuera de regla. No se mueven: quedan marcados.',
    )
  })

  it('en repuestos nombra ítems de repuestos', () => {
    const resumen = resumenDeImpacto(impacto({ fuera: 3 }), {
      ambito: 'repuestos',
      faseNombre: 'En camino',
    })
    expect(resumen?.avisos[0]).toBe(
      '3 ítems de repuestos que ya están en «En camino» quedarán fuera de regla. No se mueven: quedan marcados.',
    )
  })

  it('si la base revisó el tope de unidades, avisa que es una muestra', () => {
    const resumen = resumenDeImpacto(impacto({ fuera: 4, revisadas: 1000 }), vehiculos)
    expect(resumen?.avisos).toHaveLength(2)
    expect(resumen?.avisos[1]).toBe(
      'Se revisaron las primeras 1.000 unidades de la fase: puede haber más.',
    )
  })

  it('nunca impide confirmar', () => {
    expect(resumenDeImpacto(impacto({ fuera: 9, hayMas: true }), vehiculos)?.bloquea).toBe(false)
  })
})
