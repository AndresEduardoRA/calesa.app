import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Formula } from '../../../entities/formula'
import type { FormulaParaEditar } from '../../../entities/formula/edicion'
import type * as ModuloDelTextoVigente from '../../../entities/formula/texto-vigente'
import type * as ModuloDeValidar from '../../../entities/validar'
import { conElAjuste, formulaDePrueba } from '../../../entities/formula/fila-de-prueba.soporte'
import { textoVigente } from '../../../entities/formula/texto-vigente'
import { validarFormula } from '../../../entities/validar'
import { useEditorDeLaFormula } from './use-editor-de-la-formula'

// «Guardar el borrador» (4.21-3b-1): la action no llega aquí (su composición es del servidor).
vi.mock('../actions/guardar-borrador', () => ({
  guardarBorrador: () => Promise.resolve(undefined),
}))

// `validarFormula()` y `textoVigente()` envueltas, llamando a las reales: para contar cuándo se llaman.
vi.mock('../../../entities/validar', async (original) => {
  const real = await original<typeof ModuloDeValidar>()
  return { ...real, validarFormula: vi.fn(real.validarFormula) }
})
vi.mock('../../../entities/formula/texto-vigente', async (original) => {
  const real = await original<typeof ModuloDelTextoVigente>()
  return { ...real, textoVigente: vi.fn(real.textoVigente) }
})
// Lo de prueba de la vista previa (4.21-3a-2): sin red, un tipo de cambio y ninguna tabla.
vi.mock('../../../areas/formula/composicion.client', () => ({
  leerElTerrenoDePrueba: () =>
    Promise.resolve({
      ok: true as const,
      data: {
        tipos_cambio: { oficial: 6.96 },
        monedas: { oficial: 'BOB' },
        tablas: {},
        avisos: [],
      },
    }),
}))
type Accion = { etiqueta: string; alHacer: () => void }
const avisos: { mensaje: string; accion?: Accion }[] = []
vi.mock('@/shared/ui/toasts', () => ({
  avisar: (mensaje: string, accion?: Accion) => {
    avisos.push({ mensaje, ...(accion ? { accion } : {}) })
  },
}))

const ORIGEN = '11111111-1111-4111-8111-111111111111'
const FORMULA = '22222222-2222-4222-8222-222222222222'
const HORA = '2026-11-07T15:00:00.123456+00:00'

const formula = () =>
  formulaDePrueba([
    { id: 'base', texto: '=remate+fees', etiqueta: 'Base' },
    { id: 'total', texto: '=(remate+fees)*4%', etiqueta: 'Total' },
  ])
const leidaDe = (f: Formula, hora = HORA): FormulaParaEditar => ({
  id: FORMULA,
  actualizadoEn: hora,
  estado: 'borrador',
  diseno: null,
  nota: null,
  formula: f,
})
const montar = (leida: FormulaParaEditar = leidaDe(formula())) =>
  renderHook(({ l }) => useEditorDeLaFormula({ origenId: ORIGEN, leida: l }), {
    initialProps: { l: leida },
  })
const textoDe = (r: ReturnType<typeof montar>['result'], id: string) =>
  r.current.filas.find((f) => f.id === id)?.texto

beforeEach(() => {
  window.sessionStorage.clear()
  avisos.length = 0
  vi.mocked(validarFormula).mockClear()
  vi.mocked(textoVigente).mockClear()
})

describe('useEditorDeLaFormula: aplicar (T3)', () => {
  it('aplicar un texto que compila cambia la fórmula de trabajo y cierra la fila', () => {
    const { result } = montar()
    act(() => {
      result.current.abrir('base')
    })
    expect(result.current.abierta).toEqual({ id: 'base', error: null })
    act(() => {
      result.current.aplicar('=remate+flete')
    })
    expect(result.current.abierta).toBeNull()
    expect(textoDe(result, 'base')).toEqual({ modo: 'texto', texto: '=remate+flete' })
    expect(result.current.aplicada).toEqual({ id: 'base', soltados: [] })
  })

  it('un error del compilador deja la fila abierta con su error y la fórmula igual', () => {
    const { result } = montar()
    act(() => {
      result.current.abrir('base')
    })
    act(() => {
      result.current.aplicar('=remate+nada')
    })
    expect(result.current.abierta?.error?.mensaje).toBeTruthy()
    expect(textoDe(result, 'base')).toEqual({ modo: 'texto', texto: '=remate+fees' })
  })

  it('4-6: 2.001 caracteres dan el error en la fila sin llamar a validarFormula() ni recalcular las filas; con 2.000 aplica', () => {
    const { result } = montar()
    act(() => {
      result.current.abrir('base')
    })
    vi.mocked(validarFormula).mockClear()
    vi.mocked(textoVigente).mockClear()
    act(() => {
      result.current.aplicar('=remate'.padEnd(2001, ' '))
    })
    expect(result.current.abierta?.error).toMatchObject({
      codigo: 'texto_demasiado_largo',
      mensaje: 'El texto de la fila pasa de 2.000 caracteres.',
    })
    expect(validarFormula).not.toHaveBeenCalled()
    expect(textoVigente).not.toHaveBeenCalled()
    expect(textoDe(result, 'base')).toEqual({ modo: 'texto', texto: '=remate+fees' })
    act(() => {
      result.current.aplicar('=remate'.padEnd(2000, ' '))
    })
    expect(result.current.abierta).toBeNull()
    expect(validarFormula).toHaveBeenCalledTimes(1)
  })

  it('volver a dibujar sin cambiar la fórmula (abrir una fila, tipear en ella) no recalcula las filas ni valida', () => {
    const leida = leidaDe(formula())
    const { result, rerender } = montar(leida)
    vi.mocked(validarFormula).mockClear()
    vi.mocked(textoVigente).mockClear()
    act(() => {
      result.current.abrir('base')
    })
    rerender({ l: leida })
    rerender({ l: leida })
    expect(textoVigente).not.toHaveBeenCalled()
    expect(validarFormula).not.toHaveBeenCalled()
  })
})

