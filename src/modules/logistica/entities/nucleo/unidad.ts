// La unidad de logística (6.01): el vehículo o el repuesto sobre el que se opera. Documentos, gastos, pagos, notas y transporte cuelgan siempre de
// una unidad, `vehiculo_id` o `repuesto_id`, uno y sólo uno (la ficha de `logistica`, sección «No se rompe»). La de vehículo la arma `unidad-abierta` y la de repuesto, `repuestos/item-abierto` (8.13-2).
export type Unidad = {
  tipo: 'vehiculo' | 'repuesto'
  id: string
  // Nulo para un ítem: el flujo de repuestos no tiene origen.
  origenId: string | null
  // Lo que nombra al vehículo: su título (`vehiculos.titulo`) o, si su origen tiene campo principal, «<principal> · <título>» (6.13).
  titulo: string
  faseId: string | null
  // Cuándo entró a su fase (ISO); nulo si no tiene fase. De ahí salen los días en la fase.
  faseDesde: string | null
  // Sólo en un ítem (D6 de 8.13-2): su proyecto y el vehículo de éste, si lo tiene. De ahí salen «Abrir proyecto» y «Sigue al vehículo».
  proyecto?: { id: string; vehiculoId: string | null }
}

/** La unidad es un vehículo (y entonces tiene origen): donde sólo hay vehículos, estrecha `origenId` a `string`. */
export function esUnidadDeVehiculo(
  unidad: Unidad,
): unidad is Unidad & { tipo: 'vehiculo'; origenId: string } {
  return unidad.tipo === 'vehiculo' && unidad.origenId !== null
}

export type RefDeUnidad = { vehiculo_id: string } | { repuesto_id: string }

/** La forma de la unidad en las tablas de logística: una de las dos columnas y nunca las dos. */
export function refDeUnidad(unidad: Pick<Unidad, 'tipo' | 'id'>): RefDeUnidad {
  return unidad.tipo === 'vehiculo' ? { vehiculo_id: unidad.id } : { repuesto_id: unidad.id }
}
