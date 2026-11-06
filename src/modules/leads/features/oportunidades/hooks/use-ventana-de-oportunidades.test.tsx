import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import type { OportunidadDelLead } from '../../../entities/oportunidad'
import {
  useVentanaDeOportunidades,
  type PaginaDeOportunidades,
} from './use-ventana-de-oportunidades'

afterEach(cleanup)

// Una por segundo, más recientes primero: la 1 es la más nueva.
const de = (n: number, actualizadoEn = 'v1'): OportunidadDelLead =>
  ({
    id: `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`,
    estado: 'abierta',
    titulo: `#${String(n)}`,
    enEtapaDesde: `2026-11-06T12:00:${String(59 - n).padStart(2, '0')}+00:00`,
    actualizadoEn,
    eliminada: false,
  }) as unknown as OportunidadDelLead

const pagina = (desde: number, hasta: number, hayMas: boolean): PaginaDeOportunidades => ({
  oportunidades: Array.from({ length: hasta - desde }, (_, i) => de(desde + i)),
  hayMas,
})

const titulos = (lista: readonly OportunidadDelLead[]) => lista.map((o) => o.titulo)

describe('useVentanaDeOportunidades: lo que trae el servidor y lo que vuelve de una action', () => {
  it('arranca con la página del servidor', () => {
    const { result } = renderHook(() => useVentanaDeOportunidades(pagina(1, 4, true)))
    expect(titulos(result.current.lista)).toEqual(['#1', '#2', '#3'])
    expect(result.current.hayMas).toBe(true)
  })

  it('una página con la misma firma no reinicia lo puesto; una distinta sí', () => {
    const { result, rerender } = renderHook(({ inicial }) => useVentanaDeOportunidades(inicial), {
      initialProps: { inicial: pagina(1, 4, false) },
    })
    act(() => {
      result.current.poner({ ...de(2, 'v2'), titulo: 'Editada' })
    })
    // Otra página con la misma firma (un objeto nuevo, lo mismo dentro): no se reinicia.
    rerender({ inicial: pagina(1, 4, false) })
    expect(titulos(result.current.lista)).toEqual(['#1', 'Editada', '#3'])
    // Otra versión de una de ellas: lo que trae el servidor manda.
    rerender({ inicial: { oportunidades: [de(1), de(2, 'v3'), de(3)], hayMas: false } })
    expect(titulos(result.current.lista)).toEqual(['#1', '#2', '#3'])
  })

  it('poner pone la respuesta en su lugar, también una nueva arriba, y quitar la saca', () => {
    const { result } = renderHook(() => useVentanaDeOportunidades(pagina(2, 4, false)))
    act(() => {
      result.current.poner(de(1))
    })
    expect(titulos(result.current.lista)).toEqual(['#1', '#2', '#3'])
    act(() => {
      result.current.quitar(de(2).id)
    })
    expect(titulos(result.current.lista)).toEqual(['#1', '#3'])
  })

  it('con más por leer, lo que cae después de lo cargado no entra', () => {
    const { result } = renderHook(() => useVentanaDeOportunidades(pagina(1, 4, true)))
    act(() => {
      result.current.poner(de(30))
    })
    expect(titulos(result.current.lista)).toEqual(['#1', '#2', '#3'])
  })

  it('cambiarEnSitio cambia una sin moverla', () => {
    const { result } = renderHook(() => useVentanaDeOportunidades(pagina(1, 4, false)))
    act(() => {
      result.current.cambiarEnSitio(de(2).id, (o) => ({ ...o, estado: 'ganada' }))
    })
    expect(result.current.lista.map((o) => o.estado)).toEqual(['abierta', 'ganada', 'abierta'])
  })
})
