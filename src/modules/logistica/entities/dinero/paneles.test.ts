import { describe, expect, it } from 'vitest'
import { gastoDeLaUrl, MENSAJE_GASTO_YA_NO_ESTA, motivoParaNoAbrirGasto } from './paneles'

const gastos = [{ id: 'a' }, { id: 'b' }]

describe('gastoDeLaUrl', () => {
  it('encuentra el de la URL y da nulo con nuevo, sin valor o con uno que no está', () => {
    expect(gastoDeLaUrl(gastos, 'b')).toEqual({ id: 'b' })
    expect(gastoDeLaUrl(gastos, 'nuevo')).toBeNull()
    expect(gastoDeLaUrl(gastos, null)).toBeNull()
    expect(gastoDeLaUrl(gastos, 'z')).toBeNull()
    expect(gastoDeLaUrl(null, 'a')).toBeNull()
  })
})

describe('motivoParaNoAbrirGasto', () => {
  const abre = { valor: 'a', encontrado: {}, puedeEditar: true, admiteNuevo: true }
  it('abre con permiso y un gasto que está', () => {
    expect(motivoParaNoAbrirGasto(abre)).toBeNull()
  })
  it('sin permiso de editar no abre, ni siquiera nuevo', () => {
    expect(motivoParaNoAbrirGasto({ ...abre, puedeEditar: false })).toBe(MENSAJE_GASTO_YA_NO_ESTA)
    expect(motivoParaNoAbrirGasto({ ...abre, valor: 'nuevo', puedeEditar: null })).toBe(
      MENSAJE_GASTO_YA_NO_ESTA,
    )
  })
  it('un gasto que ya no está no abre; nuevo abre sólo donde se admite', () => {
    expect(motivoParaNoAbrirGasto({ ...abre, encontrado: null })).toBe(MENSAJE_GASTO_YA_NO_ESTA)
    expect(motivoParaNoAbrirGasto({ ...abre, valor: 'nuevo', encontrado: null })).toBeNull()
    expect(
      motivoParaNoAbrirGasto({ ...abre, valor: 'nuevo', encontrado: null, admiteNuevo: false }),
    ).toBe(MENSAJE_GASTO_YA_NO_ESTA)
  })
})
