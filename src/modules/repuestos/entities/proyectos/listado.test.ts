import { describe, expect, it } from 'vitest'
import type { ValoresDeFiltros } from '@/shared/lib/filtros'
import {
  armarPaginaDeProyectos,
  esquemaDelListado,
  leerCursorDeProyectos,
  pedidoDelListado,
  textoDeItems,
  type FilaDeProyecto,
} from './listado'

const SIN_NADA: ValoresDeFiltros = { busqueda: '', porClave: {} }

function fila(numero: number): FilaDeProyecto {
  return {
    id: '00000000-0000-4000-8000-000000000001',
    numero,
    vehiculoId: null,
    vehiculoTitulo: null,
    vehiculoEtiqueta: 'Camión',
    vin: null,
    clienteNombre: null,
    cerradoEn: null,
    items: 0,
    pendientes: 0,
    enStock: 0,
    terminados: 0,
    ultimaActividad: '2026-11-12T10:00:00Z',
    actualizadoEn: '2026-11-12T10:00:00Z',
  }
}

describe('leerCursorDeProyectos', () => {
  it('lee de 1 a 18 dígitos', () => {
    expect(leerCursorDeProyectos('12')).toBe(12)
    expect(leerCursorDeProyectos('999999999999999')).toBe(999999999999999)
  })

  it('todo lo demás es la primera página', () => {
    for (const malo of [
      '',
      '-1',
      '1e3',
      '0',
      '012',
      '1'.repeat(19),
      'abc',
      ' 5',
      null,
      undefined,
    ]) {
      expect(leerCursorDeProyectos(malo)).toBeNull()
    }
  })

  it('no pasa de un entero seguro', () => {
    expect(leerCursorDeProyectos('999999999999999999')).toBeNull()
  })
})

describe('pedidoDelListado', () => {
  const pagina = { cursor: null, tamano: 50 }

  it('manda la búsqueda nula con menos de 3 caracteres y el texto cuando alcanza', () => {
    expect(pedidoDelListado({ ...SIN_NADA, busqueda: 'ab' }, pagina).q).toBeNull()
    expect(pedidoDelListado({ ...SIN_NADA, busqueda: '  ' }, pagina).q).toBeNull()
    expect(pedidoDelListado({ ...SIN_NADA, busqueda: 'cami' }, pagina).q).toBe('cami')
  })

  it('un número vale con menos de 3 dígitos', () => {
    expect(pedidoDelListado({ ...SIN_NADA, busqueda: '7' }, pagina).q).toBe('7')
  })

  it('abiertos por defecto; cerrados; todos manda el estado nulo', () => {
    expect(pedidoDelListado(SIN_NADA, pagina).estado).toBe('abiertos')
    const con = (valor: string): ValoresDeFiltros => ({
      busqueda: '',
      porClave: { estado: { tipo: 'eleccion', valor } },
    })
    expect(pedidoDelListado(con('cerrados'), pagina).estado).toBe('cerrados')
    expect(pedidoDelListado(con('todos'), pagina).estado).toBeNull()
    expect(pedidoDelListado(con('cualquiera'), pagina).estado).toBe('abiertos')
  })

  it('lleva el cursor y el tamaño tal cual', () => {
    expect(pedidoDelListado(SIN_NADA, { cursor: 40, tamano: 25 })).toMatchObject({
      cursor: 40,
      tamano: 25,
    })
  })
})

describe('armarPaginaDeProyectos', () => {
  it('con tamano + 1 filas corta a tamano y sigue desde el número de la última', () => {
    const leidas = [fila(9), fila(8), fila(7)]
    const pagina = armarPaginaDeProyectos(leidas, 2)
    expect(pagina.filas.map((f) => f.numero)).toEqual([9, 8])
    expect(pagina.siguiente).toBe(8)
  })

  it('con tamano filas no hay más', () => {
    expect(armarPaginaDeProyectos([fila(9), fila(8)], 2).siguiente).toBeNull()
  })

  it('vacía da filas vacías y ningún siguiente', () => {
    expect(armarPaginaDeProyectos([], 50)).toEqual({ filas: [], siguiente: null })
  })
})

describe('textoDeItems', () => {
  it('nunca escribe un total exacto de más de 200', () => {
    expect(textoDeItems(12)).toBe('12')
    expect(textoDeItems(200)).toBe('200')
    expect(textoDeItems(201)).toBe('200+')
  })
})

describe('esquemaDelListado', () => {
  it('tiene la búsqueda con mínimo y el estado con «abiertos» por defecto', () => {
    const esquema = esquemaDelListado()
    expect(esquema.busqueda?.clave).toBe('q')
    expect(esquema.filtros[0]).toMatchObject({ clave: 'estado', porDefecto: 'abiertos' })
  })
})
