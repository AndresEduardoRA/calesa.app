import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MENSAJE_DEL_VALOR_VACIO } from '../../../entities/formula/ajuste'
import {
  MENSAJE_DEL_MISMO_TIPO_CAMBIO,
  MENSAJE_DEL_TIPO_CAMBIO_INVALIDO,
} from '../../../entities/formula/tipo-cambio'
import {
  ejecutar,
  ESPERADA,
  falla,
  FILA,
  FORMULA,
  hojaDePrueba,
  leida,
  ok,
  OTRA_ESPERADA,
  pedidoMandado,
  pedidos,
  reiniciar,
  responder,
} from './use-ajuste-de-tipo-cambio.soporte'

vi.mock('next-safe-action/hooks', async () => {
  const soporte = await import('./use-ajuste-de-tipo-cambio.soporte')
  return { useAction: () => ({ executeAsync: soporte.ejecutar }) }
})
vi.mock('@/modules/empresa/client', () => ({ guardarTipoCambio: {} }))
vi.mock('@/shared/ui/toasts', async () => {
  const soporte = await import('./use-ajuste-de-tipo-cambio.soporte')
  return { avisarExito: soporte.avisarExito }
})
vi.mock('../../../areas/formula/composicion.client', async () => {
  const soporte = await import('./use-ajuste-de-tipo-cambio.soporte')
  return { leerTipoCambioDelNodo: soporte.leerSimulado }
})

const { MENSAJE_SIN_SABER_SI_CAMBIO_EL_TIPO, useAjusteDeTipoCambio } =
  await import('./use-ajuste-de-tipo-cambio')

type Hook = { current: ReturnType<typeof useAjusteDeTipoCambio> }

function montar() {
  const { hoja, alConfirmar } = hojaDePrueba()
  const cerrar = vi.fn()
  const vista = renderHook(() => useAjusteDeTipoCambio({ nodo: 'tc', hoja, cerrar }))
  return { ...vista, alConfirmar, cerrar }
}

async function escribirYEnviar(result: Hook, texto: string) {
  act(() => {
    result.current.escribir(texto)
  })
  await act(async () => {
    await result.current.enviar()
  })
}

beforeEach(reiniciar)

describe('useAjusteDeTipoCambio: lo que lee y lo que manda', () => {
  it('lee la fila del nodo en la versión de la hoja y abre el campo con su valor de hoy', async () => {
    const { result } = montar()
    expect(result.current.lectura.tipo).toBe('leyendo')
    expect(result.current.tipoCambio).toBeNull()
    await responder(1, leida())
    expect(pedidos.map(({ formulaId, nodo }) => ({ formulaId, nodo }))).toEqual([
      { formulaId: FORMULA, nodo: 'tc' },
    ])
    expect(result.current.tipoCambio).toEqual(FILA)
    expect(result.current.texto).toBe('11,68')
    expect(result.current.hayCambios).toBe(false)
  })

  it('manda sólo el id, la versión leída y el valor tipeado', async () => {
    const { result } = montar()
    await responder(1, leida())
    ejecutar.mockResolvedValueOnce(ok())
    await escribirYEnviar(result, '7,8')
    expect(ejecutar).toHaveBeenCalledTimes(1)
    expect(pedidoMandado()).toStrictEqual({
      id: FILA.id,
      actualizadoEnEsperado: ESPERADA,
      valor: 7.8,
    })
  })

  it('lo que no se puede pedir no se pide y deja su aviso bajo el campo', async () => {
    const { result } = montar()
    await responder(1, leida())
    await escribirYEnviar(result, '11,68')
    expect(result.current.avisoDelCampo).toBe(MENSAJE_DEL_MISMO_TIPO_CAMBIO)
    await escribirYEnviar(result, '0')
    expect(result.current.avisoDelCampo).toBe(MENSAJE_DEL_TIPO_CAMBIO_INVALIDO)
    await escribirYEnviar(result, '')
    expect(result.current.avisoDelCampo).toBe(MENSAJE_DEL_VALOR_VACIO)
    expect(ejecutar).not.toHaveBeenCalled()
    act(() => {
      result.current.escribir('8')
    })
    expect(result.current.avisoDelCampo).toBeNull()
  })

  it('con la respuesta buena avisa con el nombre y cierra, sin tocar la hoja', async () => {
    const { result, cerrar, alConfirmar } = montar()
    const { avisarExito } = await import('./use-ajuste-de-tipo-cambio.soporte')
    await responder(1, leida())
    ejecutar.mockResolvedValueOnce(ok())
    await escribirYEnviar(result, '7,8')
    expect(avisarExito).toHaveBeenCalledWith(
      'Cambiaste el tipo de cambio Oficial para toda la empresa.',
    )
    expect(cerrar).toHaveBeenCalledTimes(1)
    expect(alConfirmar).not.toHaveBeenCalled()
  })
})

