import { describe, expect, it } from 'vitest'
import {
  SIN_COTIZACION_FINAL,
  SIN_VENTA_REGISTRADA,
  margenDesde,
  textosDelMargen,
  type Margen,
} from './margen'

const CATEGORIA = '0b6f1a0e-6a43-4c1e-9d3b-6c1d3f7a9e11'

const base: Margen = {
  cotizado: null,
  real: 0,
  desviacion: null,
  venta: null,
  margen: null,
  porCategoria: [],
}

const cifraDe = (m: Margen, clave: string) => textosDelMargen(m).find((c) => c.clave === clave)

describe('textosDelMargen', () => {
  it('cotizado y desviación nulos dicen «Sin cotización final», nunca 0', () => {
    for (const clave of ['cotizado', 'desviacion']) {
      const c = cifraDe(base, clave)
      expect(c?.monto).toBeNull()
      expect(c?.sinDato).toBe(SIN_COTIZACION_FINAL)
    }
  })

  it('venta y margen nulos dicen «Sin venta registrada», nunca 0', () => {
    for (const clave of ['venta', 'margen']) {
      const c = cifraDe(base, clave)
      expect(c?.monto).toBeNull()
      expect(c?.sinDato).toBe(SIN_VENTA_REGISTRADA)
    }
  })

  it('un 0 verdadero es un monto y no el texto del nulo', () => {
    const m = { ...base, cotizado: 100, desviacion: 0, venta: 0, margen: 0 }
    for (const clave of ['cotizado', 'desviacion', 'venta', 'margen', 'real']) {
      const c = cifraDe(m, clave)
      expect(c?.sinDato).toBeNull()
      expect(typeof c?.monto).toBe('number')
    }
    expect(cifraDe(m, 'desviacion')?.nota).toBe('igual a lo cotizado')
  })

  it('la desviación positiva y la negativa llevan su texto', () => {
    expect(cifraDe({ ...base, cotizado: 100, real: 80, desviacion: 20 }, 'desviacion')?.nota).toBe(
      'por debajo de lo cotizado',
    )
    expect(
      cifraDe({ ...base, cotizado: 100, real: 130, desviacion: -30 }, 'desviacion')?.nota,
    ).toBe('por encima de lo cotizado')
  })

  it('el real sin gastos es un 0 verdadero: un monto', () => {
    expect(cifraDe(base, 'real')?.monto).toBe(0)
  })
})

describe('margenDesde', () => {
  it('lee la respuesta de la base y conserva el orden de las categorías', () => {
    const m = margenDesde({
      cotizado: null,
      real: 150,
      desviacion: null,
      venta: null,
      margen: null,
      por_categoria: [
        { categoria_id: CATEGORIA, nombre: 'Flete', proposito: 'flete', real: 100 },
        {
          categoria_id: '7d1e2f3a-1b2c-4d5e-8f90-a1b2c3d4e5f6',
          nombre: 'Grúa',
          proposito: null,
          real: 50,
        },
      ],
    })
    expect(m?.porCategoria.map((c) => c.nombre)).toEqual(['Flete', 'Grúa'])
    expect(m?.venta).toBeNull()
  })

  it('una respuesta mal formada es nula', () => {
    expect(margenDesde({ real: 'x' })).toBeNull()
    expect(margenDesde(null)).toBeNull()
  })
})
