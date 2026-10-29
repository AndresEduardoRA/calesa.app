import { describe, expect, it } from 'vitest'
import type { ContextoDeHoja } from './binding'
import { ENTRADAS_VACIAS, indiceDeHoja } from './entradas'
import { hojaDesde, type CeldaDeHoja, type HojaLista, type SeccionDeHoja } from './hoja'
import { crudaDeLaHoja, respuestaDePrueba } from './hoja-de-prueba.soporte'
import {
  ayudaDeTexto,
  celdaConAyudaDeTexto,
  hayDatosPorRevisar,
  ordenDeLaHoja,
  titulosDeAvanzado,
} from './presentacion-de-la-hoja'

const celda = (nodo: string, mas: Record<string, unknown> = {}) => ({
  tipo: 'celda',
  nodo,
  etiqueta: nodo.toUpperCase(),
  tipo_nodo: 'input',
  ajustes: false,
  ancho: 'completo',
  formato: 'usd',
  editable: true,
  ...mas,
})

// Sin título, la clave no viaja (la base no manda nulos).
const seccion = (id: string, presentacion: string, titulo: string | null, items: unknown[]) => ({
  id,
  ...(titulo === null ? {} : { titulo }),
  presentacion,
  items,
})

// Principal, avanzada, principal, avanzada: las dos avanzadas van juntas, donde estaba la primera.
function hojaCon(secciones: unknown[]): HojaLista {
  const hoja = hojaDesde({ ...crudaDeLaHoja(), secciones })
  if (hoja?.estado !== 'lista') {
    throw new Error('La hoja de prueba no se leyó.')
  }
  return hoja
}

const DOS_AVANZADAS = hojaCon([
  seccion('a', 'principal', 'A', [celda('a1')]),
  seccion('x', 'avanzado', 'Componentes CIF', [
    celda('x1', { ayuda: { texto: 'Cómo se usa x1' } }),
  ]),
  seccion('b', 'principal', 'B', [celda('b1', { ayuda: { texto: 'Cómo se usa b1' } })]),
  seccion('y', 'avanzado', 'Póliza', [celda('y1', { ayuda: { tabla: 'poliza' } })]),
])

const contexto = (
  hoja: HojaLista,
  respuesta: ReturnType<typeof respuestaDePrueba> | null = respuestaDePrueba({
    valores: { a1: 1, x1: 2, b1: 3, y1: 4 },
  }),
): ContextoDeHoja => ({
  indice: indiceDeHoja(hoja.secciones),
  entradas: ENTRADAS_VACIAS,
  respuesta,
})

const ids = (secciones: readonly SeccionDeHoja[]) => secciones.map((s) => s.id)

describe('ordenDeLaHoja: el botón «Avanzado» va donde estaba la primera avanzada', () => {
  it('las principales en su orden y las avanzadas juntas en el lugar de la primera', () => {
    const orden = ordenDeLaHoja(DOS_AVANZADAS.secciones)
    expect(orden.map((l) => l.tipo)).toEqual(['seccion', 'avanzado', 'seccion'])
    const avanzado = orden[1]
    expect(avanzado?.tipo === 'avanzado' ? ids(avanzado.secciones) : null).toEqual(['x', 'y'])
    expect(orden.flatMap((l) => (l.tipo === 'seccion' ? [l.seccion.id] : []))).toEqual(['a', 'b'])
  })

  it('sin ninguna avanzada no hay botón', () => {
    const hoja = hojaCon([seccion('a', 'principal', 'A', [celda('a1')])])
    expect(ordenDeLaHoja(hoja.secciones).map((l) => l.tipo)).toEqual(['seccion'])
  })

  it('una sola avanzada al principio abre el orden con el botón', () => {
    const hoja = hojaCon([
      seccion('x', 'avanzado', 'X', [celda('x1')]),
      seccion('a', 'principal', 'A', [celda('a1')]),
    ])
    expect(ordenDeLaHoja(hoja.secciones).map((l) => l.tipo)).toEqual(['avanzado', 'seccion'])
  })

  it('sin secciones no hay nada', () => {
    expect(ordenDeLaHoja([])).toEqual([])
  })
})

