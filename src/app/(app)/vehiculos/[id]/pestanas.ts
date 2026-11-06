// Las pestañas de la ficha de un vehículo (docs/UX.md › Vehículo), declaradas enteras. Sólo se
// muestran las que ya existen: una pestaña es `disponible` cuando tiene su `seccion-<clave>.tsx`
// en esta carpeta, y un test lo compara con el disco. Así ninguna pestaña lleva a la nada.

export const PESTANAS_DE_VEHICULO = [
  { clave: 'ficha', titulo: 'Ficha', disponible: true },
  { clave: 'fotos', titulo: 'Fotos', disponible: true },
  { clave: 'documentos', titulo: 'Documentos', disponible: false },
  { clave: 'cotizaciones', titulo: 'Cotizaciones', disponible: true },
  { clave: 'repuestos', titulo: 'Repuestos', disponible: false },
] as const

// El parámetro de la URL que dice qué pestaña está abierta.
export const CLAVE_DE_PESTANA = 'seccion'

export type PestanaDeVehiculo = (typeof PESTANAS_DE_VEHICULO)[number]['clave']

export function pestanasDisponibles() {
  return PESTANAS_DE_VEHICULO.filter((pestana) => pestana.disponible)
}

// Una pestaña de la barra: lo único que cruza al navegador.
export type PestanaVisible = { clave: PestanaDeVehiculo; titulo: string }

// Las pestañas que quien mira ve: las disponibles, y «Cotizaciones» sólo con `cotizaciones.ver` en el origen del vehículo (la RLS de `cotizaciones` va por el origen).
export function pestanasVisibles({ cotizaciones }: { cotizaciones: boolean }): PestanaVisible[] {
  return pestanasDisponibles()
    .filter((pestana) => pestana.clave !== 'cotizaciones' || cotizaciones)
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
