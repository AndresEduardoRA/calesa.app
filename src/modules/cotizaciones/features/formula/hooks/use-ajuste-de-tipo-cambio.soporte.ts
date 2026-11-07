// Lo que comparten las pruebas del ⚙ de un tipo de cambio (4.20-3d): la action y la lectura simuladas, la fila leída, las respuestas y la hoja nueva o guardada. Sólo para
// las pruebas (el sufijo `.soporte.` lo deja fuera del mapa). Las pruebas lo traen dentro de su `vi.mock` con `await import()`, así que no importa el hook.
import { act, waitFor } from '@testing-library/react'
import { expect, vi } from 'vitest'
import type { Resultado } from '@/shared/lib/errores'
import type { TipoCambioDelNodo } from '../../../entities/formula/tipo-cambio'
import type { PropsDelAjuste } from '../../hoja/components/huecos'

export const ejecutar = vi.fn()
export const avisarExito = vi.fn()

type Respuesta = Resultado<TipoCambioDelNodo | null>
type Pedido = { formulaId: string; nodo: string; resolver: (r: Respuesta) => void }
export const pedidos: Pedido[] = []
export const leerSimulado = (pedido: { formulaId: string; nodo: string }) =>
  new Promise<Respuesta>((resolver) => {
    pedidos.push({ ...pedido, resolver })
  })

export const FORMULA = '44444444-4444-4444-8444-444444444444'
export const ESPERADA = '2026-11-06T22:27:12.123456-04:00'
export const OTRA_ESPERADA = '2026-11-06T22:30:00.654321-04:00'

export const FILA: TipoCambioDelNodo = {
  id: '55555555-5555-4555-8555-555555555555',
  clave: 'oficial',
  nombre: 'Oficial',
  monedaDe: 'USD',
  monedaA: 'BOB',
  valor: 11.68,
  activo: true,
  actualizadoEn: ESPERADA,
}

export const leida = (mas: Partial<TipoCambioDelNodo> = {}): Respuesta => ({
  ok: true,
  data: { ...FILA, ...mas },
})

// Contesta el pedido n.º `n` (desde 1) de la lectura del tipo de cambio.
export const responder = async (n: number, r: Respuesta) => {
  await waitFor(() => {
    expect(pedidos.length).toBeGreaterThanOrEqual(n)
  })
  await act(async () => {
    pedidos[n - 1]?.resolver(r)
    await Promise.resolve()
  })
}

export const ok = (actualizadoEn = OTRA_ESPERADA) => ({
  data: { ok: true, data: { actualizadoEn } },
})
export const falla = (codigo: string, mensaje: string) => ({
  data: { ok: false, error: { codigo, mensaje } },
})

// Lo que la hoja le da al panel: la nueva (calcula por su origen y su abierta) o una guardada.
export function hojaDePrueba(tipo: 'abierta' | 'guardada' = 'abierta') {
  const alConfirmar = vi.fn()
  const hoja: PropsDelAjuste['hoja'] = {
    de:
      tipo === 'abierta'
        ? {
            tipo: 'abierta',
            origenId: '11111111-1111-4111-8111-111111111111',
            abierta: 'firma',
            vehiculoId: null,
          }
        : { tipo: 'guardada', cotizacionId: '66666666-6666-4666-8666-666666666666' },
    formula: { id: FORMULA, version: 3 },
    alConfirmar,
    alRecargar: vi.fn(),
  }
  return { hoja, alConfirmar }
}

export const pedidoMandado = (n = 0) =>
  ejecutar.mock.calls[n]?.[0] as Record<string, unknown> | undefined

export function reiniciar() {
  pedidos.length = 0
  ejecutar.mockReset()
  avisarExito.mockReset()
}
