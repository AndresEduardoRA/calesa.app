import { describe, expect, it } from 'vitest'
import {
  encabezadoDeLasEsperas,
  esperasDesde,
  fraseDeUnaEspera,
  TOPE_DE_ESPERAS,
  type EsperaDeItem,
} from './esperas'

const guid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`

function fila(item: number, requisito: number, extra: Record<string, unknown> = {}) {
  return {
    item_id: guid(item),
    descripcion: `Pieza ${item}`,
    proyecto_id: guid(900),
    proyecto_numero: 7,
    fase_id: guid(800),
    fase_nombre: 'En tránsito',
    requisito_id: guid(requisito),
    fase_destino_id: guid(700),
    fase_destino_nombre: 'Listo',
    espera_fase_id: guid(600),
    espera_fase_nombre: 'Recibido',
    ...extra,
  }
}

describe('esperasDesde', () => {
  it('dos filas del mismo ítem con dos requisitos son un ítem con dos esperas, en el orden que llegan', () => {
    const r = esperasDesde([fila(1, 11), fila(2, 11), fila(1, 12)])
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.data.hayMas).toBe(false)
    expect(r.data.items.map((i) => i.itemId)).toEqual([guid(1), guid(2)])
    expect(r.data.items[0]?.esperas.map((e) => e.requisitoId)).toEqual([guid(11), guid(12)])
    expect(r.data.items[1]?.esperas).toHaveLength(1)
  })

  it('con 51 filas se queda con 50 y dice que hay más', () => {
    const filas = Array.from({ length: TOPE_DE_ESPERAS + 1 }, (_, i) => fila(i + 1, 11))
    const r = esperasDesde(filas)
    expect(r.ok && r.data.items.length).toBe(TOPE_DE_ESPERAS)
    expect(r.ok && r.data.hayMas).toBe(true)
  })

  it('los nombres nulos se conservan (quien sólo ve repuestos)', () => {
    const r = esperasDesde([
      fila(1, 11, { fase_nombre: null, fase_destino_nombre: null, espera_fase_nombre: null }),
    ])
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.data.items[0]?.faseNombre).toBeNull()
    expect(r.data.items[0]?.esperas[0]).toMatchObject({
      faseDestinoNombre: null,
      esperaFaseNombre: null,
    })
  })

  it('una fila con un id que no es guid es un error visible, no una espera a medias', () => {
    const r = esperasDesde([fila(1, 11), fila(2, 11, { item_id: 'x' })])
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error.codigo).toBe('inesperado')
  })

  it('cero filas es una lista vacía válida; algo que no es una lista, no', () => {
    expect(esperasDesde([])).toEqual({ ok: true, data: { items: [], hayMas: false } })
    expect(esperasDesde(null).ok).toBe(false)
  })
})

describe('lo que dice el hueco del vehículo', () => {
  const item = (n: number): EsperaDeItem => ({
    itemId: guid(n),
    descripcion: `Pieza ${String(n)}`,
    proyectoId: guid(900),
    proyectoNumero: 7,
    faseId: guid(800),
    faseNombre: 'En tránsito',
    esperas: [],
  })

  it('cuenta sin dar un total: 1, N y «más de N»', () => {
    expect(encabezadoDeLasEsperas({ items: [], hayMas: false })).toBe(
      'Este vehículo no espera ningún repuesto.',
    )
    expect(encabezadoDeLasEsperas({ items: [item(1)], hayMas: false })).toBe('Espera 1 repuesto')
    expect(encabezadoDeLasEsperas({ items: [item(1), item(2)], hayMas: false })).toBe(
      'Espera 2 repuestos',
    )
    const cincuenta = Array.from({ length: TOPE_DE_ESPERAS }, (_, i) => item(i + 1))
    expect(encabezadoDeLasEsperas({ items: cincuenta, hayMas: true })).toBe(
      'Espera más de 50 repuestos',
    )
  })

  it('dice la fase que espera, y calla si no se ven los nombres', () => {
    const base = {
      requisitoId: guid(1),
      faseDestinoId: guid(2),
      esperaFaseId: guid(3),
    }
    expect(
      fraseDeUnaEspera({ ...base, faseDestinoNombre: 'Listo', esperaFaseNombre: 'Recibido' }),
    ).toBe('Para pasar a «Listo» espera que llegue a «Recibido».')
    expect(
      fraseDeUnaEspera({ ...base, faseDestinoNombre: null, esperaFaseNombre: 'Recibido' }),
    ).toBeNull()
  })
})
