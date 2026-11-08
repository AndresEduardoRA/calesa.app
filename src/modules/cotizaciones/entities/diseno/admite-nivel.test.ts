import { describe, expect, it } from 'vitest'
import { esquemaDefinicion } from '../formula'
import { celdaAdmiteNivel, itemAdmiteNivel, nodosPorId, seccionAdmiteNivel } from './admite-nivel'
import { celda, formulaDePrueba, seccion } from './diseno-de-prueba.soporte'

const nodos = nodosPorId(formulaDePrueba)

describe('admite-nivel (espejo de nivel_no_admitido)', () => {
  it('T1 · el total, lo que va aparte y la variante no admiten un nivel; una celda normal sí', () => {
    expect(itemAdmiteNivel(celda('total'), nodos)).toBe(false)
    expect(itemAdmiteNivel({ tipo: 'subtotal', nodo: 'total' }, nodos)).toBe(false)
    expect(itemAdmiteNivel({ tipo: 'variante', nodo: 'variante' }, nodos)).toBe(false)
    expect(itemAdmiteNivel({ tipo: 'subtotal', nodo: 'neto' }, nodos)).toBe(true)
    const normal = celda('a')
    expect(itemAdmiteNivel(normal, nodos)).toBe(true)
    expect(
      celdaAdmiteNivel({ ...celda('a'), tipo: 'celda', nodo: 'a', ancho: 'mitad' }, nodos),
    ).toBe(true)
  })

  it('T1 · una celda con secundario cuyo porcentaje va aparte tampoco', () => {
    const def = esquemaDefinicion.parse({
      nodos: [
        { id: 'a', tipo: 'input', etiqueta: 'A' },
        { id: 'tasa', tipo: 'constante', etiqueta: 'Tasa', formato: 'pct', salida: 'aparte' },
        {
          id: 'com',
          tipo: 'calculo',
          op: 'porcentaje_de',
          de: ['a'],
          pct: 'tasa',
          etiqueta: 'Comisión',
        },
      ],
    })
    const m = nodosPorId(def)
    expect(itemAdmiteNivel(celda('com', { secundario: 'porcentaje' }), m)).toBe(false)
    expect(itemAdmiteNivel(celda('com'), m)).toBe(true)
  })

  it('T1 · una sección que contiene uno de esos ítems no admite nivel de ver; las demás sí', () => {
    expect(seccionAdmiteNivel(seccion('s', [celda('a'), celda('total')]), nodos)).toBe(false)
    expect(seccionAdmiteNivel(seccion('s', [celda('a'), celda('b')]), nodos)).toBe(true)
  })
})
