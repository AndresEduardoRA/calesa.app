import { describe, expect, it } from 'vitest'
import { areasCubiertas, nombresDeUnaLista } from './areas-cubiertas.mjs'

const lista = (...lineas: string[]) =>
  `Listing tests:\n${lineas.map((l) => `  ${l}`).join('\n')}\nTotal: ${String(lineas.length)} tests in 1 file\n`

describe('areas cubiertas: la salida de --list', () => {
  it('el nombre es «archivo › título», sin la línea ni el proyecto', () => {
    const nombres = nombresDeUnaLista(
      lista(
        '[movil] › a.spec.ts:12:5 › una prueba: con › dos puntos',
        '[movil] › b.spec.ts:3:1 › otra',
      ),
    )
    expect([...nombres]).toEqual(['a.spec.ts › una prueba: con › dos puntos', 'b.spec.ts › otra'])
  })
})

describe('areas cubiertas: lo que sale de un proyecto sigue en el otro o bajó', () => {
  const set = (...n: string[]) => new Set(n)
  const antes = {
    escritorio: set('a › 1', 'a › 2', 'b › 1'),
    movil: set('a › 1', 'a › 2', 'b › 1'),
  }

  it('una prueba que sale del celular y sigue en el escritorio está cubierta', () => {
    const r = areasCubiertas({
      antes,
      despues: { escritorio: antes.escritorio, movil: set('a › 1') },
    })
    expect(r.salenDeMovil).toEqual(['a › 2', 'b › 1'])
    expect(r.sinCubrir).toEqual([])
  })

  it('una que se borra de los dos sin decir qué la cubre queda sin cubrir', () => {
    const r = areasCubiertas({
      antes,
      despues: { escritorio: set('a › 1', 'a › 2'), movil: set('a › 1', 'a › 2') },
    })
    expect(r.sinCubrir).toEqual(['b › 1'])
  })

  it('una que bajó de nivel dice la prueba que la cubre', () => {
    const r = areasCubiertas({
      antes,
      despues: { escritorio: set('a › 1', 'a › 2'), movil: set('a › 1', 'a › 2') },
      bajadas: { 'b › 1': 'humo.sql › marcas de un lead ajeno' },
    })
    expect(r.sinCubrir).toEqual([])
    expect(r.detalle.map((d) => d.sigue)).toContain('bajó: humo.sql › marcas de un lead ajeno')
  })
})
