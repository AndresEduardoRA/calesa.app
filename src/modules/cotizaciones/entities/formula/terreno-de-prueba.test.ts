import { describe, expect, it } from 'vitest'
import type { Formula } from '../formula'
import type { Nodo } from '../nodos'
import {
  aceptarPagina,
  avisosDelTerreno,
  clavesDeCambioDe,
  elegirTablas,
  entradaDePrueba,
  FILAS_POR_PAGINA,
  MAXIMO_DE_CLAVES_DE_CAMBIO,
  MAXIMO_DE_TABLAS_VIVAS,
  tablasVivasDe,
  TERRENO_VACIO,
  type TablaCandidata,
} from './terreno-de-prueba'

const formulaCon = (nodos: Nodo[], tablas: Record<string, never[]> = {}): Formula => ({
  definicion: { nodos },
  params: { constantes: {}, tablas },
})

const tramo = (id: string, tabla: string): Nodo => ({
  id,
  etiqueta: id,
  tipo: 'tramo',
  tabla,
  sobre: 'anio',
  columna: 'factor',
})
const tablaNodo = (id: string, tabla: string): Nodo => ({
  id,
  etiqueta: id,
  tipo: 'tabla',
  tabla,
  match: {},
  columna: 'costo',
})
const depreciar = (id: string, tabla: string): Nodo => ({
  id,
  etiqueta: id,
  tipo: 'calculo',
  op: 'depreciar',
  de: ['valor'],
  tabla,
  sobre: 'anio',
  columna: 'factor',
})
const cambio = (id: string, clave: string): Nodo => ({
  id,
  etiqueta: id,
  tipo: 'tipo_cambio',
  clave,
})

describe('tablasVivasDe', () => {
  it('toma las tablas de un nodo tabla, tramo o depreciar, sin repetir y en el orden de la lista', () => {
    const f = formulaCon([
      tramo('a', 'dep'),
      tablaNodo('b', 'flete'),
      depreciar('c', 'dep'),
      depreciar('d', 'seguro'),
    ])
    expect(tablasVivasDe(f)).toEqual(['dep', 'flete', 'seguro'])
  })

  it('no cuenta la que la fórmula congeló, aunque esté vacía (D5)', () => {
    const f = formulaCon([tramo('a', 'dep'), tablaNodo('b', 'flete')], { dep: [] })
    expect(tablasVivasDe(f)).toEqual(['flete'])
  })

  it('una fórmula sin tablas no tiene vivas', () => {
    expect(tablasVivasDe(formulaCon([cambio('tc', 'oficial')]))).toEqual([])
  })
})

describe('clavesDeCambioDe', () => {
  it('toma las claves de los nodos tipo_cambio sin repetir', () => {
    const f = formulaCon([cambio('a', 'oficial'), cambio('b', 'paralelo'), cambio('c', 'oficial')])
    expect(clavesDeCambioDe(f)).toEqual(['oficial', 'paralelo'])
  })
})

describe('elegirTablas (paridad con evaluar_formula(): base.sql, «las tablas vivas»)', () => {
  const origen = '11111111-1111-4111-8111-111111111111'
  const otro = '22222222-2222-4222-8222-222222222222'
  const t = (
    id: string,
    origen_id: string | null,
    clave: string,
    activa = true,
  ): TablaCandidata => ({
    id,
    origen_id,
    clave,
    activa,
  })

  it('la del origen gana a la compartida', () => {
    const r = elegirTablas([t('c', null, 'dep'), t('o', origen, 'dep')], origen)
    expect(r.get('dep')).toBe('o')
    const r2 = elegirTablas([t('o', origen, 'dep'), t('c', null, 'dep')], origen)
    expect(r2.get('dep')).toBe('o')
  })

  it('sin una del origen, la compartida', () => {
    expect(elegirTablas([t('c', null, 'dep')], origen).get('dep')).toBe('c')
  })

  it('la del origen inactiva con una compartida activa: la compartida', () => {
    expect(
      elegirTablas([t('o', origen, 'dep', false), t('c', null, 'dep')], origen).get('dep'),
    ).toBe('c')
  })

  it('una inactiva sola no está, y la de otro origen no cuenta', () => {
    expect(elegirTablas([t('c', null, 'dep', false)], origen).has('dep')).toBe(false)
    expect(elegirTablas([t('x', otro, 'dep')], origen).has('dep')).toBe(false)
  })
})

