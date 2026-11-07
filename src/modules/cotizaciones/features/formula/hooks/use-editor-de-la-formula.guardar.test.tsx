import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { leerBorradorDeEstado } from '@/shared/lib/borrador'
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import type { Diseno } from '../../../entities/diseno'
import type { Formula } from '../../../entities/formula'
import type { FormulaParaEditar } from '../../../entities/formula/edicion'
import { conElAjuste, formulaDePrueba } from '../../../entities/formula/fila-de-prueba.soporte'
import type { BorradorGuardado, PedidoDeGuardar } from '../../../entities/formula/repositorio'
import { useEditorDeLaFormula } from './use-editor-de-la-formula'

// «Guardar el borrador» desde el editor (4.21-3b-1, T6): la action simulada, sin red; lo de prueba de la vista previa, sin tablas.
type Respuesta = { data?: ResultadoDeAccion<BorradorGuardado> } | undefined
const h = vi.hoisted(() => ({
  pedidos: [] as unknown[],
  responder: null as null | (() => Promise<unknown>),
  lecturas: 0,
}))
vi.mock('../actions/guardar-borrador', () => ({
  guardarBorrador: (pedido: unknown) => {
    h.pedidos.push(pedido)
    return h.responder ? h.responder() : Promise.resolve(undefined)
  },
}))
vi.mock('../../../areas/formula/composicion.client', () => ({
  leerDefinicionParaEditar: () => {
    h.lecturas += 1
    return Promise.resolve({ ok: true, data: null })
  },
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
vi.mock('@/shared/ui/toasts', () => ({ avisar: () => undefined }))

const ORIGEN = '11111111-1111-4111-8111-111111111111'
const FORMULA = '22222222-2222-4222-8222-222222222222'
const BORRADOR = '33333333-3333-4333-8333-333333333333'
const HORA = '2026-11-07T15:00:00.123456+00:00'
const HORA_NUEVA = '2026-11-07T15:02:10.654321+00:00'
const HORA_OTRA = '2026-11-07T15:05:00.000001+00:00'
const DISENO = {
  cabecera: { modos: [], ver_total_bs: false },
  secciones: [],
  tarjeta_total: { nodo: 'total', secundarios: [] },
} as unknown as Diseno

const formula = () =>
  formulaDePrueba([
    { id: 'base', texto: '=remate+fees', etiqueta: 'Base' },
    { id: 'total', texto: '=(remate+fees)*4%', etiqueta: 'Total' },
  ])
const leida = (estado: 'borrador' | 'publicada', f: Formula = formula()): FormulaParaEditar => ({
  id: FORMULA,
  actualizadoEn: HORA,
  estado,
  diseno: DISENO,
  nota: estado === 'borrador' ? 'A medias' : 'Nota de la publicada',
  formula: f,
})
const montar = (l: FormulaParaEditar) =>
  renderHook(() => useEditorDeLaFormula({ origenId: ORIGEN, leida: l }))
type Editor = ReturnType<typeof montar>['result']

const responde = (r: Respuesta) => {
  h.responder = () => Promise.resolve(r)
}
const entra = (actualizadoEn: string) =>
  responde({ data: { ok: true, data: { id: BORRADOR, actualizadoEn } } })
const falla = (codigo: string, mensaje: string) =>
  responde({
    data: { ok: false, error: { codigo, mensaje } } as ResultadoDeAccion<BorradorGuardado>,
  })

function aplicarEnBase(result: Editor, texto: string) {
  act(() => {
    result.current.abrir('base')
  })
  act(() => {
    result.current.aplicar(texto)
  })
}
const textoDe = (result: Editor, id: string) => {
  const t = result.current.filas.find((f) => f.id === id)?.texto
  return t && 'texto' in t ? t.texto : undefined
}
async function guardar(result: Editor) {
  await act(async () => {
    await result.current.guardado.guardar()
  })
}
const ultimo = () => h.pedidos.at(-1) as PedidoDeGuardar

beforeEach(() => {
  window.sessionStorage.clear()
  h.pedidos.length = 0
  h.responder = null
  h.lecturas = 0
})

describe('useEditorDeLaFormula › guardar (C3, C5, C7)', () => {
  it('sin cambios espera con su motivo; con una fila abierta, el de la fila; tras aplicar, listo', () => {
    const { result } = montar(leida('borrador'))
    expect(result.current.guardado.motivo).toBe('No hay cambios por guardar.')
    act(() => {
      result.current.abrir('base')
    })
    expect(result.current.guardado.motivo).toBe('Aplica o cancela la fila abierta.')
    act(() => {
      result.current.aplicar('=remate+flete')
    })
    expect(result.current.guardado.motivo).toBeNull()
  })

  it('una reescrita del ⚙ se puede guardar sin tocar nada', () => {
    const { result } = montar(leida('publicada', conElAjuste(formula(), 'total__2', 0.05)))
    expect(result.current.guardado.motivo).toBeNull()
  })

  it('sobre el borrador pisa con su hora; el segundo guardado manda la hora nueva sin releer', async () => {
    const { result } = montar(leida('borrador'))
    aplicarEnBase(result, '=remate+flete')
    entra(HORA_NUEVA)
    await guardar(result)
    expect(ultimo().esperada).toEqual({ sobre: 'borrador', actualizadoEn: HORA })
    expect(ultimo().nota).toBe('A medias')
    expect(ultimo().diseno).toBe(DISENO)
    expect(result.current.guardado.estado).toEqual({ tipo: 'entro' })
    expect(result.current.guardado.motivo).toBe('No hay cambios por guardar.')

    aplicarEnBase(result, '=remate+fees+flete')
    entra(HORA_OTRA)
    await guardar(result)
    expect(ultimo().esperada).toEqual({ sobre: 'borrador', actualizadoEn: HORA_NUEVA })
    expect(h.lecturas).toBe(0)
  })

  it('sobre la publicada crea; el segundo guardado pisa el borrador creado, con la nota nula', async () => {
    const { result } = montar(leida('publicada'))
    aplicarEnBase(result, '=remate+flete')
    entra(HORA_NUEVA)
    await guardar(result)
    expect(ultimo().esperada).toEqual({ sobre: 'publicada', publicadaId: FORMULA })
    expect(ultimo().nota).toBeNull()
    aplicarEnBase(result, '=remate+fees+flete')
    entra(HORA_OTRA)
    await guardar(result)
    expect(ultimo().esperada).toEqual({ sobre: 'borrador', actualizadoEn: HORA_NUEVA })
    expect(ultimo().nota).toBeNull()
  })
})

describe('useEditorDeLaFormula › tras guardar, un error o mientras guarda (C3, C5, C7)', () => {
  it('tras guardar, lo guardado es la fórmula de trabajo (con el texto reescrito) y el borrador local se limpia', async () => {
    const { result } = montar(leida('publicada', conElAjuste(formula(), 'total__2', 0.05)))
    aplicarEnBase(result, '=remate+flete')
    const clave = `formula-editor:${ORIGEN}:${FORMULA}:${HORA}`
    await waitFor(() => {
      expect(leerBorradorDeEstado(window.sessionStorage, clave)).not.toBeNull()
    })
    entra(HORA_NUEVA)
    await guardar(result)
    expect(leerBorradorDeEstado(window.sessionStorage, clave)).toBeNull()
    expect(textoDe(result, 'total')).toBe('=(remate+fees)*5%')
    expect(result.current.filas.find((f) => f.id === 'total')?.texto.modo).toBe('texto')
    expect(textoDe(result, 'base')).toBe('=remate+flete')
  })

  it('un conflicto deja la fórmula como estaba y dice el texto de la base', async () => {
    const { result } = montar(leida('borrador'))
    aplicarEnBase(result, '=remate+flete')
    falla(
      'conflicto',
      'El borrador cambió después de que lo abriste: se guardó de nuevo hace 1 min.',
    )
    await guardar(result)
    expect(result.current.guardado.estado).toEqual({
      tipo: 'conflicto',
      mensaje: 'El borrador cambió después de que lo abriste: se guardó de nuevo hace 1 min.',
    })
    expect(textoDe(result, 'base')).toBe('=remate+flete')
  })

  it('sin respuesta, sin permiso y una regla de la base: cada uno su estado', async () => {
    const { result } = montar(leida('borrador'))
    aplicarEnBase(result, '=remate+flete')
    responde(undefined)
    await guardar(result)
    expect(result.current.guardado.estado).toEqual({ tipo: 'sin_respuesta' })
    falla('sin_permiso', 'No tienes permiso.')
    await guardar(result)
    expect(result.current.guardado.estado).toEqual({ tipo: 'sin_permiso' })
    falla('regla', 'Nodo repetido.')
    await guardar(result)
    expect(result.current.guardado.estado).toEqual({ tipo: 'regla' })
  })

  it('mientras guarda, «Editar» y «Sumar fila» esperan y nada cambia el trabajo; al volver, el trabajo es lo guardado', async () => {
    const { result } = montar(leida('borrador'))
    aplicarEnBase(result, '=remate+flete')
    let soltar: (r: Respuesta) => void = () => undefined
    h.responder = () =>
      new Promise((resolver) => {
        soltar = resolver
      })
    let enVuelo: Promise<void> = Promise.resolve()
    act(() => {
      enVuelo = result.current.guardado.guardar()
    })
    expect(result.current.guardado.enCurso).toBe(true)
    act(() => {
      result.current.abrir('base')
    })
    expect(result.current.abierta).toBeNull()
    act(() => {
      result.current.nueva.sumar('base')
    })
    expect(result.current.nueva.sumando).toBeNull()
    act(() => {
      result.current.aplicar('=fees')
    })
    expect(textoDe(result, 'base')).toBe('=remate+flete')
    await act(async () => {
      soltar({ data: { ok: true, data: { id: BORRADOR, actualizadoEn: HORA_NUEVA } } })
      await enVuelo
    })
    expect(result.current.guardado.enCurso).toBe(false)
    expect(textoDe(result, 'base')).toBe('=remate+flete')
    expect(result.current.guardado.motivo).toBe('No hay cambios por guardar.')
  })
})

describe('useEditorDeLaFormula › otro intento tras un error', () => {
  it('lo que dijo el intento anterior no queda a la vista mientras corre el nuevo; un error cualquiera, sin el texto de la base', async () => {
    const { result } = montar(leida('borrador'))
    aplicarEnBase(result, '=remate+flete')
    falla('inesperado', 'relation "formulas" does not exist')
    await guardar(result)
    expect(result.current.guardado.estado).toEqual({ tipo: 'error' })
    let soltar: (r: Respuesta) => void = () => undefined
    h.responder = () =>
      new Promise((resolver) => {
        soltar = resolver
      })
    let enVuelo: Promise<void> = Promise.resolve()
    act(() => {
      enVuelo = result.current.guardado.guardar()
    })
    expect(result.current.guardado.estado).toEqual({ tipo: 'quieto' })
    await act(async () => {
      soltar({ data: { ok: true, data: { id: BORRADOR, actualizadoEn: HORA_NUEVA } } })
      await enVuelo
    })
    expect(result.current.guardado.estado).toEqual({ tipo: 'entro' })
  })
})
