// Las pestañas de Configuración › Cotización. Cuál está abierta vive en la URL (`?seccion=`). Cada una lleva sus permisos: «Niveles de acceso» los de la matriz de
// Roles (cada nivel es un permiso) y «Fórmula» `cotizaciones.configurar` (4.20-2a), en cualquier origen. Niveles va primero: quien entra por el hub con los dos cae en
// la de siempre. Las tablas y la tarjeta llegan después (docs/PLAN.md, Fase 4).
import { puede, type ClavePermiso, type Permisos } from '@/shared/lib/permisos'
import type { AlMenosUna } from '../empresa/pestanas'

type PestanaDeCotizacion = {
  clave: string
  titulo: string
  permisos: readonly ClavePermiso[]
}

export const PESTANAS = [
  {
    clave: 'niveles',
    titulo: 'Niveles de acceso',
    permisos: ['equipo.roles.ver', 'equipo.roles.gestionar'],
  },
  { clave: 'formula', titulo: 'Fórmula', permisos: ['cotizaciones.configurar'] },
] as const satisfies readonly PestanaDeCotizacion[]

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
