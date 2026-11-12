import { describe, expect, it } from 'vitest'
import { versionDeTransicionDesde } from './respuestas'

describe('versionDeTransicionDesde', () => {
  it('toma la versión como texto, tal cual', () => {
    expect(versionDeTransicionDesde('2026-11-11T10:00:00.123456+00:00')).toEqual({
      actualizadoEn: '2026-11-11T10:00:00.123456+00:00',
    })
  })

  it('lo que no es una versión no se entiende', () => {
    for (const malo of [null, undefined, '', 5, { actualizado_en: 'x' }]) {
      expect(versionDeTransicionDesde(malo)).toBeNull()
    }
  })
})
