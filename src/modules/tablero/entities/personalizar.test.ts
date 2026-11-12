import { describe, expect, it } from 'vitest'
import { alternarOculto, aPreferencia, filasDesde, moverFila, type Fila } from './personalizar'
import { aplicarPreferencia, type WidgetDelCatalogo } from './widgets'

function widget(clave: string): WidgetDelCatalogo {
  return {
    clave,
    titulo: clave,
    permisos: ['tablero.metricas.ver'],
    grupo: 'leads',
    tamano: 'cifra',
    disponible: true,
  }
}

const VISIBLES = ['a', 'b', 'c', 'd'].map(widget)
const filas = (...claves: string[]): Fila[] => claves.map((clave) => ({ clave, oculto: false }))
const claves = (lista: readonly Fila[]) => lista.map((fila) => fila.clave)

describe('moverFila', () => {
  it('sube y baja un lugar sin mutar la lista', () => {
    const original = filas('a', 'b', 'c')
    expect(claves(moverFila(original, 'b', 'subir'))).toEqual(['b', 'a', 'c'])
    expect(claves(moverFila(original, 'b', 'bajar'))).toEqual(['a', 'c', 'b'])
    expect(claves(original)).toEqual(['a', 'b', 'c'])
  })

  it('en los extremos o con una clave que no está, deja la lista como estaba', () => {
    const original = filas('a', 'b', 'c')
    expect(moverFila(original, 'a', 'subir')).toBe(original)
    expect(moverFila(original, 'c', 'bajar')).toBe(original)
    expect(moverFila(original, 'zzz', 'subir')).toBe(original)
  })

  it('lleva su estado de oculto consigo', () => {
    const movida = moverFila(
      [
        { clave: 'a', oculto: true },
        { clave: 'b', oculto: false },
      ],
      'a',
      'bajar',
    )
    expect(movida).toEqual([
      { clave: 'b', oculto: false },
      { clave: 'a', oculto: true },
    ])
  })
})

describe('alternarOculto', () => {
  it('oculta y, dos veces, vuelve a lo mismo', () => {
    const original = filas('a', 'b')
    const una = alternarOculto(original, 'b')
    expect(una).toEqual([
      { clave: 'a', oculto: false },
      { clave: 'b', oculto: true },
    ])
    expect(alternarOculto(una, 'b')).toEqual(original)
  })
})

describe('aPreferencia', () => {
  it('guarda todas las claves en orden y los ocultos aunque estén intercalados', () => {
    const lista: Fila[] = [
      { clave: 'a', oculto: false },
      { clave: 'b', oculto: true },
      { clave: 'c', oculto: false },
      { clave: 'd', oculto: true },
    ]
    expect(aPreferencia(lista)).toEqual({ orden: ['a', 'b', 'c', 'd'], ocultos: ['b', 'd'] })
  })
})

describe('filasDesde', () => {
  it('sin preferencia, el orden del catálogo y todo visible', () => {
    expect(filasDesde(VISIBLES, null)).toEqual(filas('a', 'b', 'c', 'd'))
  })

  it('con una clave vieja no sale y con un widget nuevo que no nombra, queda al final', () => {
    const resultado = filasDesde(VISIBLES, { orden: ['c', 'vieja', 'a'], ocultos: ['vieja', 'a'] })
    expect(resultado).toEqual([
      { clave: 'c', oculto: false },
      { clave: 'a', oculto: true },
      { clave: 'b', oculto: false },
      { clave: 'd', oculto: false },
    ])
  })

  it('ida y vuelta: lo que se guarda se lee como la misma disposición', () => {
    const lista = moverFila(alternarOculto(filasDesde(VISIBLES, null), 'b'), 'c', 'subir')
    const guardada = aPreferencia(lista)
    expect(filasDesde(VISIBLES, guardada)).toEqual(lista)
    const aplicada = aplicarPreferencia(VISIBLES, guardada)
    expect(aplicada.mostrados.map((w) => w.clave)).toEqual(['a', 'c', 'd'])
    expect(aplicada.ocultos.map((w) => w.clave)).toEqual(['b'])
  })
})
