import { describe, expect, it } from 'vitest'
import {
  cortaLaCola,
  falloDeLinea,
  lineasDePegado,
  reducirLineas,
  resumirLineas,
  sePuedeReintentarLinea,
  type Linea,
} from './lineas'

const FICHA = {
  consulta: '00000000-0000-0000-0000-0000000000c1',
  data: { lot_number: '1' },
  url: null,
}
const DATOS = { columnas: {}, atributos: {}, sinCoincidencia: [] }

describe('lineasDePegado', () => {
  it('interpreta cada renglón y deja fallidos los que no se entienden', () => {
    const { lineas, recortadas } = lineasDePegado(
      'https://www.copart.com/lot/58540656\nhola\n3FMCR9B64RRE04601\n58540656',
    )
    expect(recortadas).toBe(0)
    expect(lineas.map((linea) => linea.estado.tipo)).toEqual([
      'esperando',
      'fallida',
      'esperando',
      'esperando',
    ])
    expect(lineas[1]?.entrada).toBeNull()
    expect(lineas[1]?.estado).toMatchObject({ codigo: null })
    expect(lineas.map((linea) => linea.clave)).toEqual(['0', '1', '2', '3'])
  })

  it('recorta lo que pasa de veinte y dice cuántas quedaron fuera', () => {
    const texto = Array.from({ length: 25 }, (_, n) => String(10_000_000 + n)).join('\n')
    const { lineas, recortadas } = lineasDePegado(texto)
    expect(lineas).toHaveLength(20)
    expect(recortadas).toBe(5)
  })

  it('un pegado vacío no tiene líneas', () => {
    expect(lineasDePegado('  \n \n')).toEqual({ lineas: [], recortadas: 0 })
  })
})

describe('reducirLineas', () => {
  const base = lineasDePegado('58540656\n45312823').lineas

  it('cambia el estado de una línea sin tocar las demás', () => {
    const despues = reducirLineas(base, {
      tipo: 'estado',
      clave: '1',
      estado: { tipo: 'lista', ficha: FICHA, datos: DATOS },
    })
    expect(despues.map((linea) => linea.estado.tipo)).toEqual(['esperando', 'lista'])
  })

  it('marca como repetidas sólo las que estaban listas', () => {
    let lineas: Linea[] = reducirLineas(base, {
      tipo: 'estado',
      clave: '0',
      estado: { tipo: 'lista', ficha: FICHA, datos: DATOS },
    })
    lineas = reducirLineas(lineas, {
      tipo: 'repetidas',
      repetidas: [
        { clave: '0', vehiculoId: 'v-1' },
        { clave: '1', vehiculoId: null },
      ],
    })
    expect(lineas[0]?.estado).toEqual({ tipo: 'repetida', ficha: FICHA, vehiculoId: 'v-1' })
    expect(lineas[1]?.estado.tipo).toBe('esperando')
  })

  it('carga y vacía', () => {
    expect(reducirLineas([], { tipo: 'cargar', lineas: base })).toHaveLength(2)
    expect(reducirLineas(base, { tipo: 'vaciar' })).toEqual([])
  })
})

describe('resumirLineas', () => {
  it('cuenta por estado', () => {
    const lineas = reducirLineas(lineasDePegado('58540656\n45312823\nhola\n99999999').lineas, {
      tipo: 'estado',
      clave: '0',
      estado: { tipo: 'guardada', vehiculoId: 'v', numero: 3 },
    })
    expect(resumirLineas(lineas)).toEqual({
      total: 4,
      listas: 0,
      sinGuardar: 0,
      repetidas: 0,
      fallidas: 1,
      guardadas: 1,
      enCurso: 2,
    })
  })
})

describe('cuándo cortar la cola y cuándo reintentar', () => {
  it('con la cuota agotada o la clave rechazada no se consulta la siguiente', () => {
    expect(cortaLaCola('cuota')).toBe(true)
    expect(cortaLaCola('clave_invalida')).toBe(true)
    expect(cortaLaCola('no_encontrado')).toBe(false)
    expect(cortaLaCola('tiempo')).toBe(false)
  })

  it('sólo se reintenta lo que falló del momento y se entendió', () => {
    const [una] = lineasDePegado('58540656').lineas
    if (!una) throw new Error('sin línea')
    expect(sePuedeReintentarLinea({ ...una, estado: falloDeLinea('tiempo') })).toBe(true)
    expect(sePuedeReintentarLinea({ ...una, estado: falloDeLinea('cuota') })).toBe(false)
    expect(sePuedeReintentarLinea({ ...una, estado: falloDeLinea('no_encontrado') })).toBe(false)
    const [rota] = lineasDePegado('hola').lineas
    if (!rota) throw new Error('sin línea')
    expect(sePuedeReintentarLinea(rota)).toBe(false)
  })
})
