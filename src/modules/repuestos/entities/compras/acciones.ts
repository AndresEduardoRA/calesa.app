// Por qué no se puede registrar, editar ni eliminar una compra (8.11-3, C3). Puro. Apagar el botón es comodidad: la action y la base lo vuelven a exigir.

/** El motivo para apagar «Registrar compra» (nulo = se puede). El permiso gana sobre el cierre: reabrir no le alcanzaría a quien no lo tiene. */
export function motivoParaNoEscribirCompras({
  puedeEditarCostos,
  cerrado,
}: {
  puedeEditarCostos: boolean
  cerrado: boolean
}): string | null {
  if (!puedeEditarCostos) {
    return 'Necesitas el permiso de editar costos para registrar compras.'
  }
  if (cerrado) {
    // El texto de la base (D4 de 8.11-1).
    return 'El proyecto está cerrado: reábrelo para registrar compras.'
  }
  return null
}
