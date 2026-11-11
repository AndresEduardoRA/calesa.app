// Los requisitos de una fase tal como el bloque del inspector los ordena y los ofrece. Puro: el orden lo manda `orden` (la base renumera de 10 en 10),
// y mover es «después de X» (nulo = primero), como lo recibe `requisito_mover`.
import type { AmbitoDeFlujo, RequisitoParaConfigurar } from '../flujo'
import { CLAVES_POR_AMBITO } from './claves'

export type DireccionDeRequisito = 'subir' | 'bajar'

// Los de una fase, en el orden en que se ven.
export function requisitosDeLaFase(
  requisitos: readonly RequisitoParaConfigurar[],
  faseId: string,
): RequisitoParaConfigurar[] {
  return requisitos.filter((r) => r.faseId === faseId).sort((a, b) => a.orden - b.orden)
}

// A dónde va un requisito al subirlo o bajarlo un lugar. Nulo si ya está en el extremo o no está. La lista es la de la fase, en el orden en que se ve.
export function destinoDeRequisito(
  requisitos: readonly RequisitoParaConfigurar[],
  id: string,
  direccion: DireccionDeRequisito,
): { despuesDe: string | null } | null {
  const lugar = requisitos.findIndex((r) => r.id === id)
  if (lugar < 0) {
    return null
  }
  if (direccion === 'subir') {
    return lugar === 0 ? null : { despuesDe: requisitos[lugar - 2]?.id ?? null }
  }
  const siguiente = requisitos[lugar + 1]
  return siguiente ? { despuesDe: siguiente.id } : null
}

// El orden de una lista como texto: dice si la página ya trajo el orden nuevo tras mover (el foco vuelve al botón entonces, no antes).
export function firmaDelOrden(requisitos: readonly RequisitoParaConfigurar[]): string {
  return requisitos.map((r) => r.id).join(',')
}

// Las claves que el selector de «Dato» ofrece: las del ámbito del flujo menos las que la fase ya pide (la base permite repetir, pero no tiene sentido).
export function clavesQueFaltan(
  ambito: AmbitoDeFlujo,
  deLaFase: readonly RequisitoParaConfigurar[],
): string[] {
  const tiene = new Set(deLaFase.map((r) => r.claveDato))
  return CLAVES_POR_AMBITO[ambito].filter((clave) => !tiene.has(clave))
}