describe('aceptarPagina', () => {
  const fila = (tabla_id: string, n: number) => ({ tabla_id, valores: { n } })
  const filasDe = (tabla_id: string, cuantas: number) =>
    Array.from({ length: cuantas }, (_, n) => fila(tabla_id, n))

  it('una página de menos de 1.000 filas deja enteras todas las pendientes (y vacías las sin filas)', () => {
    const r = aceptarPagina(['a', 'b', 'c'], [...filasDe('a', 3), ...filasDe('c', 2)])
    expect([...r.aceptadas.keys()]).toEqual(['a', 'b', 'c'])
    expect(r.aceptadas.get('b')).toEqual([])
    expect(r.aceptadas.get('c')).toHaveLength(2)
    expect(r.pendientes).toEqual([])
    expect(r.descartada).toBeNull()
  })

  it('una de 1.000 con dos tablas: la última queda pendiente y la anterior se acepta', () => {
    const r = aceptarPagina(['a', 'b'], [...filasDe('a', 600), ...filasDe('b', 400)])
    expect([...r.aceptadas.keys()]).toEqual(['a'])
    expect(r.aceptadas.get('a')).toHaveLength(600)
    expect(r.pendientes).toEqual(['b'])
    expect(r.descartada).toBeNull()
  })

  it('una de 1.000 con una sola tabla: tiene 1.000 o más y se descarta', () => {
    const r = aceptarPagina(['a', 'b'], filasDe('a', FILAS_POR_PAGINA))
    expect(r.aceptadas.size).toBe(0)
    expect(r.descartada).toBe('a')
    expect(r.pendientes).toEqual(['b'])
  })

  it('con conjuntos: las que la página no alcanzó siguen pendientes, nunca se aceptan vacías', () => {
    const r = aceptarPagina(['a', 'b', 'c'], [...filasDe('a', 500), ...filasDe('b', 500)])
    expect([...r.aceptadas.keys()]).toEqual(['a'])
    expect(r.pendientes).toEqual(['b', 'c'])
    expect(r.aceptadas.has('c')).toBe(false)
  })

  it('ignora lo que no estaba pendiente', () => {
    const r = aceptarPagina(['a'], [...filasDe('a', 2), ...filasDe('zz', 2)])
    expect([...r.aceptadas.keys()]).toEqual(['a'])
  })
})

describe('avisosDelTerreno', () => {
  it('dice un texto por caso, con el nombre del origen', () => {
    const textos = avisosDelTerreno(
      {
        ...TERRENO_VACIO,
        avisos: [
          { codigo: 'tabla_ausente', clave: 'dep' },
          { codigo: 'tabla_grande', clave: 'g' },
          { codigo: 'tabla_sin_leer', clave: 's' },
          { codigo: 'tabla_ilegible', clave: 'i' },
          { codigo: 'cambio_ausente', clave: 'oficial' },
          { codigo: 'mas_tablas' },
          { codigo: 'mas_cambios' },
        ],
      },
      'Miami',
    )
    expect(textos).toEqual([
      'No hay una tabla «dep» activa en Miami ni compartida.',
      'La tabla «g» tiene 1.000 filas o más: la vista previa no la lee.',
      'La tabla «s» no se pudo leer entera: la vista previa no la usa.',
      'La tabla «i» tiene filas que la fórmula no sabe leer.',
      'No hay un tipo de cambio activo «oficial».',
      `La fórmula nombra más de ${String(MAXIMO_DE_TABLAS_VIVAS)} tablas: se leen las primeras ${String(MAXIMO_DE_TABLAS_VIVAS)}.`,
      `La fórmula nombra más de ${String(MAXIMO_DE_CLAVES_DE_CAMBIO)} tipos de cambio: se leen los primeros ${String(MAXIMO_DE_CLAVES_DE_CAMBIO)}.`,
    ])
  })

  it('las claves de cambio que pasan del máximo no salen como «no hay»: sólo el aviso de más', () => {
    const textos = avisosDelTerreno({ ...TERRENO_VACIO, avisos: [{ codigo: 'mas_cambios' }] }, 'X')
    expect(textos).toHaveLength(1)
    expect(textos[0]).not.toContain('No hay un tipo de cambio')
  })
})

describe('entradaDePrueba', () => {
  it('los datos en 0, las opciones apagadas, sin variante ni overrides y el vehículo vacío', () => {
    const e = entradaDePrueba({
      tipos_cambio: { oficial: 6.96 },
      tablas: { dep: [{ desde: 0 }] },
      avisos: [],
    })
    expect(e.inputs).toEqual({})
    expect(e.banderas).toEqual({})
    expect(e.variante).toBeUndefined()
    expect(e.overrides).toEqual({})
    expect(e.vehiculo).toEqual({})
    expect(e.tipos_cambio).toEqual({ oficial: 6.96 })
    expect(e.tablas).toEqual({ dep: [{ desde: 0 }] })
  })
})
