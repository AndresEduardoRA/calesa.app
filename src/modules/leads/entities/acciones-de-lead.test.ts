import { describe, expect, it } from 'vitest'
import {
  BLOQUES_DEL_MENU_DE_LEAD,
  ETIQUETA_DE_ACCION_DE_LEAD,
  accionesDeLead,
  type ClaveDeAccionDeLead,
} from './acciones-de-lead'

const aplanar = (bloques: readonly (readonly string[])[]) => bloques.flat()

describe('accionesDeLead', () => {
  it('con todo, el orden es el de siempre: agendar, anotar, etiquetas, favorito, tachado y la papelera al final', () => {
    expect(aplanar(accionesDeLead({ actuar: true, enviar: true }))).toEqual([
      'agendar',
      'anotar',
      'etiquetas',
      'favorito',
      'tachado',
      'papelera',
    ])
  })

  it('va en tres bloques: seguimiento, marcas y lo destructivo, separado', () => {
    expect(accionesDeLead({ actuar: true, enviar: true })).toEqual([
      ['agendar', 'anotar'],
      ['etiquetas', 'favorito', 'tachado'],
      ['papelera'],
    ])
  })

  it('lo que quien mira no puede hacer no aparece, y no queda un bloque vacío', () => {
    expect(accionesDeLead({ actuar: false, enviar: false })).toEqual([
      ['etiquetas', 'favorito', 'tachado'],
    ])
    expect(accionesDeLead({ actuar: true, enviar: false })).toEqual([
      ['agendar', 'anotar'],
      ['etiquetas', 'favorito', 'tachado'],
    ])
    expect(accionesDeLead({ actuar: false, enviar: true })).toEqual([
      ['etiquetas', 'favorito', 'tachado'],
      ['papelera'],
    ])
  })

  it('marcar basta con ver el lead: las tres marcas están siempre', () => {
    for (const puede of [
      { actuar: false, enviar: false },
      { actuar: true, enviar: true },
    ]) {
      const claves = aplanar(accionesDeLead(puede))
      expect(claves).toEqual(expect.arrayContaining(['etiquetas', 'favorito', 'tachado']))
    }
  })

  it('cada acción está en un solo bloque y tiene su texto, en español y sin signos de exclamación', () => {
    const claves = aplanar(BLOQUES_DEL_MENU_DE_LEAD) as ClaveDeAccionDeLead[]
    expect(new Set(claves).size).toBe(claves.length)
    expect(claves.sort()).toEqual(Object.keys(ETIQUETA_DE_ACCION_DE_LEAD).sort())
    for (const texto of Object.values(ETIQUETA_DE_ACCION_DE_LEAD)) {
      expect(texto).not.toMatch(/[!¡]/)
    }
    expect(ETIQUETA_DE_ACCION_DE_LEAD.papelera).toBe('Enviar a la papelera')
    expect(ETIQUETA_DE_ACCION_DE_LEAD.favorito).toBe('Favorito')
    expect(ETIQUETA_DE_ACCION_DE_LEAD.tachado).toBe('Tachado')
  })
})
