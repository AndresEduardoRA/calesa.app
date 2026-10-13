// Las pestañas de la ficha de un vehículo (docs/UX.md › Vehículo), declaradas enteras. Sólo se
// muestran las que ya existen: una pestaña es `disponible` cuando tiene su `seccion-<clave>.tsx`
// en esta carpeta, y un test lo compara con el disco. Así ninguna pestaña lleva a la nada.

export const PESTANAS_DE_VEHICULO = [
  { clave: 'ficha', titulo: 'Ficha', disponible: true },
  { clave: 'fotos', titulo: 'Fotos', disponible: false },
  { clave: 'documentos', titulo: 'Documentos', disponible: false },
  { clave: 'cotizaciones', titulo: 'Cotizaciones', disponible: false },
  { clave: 'repuestos', titulo: 'Repuestos', disponible: false },
] as const

export type PestanaDeVehiculo = (typeof PESTANAS_DE_VEHICULO)[number]['clave']

export function pestanasDisponibles() {
  return PESTANAS_DE_VEHICULO.filter((pestana) => pestana.disponible)
}

// Con una sola pestaña no hay nada entre qué elegir: la barra no se dibuja.
export function hayBarraDePestanas(): boolean {
  return pestanasDisponibles().length > 1
}

// Lo que viene en la URL lo puede escribir cualquiera: lo que no es una pestaña que existe abre
// la ficha.
export function pestanaDeVehiculo(valor: string | undefined): PestanaDeVehiculo {
  return pestanasDisponibles().find((pestana) => pestana.clave === valor)?.clave ?? 'ficha'
}
