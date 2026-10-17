import 'server-only'
import { leerVehiculosDelLead } from '../../composicion'

export type OpcionDeVehiculo = { id: string; titulo: string; numero: number }

// Los vehículos del lead que quien mira ve (vinculados e interesados, sin repetir), para elegir uno en
// un seguimiento o un recordatorio, y si se recortaron (cierre 1: cada lista tiene su tope y entonces el campo lo dice).
// Si la lectura falla, ninguno: no tumba la sección que lo pide.
export async function opcionesDeVehiculoDelLead(
  leadId: string,
): Promise<{ opciones: OpcionDeVehiculo[]; recortado: boolean }> {
  const leido = await leerVehiculosDelLead(leadId)
  if (!leido.ok) {
    return { opciones: [], recortado: false }
  }
  const vistos = new Set<string>()
  const opciones = [...leido.data.vinculados, ...leido.data.interesados].flatMap((v) => {
    if (vistos.has(v.id)) {
      return []
    }
    vistos.add(v.id)
    return [{ id: v.id, titulo: v.titulo, numero: v.numero }]
  })
  return { opciones, recortado: leido.data.hayMas.vinculados || leido.data.hayMas.interesados }
}
