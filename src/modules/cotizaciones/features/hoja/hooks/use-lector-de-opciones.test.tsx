import { renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { fallo, ok } from '@/shared/lib/errores'
import type { PedidoDeTabla } from '../../../entities/tabla-de-ayuda'
import { useLectorDeOpciones } from './use-lector-de-opciones'

let falla = false
const leerTablaDeAyuda = vi.fn((pedido: PedidoDeTabla) =>
  Promise.resolve(
    falla
      ? fallo('inesperado', 'sin red')
      : ok({
          clave: pedido.tabla,
          nombre: pedido.tabla,
          columnas: [{ clave: 'tipo', etiqueta: 'Tipo de vehículo', tipo: 'texto' }],
          filas: [{ tipo: `de_${pedido.tabla}` }],
          hayMas: false,
        }),
  ),
)
vi.mock('../../../composicion.client', () => ({
  leerTablaDeAyuda: (pedido: PedidoDeTabla) => leerTablaDeAyuda(pedido),
}))

afterEach(() => {
  falla = false
  vi.clearAllMocks()
})

const TABLAS = [
  { tabla: 'bo', columna: 'tipo' },
  { tabla: 'cl', columna: 'tipo' },
]
let n = 0
// Cada prueba con su hoja abierta: la memoria es del módulo.
const otraAbierta = () => {
  n += 1
  return `abierta-${String(n)}`
}

describe('useLectorDeOpciones: las opciones de un dato, recordadas por hoja abierta y tabla', () => {
  it('no lee nada al montarse; dos aperturas con la misma hoja leen cada tabla una vez', async () => {
    const abierta = otraAbierta()
    const { result, rerender } = renderHook(() => useLectorDeOpciones({ origenId: 'o', abierta }))
    expect(leerTablaDeAyuda).not.toHaveBeenCalled()
    const primera = await result.current(TABLAS)
    rerender()
    const segunda = await result.current(TABLAS)
    expect(primera).toEqual(segunda)
    expect(leerTablaDeAyuda.mock.calls.map(([p]) => p)).toEqual([
      { tabla: 'bo', origenId: 'o', abierta },
      { tabla: 'cl', origenId: 'o', abierta },
    ])
  })

  it('otra hoja abierta (guardar el vehículo trae otra) lee de nuevo', async () => {
    const una = otraAbierta()
    const otra = otraAbierta()
    const { result, rerender } = renderHook(
      ({ abierta }) => useLectorDeOpciones({ origenId: 'o', abierta }),
      { initialProps: { abierta: una } },
    )
    await result.current(TABLAS)
    rerender({ abierta: otra })
    await result.current(TABLAS)
    expect(leerTablaDeAyuda).toHaveBeenCalledTimes(4)
  })

  it('un fallo no se recuerda: el siguiente pedido lee otra vez', async () => {
    const abierta = otraAbierta()
    const { result } = renderHook(() => useLectorDeOpciones({ origenId: 'o', abierta }))
    falla = true
    expect((await result.current(TABLAS)).ok).toBe(false)
    falla = false
    expect((await result.current(TABLAS)).ok).toBe(true)
    expect(leerTablaDeAyuda).toHaveBeenCalledTimes(4)
  })
})
