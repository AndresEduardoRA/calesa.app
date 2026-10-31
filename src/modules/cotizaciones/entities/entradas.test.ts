import { describe, expect, it } from 'vitest'
import {
  alternarBandera,
  confirmar,
  ENTRADAS_VACIAS,
  elegirAtajo,
  elegirModo,
  elegirVariante,
  entradasIniciales,
  entradasDelPedido,
  indiceDeHoja,
  restablecer,
  type Entradas,
} from './entradas'
import { hojaDePrueba } from './hoja-de-prueba.soporte'

const indice = indiceDeHoja(hojaDePrueba().secciones)
const ctx = { indice }
const con = (e: Partial<Entradas>): Entradas => ({ ...ENTRADAS_VACIAS, ...e })

describe('indiceDeHoja', () => {
  it('sabe qué es cada id: celdas, los dos lados de un par, interruptores, subtotales y la variante', () => {
    expect(indice.celdas.get('fees')?.nodo).toBe('fees')
    expect(indice.lados.get('fees')).toMatchObject({ lado: 'principal' })
    expect(indice.lados.get('fees_pct')).toMatchObject({ lado: 'secundario' })
    expect(indice.lados.get('fees_pct')?.celda.nodo).toBe('fees')
    expect(indice.interruptores.get('mostrar_garantia')?.efecto).toBe('muestra')
    expect(indice.subtotales.has('cif')).toBe(true)
    expect(indice.variante?.porDefecto).toBe('gasolina')
    expect(indice.opciones.get('moto')).toBe('Moto')
  })
})

describe('confirmar: lo que una celda emitió', () => {
  it('un input va a inputs y un sobrescribible, una constante o un tipo de cambio, a overrides', () => {
    expect(confirmar(ENTRADAS_VACIAS, ctx, 'remate', 9500).inputs.get('remate')).toBe(9500)
    expect(confirmar(ENTRADAS_VACIAS, ctx, 'remate', 9500).overrides.size).toBe(0)
    for (const id of ['fees', 'iva_c', 'tc', 'factor']) {
      const e = confirmar(ENTRADAS_VACIAS, ctx, id, 1)
      expect(e.overrides.get(id)).toBe(1)
      expect(e.inputs.size).toBe(0)
    }
  })

  it('vaciar la celda (null) quita lo tipeado, y no toca lo demás', () => {
    const antes = con({
      inputs: new Map([
        ['remate', 5],
        ['otro', 1],
      ]),
    })
    const e = confirmar(antes, ctx, 'remate', null)
    expect([...e.inputs]).toEqual([['otro', 1]])
  })

  it('el porcentaje de un par quita el override del monto: si no, el monto mandaría y lo tipeado no se vería', () => {
    const antes = con({ overrides: new Map([['fees', 1300]]) })
    const e = confirmar(antes, ctx, 'fees_pct', 0.12)
    expect([...e.overrides]).toEqual([['fees_pct', 0.12]])
  })

  it('el monto de un par no toca su porcentaje', () => {
    const antes = con({ overrides: new Map([['fees_pct', 0.12]]) })
    const e = confirmar(antes, ctx, 'fees', 1300)
    expect(e.overrides.get('fees_pct')).toBe(0.12)
    expect(e.overrides.get('fees')).toBe(1300)
  })

  it('un porcentaje que es un input (lo dice la lectura: tipoDeNodo) va a inputs, aunque no haya respuesta; una constante, a overrides', () => {
    const conPct = (tipoDeNodo: 'input' | 'constante') =>
      indiceDeHoja(
        hojaDePrueba().secciones.map((s) => ({
          ...s,
          items: s.items.map((i) =>
            i.tipo === 'celda' && i.nodo === 'fees' && i.secundario
              ? { ...i, secundario: { ...i.secundario, tipoDeNodo } }
              : i,
          ),
        })),
      )
    const comoInput = confirmar(ENTRADAS_VACIAS, { indice: conPct('input') }, 'fees_pct', 0.1)
    expect(comoInput.inputs.get('fees_pct')).toBe(0.1)
    expect(comoInput.overrides.size).toBe(0)
    const comoConstante = confirmar(
      ENTRADAS_VACIAS,
      { indice: conPct('constante') },
      'fees_pct',
      0.1,
    )
    expect(comoConstante.overrides.get('fees_pct')).toBe(0.1)
    expect(comoConstante.inputs.size).toBe(0)
  })

  it('un id que la hoja no dibuja no cambia nada', () => {
    expect(confirmar(ENTRADAS_VACIAS, ctx, 'nada', 1)).toBe(ENTRADAS_VACIAS)
  })

  it('un id como «constructor» no se confunde con el prototipo', () => {
    expect(confirmar(ENTRADAS_VACIAS, ctx, 'constructor', 1)).toBe(ENTRADAS_VACIAS)
  })

  it('no muta las entradas anteriores', () => {
    const antes = con({ inputs: new Map([['remate', 5]]) })
    confirmar(antes, ctx, 'remate', 6)
    expect(antes.inputs.get('remate')).toBe(5)
  })
})

