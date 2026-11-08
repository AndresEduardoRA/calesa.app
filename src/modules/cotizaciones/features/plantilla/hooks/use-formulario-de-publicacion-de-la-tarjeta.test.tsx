import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Envio } from '@/shared/lib/enviar-accion'
import { useFormularioDePublicacionDeLaTarjeta } from './use-formulario-de-publicacion-de-la-tarjeta'

const refrescar = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: refrescar }) }))

const V1 = '2026-11-07T10:00:00.123456+00:00'
const V2 = '2026-11-07T11:00:00.654321+00:00'
const ID = '00000000-0000-4000-8000-000000000009'

beforeEach(() => {
  refrescar.mockReset()
})

type Props = { esperada: string | null; abierto: boolean }

function montar(pedir: (nota: string, esperada: string) => Promise<Envio<string>>) {
  const alGuardar = vi.fn()
  const hook = renderHook(
    ({ esperada, abierto }: Props) =>
      useFormularioDePublicacionDeLaTarjeta({ abierto, esperada, pedir, alGuardar }),
    { initialProps: { esperada: V1, abierto: true } as Props },
  )
  return { ...hook, alGuardar }
}

const enviar = async (result: { current: { enviar: () => Promise<boolean> } }) => {
  let hecho = false
  await act(async () => {
    hecho = await result.current.enviar()
  })
  return hecho
}

describe('useFormularioDePublicacionDeLaTarjeta', () => {
  it('una nota en blanco no pide nada y se dice junto al campo; escribir quita el motivo', async () => {
    const pedir = vi.fn()
    const { result } = montar(pedir)
    act(() => {
      result.current.escribir('   ')
    })
    expect(await enviar(result)).toBe(false)
    expect(pedir).not.toHaveBeenCalled()
    expect(result.current.motivoDeNota).toBe('Publicar pide una nota.')
    act(() => {
      result.current.escribir('Algo')
    })
    expect(result.current.motivoDeNota).toBeNull()
  })

  it('manda la nota recortada con la esperada de ahora, avisa una vez y no reenvía', async () => {
    const pedir = vi.fn().mockResolvedValue({ ok: true, data: ID })
    const { result, alGuardar } = montar(pedir)
    act(() => {
      result.current.escribir('  Subo el flete ')
    })
    expect(result.current.hayCambios).toBe(true)
    expect(await enviar(result)).toBe(true)
    expect(pedir).toHaveBeenCalledWith('Subo el flete', V1)
    expect(alGuardar).toHaveBeenCalledWith(ID)
    expect(result.current.guardado).toBe(true)
  })

  it('un PT409 queda como conflicto, conserva la nota, no pide de nuevo y se va al CAMBIAR la esperada, no al pulsar «Recargar»', async () => {
    const pedir = vi.fn().mockResolvedValue({
      ok: false,
      error: {
        codigo: 'conflicto',
        mensaje: 'El borrador de esta plantilla cambió hace 1 min, mientras lo editabas.',
      },
    })
    const { result, rerender } = montar(pedir)
    act(() => {
      result.current.escribir('Mi nota')
    })
    expect(await enviar(result)).toBe(false)
    expect(result.current.conflicto).toBe(
      'El borrador de esta plantilla cambió hace 1 min, mientras lo editabas.',
    )
    expect(await enviar(result)).toBe(false)
    expect(pedir).toHaveBeenCalledTimes(1)
    act(() => {
      result.current.recargar()
    })
    expect(refrescar).toHaveBeenCalledTimes(1)
    expect(result.current.conflicto).not.toBeNull()
    expect(result.current.nota).toBe('Mi nota')
    rerender({ esperada: V2, abierto: true })
    expect(result.current.conflicto).toBeNull()
    expect(result.current.nota).toBe('Mi nota')
  })
})

