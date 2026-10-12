// Lo que los casos de uso de `features/` necesitan de afuera, dicho como interfaces. La
// implementación (Supabase) vive en `infra/` y se la entrega `composicion.ts`.
import type { Resultado } from '@/shared/lib/errores'
import type { AjustesEmpresa, CambiosDeAjustes } from './ajustes-empresa'
import type { ClaveIntegracion, Integracion } from './integraciones'
import type { CambioDeValor, Moneda, TipoCambio } from './tipos-cambio'

// Toda edición manda la versión que tenía en pantalla quien edita; la base responde `conflicto`
// si otra persona lo cambió, y devuelve la versión nueva para seguir editando sin recargar.
type Editado = { actualizadoEn: string }

export type RepositorioEmpresa = {
  guardar: (pedido: {
    cambios: CambiosDeAjustes
    actualizadoEnEsperado: string
  }) => Promise<Resultado<Editado>>
}

export type RepositorioTiposCambio = {
  crear: (nuevo: {
    clave: string
    nombre: string
    monedaDe: string
    monedaA: string
    valor: number
  }) => Promise<Resultado<{ id: string }>>
  // Lo que viene `undefined` no se toca.
  guardar: (pedido: {
    id: string
    actualizadoEnEsperado: string
    nombre?: string
    valor?: number
    activo?: boolean
    esDefault?: boolean
  }) => Promise<Resultado<Editado>>
  crearMoneda: (nueva: {
    codigo: string
    nombre: string
    simbolo: string
    decimales: number
  }) => Promise<Resultado<Editado>>
  guardarMoneda: (pedido: {
    codigo: string
    actualizadoEnEsperado: string
    nombre?: string
    simbolo?: string
    decimales?: number
    activa?: boolean
  }) => Promise<Resultado<Editado>>
}

export type RepositorioIntegraciones = {
  guardar: (pedido: {
    clave: ClaveIntegracion
    actualizadoEnEsperado: string
    activa?: boolean
    config?: Record<string, unknown>
  }) => Promise<Resultado<Editado>>
  // Va a Vault. Nada lo devuelve: sólo queda dicho cuándo se guardó.
  guardarSecreto: (pedido: {
    clave: ClaveIntegracion
    secreto: string
    actualizadoEnEsperado: string
  }) => Promise<Resultado<Editado>>
}

export type AjustesParaEditar = {
  ajustes: AjustesEmpresa
  // Con vehículos, cotizaciones o gastos cargados la moneda base ya no se cambia.
  conDatosCargados: boolean
}

export type MonedasYTiposCambio = { monedas: Moneda[]; tipos: TipoCambio[] }

export type LectorDeAjustes = () => Promise<Resultado<AjustesParaEditar>>
// Todos, también los inactivos: es lo que edita la pantalla.
export type LectorDeMonedasYTiposCambio = () => Promise<Resultado<MonedasYTiposCambio>>
export type LectorDeHistorial = (tipoCambioId: string) => Promise<Resultado<CambioDeValor[]>>
export type LectorDeIntegraciones = () => Promise<Resultado<Integracion[]>>
