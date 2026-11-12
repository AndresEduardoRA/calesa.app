import { describe, expect, it } from 'vitest'
import {
  BLOQUES_DE_FASE,
  CAMPOS_DEL_BLOQUE,
  CAMPOS_EN_ORDEN_VISUAL,
  ID_DE_CAMPO_DE_FASE,
  bloqueDelCampo,
  bloquesConError,
  primerCampoConError,
} from './bloques-de-fase'
import { CAMPOS_DE_FASE } from './reglas-de-fase'

describe('bloques de la fase', () => {
  it('cada campo de la fase está en un bloque, y sólo en uno', () => {
    expect([...CAMPOS_EN_ORDEN_VISUAL].sort()).toEqual([...CAMPOS_DE_FASE].sort())
    for (const campo of CAMPOS_DE_FASE) {
      const donde = BLOQUES_DE_FASE.filter((b) => CAMPOS_DEL_BLOQUE[b].includes(campo))
      expect(donde).toHaveLength(1)
      expect(bloqueDelCampo(campo)).toBe(donde[0])
    }
  })

  it('cada campo tiene su propio id', () => {
    const ids = Object.values(ID_DE_CAMPO_DE_FASE)
    expect(new Set(ids).size).toBe(CAMPOS_DE_FASE.length)
    expect(ID_DE_CAMPO_DE_FASE.alias_portal).toBe('fase-alias-portal')
  })

  it('el primer error es el primero que se ve, no el primero que se escribió', () => {
    expect(primerCampoConError({})).toBeNull()
    expect(primerCampoConError({ alias_portal: 'sin alias', es_final: 'inicial y final' })).toBe(
      'es_final',
    )
    expect(primerCampoConError({ alias_portal: 'x', nombre: 'y' })).toBe('nombre')
  })

  it('un bloque con un error no se pliega', () => {
    expect([...bloquesConError({})]).toEqual([])
    expect([...bloquesConError({ es_final: 'x', alias_portal: 'y', visible_portal: 'z' })]).toEqual(
      ['en-el-flujo', 'web-y-portal'],
    )
  })
})
