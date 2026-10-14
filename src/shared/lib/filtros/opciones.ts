// Buscar dentro de las opciones de un filtro cuando son muchas: sin tildes ni mayúsculas.
import type { OpcionDeFiltro } from './esquema'

// Desde cuántas opciones el filtro ofrece una búsqueda propia.
export const OPCIONES_PARA_BUSCAR = 12

const sinTildes = (texto: string) => texto.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()

export function opcionesQueCoinciden(
  opciones: readonly OpcionDeFiltro[],
  consulta: string,
): OpcionDeFiltro[] {
  const buscada = sinTildes(consulta.trim())
  return buscada === ''
    ? [...opciones]
    : opciones.filter((opcion) => sinTildes(opcion.etiqueta).includes(buscada))
}
