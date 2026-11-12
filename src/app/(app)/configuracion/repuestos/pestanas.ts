// Las pestañas de Configuración › Repuestos (8.08-3; «Cotizador», 8.12-2). Cuál está abierta vive en la URL (`?seccion=`); con dos o más visibles se dibuja
// la barra (D28).
import { puede, type ClavePermiso, type Permisos } from '@/shared/lib/permisos'
import type { AlMenosUna } from '../empresa/pestanas'

type PestanaDeRepuestos = {
  clave: string
  titulo: string
  permisos: readonly ClavePermiso[]
}

export const PESTANAS = [
  { clave: 'catalogos', titulo: 'Catálogos', permisos: ['repuestos.configurar'] },
  { clave: 'cotizador', titulo: 'Cotizador', permisos: ['repuestos.configurar'] },
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
