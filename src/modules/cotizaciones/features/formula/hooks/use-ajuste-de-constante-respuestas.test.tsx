import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { NodoDelAjuste } from '../../../entities/formula/ajuste'
import {
  avisarExito,
  ejecutar,
  FLETE,
  falla,
  hojaDePrueba,
  leido,
  ok,
  ORIGEN,
  PORCENTAJE,
  reiniciar,
  responder,
} from './use-ajuste-de-constante.soporte'

vi.mock('next-safe-action/hooks', async () => {
  const soporte = await import('./use-ajuste-de-constante.soporte')
  return { useAction: () => ({ executeAsync: soporte.ejecutar }) }
})
vi.mock('../actions/cambiar-constante', () => ({ cambiarConstante: {} }))
vi.mock('@/shared/ui/toasts', async () => {
  const soporte = await import('./use-ajuste-de-constante.soporte')
  return { avisarExito: soporte.avisarExito }
})
vi.mock('../../../areas/formula/composicion.client', async () => {
  const soporte = await import('./use-ajuste-de-constante.soporte')
  return { leerValorPorDefecto: soporte.leerSimulado }
})

const { useAjusteDeConstante, MENSAJE_SIN_SABER_SI_SE_CAMBIO } =
  await import('./use-ajuste-de-constante')

type Hook = { current: ReturnType<typeof useAjusteDeConstante> }

function montar(nodos: NodoDelAjuste[] = [PORCENTAJE], version = 3) {
  const { hoja, alConfirmar } = hojaDePrueba(version)
  const cerrar = vi.fn()
  const vista = renderHook(() => useAjusteDeConstante({ origenId: ORIGEN, nodos, hoja, cerrar }))
  return { ...vista, alConfirmar, cerrar }
}

async function escribirYEnviar(result: Hook, nodo: string, texto: string) {
  act(() => {
    result.current.escribir(nodo, texto)
  })
  await act(async () => {
    await result.current.enviar(nodo)
  })
}

beforeEach(reiniciar)

describe('useAjusteDeConstante: las respuestas', () => {
  it('el 22023 de un valor igual va bajo el campo de su bloque', async () => {
    const { result } = montar([PORCENTAJE, FLETE])
    await responder(1, leido({ fees_pct: 0.13, flete: 5 }))
    ejecutar.mockResolvedValueOnce(
      falla('regla', 'La constante ya tiene ese valor.', {
        valor: 'La constante ya tiene ese valor.',
      }),
    )
    await escribirYEnviar(result, 'flete', '6')
    expect(result.current.bloques[1]?.aviso).toBe('La constante ya tiene ese valor.')
    expect(result.current.bloques[0]?.aviso).toBeNull()
    expect(result.current.aviso).toBeNull()
  })

  it('otro error dice el mensaje tal cual, sin «Volver a leer»', async () => {
    const { result } = montar()
    await responder(1, leido({ fees_pct: 0.13 }))
    ejecutar.mockResolvedValueOnce(
      falla('regla', 'La fórmula publicada no tiene la constante «fees_pct».'),
    )
    await escribirYEnviar(result, 'fees_pct', '15')
    expect(result.current.aviso).toEqual({
      mensaje: 'La fórmula publicada no tiene la constante «fees_pct».',
      volverALeer: false,
    })
  })

  it('sin permiso dice el motivo que trae', async () => {
    const { result } = montar()
    await responder(1, leido({ fees_pct: 0.13 }))
    ejecutar.mockResolvedValueOnce(falla('sin_permiso', 'No puedes configurar este origen.'))
    await escribirYEnviar(result, 'fees_pct', '15')
    expect(result.current.aviso?.mensaje).toBe('No puedes configurar este origen.')
  })

  it('un pedido que no pasa el esquema dice que se recargue', async () => {
    const { result } = montar()
    await responder(1, leido({ fees_pct: 0.13 }))
    ejecutar.mockResolvedValueOnce({})
    await escribirYEnviar(result, 'fees_pct', '15')
    expect(result.current.aviso?.mensaje).toBe(
      'No pudimos leer el pedido. Recarga y vuelve a intentar.',
    )
  })

  it('sin red no sabe si se cambió: pide volver a leer y no aplica nada', async () => {
    const { result, alConfirmar, cerrar } = montar()
    await responder(1, leido({ fees_pct: 0.13 }))
    ejecutar.mockRejectedValueOnce(new Error('sin red'))
    act(() => {
      result.current.marcar('fees_pct', true)
    })
    await escribirYEnviar(result, 'fees_pct', '15')
    expect(result.current.aviso).toEqual({
      mensaje: MENSAJE_SIN_SABER_SI_SE_CAMBIO,
      volverALeer: true,
    })
    expect(alConfirmar).not.toHaveBeenCalled()
    expect(cerrar).not.toHaveBeenCalled()
  })
})

