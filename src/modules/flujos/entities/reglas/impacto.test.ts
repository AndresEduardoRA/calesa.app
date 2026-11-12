import { describe, expect, it } from 'vitest'
import { hrefDeFase, impactoDesde, textoDelImpacto } from './impacto'

const G = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`

describe('impactoDesde', () => {
  it('lee fases y requisitos, y corta en 50', () => {
    const fases = Array.from({ length: 51 }, (_, i) => ({ id: G(i + 1), nombre: `F${i}` }))
    const r = impactoDesde({ bloquea: true, fases, requisitos: [] })
    expect(r?.fases).toHaveLength(50)
    expect(r?.hayMas).toBe(true)
    expect(impactoDesde({ nada: 1 })).toBeNull()
  })
})

describe('textoDelImpacto', () => {
  const vacio = { bloquea: true, fases: [], requisitos: [], hayMas: false }
  it('una fase, varias fases', () => {
    expect(
      textoDelImpacto('Aduana', { ...vacio, fases: [{ id: G(1), nombre: 'En aduana' }] }),
    ).toBe('No se puede apagar «Aduana»: la usa la fase «En aduana».')
    expect(
      textoDelImpacto('Aduana', {
        ...vacio,
        fases: [
          { id: G(1), nombre: 'A' },
          { id: G(2), nombre: 'B' },
          { id: G(3), nombre: 'C' },
        ],
      }),
    ).toBe('No se puede apagar «Aduana»: la usan las fases «A», «B» y «C».')
  })
  it('requisitos de espera', () => {
    const q = (n: number, f: string) => ({ id: G(n), faseId: G(90), faseNombre: f })
    expect(textoDelImpacto('Esperas', { ...vacio, requisitos: [q(1, 'X'), q(2, 'X')] })).toBe(
      'No se puede apagar «Esperas»: la usan 2 requisitos de espera (fase «X»).',
    )
  })
  it('más del tope', () => {
    expect(
      textoDelImpacto('Aduana', { ...vacio, fases: [{ id: G(1), nombre: 'A' }], hayMas: true }),
    ).toContain('más de 50')
  })
})

describe('hrefDeFase', () => {
  it('abre el inspector del flujo de un origen o el de repuestos', () => {
    expect(hrefDeFase(G(5), G(6))).toBe(
      `/configuracion/flujos?seccion=fases&origen=${G(5)}&fase=${G(6)}`,
    )
    expect(hrefDeFase('repuestos', G(6))).toBe(
      `/configuracion/flujos?seccion=fases&ambito=repuestos&fase=${G(6)}`,
    )
  })
})
