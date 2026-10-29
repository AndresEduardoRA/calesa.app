import { describe, expect, it } from 'vitest'
import type { ContextoDeHoja } from './binding'
import { ENTRADAS_VACIAS, indiceDeHoja } from './entradas'
import { hojaDesde, type CeldaDeHoja, type HojaLista, type SeccionDeHoja } from './hoja'
import { crudaDeLaHoja, respuestaDePrueba } from './hoja-de-prueba.soporte'
import {
  ayudaDeTexto,
  celdaConAyuda,
  hayDatosPorRevisar,
  ordenDeLaHoja,
  tablaDeAyuda,
  tipoDeAyuda,
  tiposDeAyuda,
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

describe('ayudaDeTexto y tablaDeAyuda: cada una, lo suyo', () => {
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

describe('tipoDeAyuda y tablaDeAyuda', () => {
  const de = (nodo: string): CeldaDeHoja => {
    const c = contexto(DOS_AVANZADAS).indice.celdas.get(nodo)
    if (!c) {
      throw new Error(`No hay ${nodo}`)
    }
    return c
  }

  it('dice si la ayuda es de texto, de una tabla o no hay', () => {
    expect(tipoDeAyuda(de('b1'))).toBe('texto')
    expect(tipoDeAyuda(de('y1'))).toBe('tabla')
    expect(tipoDeAyuda(de('a1'))).toBeNull()
  })

  it('la clave de la tabla, sólo si la ayuda es de una tabla', () => {
    expect(tablaDeAyuda(de('y1'))).toBe('poliza')
    expect(tablaDeAyuda(de('b1'))).toBeNull()
    expect(tablaDeAyuda(de('a1'))).toBeNull()
  })
})

describe('tiposDeAyuda: qué abre el botón de cada celda, de todas las secciones', () => {
  it('un tipo por nodo con ayuda, principales y avanzadas; sin ayuda, nada', () => {
    const tipos = tiposDeAyuda(DOS_AVANZADAS.secciones)
    expect(Object.fromEntries(tipos)).toEqual({ x1: 'texto', b1: 'texto', y1: 'tabla' })
    expect(tipos.has('a1')).toBe(false)
  })

  it('sólo cuenta las celdas (un interruptor o un subtotal no tienen ayuda)', () => {
    expect(tiposDeAyuda([]).size).toBe(0)
  })
})

describe('celdaConAyuda: la URL no abre lo que la hoja no muestra ni lo que es de otro tipo', () => {
  const c = contexto(DOS_AVANZADAS)
  const principales = DOS_AVANZADAS.secciones.filter((s) => s.presentacion === 'principal')
  const avanzadas = DOS_AVANZADAS.secciones.filter((s) => s.presentacion === 'avanzado')

  it('encuentra la celda con ayuda de ese tipo en las secciones que se miran', () => {
    expect(celdaConAyuda(principales, 'b1', 'texto', c)?.nodo).toBe('b1')
    expect(celdaConAyuda(avanzadas, 'x1', 'texto', c)?.nodo).toBe('x1')
    expect(celdaConAyuda(avanzadas, 'y1', 'tabla', c)?.nodo).toBe('y1')
  })

  it('una celda de otra parte (la de «Avanzado» con el modal cerrado) no se abre', () => {
    expect(celdaConAyuda(principales, 'x1', 'texto', c)).toBeNull()
    expect(celdaConAyuda(principales, 'y1', 'tabla', c)).toBeNull()
  })

  it('«tabla» no abre una celda de texto, ni «texto» una de tabla', () => {
    expect(celdaConAyuda(principales, 'b1', 'tabla', c)).toBeNull()
    expect(celdaConAyuda(avanzadas, 'y1', 'texto', c)).toBeNull()
  })

  it('una celda sin ayuda, un id inventado o la falta de nodo no abren nada', () => {
    expect(celdaConAyuda(principales, 'a1', 'texto', c)).toBeNull()
    expect(celdaConAyuda(principales, 'a1', 'tabla', c)).toBeNull()
    expect(celdaConAyuda(principales, 'no_existe', 'texto', c)).toBeNull()
    expect(celdaConAyuda(principales, null, 'tabla', c)).toBeNull()
  })
})
