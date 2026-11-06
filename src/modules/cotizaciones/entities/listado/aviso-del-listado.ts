// Lo que dice `/cotizaciones` cuando la URL trae `?lead=` o `?vehiculo=` (4.16-4a, 4.17-4b): el aviso de arriba y el vacío sin filtros. Puro. El nombre del cliente o el
// título del vehículo llegan sólo si quien mira los ve; si no, «un cliente» o «un vehículo», sin distinguir un id que no existe de uno que no se ve.
type DeQuien = {
  lead?: { nombre: string | null } | undefined
  vehiculo?: { titulo: string | null } | undefined
}

export function textoDelAviso({ lead, vehiculo }: DeQuien): string | null {
  const cliente = lead === undefined ? null : (lead.nombre ?? 'un cliente')
  const coche = vehiculo === undefined ? null : (vehiculo.titulo ?? 'un vehículo')
  if (cliente !== null && coche !== null) {
    return `Cotizaciones de ${cliente} sobre ${coche}.`
  }
  const quien = cliente ?? coche
  return quien === null ? null : `Cotizaciones de ${quien}.`
}

export function textoDelVacio({
  lead,
  vehiculo,
}: {
  lead?: boolean
  vehiculo?: boolean
}): string | null {
  if (lead === true && vehiculo === true) {
    return 'Sin cotizaciones de este cliente sobre este vehículo que puedas ver.'
  }
  if (lead === true) {
    return 'Sin cotizaciones de este cliente que puedas ver.'
  }
  return vehiculo === true ? 'Sin cotizaciones de este vehículo que puedas ver.' : null
}
