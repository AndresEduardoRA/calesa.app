import { describe, expect, it } from 'vitest'
import {
  TOPE_DE_LA_OFERTA,
  cambioDeOferta,
  catalogoDesde,
  elegibles,
  firmaDeOferta,
  ofertaDesde,
  vacioDe,
} from './oferta'

const e = (id: string, activo = true) => ({ id, nombre: `P${id}`, activo })
const oferta = (o: string[], d: string[], n: string[]) => ({
  transporte: true,
  puertosOrigen: o.map((x) => e(x)),
  puertosDestino: d.map((x) => e(x)),
  navieras: n.map((x) => e(x)),
})

describe('oferta', () => {
  it('vacío = se ofrecen todos', () => {
    expect(vacioDe([])).toBe(true)
    expect(vacioDe([e('a')])).toBe(false)
  })

  it('un guardado inactivo sigue visible aunque no esté en el catálogo', () => {
    const lista = elegibles([e('a')], [e('a'), e('z', false)])
    expect(lista.map((x) => x.id)).toEqual(['a', 'z'])
  })

  it('la firma no depende del orden y detecta el cambio', () => {
    const guardada = oferta(['a', 'b'], [], [])
    expect(firmaDeOferta(guardada)).toBe(firmaDeOferta(oferta(['b', 'a'], [], [])))
    expect(
      cambioDeOferta(guardada, { puertosOrigen: ['b', 'a'], puertosDestino: [], navieras: [] }),
    ).toBe(false)
    expect(
      cambioDeOferta(guardada, { puertosOrigen: ['a'], puertosDestino: [], navieras: [] }),
    ).toBe(true)
  })

  it('el catálogo se corta en el tope', () => {
    const muchos = Array.from({ length: TOPE_DE_LA_OFERTA + 1 }, (_, i) => e(String(i)))
    const c = catalogoDesde(muchos, [])
    expect(c.puertos).toHaveLength(TOPE_DE_LA_OFERTA)
    expect(c.hayMasPuertos).toBe(true)
    expect(c.hayMasNavieras).toBe(false)
  })

  it('ofertaDesde entiende la RPC y rechaza lo demás', () => {
    const id = '00000000-0000-4000-8000-000000000001'
    const r = ofertaDesde({
      transporte: true,
      puertos_origen: [{ id, nombre: 'Iquique', activo: true }],
      puertos_destino: [],
      navieras: [],
    })
    expect(r?.puertosOrigen[0]?.nombre).toBe('Iquique')
    expect(ofertaDesde({})).toBeNull()
  })
})
