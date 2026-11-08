import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import {
  celda,
  disenoDe,
  formulaDePrueba,
  seccion,
} from '../../../entities/diseno/diseno-de-prueba.soporte'
import type {
  BorradorDelDisenoGuardado,
  DisenoParaEditar,
} from '../../../entities/diseno/edicion-del-diseno'
import { ponerNiveles } from '../../../entities/diseno/niveles'
import { useGuardadoDelDiseno } from './use-guardar-diseno'

// «Guardar el borrador» del diseño (4.22-2, T8): la action simulada, sin red.
type Respuesta = { data?: ResultadoDeAccion<BorradorDelDisenoGuardado> } | undefined
const h = vi.hoisted(() => ({
  pedidos: [] as { esperada: unknown; nota: unknown; diseno: unknown }[],
  responder: null as null | (() => Promise<unknown>),
}))
vi.mock('../actions/guardar-diseno', () => ({
  guardarDiseno: (pedido: { esperada: unknown; nota: unknown; diseno: unknown }) => {
    h.pedidos.push(pedido)
    return h.responder ? h.responder() : Promise.resolve(undefined)
  },
}))
vi.mock('@/shared/ui/toasts', () => ({ avisar: () => undefined }))

const ORIGEN = '11111111-1111-4111-8111-111111111111'
const PUBLICADA = '22222222-2222-4222-8222-222222222222'
const BORRADOR = '33333333-3333-4333-8333-333333333333'
const HORA = '2026-11-08T10:00:00.123456+00:00'
const HORA_NUEVA = '2026-11-08T10:02:10.654321+00:00'

const diseno = disenoDe([seccion('s', [celda('a'), celda('b')])])
const leida = (estado: 'borrador' | 'publicada'): DisenoParaEditar => ({
  id: estado === 'publicada' ? PUBLICADA : BORRADOR,
  estado,
  actualizadoEn: HORA,
  nota: estado === 'borrador' ? 'A medias' : 'De la publicación',
  definicion: formulaDePrueba,
  params: {},
  diseno,
})
const envio = { enCurso: false, mandar: <T,>(f: () => Promise<T>) => f() }
const montar = (l: DisenoParaEditar, trabajo = diseno) =>
  renderHook(
    ({ t }) =>
      useGuardadoDelDiseno({
        origenId: ORIGEN,
        leida: l,
        disenoLeido: diseno,
        trabajo: t,
        envio,
        alReemplazar: () => undefined,
      }),
    { initialProps: { t: trabajo } },
  )
const entra = (): Respuesta => ({
  data: { ok: true, data: { id: BORRADOR, actualizadoEn: HORA_NUEVA } },
})

beforeEach(() => {
  h.pedidos.length = 0
  h.responder = () => Promise.resolve(entra())
  window.sessionStorage.clear()
})

describe('useGuardadoDelDiseno', () => {
  it('T8 · sin cambios espera; con un cambio, se puede guardar', () => {
    const sin = montar(leida('borrador'))
    expect(sin.result.current.motivo).toBe('No hay cambios por guardar.')
    const cambiado = ponerNiveles(diseno, { seccion: 's' }, { ver: 'costos' })
    const con = montar(leida('borrador'), cambiado)
    expect(con.result.current.motivo).toBeNull()
  })

  it('T8 · tras guardar, el siguiente guardado manda la hora que devolvió la base y, desde la publicada, ya manda «borrador»', async () => {
    const cambiado = ponerNiveles(diseno, { seccion: 's' }, { ver: 'costos' })
    const { result, rerender } = montar(leida('publicada'), cambiado)
    await act(async () => {
      await result.current.guardar()
    })
    expect(h.pedidos[0]?.esperada).toEqual({ sobre: 'publicada', publicadaId: PUBLICADA })
    expect(h.pedidos[0]?.nota).toBeNull()
    expect(result.current.estado).toEqual({ tipo: 'entro' })
    // Tras guardar, sin cambios nuevos, no hay nada por guardar.
    expect(result.current.motivo).toBe('No hay cambios por guardar.')
    rerender({ t: ponerNiveles(cambiado, { seccion: 's' }, { editar: 'aduana' }) })
    await act(async () => {
      await result.current.guardar()
    })
    expect(h.pedidos[1]?.esperada).toEqual({ sobre: 'borrador', actualizadoEn: HORA_NUEVA })
  })

  it('T8 · un conflicto deja el diseño y dice el texto de la base; no cambia la base', async () => {
    h.responder = () =>
      Promise.resolve({
        data: { ok: false, error: { codigo: 'conflicto', mensaje: 'Ana lo guardó a las 10:01.' } },
      })
    const cambiado = ponerNiveles(diseno, { seccion: 's' }, { ver: 'costos' })
    const { result } = montar(leida('borrador'), cambiado)
    await act(async () => {
      await result.current.guardar()
    })
    expect(result.current.estado).toEqual({
      tipo: 'conflicto',
      mensaje: 'Ana lo guardó a las 10:01.',
    })
    expect(result.current.motivo).toBeNull()
    await act(async () => {
      await result.current.guardar()
    })
    expect(h.pedidos[1]?.esperada).toEqual({ sobre: 'borrador', actualizadoEn: HORA })
  })
})