describe('useAjusteDeTipoCambio: un envío a la vez y lo tipeado', () => {
  it('dos envíos seguidos sin respuesta mandan uno', async () => {
    const { result } = montar()
    await responder(1, leida())
    let soltar: (v: unknown) => void = () => undefined
    ejecutar.mockReturnValueOnce(
      new Promise((r) => {
        soltar = r
      }),
    )
    act(() => {
      result.current.escribir('7,8')
    })
    await act(async () => {
      const primero = result.current.enviar()
      const segundo = result.current.enviar()
      soltar(ok())
      await Promise.all([primero, segundo])
    })
    expect(ejecutar).toHaveBeenCalledTimes(1)
  })

  it('hay cambios con algo distinto de lo que abrió el campo', async () => {
    const { result } = montar()
    await responder(1, leida())
    act(() => {
      result.current.escribir('12')
    })
    expect(result.current.hayCambios).toBe(true)
    act(() => {
      result.current.escribir('11,68')
    })
    expect(result.current.hayCambios).toBe(false)
  })
})

describe('useAjusteDeTipoCambio: las respuestas', () => {
  it('un PT409 dice el mensaje de la base y pide volver a leer; releído, manda la versión nueva y lo tipeado sigue', async () => {
    const { result } = montar()
    await responder(1, leida())
    const mensaje = 'Otra persona cambió este tipo de cambio mientras lo editabas.'
    ejecutar.mockResolvedValueOnce(falla('conflicto', mensaje))
    await escribirYEnviar(result, '8')
    expect(result.current.aviso).toEqual({ mensaje, volverALeer: true })
    // Con «Volver a leer» pendiente no se manda nada.
    await act(async () => {
      await result.current.enviar()
    })
    expect(ejecutar).toHaveBeenCalledTimes(1)
    act(() => {
      result.current.volverALeer()
    })
    expect(result.current.aviso).toBeNull()
    await responder(2, leida({ valor: 7.9, actualizadoEn: OTRA_ESPERADA }))
    expect(result.current.texto).toBe('8')
    ejecutar.mockResolvedValueOnce(ok())
    await act(async () => {
      await result.current.enviar()
    })
    expect(pedidoMandado(1)).toStrictEqual({
      id: FILA.id,
      actualizadoEnEsperado: OTRA_ESPERADA,
      valor: 8,
    })
  })

  it('sin red no se sabe si entró: pide volver a leer', async () => {
    const { result } = montar()
    await responder(1, leida())
    ejecutar.mockRejectedValueOnce(new Error('sin red'))
    await escribirYEnviar(result, '8')
    expect(result.current.aviso).toEqual({
      mensaje: MENSAJE_SIN_SABER_SI_CAMBIO_EL_TIPO,
      volverALeer: true,
    })
    expect(MENSAJE_SIN_SABER_SI_CAMBIO_EL_TIPO).toBe(
      'No sabemos si se cambió: vuelve a leer el tipo de cambio.',
    )
  })

  it('una entrada que la action no aceptó pide recargar, sin volver a leer', async () => {
    const { result } = montar()
    await responder(1, leida())
    ejecutar.mockResolvedValueOnce({})
    await escribirYEnviar(result, '8')
    expect(result.current.aviso).toEqual({
      mensaje: 'No pudimos leer el pedido. Recarga y vuelve a intentar.',
      volverALeer: false,
    })
  })

  it('sin permiso, el mensaje tal cual', async () => {
    const { result, cerrar } = montar()
    await responder(1, leida())
    ejecutar.mockResolvedValueOnce(falla('sin_permiso', 'No puedes cambiar los tipos de cambio.'))
    await escribirYEnviar(result, '8')
    expect(result.current.aviso).toEqual({
      mensaje: 'No puedes cambiar los tipos de cambio.',
      volverALeer: false,
    })
    expect(cerrar).not.toHaveBeenCalled()
  })
})
