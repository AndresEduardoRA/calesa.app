// Los tipos de la cotización aprobada de un vehículo (B4): lo que devuelve aprobar y lo que se lee de `cotizaciones_aprobadas`. Sin I/O.

// Una cotización por su número y su versión: lo que «Deshacer» necesita para volver a aprobarla.
export type CotizacionAprobable = { id: string; numero: number; actualizadoEn: string }

// `anterior` sólo viaja si quien aprobó la ve, puede aprobarla y sigue activa: sin ella no hay «Deshacer».
export type ResultadoDeAprobar = {
  cotizacion: CotizacionAprobable
  anterior: CotizacionAprobable | null
}

// La aprobada de un vehículo con su primer resultado congelado. `monto` cruza como texto (`numeric`): nunca pasa por un número hasta `<Monto>`.
export type CotizacionAprobadaDelVehiculo = {
  vehiculoId: string
  cotizacionId: string
  monto: string | null
  moneda: string
}

// Lo que la guardada necesita saber de su cotización: si es la aprobada y en qué estado está.
export type MarcaDeLaGuardada = { aprobada: boolean; estado: 'activa' | 'reportada' | 'invalida' }
