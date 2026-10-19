import { describe, expect, it } from 'vitest'
import {
  comparar,
  decidir,
  extrasDelCelular,
  normalizar,
  primeraDiferencia,
} from './comparar-anchos.mjs'

type Paso = { m: string; s: string; x: string; u: string; n: number; h: string[] }
type Huella = {
  prueba: string
  proyecto: string
  pasos: Paso[]
  errores: string[]
  cobertura: Record<string, string>
}

const paso = (sobre: Partial<Paso> = {}): Paso => ({
  m: 'click',
  s: 'internal:role=button[name="Guardar"i]',
  x: '',
  u: '/leads',
  n: 1,
  h: ['button|||||'],
  ...sobre,
})

const huella = (proyecto: string, sobre: Partial<Huella> = {}): Huella => ({
  prueba: 'a.spec.ts › una prueba',
  proyecto,
  pasos: [paso()],
  errores: [],
  cobertura: {},
  ...sobre,
})

describe('comparar anchos: la huella de un paso', () => {
  it('el nombre del proyecto, los ids y las marcas de tiempo no cuentan', () => {
    expect(normalizar('Lead E2E escritorio 1792374955920')).toBe(
      normalizar('Lead E2E movil 1792374955921'),
    )
    expect(normalizar('a 0b8f6c1e-0000-4000-8000-000000000001')).toBe(
      normalizar('a ffffffff-0000-4000-8000-0000000000aa'),
    )
    expect(normalizar('Abrir Ana')).not.toBe(normalizar('Abrir Berta'))
  })

  it('los mismos pasos no difieren', () => {
    expect(
      primeraDiferencia([paso(), paso({ m: 'fill' })], [paso(), paso({ m: 'fill' })]),
    ).toBeNull()
  })

  it('una tabla contra una tarjeta es otra huella: la fila (tr) no es el artículo (li)', () => {
    const tabla = paso({ h: ['td|||||< tr|||||< table|||||'] })
    const tarjeta = paso({ h: ['div|||||< article|||||< li|||||< ul|||||'] })
    expect(primeraDiferencia([tabla], [tarjeta])?.paso).toBe(1)
  })

  it('un panel al costado contra uno desde abajo es otra huella (data-side)', () => {
    const derecha = paso({ h: ['div|dialog|Cambiar||right|true'] })
    const abajo = paso({ h: ['div|dialog|Cambiar||bottom|true'] })
    expect(primeraDiferencia([derecha], [abajo])?.paso).toBe(1)
  })

  it('un paso de más (el celular abre la hoja de filtros) es una diferencia', () => {
    const dif = primeraDiferencia([paso()], [paso(), paso({ m: 'click', s: 'Filtros' })])
    expect(dif?.paso).toBe(2)
    expect(dif?.escritorio).toBeNull()
  })

  it('cuántos elementos coinciden también cuenta (toHaveCount)', () => {
    expect(primeraDiferencia([paso({ n: 0 })], [paso({ n: 1 })])?.paso).toBe(1)
  })
})

describe('comparar anchos: el JS que el celular agrega', () => {
  it('una función que sólo llamó el celular y un bloque que el escritorio no ejecutó son extras', () => {
    const escritorio = huella('escritorio', { cobertura: { 'a.js|10': '20-30', 'a.js|50': '' } })
    const movil = huella('movil', {
      cobertura: { 'a.js|10': '', 'a.js|50': '', 'b.js|1': '' },
    })
    expect(extrasDelCelular(escritorio, movil).sort()).toEqual(['blk:a.js|10:20-30', 'fn:b.js|1'])
  })

  it('lo que el escritorio ejecutó de más no es un extra del celular', () => {
    const escritorio = huella('escritorio', { cobertura: { 'a.js|10': '', 'c.js|1': '' } })
    const movil = huella('movil', { cobertura: { 'a.js|10': '20-30' } })
    expect(extrasDelCelular(escritorio, movil)).toEqual([])
  })
})

