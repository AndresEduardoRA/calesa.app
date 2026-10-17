import { describe, expect, it } from 'vitest'
import type { LoteDePapelera } from './papelera'
import { MENSAJE_DE_LOTE_NO_DISPONIBLE, motivoParaNoPurgar } from './purga-por-url'

describe('motivoParaNoPurgar', () => {
  const vehiculo = (id: string) => ({ id }) as unknown as LoteDePapelera['vehiculos'][number]
  const lote = (id: string, vehiculos: string[]) =>
    ({ id, vehiculos: vehiculos.map(vehiculo) }) as unknown as LoteDePapelera
  const lotes = [lote('l1', ['a', 'b']), lote('l2', ['c'])]

  it('abre un lote de la página, entero o con uno de sus vehículos', () => {
    expect(motivoParaNoPurgar(lotes, 'l1', null)).toBeNull()
    expect(motivoParaNoPurgar(lotes, 'l1', 'b')).toBeNull()
  })

  it('no abre un lote que no está en la página, o sin lote', () => {
    expect(motivoParaNoPurgar(lotes, 'zzz', null)).toBe(MENSAJE_DE_LOTE_NO_DISPONIBLE)
    expect(motivoParaNoPurgar(lotes, null, null)).toBe(MENSAJE_DE_LOTE_NO_DISPONIBLE)
  })

  it('no abre un vehículo que no es de ese lote', () => {
    expect(motivoParaNoPurgar(lotes, 'l1', 'c')).toBe('Ese vehículo ya no está en el lote.')
  })
})
