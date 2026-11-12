// Qué nombra a un vehículo: el valor de su campo principal o, sin él, su título. Puro: lo usan el
// listado, el resumen y logística (que compone el campo principal de `origenes`).
import { valorMostrado, type CampoMostrable } from '@/shared/lib/campos'
import type { CampoDeVehiculo } from './campo'

// Lo que hace falta del campo principal: lo cumplen `CampoDeVehiculo` y el de `origenes`.
export type CampoQueIdentifica = CampoMostrable & { clave: string }

export type Formato = Parameters<typeof valorMostrado>[2]

// `titulo` sólo cuando el nombre es el principal: entonces el título acompaña.
export type IdentidadDeVehiculo = { nombre: string; titulo: string | null }

// El principal del origen, si hay uno activo.
export function campoPrincipalDe<C extends CampoDeVehiculo>(campos: readonly C[]): C | null {
  return campos.find((campo) => campo.principal === true && campo.activo) ?? null
}

function textoDelPrincipal(
  principal: CampoQueIdentifica,
  atributos: Record<string, unknown>,
  formato: Formato,
): string {
  const mostrado = valorMostrado(principal, atributos[principal.clave], formato)
  switch (mostrado.tipo) {
    case 'texto':
      return mostrado.texto.trim()
    case 'enlace':
      return mostrado.url.trim()
    // Un monto nunca nombra a un vehículo (la base no lo deja ser principal).
    case 'monto':
    case 'vacio':
      return ''
  }
}

export function identidadDeVehiculo(
  vehiculo: { titulo: string; atributos: Record<string, unknown> },
  principal: CampoQueIdentifica | null,
  formato: Formato = {},
): IdentidadDeVehiculo {
  const nombre = principal === null ? '' : textoDelPrincipal(principal, vehiculo.atributos, formato)
  return nombre === ''
    ? { nombre: vehiculo.titulo, titulo: null }
    : { nombre, titulo: vehiculo.titulo }
}

// En una línea: «<principal> · <título>», o el título solo.
export function identidadEnUnaLinea(identidad: IdentidadDeVehiculo): string {
  return identidad.titulo === null ? identidad.nombre : `${identidad.nombre} · ${identidad.titulo}`
}