describe('useAjusteDeConstante: un envío a la vez', () => {
  it('un envío a la vez en el panel, también desde dos bloques, y mientras tanto todo apagado', async () => {
    const { result } = montar([PORCENTAJE, FLETE])
    await responder(1, leido({ fees_pct: 0.13, flete: 5 }))
    let soltar: (r: unknown) => void = () => {}
    ejecutar.mockReturnValueOnce(
      new Promise((resolver) => {
        soltar = resolver
      }),
    )
    act(() => {
      result.current.escribir('fees_pct', '15')
      result.current.escribir('flete', '7')
    })
    let primero: Promise<void> = Promise.resolve()
    act(() => {
      primero = result.current.enviar('fees_pct')
    })
    expect(result.current.enCurso).toBe(true)
    await act(async () => {
      await result.current.enviar('flete')
    })
    expect(ejecutar).toHaveBeenCalledTimes(1)
    await act(async () => {
      soltar(ok())
      await primero
    })
    expect(result.current.enCurso).toBe(false)
  })
})

describe('useAjusteDeConstante: «Aplicar también»', () => {
  it('con «Aplicar también» y la respuesta buena, aplica a la hoja el mismo nodo y la fracción, una vez y antes de cerrar', async () => {
    const { result, alConfirmar, cerrar } = montar()
    await responder(1, leido({ fees_pct: 0.13 }))
    ejecutar.mockResolvedValueOnce(ok())
    act(() => {
      result.current.marcar('fees_pct', true)
    })
    await escribirYEnviar(result, 'fees_pct', '15')
    expect(alConfirmar).toHaveBeenCalledTimes(1)
    expect(alConfirmar).toHaveBeenCalledWith('fees_pct', 0.15)
    expect(cerrar).toHaveBeenCalledTimes(1)
    expect(alConfirmar.mock.invocationCallOrder[0]).toBeLessThan(
      cerrar.mock.invocationCallOrder[0] ?? 0,
    )
    expect(avisarExito).toHaveBeenCalledWith(
      'Cambiaste el valor por defecto de Porcentaje de Fees y lo aplicaste a esta cotización.',
    )
  })

  it('sin «Aplicar también», nunca toca la hoja y lo dice', async () => {
    const { result, alConfirmar, cerrar } = montar()
    await responder(1, leido({ fees_pct: 0.13 }))
    ejecutar.mockResolvedValueOnce(ok())
    await escribirYEnviar(result, 'fees_pct', '15')
    expect(alConfirmar).not.toHaveBeenCalled()
    expect(cerrar).toHaveBeenCalledTimes(1)
    expect(avisarExito).toHaveBeenCalledWith(
      'Cambiaste el valor por defecto de Porcentaje de Fees. Esta cotización no cambia.',
    )
  })

  it('con «Aplicar también» y un error, nunca toca la hoja', async () => {
    const { result, alConfirmar, cerrar } = montar()
    await responder(1, leido({ fees_pct: 0.13 }))
    ejecutar.mockResolvedValueOnce(falla('conflicto', 'Otra versión.'))
    act(() => {
      result.current.marcar('fees_pct', true)
    })
    await escribirYEnviar(result, 'fees_pct', '15')
    expect(alConfirmar).not.toHaveBeenCalled()
    expect(cerrar).not.toHaveBeenCalled()
  })

  it('un nodo que no se edita en esta hoja no se aplica aunque se marque', async () => {
    const { result, alConfirmar } = montar([{ ...PORCENTAJE, editable: false }])
    await responder(1, leido({ fees_pct: 0.13 }))
    ejecutar.mockResolvedValueOnce(ok())
    act(() => {
      result.current.marcar('fees_pct', true)
    })
    await escribirYEnviar(result, 'fees_pct', '15')
    expect(alConfirmar).not.toHaveBeenCalled()
  })
})
