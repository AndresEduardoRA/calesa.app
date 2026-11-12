// Los requisitos de una fase tal como el bloque del inspector los ordena y los ofrece. Puro: el orden lo manda `orden` (la base renumera de 10 en 10),
// y mover es «después de X» (nulo = primero), como lo recibe `requisito_mover`.
import type { AmbitoDeFlujo, FlujoParaConfigurar, RequisitoParaConfigurar } from '../flujo'
import { CLAVES_POR_AMBITO } from './claves'
import type { TipoParaRequisito } from './opciones'

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

// Los tipos de documento que un requisito nuevo puede pedir: los activos, en el orden leído.
export function tiposActivos(tipos: readonly TipoParaRequisito[]): TipoParaRequisito[] {
  return tipos.filter((t) => t.activo)
}

// La regla «Esperas» del flujo (la base no deja pedir una espera con ella apagada).
export function reglaDeEsperasActiva(flujo: Pick<FlujoParaConfigurar, 'reglas'>): boolean {
  return flujo.reglas.some((r) => r.regla === 'esperas' && r.activa)
}

// Las partes de la URL del bloque (nuqs): «Agregar requisito» (`?agregar=nuevo&forma=elegir|dato|documento|espera`), editar (`?editar=requisito&requisito=<id>`)
// y la confirmación de quitar (`?eliminar=requisito&quitar=<id>`). Una clave propia para cada uno: el panel del inspector ya ocupa `?fase=` y el diálogo no
// puede ocupar `?panel=`.
export const CLAVE_AGREGAR = 'agregar'
export const PANEL_AGREGAR = 'nuevo'
export const CLAVE_DE_LA_FORMA = 'forma'
export const FORMA_DE_ELEGIR = 'elegir'
export const FORMA_DE_DATO = 'dato'
export const FORMA_DE_DOCUMENTO = 'documento'
export const FORMA_DE_ESPERA = 'espera'
export const FORMAS_DE_AGREGAR = [
  FORMA_DE_ELEGIR,
  FORMA_DE_DATO,
  FORMA_DE_DOCUMENTO,
  FORMA_DE_ESPERA,
] as const
export type FormaDeAgregar = (typeof FORMAS_DE_AGREGAR)[number]

// La forma que dice la URL; una desconocida cae en el selector.
export function formaDeAgregarDe(valor: string | null): FormaDeAgregar {
  return FORMAS_DE_AGREGAR.find((forma) => forma === valor) ?? FORMA_DE_ELEGIR
}
export const CLAVE_EDITAR = 'editar'
export const PANEL_EDITAR_REQUISITO = 'requisito'
export const CLAVE_DEL_REQUISITO_A_EDITAR = 'requisito'
export const CLAVE_ELIMINAR = 'eliminar'
export const PANEL_ELIMINAR_REQUISITO = 'requisito'
export const CLAVE_DEL_REQUISITO_A_QUITAR = 'quitar'
export const MOTIVO_DE_REQUISITO_NO_DISPONIBLE = 'Ese requisito ya no existe.'
