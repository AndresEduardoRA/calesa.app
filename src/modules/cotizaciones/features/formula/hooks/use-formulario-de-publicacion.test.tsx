import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Envio } from '@/shared/lib/enviar-accion'
import { useFormularioDePublicacion } from './use-formulario-de-publicacion'

const refrescar = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: refrescar }) }))

const P1 = '00000000-0000-4000-8000-000000000001'
const P2 = '00000000-0000-4000-8000-000000000002'
const NUEVA = '00000000-0000-4000-8000-000000000009'

beforeEach(() => {
  refrescar.mockReset()
})

type Props = { esperada: string | null }

function montar(pedir: (nota: string) => Promise<Envio<string>>, notaInicial = '') {
  const alGuardar = vi.fn()
  const hook = renderHook(
    ({ esperada }: Props) =>
      useFormularioDePublicacion({ abierto: true, notaInicial, esperada, pedir, alGuardar }),
    { initialProps: { esperada: P1 } },
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

describe('useFormularioDePublicacion', () => {
  it('una nota vacía no pide nada y se dice junto al campo', async () => {
    const pedir = vi.fn()
    const { result } = montar(pedir)
    act(() => {
      result.current.escribir('   ')
    })
    expect(await enviar(result)).toBe(false)
    expect(pedir).not.toHaveBeenCalled()
    expect(result.current.motivoDeNota).toBe('Publicar pide una nota.')
    // Escribir quita el motivo.
    act(() => {
      result.current.escribir('Algo')
    })
    expect(result.current.motivoDeNota).toBeNull()
  })

  it('manda la nota recortada y, al entrar, avisa a quien lo usa con el id', async () => {
    const pedir = vi.fn().mockResolvedValue({ ok: true, data: NUEVA })
    const { result, alGuardar } = montar(pedir)
    act(() => {
      result.current.escribir('  Subo el flete ')
    })
    expect(result.current.hayCambios).toBe(true)
    expect(await enviar(result)).toBe(true)
    expect(pedir).toHaveBeenCalledWith('Subo el flete')
    expect(alGuardar).toHaveBeenCalledWith(NUEVA)
    expect(result.current.guardado).toBe(true)
  })

  it('un PT409 queda como conflicto con su texto, «Recargar» refresca y conserva la nota, y se va con otra esperada', async () => {
    const pedir = vi.fn().mockResolvedValue({
      ok: false,
      error: { codigo: 'conflicto', mensaje: 'Otra persona publicó la versión 2 hace 1 min.' },
    })
    const { result, rerender } = montar(pedir)
    act(() => {
      result.current.escribir('Mi nota')
    })
    expect(await enviar(result)).toBe(false)
    expect(result.current.conflicto).toBe('Otra persona publicó la versión 2 hace 1 min.')
    // Con el conflicto, enviar otra vez no pide.
    expect(await enviar(result)).toBe(false)
    expect(pedir).toHaveBeenCalledTimes(1)
    act(() => {
      result.current.recargar()
    })
    expect(refrescar).toHaveBeenCalledTimes(1)
    expect(result.current.nota).toBe('Mi nota')
    rerender({ esperada: P2 })
    expect(result.current.conflicto).toBeNull()
  })
})

describe('useFormularioDePublicacion: lo que no entra', () => {
  it('una regla de la base va arriba del formulario y la nota queda', async () => {
    const pedir = vi.fn().mockResolvedValue({
      ok: false,
      error: { codigo: 'regla', mensaje: 'Publicar pide el diseño de la hoja.' },
    })
    const { result } = montar(pedir)
    act(() => {
      result.current.escribir('Mi nota')
    })
    await enviar(result)
    expect(result.current.aviso).toBe('Publicar pide el diseño de la hoja.')
    expect(result.current.nota).toBe('Mi nota')
    expect(result.current.guardado).toBe(false)
  })

  it('sin red espera la conexión', async () => {
    const pedir = vi.fn().mockResolvedValue({
      ok: false,
      sinRed: true,
      error: { codigo: 'inesperado', mensaje: 'No pudimos llegar al servidor.' },
    })
    const { result } = montar(pedir)
    act(() => {
      result.current.escribir('Mi nota')
    })
    await enviar(result)
    expect(result.current.esperandoConexion).toBe(true)
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
      soltar({ ok: true, data: NUEVA })
      await primero
    })
  })

  it('la nota escrita de antemano no cuenta como cambio', () => {
    const { result } = montar(vi.fn(), 'Vuelve a la versión 3.')
    expect(result.current.nota).toBe('Vuelve a la versión 3.')
    expect(result.current.hayCambios).toBe(false)
  })
})
