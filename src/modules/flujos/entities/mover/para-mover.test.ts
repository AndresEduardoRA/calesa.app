import { describe, expect, it } from 'vitest'
import type { Permisos } from '@/shared/lib/permisos'
import {
  destinosDeSalidas,
  destinosIniciales,
  puedeMoverEn,
  puedeMoverUnRepuesto,
  unidadDeRepuestoParaMover,
} from './para-mover'

const ORIGEN = '11111111-1111-4111-8111-111111111111'
const OTRO = '22222222-2222-4222-8222-222222222222'
const ITEM = '33333333-3333-4333-8333-333333333333'
const FASE = '44444444-4444-4444-8444-444444444444'

const global = (
  clave: 'repuestos.mover' | 'flujos.mover' | 'flujos.mover.cualquiera',
): Permisos => [{ clave, origenId: null, alcance: 'todos' }]

describe('puedeMoverUnRepuesto', () => {
  it('sin repuestos.mover no puede, aunque tenga flujos.mover', () => {
    expect(puedeMoverUnRepuesto([])).toBe(false)
    expect(puedeMoverUnRepuesto(global('flujos.mover'))).toBe(false)
    expect(puedeMoverUnRepuesto(global('flujos.mover.cualquiera'))).toBe(false)
  })

  it('con repuestos.mover (global) puede', () => {
    expect(puedeMoverUnRepuesto(global('repuestos.mover'))).toBe(true)
  })
})

describe('puedeMoverEn (regresión: el vehículo sigue con flujos.mover)', () => {
  it('flujos.mover del origen alcanza; repuestos.mover no', () => {
    expect(
      puedeMoverEn([{ clave: 'flujos.mover', origenId: ORIGEN, alcance: 'todos' }], ORIGEN),
    ).toBe(true)
    expect(
      puedeMoverEn([{ clave: 'flujos.mover', origenId: ORIGEN, alcance: 'todos' }], OTRO),
    ).toBe(false)
    expect(puedeMoverEn(global('flujos.mover.cualquiera'), OTRO)).toBe(true)
    expect(puedeMoverEn(global('repuestos.mover'), ORIGEN)).toBe(false)
  })
})

describe('unidadDeRepuestoParaMover', () => {
  it('un ítem con fase queda sin franja de fuera de regla ni quién lo movió', () => {
    const leida = unidadDeRepuestoParaMover({ id: ITEM, fase_id: FASE })
    expect(leida).toEqual({
      ok: true,
      data: {
        tipo: 'repuesto',
        unidadId: ITEM,
        faseId: FASE,
        fueraDeRegla: false,
        faltanEnSuFase: [],
        movida: null,
      },
    })
  })

  it('un ítem sin fase tiene faseId nulo', () => {
    const leida = unidadDeRepuestoParaMover({ id: ITEM, fase_id: null })
    expect(leida.ok && leida.data.faseId).toBeNull()
  })

  it('sin fila es un rechazo de acceso, y un id que no es guid es inesperado', () => {
    const sinFila = unidadDeRepuestoParaMover(null)
    expect(sinFila.ok).toBe(false)
    if (!sinFila.ok) expect(sinFila.error.codigo).toBe('no_encontrado')
    const mala = unidadDeRepuestoParaMover({ id: 'x', fase_id: null })
    expect(mala.ok).toBe(false)
    if (!mala.ok) expect(mala.error.codigo).toBe('inesperado')
  })
})

describe('los destinos dicen si son la subasta', () => {
  const fase = (id: string, orden: number, esSubasta: boolean) => ({
    id: `00000000-0000-4000-8000-00000000000${id}`,
    nombre: `F${id}`,
    color: '#123456',
    orden,
    es_subasta: esSubasta,
  })

  it('las salidas, en el orden de las fases, con esSubasta', () => {
    const leidos = destinosDeSalidas([
      { accion: null, nota_obligatoria: false, destino: fase('2', 20, false) },
      { accion: 'Ganar', nota_obligatoria: true, destino: fase('1', 10, true) },
    ])
    expect(leidos.ok && leidos.data.map((d) => [d.nombre, d.esSubasta])).toEqual([
      ['F1', true],
      ['F2', false],
    ])
  })

  it('las iniciales también; sin es_subasta, la forma no vale', () => {
    const leidos = destinosIniciales([fase('1', 10, true)])
    expect(leidos.ok && leidos.data[0]?.esSubasta).toBe(true)
    const { es_subasta: _sin, ...sinMarca } = fase('1', 10, true)
    expect(destinosIniciales([sinMarca]).ok).toBe(false)
  })
})
