import { describe, expect, it } from 'vitest'
import { TABLA_DEMASIADO_GRANDE, TABLA_NO_ENCONTRADA } from '../../entities/tablas/lectura'
import { leerTablaParaEditar, leerTablasDeReferencia } from './lectura'
import {
  clienteSimulado,
  filasDe,
  ORIGEN,
  pedidosDe,
  TABLA,
  tablaDeLaBase,
} from './lectura.soporte'

const FILAS = 'tablas_referencia_filas'

async function leer(cuantas: number, maxRows?: number, tabla = tablaDeLaBase()) {
  const { cliente, llamadas } = clienteSimulado(
    { tablas_referencia: [tabla], [FILAS]: filasDe(cuantas) },
    maxRows,
  )
  return { leida: await leerTablaParaEditar(cliente, TABLA), llamadas }
}

const montos = (r: Awaited<ReturnType<typeof leer>>['leida']) =>
  r.ok ? r.data.filas.map((f) => f.valores['monto']) : null
const enOrden = (n: number) => Array.from({ length: n }, (_, i) => i)

describe('leerTablaParaEditar: entera o nada', () => {
  it('primero la tabla (su versión) y después las filas', async () => {
    const { leida, llamadas } = await leer(3)
    expect(llamadas.map((l) => l.tabla)).toEqual(['tablas_referencia', FILAS, FILAS])
    expect(leida.ok && leida.data.tabla).toMatchObject({ version: 3, publicadoPor: 'Ana' })
    expect(montos(leida)).toEqual([0, 1, 2])
  })

  it('con 1.500 filas: 3 pedidos (el último vacío), sin repetir ni saltar ninguna', async () => {
    const { leida, llamadas } = await leer(1500)
    expect(pedidosDe(llamadas, FILAS).map((l) => l.limite)).toEqual([1000, 1000, 501])
    expect(montos(leida)).toEqual(enOrden(1500))
  })

  it('el cursor del segundo pedido es el de la última fila leída', async () => {
    const { llamadas } = await leer(1500)
    const segundo = pedidosDe(llamadas, FILAS)[1]
    expect(segundo?.filtros).toContain(
      'or:orden.gt.499,and(orden.eq.499,id.gt.00000000-0000-4000-8000-000001000999)',
    )
    expect(pedidosDe(llamadas, FILAS)[0]?.filtros.some((f) => f.startsWith('or:'))).toBe(false)
  })

  it('con 2.000 filas: el último pedido pide 1 y viene vacío; las 2.000 en orden', async () => {
    const { leida, llamadas } = await leer(2000)
    expect(pedidosDe(llamadas, FILAS).map((l) => l.limite)).toEqual([1000, 1000, 1])
    expect(montos(leida)).toEqual(enOrden(2000))
  })

  it('con 2.001 filas: 3 pedidos y no se devuelve para editar', async () => {
    const { leida, llamadas } = await leer(2001)
    expect(pedidosDe(llamadas, FILAS).map((l) => l.limite)).toEqual([1000, 1000, 1])
    expect(leida).toEqual({
      ok: false,
      error: { codigo: 'regla', mensaje: TABLA_DEMASIADO_GRANDE },
    })
  })

  it('con un max_rows de 500, las 1.500 se leen enteras: una página corta no es el final', async () => {
    const { leida, llamadas } = await leer(1500, 500)
    expect(pedidosDe(llamadas, FILAS)).toHaveLength(4)
    expect(montos(leida)).toEqual(enOrden(1500))
  })

  it('una tabla inactiva o que no se ve da no_encontrado y no lee filas', async () => {
    const inactiva = await leer(3, undefined, tablaDeLaBase(false))
    expect(inactiva.leida).toEqual({
      ok: false,
      error: { codigo: 'no_encontrado', mensaje: TABLA_NO_ENCONTRADA },
    })
    expect(pedidosDe(inactiva.llamadas, FILAS)).toEqual([])
  })

  it('una fila cuyos valores no son un objeto hace fallar la lectura entera', async () => {
    const filas = filasDe(3)
    const { cliente } = clienteSimulado({
      tablas_referencia: [tablaDeLaBase()],
      [FILAS]: [
        ...filas,
        { ...filas[0], id: '00000000-0000-4000-8000-000009999999', valores: [1] },
      ],
    })
    const leida = await leerTablaParaEditar(cliente, TABLA)
    expect(leida.ok).toBe(false)
    expect(!leida.ok && leida.error.codigo).toBe('inesperado')
  })
})

describe('leerTablasDeReferencia', () => {
  it('lee las del origen y las compartidas en un pedido con tope + 1', async () => {
    const { cliente, llamadas } = clienteSimulado({ tablas_referencia: [tablaDeLaBase()] })
    const leida = await leerTablasDeReferencia(cliente, ORIGEN)
    expect(leida.ok && leida.data.tablas.map((t) => t.clave)).toEqual(['fletes'])
    expect(llamadas.map((l) => l.limite)).toEqual([101])
  })

  it('un origen que no es un guid no llega al filtro', async () => {
    const { cliente, llamadas } = clienteSimulado({ tablas_referencia: [tablaDeLaBase()] })
    const leida = await leerTablasDeReferencia(cliente, `${ORIGEN},origen_id.not.is.null`)
    expect(leida.ok).toBe(false)
    expect(llamadas).toEqual([])
  })
})
