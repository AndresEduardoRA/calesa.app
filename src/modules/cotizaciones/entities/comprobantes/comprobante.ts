// Un comprobante de una cotización como lo dibuja la guardada (4.26-2). Nada de React ni de Supabase: lo leen `infra/comprobantes/leer.ts` y la sección
// «Comprobantes». No lleva `datos` (P4 a del 4.26): lo congelado no se dibuja; el cliente y el vehículo los muestra la cabecera, con sus permisos.
// El estado de la cotización (`estado_cotizacion` de la base): sólo se emite de una final activa. Propio del área: un área no importa otra.
export type EstadoDeLaCotizacion = 'activa' | 'reportada' | 'invalida'

export type ComprobanteDeLaCotizacion = {
  id: string
  serie: string
  numero: number
  emitidoEn: string
  // El nombre de quien lo emitió o lo anuló; nulo si no se sabe (la persona se borró o no tiene nombre).
  emitidoPor: string | null
  anuladoEn: string | null
  anuladoPor: string | null
  motivo: string | null
}

// Lo que la guardada lee de los comprobantes de una cotización: el estado de la cotización (sólo se emite de una final activa) y los comprobantes, del más nuevo
// al más viejo, cortados al tope.
export type ComprobantesDeLaCotizacion = {
  estado: EstadoDeLaCotizacion
  filas: ComprobanteDeLaCotizacion[]
  hayMas: boolean
}

// «A-12»: como lo escribe la base en sus mensajes («S-N»).
export function numeroDeComprobante(serie: string, numero: number): string {
  return `${serie}-${String(numero)}`
}

// El comprobante vigente (sin anular): a lo sumo uno por cotización (P2 a), o nulo.
export function vigenteDe(
  comprobantes: readonly ComprobanteDeLaCotizacion[],
): ComprobanteDeLaCotizacion | null {
  return comprobantes.find((comprobante) => comprobante.anuladoEn === null) ?? null
}
