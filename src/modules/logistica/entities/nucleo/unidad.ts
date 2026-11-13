// La unidad de logística (6.01): el vehículo o el repuesto sobre el que se opera. Documentos, gastos, pagos, notas y transporte cuelgan siempre de
// una unidad, `vehiculo_id` o `repuesto_id`, uno y sólo uno (la ficha de `logistica`, sección «No se rompe»). La de vehículo la arma `unidad-abierta` y la de repuesto, `repuestos/item-abierto` (8.13-2).
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

/**
 * La unidad que abre el panel: un vehículo (`Unidad`) o un ítem de repuesto (8.13-2). Un ítem no tiene origen (el flujo de repuestos no lo tiene: `origenId`
 * nulo) y trae su proyecto y el vehículo de éste, si lo tiene (D6): de ahí salen «Abrir proyecto» y «Sigue al vehículo». `Unidad` se queda con `origenId: string`
 * para las áreas que sólo tratan vehículos (documentos, transporte, aduana…): ellas no se enteran del ítem.
 */
export type UnidadAbierta = Omit<Unidad, 'origenId'> & {
  origenId: string | null
  proyecto?: { id: string; vehiculoId: string | null }
}

/** La unidad abierta es un vehículo (y entonces tiene origen): donde sólo hay vehículos, estrecha a `Unidad`. */
export function esUnidadDeVehiculo(unidad: UnidadAbierta): unidad is Unidad & { tipo: 'vehiculo' } {
  return unidad.tipo === 'vehiculo' && unidad.origenId !== null
}

export type RefDeUnidad = { vehiculo_id: string } | { repuesto_id: string }

/** La forma de la unidad en las tablas de logística: una de las dos columnas y nunca las dos. */
export function refDeUnidad(unidad: Pick<Unidad, 'tipo' | 'id'>): RefDeUnidad {
  return unidad.tipo === 'vehiculo' ? { vehiculo_id: unidad.id } : { repuesto_id: unidad.id }
}
