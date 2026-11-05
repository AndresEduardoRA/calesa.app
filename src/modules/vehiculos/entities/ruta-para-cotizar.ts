// «Cotizar» desde el resumen del vehículo (4.14-2b): la hoja de cotizar abierta con este vehículo. La página (`src/app`) arma la ruta de la hoja con su origen y dice en qué clave de
// la URL lleva el vehículo: `vehiculos` no conoce `cotizaciones` ni sus claves. Sin lead: la hoja calcula y «Guardar» dice por qué no hasta que se elija el cliente (4.14-3).
export type ParaCotizar = {
  // La ruta de la hoja con el origen, sin vehículo (`rutaDeLaHoja()` de `cotizaciones`).
  ruta: string
  // La clave de la URL donde la hoja lleva su vehículo (`CLAVE_DE_VEHICULO`).
  claveDelVehiculo: string
}

// La ruta con el vehículo agregado, sin tocar lo demás de su consulta.
export function rutaParaCotizar(para: ParaCotizar, vehiculoId: string): string {
  const [camino = '', consulta = ''] = para.ruta.split('?')
  const parametros = new URLSearchParams(consulta)
  parametros.set(para.claveDelVehiculo, vehiculoId)
  return `${camino}?${parametros.toString()}`
}
