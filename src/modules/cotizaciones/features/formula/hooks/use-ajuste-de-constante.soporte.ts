// Lo que comparten las pruebas de `useAjusteDeConstante` (4.20-3b): la action y la lectura simuladas, los nodos y las respuestas. Sólo para las pruebas (el sufijo
// `.soporte.` lo deja fuera del mapa). Las pruebas lo traen dentro de su `vi.mock` con `await import()`, así que no importa el hook.
import { act, waitFor } from '@testing-library/react'
import { expect, vi } from 'vitest'
import type { Resultado } from '@/shared/lib/errores'
import type { NodoDelAjuste, ValorPorDefecto } from '../../../entities/formula/ajuste'
import type { PropsDelAjuste } from '../../hoja/components/huecos'

export const ejecutar = vi.fn()
export const avisarExito = vi.fn()

type Respuesta = Resultado<ValorPorDefecto | null>
type Pedido = { origenId: string; nodos: readonly string[]; resolver: (r: Respuesta) => void }
export const pedidos: Pedido[] = []
export const leerSimulado = (pedido: { origenId: string; nodos: readonly string[] }) =>
  new Promise<Respuesta>((resolver) => {
    pedidos.push({ ...pedido, resolver })
  })

export const ORIGEN = '11111111-1111-4111-8111-111111111111'
export const PUBLICADA = '22222222-2222-4222-8222-222222222222'
export const OTRA_PUBLICADA = '33333333-3333-4333-8333-333333333333'
const LA_DE_LA_HOJA = '44444444-4444-4444-8444-444444444444'

export const PORCENTAJE: NodoDelAjuste = {
  nodo: 'fees_pct',
  tipo: 'constante',
  formato: 'pct',
  editable: true,
  nombre: 'Porcentaje de Fees',
}
export const FLETE: NodoDelAjuste = {
  nodo: 'flete',
  tipo: 'constante',
  formato: 'raw',
  editable: true,
  nombre: 'Flete',
}

export const leido = (
  valores: Record<string, number | null>,
  publicadaId = PUBLICADA,
  version = 3,
): Respuesta => ({ ok: true, data: { publicadaId, version, valores } })

// Contesta el pedido n.º `n` (desde 1) de la lectura del valor por defecto.
export const responder = async (n: number, r: Respuesta) => {
  await waitFor(() => {
    expect(pedidos.length).toBeGreaterThanOrEqual(n)
  })
  await act(async () => {
    pedidos[n - 1]?.resolver(r)
    await Promise.resolve()
  })
}

export const ok = (id = 'nueva') => ({ data: { ok: true, data: id } })
export const falla = (codigo: string, mensaje: string, porCampo?: Record<string, string>) => ({
  data: { ok: false, error: { codigo, mensaje }, ...(porCampo ? { porCampo } : {}) },
})

// Lo que la hoja le da al panel, con la versión de la fórmula que dibuja (otra que la publicada que se lee).
export function hojaDePrueba(version = 3) {
  const alConfirmar = vi.fn()
  const hoja: PropsDelAjuste['hoja'] = {
    de: { origen: ORIGEN, abierta: 'firma' } as unknown as PropsDelAjuste['hoja']['de'],
    formula: { id: LA_DE_LA_HOJA, version },
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
