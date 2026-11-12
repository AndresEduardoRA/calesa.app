// Las pestañas de la ficha de un vehículo (docs/UX.md › Vehículo). Con «Repuestos» (8.09-4) ya están todas las declaradas: cada una tiene su `seccion-<clave>.tsx` en esta carpeta y un
// test lo compara con el disco, así que ninguna pestaña lleva a la nada. Una pestaña nueva se declara aquí al crear su sección.

import { puede, type Permisos } from '@/shared/lib/permisos'

export const PESTANAS_DE_VEHICULO = [
  { clave: 'ficha', titulo: 'Ficha' },
  { clave: 'fotos', titulo: 'Fotos' },
  { clave: 'documentos', titulo: 'Documentos' },
  { clave: 'cotizaciones', titulo: 'Cotizaciones' },
  { clave: 'repuestos', titulo: 'Repuestos' },
] as const

// El parámetro de la URL que dice qué pestaña está abierta.
export const CLAVE_DE_PESTANA = 'seccion'

export type PestanaDeVehiculo = (typeof PESTANAS_DE_VEHICULO)[number]['clave']

// Una pestaña de la barra: lo único que cruza al navegador.
export type PestanaVisible = { clave: PestanaDeVehiculo; titulo: string }

// Las pestañas que quien mira ve: todas, con «Cotizaciones» sólo con `cotizaciones.ver` en el origen del vehículo (la RLS de `cotizaciones` va por el origen) y «Documentos» sólo
// con `logistica.ver` en él (la de `documentos` también) y «Repuestos» con `repuestos.ver`, que es global y no va por origen (8.09-4, D75).
export function pestanasVisibles({
  cotizaciones,
  documentos,
  repuestos,
}: {
  cotizaciones: boolean
  documentos: boolean
  repuestos: boolean
}): PestanaVisible[] {
  return PESTANAS_DE_VEHICULO.filter((pestana) => pestana.clave !== 'cotizaciones' || cotizaciones)
    .filter((pestana) => pestana.clave !== 'documentos' || documentos)
    .filter((pestana) => pestana.clave !== 'repuestos' || repuestos)
    .map(({ clave, titulo }) => ({ clave, titulo }))
}

// Con una sola pestaña no hay nada entre qué elegir: la barra no se dibuja.
export function hayBarraDePestanas(visibles: readonly PestanaVisible[]): boolean {
  return visibles.length > 1
}

// Lo que viene en la URL lo puede escribir cualquiera: lo que no es una pestaña visible (una que no existe, o «Cotizaciones» sin la clave) abre la ficha.
export function pestanaDeVehiculo(
  valor: string | undefined,
  visibles: readonly PestanaVisible[],
): PestanaDeVehiculo {
  return visibles.find((pestana) => pestana.clave === valor)?.clave ?? 'ficha'
}

/** Las pestañas que ve quien tiene esos permisos en el origen del vehículo. */
export function pestanasDeQuienMira(permisos: Permisos, origenId: string): PestanaVisible[] {
  return pestanasVisibles({
    cotizaciones: puede(permisos, 'cotizaciones.ver', origenId),
    documentos: puede(permisos, 'logistica.ver', origenId),
    repuestos: puede(permisos, 'repuestos.ver'),
  })
}
