import { describe, expect, it } from 'vitest'
import { ofertaDesde, opcionesDeTransporte, type ElementoDeOferta } from './oferta'

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const el = (n: number, nombre: string, activo = true): ElementoDeOferta => ({
  id: id(n),
  nombre,
  activo,
})

const catalogo = [el(1, 'Maersk'), el(2, 'CMA', true), el(3, 'Hapag', false)]

describe('opcionesDeTransporte', () => {
  it('con la oferta vacía ofrece todos los activos del catálogo, por nombre', () => {
    const r = opcionesDeTransporte({ ofrecidos: [], catalogo, guardado: null, femenino: true })
    expect(r.map((o) => o.etiqueta)).toEqual(['CMA', 'Maersk'])
  })

  it('con elementos en la oferta ofrece sólo esos', () => {
    const r = opcionesDeTransporte({
      ofrecidos: [el(1, 'Maersk')],
      catalogo,
      guardado: null,
      femenino: true,
    })
    expect(r).toEqual([{ valor: id(1), etiqueta: 'Maersk' }])
  })

  it('lo guardado que se desactivó sigue, rotulado según el género', () => {
    const naviera = opcionesDeTransporte({
      ofrecidos: [],
      catalogo,
      guardado: id(3),
      femenino: true,
    })
    expect(naviera.at(-1)).toEqual({ valor: id(3), etiqueta: 'Hapag (inactiva)' })
    const puerto = opcionesDeTransporte({
      ofrecidos: [],
      catalogo,
      guardado: id(3),
      femenino: false,
    })
    expect(puerto.at(-1)?.etiqueta).toBe('Hapag (inactivo)')
  })

  it('lo guardado que ya no se ofrece sigue, rotulado «fuera de la oferta»', () => {
    const r = opcionesDeTransporte({
      ofrecidos: [el(1, 'Maersk')],
      catalogo,
      guardado: id(2),
      femenino: true,
    })
    expect(r.at(-1)).toEqual({ valor: id(2), etiqueta: 'CMA (fuera de la oferta)' })
  })

  it('un ofrecido que se desactivó no se ofrece como nuevo, pero lo guardado sigue', () => {
    const r = opcionesDeTransporte({
      ofrecidos: [el(3, 'Hapag', false)],
      catalogo,
      guardado: id(3),
      femenino: true,
    })
    expect(r).toEqual([{ valor: id(3), etiqueta: 'Hapag (inactiva)' }])
  })

  it('lo guardado que está en la oferta no se repite', () => {
    const r = opcionesDeTransporte({
      ofrecidos: catalogo,
      catalogo,
      guardado: id(1),
      femenino: true,
    })
    expect(r.filter((o) => o.valor === id(1))).toHaveLength(1)
  })

  it('lo guardado que el catálogo ya no nombra se muestra sin perderlo', () => {
    const r = opcionesDeTransporte({ ofrecidos: [], catalogo, guardado: id(9), femenino: true })
    expect(r.at(-1)?.valor).toBe(id(9))
  })
})

describe('ofertaDesde', () => {
  it('lee la forma de flujo_oferta y rechaza otra', () => {
    const ok = ofertaDesde({
      transporte: true,
      puertos_origen: [],
      puertos_destino: [],
      navieras: [el(1, 'A')],
    })
    expect(ok?.navieras).toHaveLength(1)
    expect(ofertaDesde({ transporte: 'sí' })).toBeNull()
  })
})
