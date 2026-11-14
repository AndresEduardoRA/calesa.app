// La cotización aprobada de cada vehículo de una página del inventario, como la dibuja la columna «Cotización aprobada». La arma `src/app` con lo que lee
// `cotizaciones` (este módulo no lo importa): una `ruta` ya resuelta, y el primer resultado congelado con su moneda. Sin I/O.

export const ENCABEZADO_DE_LA_APROBADA = 'Cotización aprobada'
export const SIN_TOTAL = 'Sin total'

export type CotizacionAprobadaDeLaFila = {
  // A dónde lleva el enlace: la guardada de esa cotización.
  ruta: string
  // El primer resultado como texto (`numeric`): nulo si la cotización no traía total.
  monto: string | null
  // La moneda congelada con el monto.
  moneda: string
}

// Por id de vehículo. Un vehículo sin cotización aprobada, o con una que quien mira no ve, no está: «—».
export type AprobadasDeLaPagina = Readonly<Record<string, CotizacionAprobadaDeLaFila>>

export function aprobadaDeLaFila(
  aprobadas: AprobadasDeLaPagina,
  vehiculoId: string,
): CotizacionAprobadaDeLaFila | null {
  return Object.hasOwn(aprobadas, vehiculoId) ? (aprobadas[vehiculoId] ?? null) : null
}

// El monto para `<Monto>`: nulo si no hay o no es un número.
export function montoDeLaAprobada(aprobada: CotizacionAprobadaDeLaFila): number | null {
  if (aprobada.monto === null) {
    return null
  }
  const valor = Number(aprobada.monto)
  return Number.isFinite(valor) ? valor : null
}
