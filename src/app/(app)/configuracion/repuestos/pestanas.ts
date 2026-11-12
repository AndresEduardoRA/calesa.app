// Las pestañas de Configuración › Repuestos (8.08-3). Cuál está abierta vive en la URL (`?seccion=`). Hoy hay una, «Catálogos»: con una sola la barra no se
// dibuja. El 8.12 suma «Cotizador» en esta lista y entonces la barra (D28).
import { puede, type ClavePermiso, type Permisos } from '@/shared/lib/permisos'
import type { AlMenosUna } from '../empresa/pestanas'

type PestanaDeRepuestos = {
  clave: string
  titulo: string
  permisos: readonly ClavePermiso[]
}

export const PESTANAS = [
  { clave: 'catalogos', titulo: 'Catálogos', permisos: ['repuestos.configurar'] },
] as const satisfies readonly PestanaDeRepuestos[]

export type Pestana = (typeof PESTANAS)[number]['clave']

// Las pestañas que esta persona puede abrir, en su orden.
export function pestanasVisibles(permisos: Permisos): (typeof PESTANAS)[number][] {
  return PESTANAS.filter((pestana) =>
    pestana.permisos.some((clave: ClavePermiso) => puede(permisos, clave)),
  )
}

// Lo que viene en la URL lo puede escribir cualquiera: lo que no es una de sus pestañas abre la primera de las suyas.
export function pestanaDe(
  valor: string | undefined,
  visibles: AlMenosUna<{ clave: Pestana }>,
): Pestana {
  return visibles.find((pestana) => pestana.clave === valor)?.clave ?? visibles[0].clave
}