describe('useFormularioDePublicacionDeLaTarjeta: lo que no entra', () => {
  it('el rechazo de la nota por la base va junto al campo, no arriba', async () => {
    const pedir = vi.fn().mockResolvedValue({
      ok: false,
      error: { codigo: 'validacion', mensaje: 'Publicar pide una nota.' },
      porCampo: { nota: 'Publicar pide una nota.' },
    })
    const { result } = montar(pedir)
    act(() => {
      result.current.escribir('x')
    })
    await enviar(result)
    expect(result.current.motivoDeNota).toBe('Publicar pide una nota.')
    expect(result.current.aviso).toBeNull()
  })

  it('una regla de la base contra la fórmula va arriba con su mensaje; la nota queda y no hay motivo junto al campo', async () => {
    const pedir = vi.fn().mockResolvedValue({
      ok: false,
      error: {
        codigo: 'regla',
        mensaje: 'La tarjeta no puede mostrar «fees»: no es del nivel «todos».',
      },
      porCampo: { fees: 'La tarjeta no puede mostrar «fees»: no es del nivel «todos».' },
    })
    const { result } = montar(pedir)
    act(() => {
      result.current.escribir('Mi nota')
    })
    await enviar(result)
    expect(result.current.aviso).toBe(
      'La tarjeta no puede mostrar «fees»: no es del nivel «todos».',
    )
    expect(result.current.motivoDeNota).toBeNull()
    expect(result.current.nota).toBe('Mi nota')
    expect(result.current.guardado).toBe(false)
  })

  it('otro rechazo (sin permiso) es un aviso arriba', async () => {
    const pedir = vi.fn().mockResolvedValue({
      ok: false,
      error: {
        codigo: 'sin_permiso',
        mensaje: 'No tienes permiso para configurar la plantilla de este origen.',
      },
    })
    const { result } = montar(pedir)
    act(() => {
      result.current.escribir('Mi nota')
    })
    await enviar(result)
    expect(result.current.aviso).toBe(
      'No tienes permiso para configurar la plantilla de este origen.',
    )
  })
})

describe('useFormularioDePublicacionDeLaTarjeta: sin conexión y un envío a la vez', () => {
  it('sin red espera la conexión y reintenta solo al volver; cerrado no reintenta', async () => {
    const sinRed = {
      ok: false,
      sinRed: true,
      error: { codigo: 'inesperado', mensaje: 'No pudimos llegar al servidor.' },
    }
    const pedir = vi.fn().mockResolvedValueOnce(sinRed).mockResolvedValue({ ok: true, data: ID })
    const linea = vi.spyOn(navigator, 'onLine', 'get')
    const { result, alGuardar, rerender } = montar(pedir)
    act(() => {
      result.current.escribir('Mi nota')
    })
    linea.mockReturnValue(false)
    await act(async () => {
      window.dispatchEvent(new Event('offline'))
      await Promise.resolve()
    })
    await enviar(result)
    expect(result.current.esperandoConexion).toBe(true)
    // Cerrado, lo que esperaba la red no sale.
    rerender({ esperada: V1, abierto: false })
    linea.mockReturnValue(true)
    await act(async () => {
      window.dispatchEvent(new Event('online'))
      await Promise.resolve()
    })
    expect(pedir).toHaveBeenCalledTimes(1)
    // Abierto, sale solo al volver la red.
    linea.mockReturnValue(false)
    await act(async () => {
      window.dispatchEvent(new Event('offline'))
      await Promise.resolve()
    })
    rerender({ esperada: V1, abierto: true })
    linea.mockReturnValue(true)
    await act(async () => {
      window.dispatchEvent(new Event('online'))
      await Promise.resolve()
      await Promise.resolve()
    })
    expect(pedir).toHaveBeenCalledTimes(2)
    expect(alGuardar).toHaveBeenCalledWith(ID)
    linea.mockRestore()
  })

  it('con esperada nula no pide', async () => {
    const pedir = vi.fn()
    const { result, rerender } = montar(pedir)
    act(() => {
      result.current.escribir('Mi nota')
    })
    rerender({ esperada: null, abierto: true })
    expect(await enviar(result)).toBe(false)
    expect(pedir).not.toHaveBeenCalled()
  })

  it('un segundo envío con uno en vuelo no sale', async () => {
    let soltar: (envio: Envio<string>) => void = () => undefined
    const pedir = vi.fn(
      () =>
        new Promise<Envio<string>>((resolver) => {
          soltar = resolver
        }),
    )
    const { result } = montar(pedir)
    act(() => {
      result.current.escribir('Mi nota')
    })
    let primero: Promise<boolean> = Promise.resolve(false)
    act(() => {
      primero = result.current.enviar()
    })
    expect(result.current.enCurso).toBe(true)
    await act(async () => {
      await result.current.enviar()
    })
    expect(pedir).toHaveBeenCalledTimes(1)
    await act(async () => {
      soltar({ ok: true, data: ID })
      await primero
    })
  })
})