describe('restablecer (↺)', () => {
  it('quita el override del nodo y, en un par, también el de su porcentaje', () => {
    const antes = con({
      overrides: new Map([
        ['fees', 1],
        ['fees_pct', 2],
        ['iva_c', 3],
      ]),
    })
    expect([...restablecer(antes, indice, 'fees').overrides]).toEqual([['iva_c', 3]])
  })

  it('no toca lo tipeado en un input', () => {
    const antes = con({ inputs: new Map([['remate', 5]]) })
    expect(restablecer(antes, indice, 'remate').inputs.get('remate')).toBe(5)
  })
})

describe('banderas, variante y atajos', () => {
  it('una bandera se enciende y se apaga; sólo las encendidas viajan', () => {
    const encendida = alternarBandera(ENTRADAS_VACIAS, 'cuenta', true)
    expect(entradasDelPedido(encendida).banderas).toEqual({ cuenta: true })
    expect(entradasDelPedido(alternarBandera(encendida, 'cuenta', false)).banderas).toEqual({})
  })

  it('la variante elegida viaja; sin elegir no viaja y manda la de la fórmula', () => {
    expect(entradasDelPedido(ENTRADAS_VACIAS)).toEqual({ inputs: {}, banderas: {}, overrides: {} })
    expect(entradasDelPedido(elegirVariante(ENTRADAS_VACIAS, 'moto')).variante).toBe('moto')
  })

  it('un chip pone el valor del nodo y recuerda cuál fue, aunque otro chip valga lo mismo', () => {
    const e = elegirAtajo(ENTRADAS_VACIAS, ctx, 'factor', { posicion: 1, valor: 0.328 })
    expect(e.overrides.get('factor')).toBe(0.328)
    expect(e.atajos.get('factor')).toBe(1)
  })

  it('el pedido lleva los números tal cual, sin un Map ni un Set', () => {
    const e = confirmar(alternarBandera(ENTRADAS_VACIAS, 'cuenta', true), ctx, 'remate', 9500)
    expect(JSON.parse(JSON.stringify(entradasDelPedido(e)))).toEqual({
      inputs: { remate: 9500 },
      banderas: { cuenta: true },
      overrides: {},
    })
  })
})

describe('los modos de tipo de cambio', () => {
  const MODOS = [
    { clave: 'paralelo', nombre: 'Paralelo' },
    { clave: 'unificado', nombre: 'Unificado' },
  ]
  const conModos = indiceDeHoja(hojaDePrueba().secciones, MODOS)

  it('el índice sabe los modos y el primero, y sin modos no hay inicial', () => {
    expect(conModos.modos).toEqual(new Set(['paralelo', 'unificado']))
    expect(conModos.modoInicial).toBe('paralelo')
    expect(indice.modos.size).toBe(0)
    expect(indice.modoInicial).toBeNull()
  })

  it('la hoja abre con el primer modo y nada más tipeado', () => {
    expect(entradasIniciales(conModos)).toEqual({ ...ENTRADAS_VACIAS, modoTc: 'paralelo' })
    expect(entradasIniciales(indice)).toEqual(ENTRADAS_VACIAS)
  })

  it('elegirModo cambia sólo el modo y no muta las entradas de antes', () => {
    const antes = entradasIniciales(conModos)
    const despues = elegirModo(antes, 'unificado')
    expect(despues).toEqual({ ...antes, modoTc: 'unificado' })
    expect(antes.modoTc).toBe('paralelo')
  })
})