describe('useEditorDeLaFormula: pisar un ⚙ y validar (T3)', () => {
  it('4-5: con el texto que ya no manda, recompilar no pisa el ⚙ hasta «Pisar el valor»', () => {
    const { result } = montar(leidaDe(conElAjuste(formula(), 'total__2', -0.03)))
    expect(textoDe(result, 'total')).toMatchObject({ modo: 'no_manda' })
    act(() => {
      result.current.abrir('total')
    })
    act(() => {
      result.current.aplicar('=(remate+fees)*4%')
    })
    expect(result.current.abierta?.error).toMatchObject({
      codigo: 'pisa_un_valor',
      cambios: [{ id: 'total__2', guardado: -0.03, nuevo: 0.04 }],
    })
    expect(textoDe(result, 'total')).toMatchObject({ modo: 'no_manda' })
    act(() => {
      result.current.aplicar('=(remate+fees)*4%', true)
    })
    expect(result.current.abierta).toBeNull()
    expect(textoDe(result, 'total')).toEqual({ modo: 'texto', texto: '=(remate+fees)*4%' })
  })

  it('un texto que compila y deja la fórmula inválida aplica y pone el rechazo en su fila', () => {
    const { result } = montar()
    expect(result.current.rechazo).toBeNull()
    act(() => {
      result.current.abrir('total')
    })
    act(() => {
      result.current.aplicar('SI(b; remate)')
    })
    expect(result.current.abierta).toBeNull()
    expect(result.current.rechazo).toEqual({
      mensaje: expect.stringContaining('El total «total» no puede depender') as unknown as string,
      filaId: 'total',
      grupoId: null,
    })
  })

  it('una fila abierta: abrir otra no la cambia; cancelar la cierra sin cambiar nada', () => {
    const { result } = montar()
    act(() => {
      result.current.abrir('base')
    })
    act(() => {
      result.current.abrir('total')
    })
    expect(result.current.abierta?.id).toBe('base')
    act(() => {
      result.current.cancelar()
    })
    expect(result.current.abierta).toBeNull()
    expect(textoDe(result, 'base')).toEqual({ modo: 'texto', texto: '=remate+fees' })
  })
})

describe('useEditorDeLaFormula: el borrador local (T3)', () => {
  it('lo aplicado se repone al volver a abrir la misma versión, con «Descartar»; otra versión no', () => {
    const primero = montar()
    act(() => {
      primero.result.current.abrir('base')
    })
    act(() => {
      primero.result.current.aplicar('=remate+flete')
    })
    primero.unmount()

    const segundo = montar()
    expect(textoDe(segundo.result, 'base')).toEqual({ modo: 'texto', texto: '=remate+flete' })
    const aviso = avisos.at(-1)
    expect(aviso?.accion?.etiqueta).toBe('Descartar')
    act(() => {
      aviso?.accion?.alHacer()
    })
    expect(textoDe(segundo.result, 'base')).toEqual({ modo: 'texto', texto: '=remate+fees' })
    segundo.unmount()

    const tercero = montar()
    act(() => {
      tercero.result.current.abrir('base')
    })
    act(() => {
      tercero.result.current.aplicar('=remate+flete')
    })
    tercero.unmount()
    const otra = montar(leidaDe(formula(), '2026-11-07T16:00:00.000001+00:00'))
    expect(textoDe(otra.result, 'base')).toEqual({ modo: 'texto', texto: '=remate+fees' })
  })
})
