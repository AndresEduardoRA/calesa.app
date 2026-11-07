import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { NodoDelAjuste } from '../../../entities/formula/ajuste'
import {
  ejecutar,
  FLETE,
  falla,
  hojaDePrueba,
  leido,
  ok,
  ORIGEN,
  OTRA_PUBLICADA,
  PORCENTAJE,
  pedidoMandado,
  pedidos,
  PUBLICADA,
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

const { useAjusteDeConstante } = await import('./use-ajuste-de-constante')

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

describe('useAjusteDeConstante: lo que lee y lo que manda', () => {
  it('lee las constantes del ⚙ y abre cada campo con su valor por defecto (un porcentaje, en puntos)', async () => {
    const { result } = montar([PORCENTAJE, FLETE])
    expect(result.current.lectura.tipo).toBe('leyendo')
    await responder(1, leido({ fees_pct: 0.13, flete: 5 }))
    expect(pedidos[0]?.nodos).toEqual(['fees_pct', 'flete'])
    expect(result.current.bloques.map((b) => [b.nodo, b.texto, b.porDefecto])).toEqual([
      ['fees_pct', '13', 0.13],
      ['flete', '5', 5],
    ])
    expect(result.current.hayCambios).toBe(false)
  })

  it('manda la publicada que leyó como esperada, aunque la hoja dibuje otra versión', async () => {
    const { result } = montar()
    await responder(1, leido({ fees_pct: 0.13 }))
    ejecutar.mockResolvedValueOnce(ok())
    await escribirYEnviar(result, 'fees_pct', '15')
    expect(pedidoMandado()).toEqual({
      origenId: ORIGEN,
      nodo: 'fees_pct',
      valor: 0.15,
      publicadaEsperada: PUBLICADA,
    })
  })

  it('«13» en un porcentaje manda 0,13 a la base', async () => {
    const { result } = montar()
    await responder(1, leido({ fees_pct: 0.15 }))
    ejecutar.mockResolvedValueOnce(ok())
    await escribirYEnviar(result, 'fees_pct', '13')
    expect(pedidoMandado()?.['valor']).toBe(0.13)
  })

  it('con dos bloques, el segundo manda su nodo y su valor', async () => {
    const { result } = montar([PORCENTAJE, FLETE])
    await responder(1, leido({ fees_pct: 0.13, flete: 5 }))
    ejecutar.mockResolvedValueOnce(ok())
    await escribirYEnviar(result, 'flete', '7')
    expect(pedidoMandado()).toMatchObject({ nodo: 'flete', valor: 7 })
  })

  it('lo que no se lee no se pide: el aviso va en su bloque', async () => {
    const { result } = montar()
    await responder(1, leido({ fees_pct: 0.13 }))
    await escribirYEnviar(result, 'fees_pct', '')
    expect(ejecutar).not.toHaveBeenCalled()
    expect(result.current.bloques[0]?.aviso).toBe('Escribe el valor nuevo.')
  })
})

describe('useAjusteDeConstante: lo que se ve', () => {
  it('hay cambios con un texto distinto del inicial o una casilla marcada', async () => {
    const { result } = montar()
    await responder(1, leido({ fees_pct: 0.13 }))
    act(() => {
      result.current.escribir('fees_pct', '14')
    })
    expect(result.current.hayCambios).toBe(true)
    act(() => {
      result.current.escribir('fees_pct', '13')
    })
    expect(result.current.hayCambios).toBe(false)
    act(() => {
      result.current.marcar('fees_pct', true)
    })
    expect(result.current.hayCambios).toBe(true)
  })

  it('si la versión publicada no es la de la hoja, lo dice', async () => {
    const { result } = montar([PORCENTAJE], 3)
    await responder(1, leido({ fees_pct: 0.13 }, PUBLICADA, 5))
    expect(result.current.otraVersion).toBe(
      'Esta hoja usa la versión 3 de la fórmula; cambias la 5, la publicada.',
    )
  })

  it('con la misma versión no dice nada', async () => {
    const { result } = montar([PORCENTAJE], 3)
    await responder(1, leido({ fees_pct: 0.13 }, PUBLICADA, 3))
    expect(result.current.otraVersion).toBeNull()
  })
})

describe('useAjusteDeConstante: el conflicto', () => {
  it('un PT409 dice el mensaje de la base y espera «Volver a leer», que trae la publicada nueva y conserva lo tipeado', async () => {
    const { result } = montar()
    await responder(1, leido({ fees_pct: 0.13 }))
    ejecutar.mockResolvedValueOnce(falla('conflicto', 'Ana publicó la versión 4 hace 1 minuto.'))
    await escribirYEnviar(result, 'fees_pct', '15')
    expect(result.current.aviso).toEqual({
      mensaje: 'Ana publicó la versión 4 hace 1 minuto.',
      volverALeer: true,
    })
    await act(async () => {
      await result.current.enviar('fees_pct')
    })
    expect(ejecutar).toHaveBeenCalledTimes(1)
    act(() => {
      result.current.volverALeer()
    })
    expect(result.current.aviso).toBeNull()
    await responder(2, leido({ fees_pct: 0.14 }, OTRA_PUBLICADA, 4))
    expect(result.current.bloques[0]?.texto).toBe('15')
    ejecutar.mockResolvedValueOnce(ok())
    await act(async () => {
      await result.current.enviar('fees_pct')
    })
    expect(pedidoMandado(1)?.['publicadaEsperada']).toBe(OTRA_PUBLICADA)
  })
})
