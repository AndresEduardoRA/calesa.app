import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { FormulaParaEditar } from '../../../entities/formula/edicion'
import { formulaDePrueba } from '../../../entities/formula/fila-de-prueba.soporte'
import { calcularLaVistaPrevia } from '../../../entities/formula/vista-previa'
import type * as ModuloDeLaVistaPrevia from '../../../entities/formula/vista-previa'
import { useEditorDeLaFormula } from './use-editor-de-la-formula'

// `calcularLaVistaPrevia()` envuelta, llamando a la real: para contar cuándo se llama.
vi.mock('../../../entities/formula/vista-previa', async (original) => {
  const real = await original<typeof ModuloDeLaVistaPrevia>()
  return { ...real, calcularLaVistaPrevia: vi.fn(real.calcularLaVistaPrevia) }
})
vi.mock('@/shared/ui/toasts', () => ({ avisar: vi.fn() }))
vi.mock('../../../areas/formula/composicion.client', () => ({
  leerElTerrenoDePrueba: () =>
    Promise.resolve({
      ok: true as const,
      data: { tipos_cambio: { oficial: 2 }, monedas: { oficial: 'BOB' }, tablas: {}, avisos: [] },
    }),
}))

const ORIGEN = '11111111-1111-4111-8111-111111111111'
const leida = (): FormulaParaEditar => ({
  id: '22222222-2222-4222-8222-222222222222',
  actualizadoEn: '2026-11-07T15:00:00.123456+00:00',
  formula: formulaDePrueba([
    { id: 'base', texto: '900', etiqueta: 'Base' },
    { id: 'total', texto: '=base*2', etiqueta: 'Total' },
  ]),
})
const montar = () => renderHook(() => useEditorDeLaFormula({ origenId: ORIGEN, leida: leida() }))
const calculada = (r: ReturnType<typeof montar>['result']) =>
  r.current.vista?.tipo === 'calculada' ? r.current.vista : null

beforeEach(() => {
  window.sessionStorage.clear()
  vi.mocked(calcularLaVistaPrevia).mockClear()
})

describe('useEditorDeLaFormula: la vista previa (T6)', () => {
  it('no hay vista hasta que lo de prueba está leído; después se calcula con la fórmula', async () => {
    const { result } = montar()
    expect(result.current.vista).toBeNull()
    expect(result.current.lectura.tipo).toBe('leyendo')
    await waitFor(() => {
      expect(result.current.lectura.tipo).toBe('lista')
    })
    expect(calculada(result)?.valores.get('total')).toBe(1800)
  })

  it('no vuelve a calcular al abrir ni al cancelar una fila; sí con un aplicar que entra', async () => {
    const { result } = montar()
    await waitFor(() => {
      expect(result.current.vista).not.toBeNull()
    })
    const antes = vi.mocked(calcularLaVistaPrevia).mock.calls.length
    act(() => {
      result.current.abrir('total')
    })
    act(() => {
      result.current.cancelar()
    })
    expect(vi.mocked(calcularLaVistaPrevia).mock.calls.length).toBe(antes)
    act(() => {
      result.current.abrir('total')
    })
    act(() => {
      result.current.aplicar('=base*3')
    })
    expect(vi.mocked(calcularLaVistaPrevia).mock.calls.length).toBe(antes + 1)
    expect(calculada(result)?.valores.get('total')).toBe(2700)
  })

  it('un texto que no compila no cambia la vista; uno que deja la fórmula inválida da no_valida y el rechazo en su fila', async () => {
    const { result } = montar()
    await waitFor(() => {
      expect(result.current.vista).not.toBeNull()
    })
    const antes = vi.mocked(calcularLaVistaPrevia).mock.calls.length
    act(() => {
      result.current.abrir('total')
    })
    act(() => {
      result.current.aplicar('=base*')
    })
    expect(result.current.abierta?.error).not.toBeNull()
    expect(vi.mocked(calcularLaVistaPrevia).mock.calls.length).toBe(antes)
    act(() => {
      result.current.cancelar()
    })
    act(() => {
      result.current.abrir('total')
    })
    act(() => {
      result.current.aplicar('SI(b; base)')
    })
    expect(result.current.vista).toEqual({ tipo: 'no_valida' })
    expect(result.current.rechazo?.filaId).toBe('total')
  })
})

describe('useEditorDeLaFormula: sumar fila (T6)', () => {
  const nuevo = { etiqueta: 'Seguro', id: 'seguro', tipo: 'calculo', texto: 'base*3' } as const

  it('«sumar» abre el formulario y apaga «abrir»; «abrir» apaga «sumar»; una sola cosa abierta', () => {
    const { result } = montar()
    act(() => {
      result.current.nueva.sumar('base')
    })
    expect(result.current.nueva.sumando).toEqual({ tras: 'base', error: null })
    act(() => {
      result.current.abrir('total')
    })
    expect(result.current.abierta).toBeNull()
    act(() => {
      result.current.nueva.cancelarSumar()
    })
    act(() => {
      result.current.abrir('total')
    })
    act(() => {
      result.current.nueva.sumar('base')
    })
    expect(result.current.nueva.sumando).toBeNull()
    expect(result.current.abierta?.id).toBe('total')
  })

  it('«crear» entra: cambia la fórmula, cierra, deja la fila nueva como creada y sube la vista', async () => {
    const { result } = montar()
    await waitFor(() => {
      expect(result.current.vista).not.toBeNull()
    })
    act(() => {
      result.current.nueva.sumar('base')
    })
    act(() => {
      result.current.nueva.crear(nuevo)
    })
    expect(result.current.nueva.sumando).toBeNull()
    expect(result.current.nueva.creada).toBe('seguro')
    const ids = result.current.filas.map((f) => f.id)
    expect(ids[ids.indexOf('base') + 1]).toBe('seguro')
    expect(calculada(result)?.valores.get('seguro')).toBe(2700)
    // Abrir otra cosa suelta la «creada».
    act(() => {
      result.current.abrir('total')
    })
    expect(result.current.nueva.creada).toBeNull()
  })

  it('un error deja el formulario abierto con su error y la fórmula igual', () => {
    const { result } = montar()
    act(() => {
      result.current.nueva.sumar('base')
    })
    act(() => {
      result.current.nueva.crear({ ...nuevo, id: 'total' })
    })
    expect(result.current.nueva.sumando?.error?.codigo).toBe('id_ocupado')
    expect(result.current.nueva.sumando?.error?.campo).toBe('id')
    expect(result.current.filas.map((f) => f.id)).not.toContain('seguro')
  })

  it('lo creado se repone con el borrador local de la misma versión', () => {
    const primero = montar()
    act(() => {
      primero.result.current.nueva.sumar('base')
    })
    act(() => {
      primero.result.current.nueva.crear(nuevo)
    })
    primero.unmount()
    const segundo = montar()
    expect(segundo.result.current.filas.map((f) => f.id)).toContain('seguro')
    expect(segundo.result.current.nueva.sumando).toBeNull()
  })
})
