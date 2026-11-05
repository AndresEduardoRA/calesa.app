import { describe, expect, it } from 'vitest'
import { avisoDeVersion } from './aviso-de-version'
import { hojaDeUnaGuardadaDesde } from './hoja-de-una-guardada-lectura'
import { crudaDeUnaGuardada } from './hoja-de-una-guardada.soporte'

const OTRA_FORMULA = '00000000-0000-4000-8000-0000000000ff'
const hoja = (mas: Record<string, unknown> = {}) => {
  const leida = hojaDeUnaGuardadaDesde(crudaDeUnaGuardada(mas))
  if (!leida) {
    throw new Error('La hoja de prueba no se leyó.')
  }
  return leida
}

describe('avisoDeVersion: de qué versión es una cotización guardada (P7)', () => {
  it('la misma versión que la de hoy y vigente: nada que decir', () => {
    expect(avisoDeVersion(hoja())).toEqual([])
  })

  it('usa otra versión: dice cuál usa y cuál es la de hoy', () => {
    const publicada = { id: OTRA_FORMULA, version: 5 }
    expect(avisoDeVersion(hoja({ publicada }))).toEqual([
      'Esta cotización usa la versión 3; la de hoy es la 5.',
    ])
  })

  it('vencida con la misma versión: «Esta cotización está vencida.»', () => {
    expect(avisoDeVersion(hoja({ vencida: true }))).toEqual(['Esta cotización está vencida.'])
  })

  it('las dos cosas: las dos líneas, la versión primero', () => {
    const publicada = { id: OTRA_FORMULA, version: 5 }
    expect(avisoDeVersion(hoja({ publicada, vencida: true }))).toEqual([
      'Esta cotización usa la versión 3; la de hoy es la 5.',
      'Esta cotización está vencida.',
    ])
  })

  it('sin versión publicada hoy no hay «otra versión»', () => {
    expect(avisoDeVersion(hoja({ publicada: null }))).toEqual([])
    expect(avisoDeVersion(hoja({ publicada: null, vencida: true }))).toEqual([
      'Esta cotización está vencida.',
    ])
  })
})
