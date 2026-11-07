import { describe, expect, it } from 'vitest'
import type { Formula } from '../formula'
import { compilarFila } from './compilar-fila'
import { conElAjuste, formulaDePrueba, nodoDe } from './fila-de-prueba.soporte'
import { textoVigente } from './texto-vigente'

const TEXTO = '=(remate+fees)*4%'
const f = () => formulaDePrueba([{ id: 'total', texto: TEXTO }])

describe('textoVigente: 4-5, el ⚙ de un número del texto (T8, C7)', () => {
  it('⚙ 0,04 → 0,05 sobre total__2: reescrito, el texto dice 5%', () => {
    const g = conElAjuste(f(), 'total__2', 0.05)
    expect(textoVigente(g, 'total')).toEqual({
      estado: 'reescrito',
      texto: '=(remate+fees)*5%',
      cambios: [{ id: 'total__2', enElTexto: 0.04, guardado: 0.05 }],
    })
  })

  it('recompilar el texto reescrito deja el 0,05: el ⚙ no se deshace', () => {
    const g = conElAjuste(f(), 'total__2', 0.05)
    const v = textoVigente(g, 'total')
    if (v.estado !== 'reescrito') throw new Error(v.estado)
    const r = compilarFila(g, { destino: { existente: 'total' }, texto: v.texto })
    if (!r.ok) throw new Error(JSON.stringify(r.error))
    expect(r.formula.params.constantes['total__2']).toBe(0.05)
    expect(textoVigente(r.formula, 'total')).toEqual({
      estado: 'al_dia',
      texto: v.texto,
      cambios: [],
    })
  })

  it('varios literales se reescriben cada uno en su tramo', () => {
    const g0 = formulaDePrueba([{ id: 'total', texto: '=(remate+fees)*4%+10-0.5' }])
    const ids = Object.keys(g0.params.constantes)
    expect(ids.length).toBe(3)
    const g = conElAjuste(conElAjuste(g0, ids[0] ?? '', 0.1), ids[2] ?? '', 2)
    const v = textoVigente(g, 'total')
    expect(v).toMatchObject({ estado: 'reescrito', texto: '=(remate+fees)*10%+10-2' })
  })

  it('una constante sola (la raíz) se reescribe también', () => {
    const g0 = formulaDePrueba([{ id: 'total', texto: '=4%' }])
    expect(textoVigente(conElAjuste(g0, 'total', 0.07), 'total')).toMatchObject({
      estado: 'reescrito',
      texto: '=7%',
    })
  })
})

describe('textoVigente: cuándo el texto ya no manda (T9, C9)', () => {
  it('sin ⚙ está al día con el texto tal cual', () => {
    expect(textoVigente(f(), 'total')).toEqual({ estado: 'al_dia', texto: TEXTO, cambios: [] })
  })

  it('⚙ a −3: no manda, valor no escribible, con el texto guardado', () => {
    const v = textoVigente(conElAjuste(f(), 'total__2', -3), 'total')
    expect(v).toMatchObject({ estado: 'no_manda', texto: TEXTO, motivo: 'valor_no_escribible' })
    expect(v).toMatchObject({ cambios: [{ id: 'total__2', enElTexto: 0.04, guardado: -3 }] })
  })

  it('⚙ a -0: no manda (sólo lo ve la verificación por recompilación)', () => {
    const v = textoVigente(conElAjuste(f(), 'total__2', -0), 'total')
    expect(v).toMatchObject({ estado: 'no_manda', texto: TEXTO, motivo: 'valor_no_escribible' })
  })

  it('un nodo editado a mano: otra estructura', () => {
    const g = f()
    const editado: Formula = {
      ...g,
      definicion: {
        ...g.definicion,
        nodos: g.definicion.nodos.map((n) =>
          n.id === 'total' && n.tipo === 'calculo' && n.op === 'multiplicar'
            ? { ...n, de: [...n.de].reverse() }
            : n,
        ),
      },
    }
    expect(textoVigente(editado, 'total')).toMatchObject({
      estado: 'no_manda',
      texto: TEXTO,
      motivo: 'otra_estructura',
    })
  })

  it('una fila anterior borrada: no compila', () => {
    const g = f()
    const sinFees: Formula = {
      ...g,
      definicion: { ...g.definicion, nodos: g.definicion.nodos.filter((n) => n.id !== 'fees') },
    }
    expect(textoVigente(sinFees, 'total')).toMatchObject({
      estado: 'no_manda',
      texto: TEXTO,
      motivo: 'no_compila',
    })
  })

  it('una fila sin texto o que no existe no tiene texto vigente', () => {
    const g = f()
    expect(textoVigente(g, 'remate')).toEqual({ estado: 'sin_texto' })
    expect(textoVigente(g, 'no_existe')).toEqual({ estado: 'sin_texto' })
  })

  it('el texto guardado no se toca', () => {
    const g = conElAjuste(f(), 'total__2', 0.05)
    const antes = structuredClone(g)
    textoVigente(g, 'total')
    expect(g).toStrictEqual(antes)
    expect(nodoDe(g, 'total')).toMatchObject({ texto: TEXTO })
  })

  it('un ⚙ sobre una auxiliar que otra fila nombra se reescribe en el texto', () => {
    const g0 = formulaDePrueba([
      { id: 'total', texto: TEXTO },
      { id: 'otra', texto: '=total__2*2' },
    ])
    expect(textoVigente(conElAjuste(g0, 'total__2', 0.05), 'total')).toMatchObject({
      estado: 'reescrito',
      texto: '=(remate+fees)*5%',
    })
  })
})
