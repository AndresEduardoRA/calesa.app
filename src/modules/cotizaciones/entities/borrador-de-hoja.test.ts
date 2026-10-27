import { describe, expect, it } from 'vitest'
import { cambiosDeEstado } from '@/shared/lib/borrador'
import { entradasComoBorrador, entradasDelBorrador, esDescarte } from './borrador-de-hoja'
import { ENTRADAS_VACIAS, indiceDeHoja, type Entradas } from './entradas'
import { hojaDePrueba } from './hoja-de-prueba.soporte'

const INDICE = indiceDeHoja(hojaDePrueba().secciones)
const [nodo = '', otro = ''] = [...INDICE.lados.keys()]
const [bandera = ''] = [...INDICE.interruptores.keys()]
const [opcion = ''] = [...INDICE.opciones.keys()]
const TIPEADAS: Entradas = {
  inputs: new Map([[nodo, 10]]),
  banderas: new Set([bandera]),
  overrides: new Map([[otro, 20]]),
  variante: opcion,
  atajos: new Map([[nodo, 2]]),
}
const VACIO = entradasComoBorrador(ENTRADAS_VACIAS)
const idaYVuelta = (e: Entradas) =>
  entradasDelBorrador(
    JSON.parse(JSON.stringify(entradasComoBorrador(e))) as Record<string, unknown>,
    INDICE,
  )

describe('el borrador de la hoja', () => {
  it('ida y vuelta por JSON, igual', () => {
    expect(idaYVuelta(TIPEADAS)).toEqual(TIPEADAS)
  })

  it('sólo guarda lo tipeado: exactamente las cinco claves de las entradas, ni la respuesta ni la abierta', () => {
    expect(Object.keys(entradasComoBorrador(TIPEADAS)).sort()).toEqual([
      'atajos',
      'banderas',
      'inputs',
      'overrides',
      'variante',
    ])
  })

  it('contra una hoja que ya no tiene un nodo, una bandera, una opción o unos atajos, eso no vuelve y lo demás sí', () => {
    const b = {
      inputs: [
        [nodo, 1],
        ['ya_no_esta', 2],
      ],
      banderas: [bandera, 'bandera_vieja'],
      overrides: [['otro_viejo', 3]],
      variante: 'opcion_vieja',
      atajos: [['atajos_viejos', 1]],
    }
    expect(entradasDelBorrador(b, INDICE)).toEqual({
      inputs: new Map([[nodo, 1]]),
      banderas: new Set([bandera]),
      overrides: new Map(),
      variante: null,
      atajos: new Map(),
    })
  })

  it('«constructor» y «__proto__» no se cuelan, y lo ilegible se ignora', () => {
    const b = JSON.parse(
      '{"inputs":[["constructor",1],["__proto__",2]],"banderas":"no","overrides":7,"variante":3}',
    ) as Record<string, unknown>
    const e = entradasDelBorrador(b, INDICE)
    expect(e.inputs.size).toBe(0)
    expect(e).toEqual(ENTRADAS_VACIAS)
  })

  it('esDescarte distingue lo que repone de lo que pasa «Descartar»', () => {
    const repone = cambiosDeEstado(entradasComoBorrador(TIPEADAS), VACIO)
    expect(esDescarte(repone, VACIO)).toBe(false)
    const descarta = Object.fromEntries(
      Object.keys(repone).map((k) => [k, VACIO[k as keyof typeof VACIO]]),
    )
    expect(esDescarte(descarta, VACIO)).toBe(true)
  })
})
