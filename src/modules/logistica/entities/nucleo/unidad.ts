// La unidad de logística (6.01): el vehículo o el repuesto sobre el que se opera. Documentos, gastos, pagos, notas y transporte cuelgan siempre de
// una unidad, `vehiculo_id` o `repuesto_id`, uno y sólo uno (la ficha de `logistica`, sección «No se rompe»). Hoy sólo se construye la de vehículo; la de repuesto llega con 8.13.
export type Unidad = {
  tipo: 'vehiculo' | 'repuesto'
  id: string
  origenId: string
  // Lo que nombra al vehículo: su título (`vehiculos.titulo`) o, si su origen tiene campo principal, «<principal> · <título>» (6.13).
  titulo: string
  faseId: string | null
  // Cuándo entró a su fase (ISO); nulo si no tiene fase. De ahí salen los días en la fase.
  faseDesde: string | null
}

export type RefDeUnidad = { vehiculo_id: string } | { repuesto_id: string }

/** La forma de la unidad en las tablas de logística: una de las dos columnas y nunca las dos. */
export function refDeUnidad(unidad: Pick<Unidad, 'tipo' | 'id'>): RefDeUnidad {
  return unidad.tipo === 'vehiculo' ? { vehiculo_id: unidad.id } : { repuesto_id: unidad.id }
}
