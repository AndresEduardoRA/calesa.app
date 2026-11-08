import { describe, expect, it } from 'vitest'
import { esquemaDefinicion } from '../formula'
import { deduccionesDelDiseno } from './deduccion'
import { celda, disenoDe, formulaDePrueba, seccion } from './diseno-de-prueba.soporte'

const enCostos = { nivel_ver: 'costos', nivel_editar: 'costos' }
const abierta = [celda('a'), celda('c')]

describe('deduccionesDelDiseno (aviso «se deduce restando»)', () => {
  it('T3 · un sumando oculto en un nivel con los demás visibles avisa; sin nivel, nada', () => {
    const con = disenoDe([seccion('s', [...abierta, celda('b', enCostos), celda('total')])])
    expect(deduccionesDelDiseno(formulaDePrueba, con)).toEqual([
      { suma: 'total', oculto: 'b', nivel: 'costos' },
    ])
    const sin = disenoDe([seccion('s', [...abierta, celda('b'), celda('total')])])
    expect(deduccionesDelDiseno(formulaDePrueba, sin)).toEqual([])
  })

  it('T4 · dos ocultos, uno sin dibujar o la suma oculta no avisan; dos niveles son dos avisos', () => {
    const dosEnElNivel = disenoDe([
      seccion('s', [celda('a', enCostos), celda('b', enCostos), celda('c'), celda('total')]),
    ])
    expect(deduccionesDelDiseno(formulaDePrueba, dosEnElNivel)).toEqual([])

    const unoSinDibujar = disenoDe([
      seccion('s', [celda('a'), celda('b', enCostos), celda('total')]),
    ])
    expect(deduccionesDelDiseno(formulaDePrueba, unoSinDibujar)).toEqual([])

    // La suma misma no puede estar en un nivel (el total es para todos): se prueba con otra suma.
    const conSumaAparte = esquemaDefinicion.parse({
      nodos: [
        ...formulaDePrueba.nodos,
        { id: 'parcial', tipo: 'calculo', op: 'suma', de: ['a', 'b'], etiqueta: 'Parcial' },
      ],
    })
    const sumaOculta = disenoDe([
      seccion('s', [celda('a'), celda('b', enCostos), celda('c'), celda('total')]),
      seccion('p', [celda('parcial', enCostos)]),
    ])
    expect(deduccionesDelDiseno(conSumaAparte, sumaOculta)).toEqual([
      { suma: 'total', oculto: 'b', nivel: 'costos' },
    ])

    const dosNiveles = disenoDe([
      seccion('s', [
        celda('a'),
        celda('b', enCostos),
        celda('c', { nivel_ver: 'aduana', nivel_editar: 'aduana' }),
        celda('total'),
      ]),
    ])
    expect(deduccionesDelDiseno(formulaDePrueba, dosNiveles)).toEqual([
      { suma: 'total', oculto: 'b', nivel: 'costos' },
      { suma: 'total', oculto: 'c', nivel: 'aduana' },
    ])

    // Límite dicho: una resta no se avisa.
    const resta = disenoDe([seccion('s', [celda('a'), celda('b', enCostos), celda('neto')])])
    expect(deduccionesDelDiseno(formulaDePrueba, resta)).toEqual([])
  })
})