describe('titulosDeAvanzado: lo que dice el botón de lo que esconde', () => {
  it('los títulos en su orden, separados por « · »', () => {
    expect(
      titulosDeAvanzado(DOS_AVANZADAS.secciones.filter((s) => s.presentacion === 'avanzado')),
    ).toBe('Componentes CIF · Póliza')
  })

  it('una sección sin título no se nombra', () => {
    const hoja = hojaCon([
      seccion('x', 'avanzado', null, [celda('x1')]),
      seccion('y', 'avanzado', 'Póliza', [celda('y1')]),
    ])
    expect(titulosDeAvanzado(hoja.secciones)).toBe('Póliza')
  })

  it('sin ningún título, nada', () => {
    const hoja = hojaCon([seccion('x', 'avanzado', null, [celda('x1')])])
    expect(titulosDeAvanzado(hoja.secciones)).toBe('')
  })
})

describe('hayDatosPorRevisar: un aviso en lo que el botón esconde', () => {
  const avanzadas = DOS_AVANZADAS.secciones.filter((s) => s.presentacion === 'avanzado')

  it('con un dato que falta en una celda de «Avanzado», sí', () => {
    const c = contexto(DOS_AVANZADAS, respuestaDePrueba({ valores: { a1: 1, b1: 3, y1: 4 } }))
    expect(hayDatosPorRevisar(avanzadas, c)).toBe(true)
  })

  it('con todo al día en «Avanzado», no', () => {
    expect(hayDatosPorRevisar(avanzadas, contexto(DOS_AVANZADAS))).toBe(false)
  })

  it('un aviso en una celda de la hoja no cuenta', () => {
    const c = contexto(DOS_AVANZADAS, respuestaDePrueba({ valores: { x1: 2, y1: 4 } }))
    expect(hayDatosPorRevisar(avanzadas, c)).toBe(false)
  })

  it('sin respuesta no hay aviso que dar', () => {
    expect(hayDatosPorRevisar(avanzadas, contexto(DOS_AVANZADAS, null))).toBe(false)
  })
})

describe('ayudaDeTexto: sólo el texto; una tabla es del 4.13-4c', () => {
  const de = (nodo: string): CeldaDeHoja => {
    const c = contexto(DOS_AVANZADAS).indice.celdas.get(nodo)
    if (!c) {
      throw new Error(`No hay ${nodo}`)
    }
    return c
  }

  it('devuelve el texto de una ayuda de texto', () => {
    expect(ayudaDeTexto(de('b1'))).toBe('Cómo se usa b1')
  })

  it('una ayuda de tabla no devuelve nada', () => {
    expect(ayudaDeTexto(de('y1'))).toBeNull()
  })

  it('una celda sin ayuda no devuelve nada', () => {
    expect(ayudaDeTexto(de('a1'))).toBeNull()
  })
})

describe('celdaConAyudaDeTexto: la URL no abre lo que la hoja no muestra', () => {
  const c = contexto(DOS_AVANZADAS)
  const principales = DOS_AVANZADAS.secciones.filter((s) => s.presentacion === 'principal')
  const avanzadas = DOS_AVANZADAS.secciones.filter((s) => s.presentacion === 'avanzado')

  it('encuentra la celda con ayuda de texto en las secciones que se miran', () => {
    expect(celdaConAyudaDeTexto(principales, 'b1', c)?.nodo).toBe('b1')
    expect(celdaConAyudaDeTexto(avanzadas, 'x1', c)?.nodo).toBe('x1')
  })

  it('una celda de otra parte (la de «Avanzado» con el modal cerrado) no se abre', () => {
    expect(celdaConAyudaDeTexto(principales, 'x1', c)).toBeNull()
  })

  it('una tabla, una celda sin ayuda, un id inventado o la falta de nodo no abren nada', () => {
    expect(celdaConAyudaDeTexto(avanzadas, 'y1', c)).toBeNull()
    expect(celdaConAyudaDeTexto(principales, 'a1', c)).toBeNull()
    expect(celdaConAyudaDeTexto(principales, 'no_existe', c)).toBeNull()
    expect(celdaConAyudaDeTexto(principales, null, c)).toBeNull()
  })
})