describe('comparar anchos: quién puede salir del celular', () => {
  const mapa = (...hs: Huella[]) => new Map(hs.map((h) => [h.prueba, h]))

  it('una prueba con la misma huella, errores iguales y sin extras sale', () => {
    const e = huella('escritorio')
    const m = huella('movil')
    const [r] = decidir(comparar(mapa(e), mapa(m)), mapa(m)) as {
      sale: boolean
      veredicto: string
    }[]
    expect(r?.veredicto).toBe('IGUAL')
    expect(r?.sale).toBe(true)
  })

  it('una prueba con un paso distinto se queda, y la prueba que solo corrió en un proyecto también', () => {
    const e = huella('escritorio')
    const m = huella('movil', { pasos: [paso({ h: ['li|||||'] })] })
    const sola = huella('escritorio', { prueba: 'b.spec.ts › sola' })
    const r = decidir(comparar(mapa(e, sola), mapa(m)), mapa(m)) as {
      prueba: string
      sale: boolean
      veredicto: string
    }[]
    expect(r.map((x) => [x.veredicto, x.sale])).toEqual([
      ['DISTINTO', false],
      ['SOLO_UNO', false],
    ])
  })

  it('errores de consola distintos cuentan como una diferencia', () => {
    const e = huella('escritorio')
    const m = huella('movil', { errores: ['console: Hydration failed'] })
    const [r] = decidir(comparar(mapa(e), mapa(m)), mapa(m)) as { veredicto: string }[]
    expect(r?.veredicto).toBe('DISTINTO')
  })

  it('una igual con un JS del celular que nadie más ejecuta se queda; si otra prueba que se queda lo ejecuta, sale', () => {
    const e1 = huella('escritorio', { prueba: 'a.spec.ts › sola', cobertura: {} })
    const m1 = huella('movil', { prueba: 'a.spec.ts › sola', cobertura: { 'tarjetas.js|7': '' } })
    const sinCubrir = decidir(comparar(mapa(e1), mapa(m1)), mapa(m1)) as {
      sale: boolean
      razon: string
    }[]
    expect(sinCubrir[0]?.sale).toBe(false)
    expect(sinCubrir[0]?.razon).toContain('tarjetas.js|7')

    // Ahora hay una prueba distinta (se queda) que sí ejecuta ese JS en celular.
    const e2 = huella('escritorio', { prueba: 'b.spec.ts › mide', pasos: [paso()] })
    const m2 = huella('movil', {
      prueba: 'b.spec.ts › mide',
      pasos: [paso({ n: 2 })],
      cobertura: { 'tarjetas.js|7': '' },
    })
    const cubierto = decidir(comparar(mapa(e1, e2), mapa(m1, m2)), mapa(m1, m2)) as {
      prueba: string
      sale: boolean
    }[]
    expect(cubierto.find((x) => x.prueba === 'a.spec.ts › sola')?.sale).toBe(true)
    expect(cubierto.find((x) => x.prueba === 'b.spec.ts › mide')?.sale).toBe(false)
  })

  it('de dos iguales con el mismo extra se queda sólo una (la de menos pasos)', () => {
    const cob = { 'hoja.js|3': '' }
    const corta = { prueba: 'a.spec.ts › corta', pasos: [paso()] }
    const larga = { prueba: 'a.spec.ts › larga', pasos: [paso(), paso(), paso()] }
    const e = [huella('escritorio', corta), huella('escritorio', larga)]
    const m = [
      huella('movil', { ...corta, cobertura: cob }),
      huella('movil', { ...larga, cobertura: cob }),
    ]
    const r = decidir(comparar(mapa(...e), mapa(...m)), mapa(...m)) as {
      prueba: string
      sale: boolean
    }[]
    expect(r.find((x) => x.prueba === corta.prueba)?.sale).toBe(false)
    expect(r.find((x) => x.prueba === larga.prueba)?.sale).toBe(true)
  })
})
