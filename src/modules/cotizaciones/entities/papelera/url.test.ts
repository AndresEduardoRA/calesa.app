import { describe, expect, it } from 'vitest'
import type { LoteDeCotizaciones } from './lotes'
import {
  CLAVE_DE_COTIZACION_A_PURGAR,
  CLAVE_DE_LOTE,
  PANEL_PURGAR,
  motivoParaNoPurgar,
} from './url'

const L1 = '11111111-1111-4111-8111-111111111111'
const L2 = '22222222-2222-4222-8222-222222222222'
const C1 = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const C2 = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'

const lote = (
  id: string,
  cotizaciones: string[],
): Pick<LoteDeCotizaciones, 'id' | 'cotizaciones'> => ({
  id,
  cotizaciones: cotizaciones.map((c, i) => ({
    id: c,
    numero: i + 1,
    titulo: `Cotización #${String(i + 1)}`,
    clase: 'preventa' as const,
    origenId: null,
    creadoEn: '2026-11-06T12:00:00.000Z',
  })),
})

const lotes = [lote(L1, [C1]), lote(L2, [C2])]

describe('la URL de purgar', () => {
  it('nombra el panel y sus claves', () => {
    expect([PANEL_PURGAR, CLAVE_DE_LOTE, CLAVE_DE_COTIZACION_A_PURGAR]).toEqual([
      'purgar',
      'lote',
      'cotizacion',
    ])
  })
})

describe('motivoParaNoPurgar', () => {
  it('sin la clave, primero eso, aunque el lote esté a la vista', () => {
    expect(motivoParaNoPurgar(lotes, L1, null, false)).toBe(
      'No tienes permiso para purgar la papelera de cotizaciones.',
    )
  })

  it('un lote que no está en la página', () => {
    expect(motivoParaNoPurgar(lotes, '33333333-3333-4333-8333-333333333333', null, true)).toBe(
      'Ese lote ya no está en esta página de la papelera.',
    )
    expect(motivoParaNoPurgar(lotes, null, null, true)).toBe(
      'Ese lote ya no está en esta página de la papelera.',
    )
  })

  it('una cotización de otro lote', () => {
    expect(motivoParaNoPurgar(lotes, L1, C2, true)).toBe('Esa cotización ya no está en el lote.')
  })

  it('con el lote y la cotización a la vista, se puede', () => {
    expect(motivoParaNoPurgar(lotes, L1, null, true)).toBeNull()
    expect(motivoParaNoPurgar(lotes, L1, C1, true)).toBeNull()
  })
})
