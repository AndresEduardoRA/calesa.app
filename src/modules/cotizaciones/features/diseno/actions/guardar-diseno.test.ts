import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Resultado } from '@/shared/lib/errores'
import type { Definicion } from '../../../entities/formula'
import { celda, disenoDe, seccion } from '../../../entities/diseno/diseno-de-prueba.soporte'
import { MOTIVO_SIN_PERMISO_DEL_DISENO } from '../../../entities/diseno/edicion-del-diseno'
import type {
  BorradorDelDisenoGuardado as BorradorGuardado,
  PedidoDeGuardarDiseno as PedidoDeGuardar,
} from '../../../entities/diseno/edicion-del-diseno'

const ORIGEN = '11111111-1111-4111-8111-111111111111'
const OTRO_ORIGEN = '44444444-4444-4444-8444-444444444444'
const PUBLICADA = '22222222-2222-4222-8222-222222222222'
const BORRADOR = '33333333-3333-4333-8333-333333333333'
const PERSONA = '55555555-5555-4555-8555-555555555555'
const HORA = '2026-11-07T15:00:00.123456+00:00'
const HORA_NUEVA = '2026-11-07T15:02:10.654321+00:00'

const h = vi.hoisted(() => ({
  permisos: [] as { clave: string; origen_id: string | null; alcance: 'propios' | 'todos' }[],
  pedidos: [] as unknown[],
  respuesta: null as Resultado<unknown> | null,
  revalidatePath: vi.fn(),
}))

vi.mock('server-only', () => ({}))
vi.mock('next/cache', () => ({ revalidatePath: h.revalidatePath }))
vi.mock('@/shared/lib/supabase/server', () => ({
  createClient: () =>
    Promise.resolve({
      auth: { getClaims: () => Promise.resolve({ data: { claims: { sub: PERSONA } } }) },
      rpc: (nombre: string) =>
        Promise.resolve(
          nombre === 'mis_permisos'
            ? { data: h.permisos, error: null }
            : { data: null, error: { message: `rpc inesperada: ${nombre}` } },
        ),
    }),
}))
vi.mock('../../../areas/diseno/composicion', () => ({
  repositorioDelDiseno: {
    guardarBorrador: (pedido: PedidoDeGuardar) => {
      h.pedidos.push(pedido)
      return Promise.resolve(h.respuesta)
    },
  },
}))

const { guardarDiseno } = await import('./guardar-diseno')

const DISENO = disenoDe([seccion('s', [celda('flete')])])
const DEFINICION: Definicion = {
  nodos: [{ id: 'flete', tipo: 'constante', etiqueta: 'Flete', texto: '=900' }],
}
const crear = {
  origenId: ORIGEN,
  definicion: DEFINICION,
  params: { flete: 900 },
  diseno: DISENO,
  nota: null,
  esperada: { sobre: 'publicada' as const, publicadaId: PUBLICADA },
}
const pisar = { ...crear, esperada: { sobre: 'borrador' as const, actualizadoEn: HORA } }
const configura = (origenId: string) => [
  { clave: 'cotizaciones.configurar', origen_id: origenId, alcance: 'todos' as const },
]
const guardado: BorradorGuardado = { id: BORRADOR, actualizadoEn: HORA_NUEVA }

beforeEach(() => {
  h.permisos = configura(ORIGEN)
  h.pedidos.length = 0
  h.respuesta = { ok: true, data: guardado }
  h.revalidatePath.mockClear()
})

describe('guardarDiseno', () => {
  it('sin cotizaciones.configurar del origen no escribe', async () => {
    h.permisos = configura(OTRO_ORIGEN)
    const respuesta = await guardarDiseno(crear)
    expect(respuesta.data).toEqual({
      ok: false,
      error: { codigo: 'sin_permiso', mensaje: MOTIVO_SIN_PERMISO_DEL_DISENO },
    })
    expect(h.pedidos).toEqual([])
    expect(h.revalidatePath).not.toHaveBeenCalled()
  })

  it('crear y pisar entran: el pedido llega tal cual y devuelve {id, actualizadoEn}; revalida', async () => {
    for (const pedido of [crear, pisar]) {
      h.pedidos.length = 0
      const respuesta = await guardarDiseno(pedido)
      expect(h.pedidos).toEqual([pedido])
      expect(respuesta.data).toEqual({ ok: true, data: guardado })
    }
    expect(h.revalidatePath).toHaveBeenCalledTimes(2)
  })

  it('con error no revalida y lo devuelve tal cual', async () => {
    h.respuesta = { ok: false, error: { codigo: 'conflicto', mensaje: 'Ya hay un borrador.' } }
    const respuesta = await guardarDiseno(crear)
    expect(respuesta.data).toEqual(h.respuesta)
    expect(h.revalidatePath).not.toHaveBeenCalled()
  })

  it('las dos esperadas, ninguna, o una hora sin zona no pasan el esquema', async () => {
    const malas = [
      { ...crear, esperada: { sobre: 'publicada', publicadaId: PUBLICADA, actualizadoEn: HORA } },
      { ...crear, esperada: undefined },
      { ...crear, esperada: { sobre: 'borrador', actualizadoEn: '2026-11-07 15:00' } },
      { ...crear, params: { flete: 'mucho' } },
      { ...crear, definicion: { nodos: [{ id: 'X' }] } },
      { ...crear, origenId: 'x' },
      { ...crear, diseno: null },
    ]
    for (const mala of malas) {
      const respuesta = await guardarDiseno(mala as unknown as typeof crear)
      expect(respuesta.data, JSON.stringify(mala)).toBeUndefined()
      expect(respuesta.validationErrors).toBeDefined()
    }
    expect(h.pedidos).toEqual([])
  })
})
