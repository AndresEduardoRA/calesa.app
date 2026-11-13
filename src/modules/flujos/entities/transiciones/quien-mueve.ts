// Quién puede mover una unidad de una fase a otra, dicho para la pantalla (5.06). Espejo de `_puede_mover(p_flujo, p_de, p_a)`
// **sin su parte de permisos**: el hueco no lleva los permisos de quien mira, así que sólo dice qué roles acotan. Si hay una transición `(de, a)` con lista de
// roles, manda esa lista; si no, manda la lista de la fase destino; si tampoco hay, cualquiera con el permiso de mover. Puro: la RPC `cambiar_fase` es el candado.
import type { FlujoParaConfigurar } from '../flujo'
import type { RolLeido } from '../lectura-de-fase'

export type OrigenDeQuienMueve = 'salida' | 'fase' | 'cualquiera'

export type QuienMueve = { origen: OrigenDeQuienMueve; rolIds: string[] }

// `deFaseId` nulo (una unidad sin fase que entra a una inicial) salta la lista de la salida: no hay transición de la que hablar.
export function quienMueve(
  flujo: FlujoParaConfigurar,
  deFaseId: string | null,
  aFaseId: string,
): QuienMueve {
  if (deFaseId !== null) {
    const salida = flujo.transiciones.find((t) => t.deFaseId === deFaseId && t.aFaseId === aFaseId)
    if (salida) {
      const deLaSalida = flujo.rolesPorTransicion
        .filter((r) => r.transicionId === salida.id)
        .map((r) => r.rolId)
      if (deLaSalida.length > 0) {
        return { origen: 'salida', rolIds: deLaSalida }
      }
    }
  }
  const deLaFase = flujo.rolesPorFase.filter((r) => r.faseId === aFaseId).map((r) => r.rolId)
  return deLaFase.length > 0
    ? { origen: 'fase', rolIds: deLaFase }
    : { origen: 'cualquiera', rolIds: [] }
}

export const TEXTO_DE_CUALQUIERA = 'Cualquiera con el permiso de mover'
export const NOTA_DE_PERMISO_GENERAL =
  'Quien tenga permiso para mover a cualquier fase siempre puede.'

// «Hoy pueden mover: Dueño, Logística», con los nombres en orden. Un rol que no está en la lista leída (más de 100 roles) se dice «otro rol». Con `sufijo`,
// de dónde sale la lista: «(lista de esta salida)» o «(los de la fase)».
export function textoDeQuienMueve(
  resultado: QuienMueve,
  roles: readonly RolLeido[],
  sufijo = true,
): string {
  if (resultado.origen === 'cualquiera') {
    return TEXTO_DE_CUALQUIERA
  }
  const nombres = resultado.rolIds
    .map((id) => roles.find((r) => r.id === id)?.nombre ?? 'otro rol')
    .sort((a, b) => a.localeCompare(b, 'es'))
  const origen = !sufijo
    ? ''
    : resultado.origen === 'salida'
      ? ' (lista de esta salida)'
      : ' (los de la fase)'
  return `Hoy pueden mover: ${nombres.join(', ')}${origen}`
}
