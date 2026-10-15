import 'server-only'
import { leerVehiculosDelLead } from '../../composicion'

export type OpcionDeVehiculo = { id: string; titulo: string; numero: number }

// Los vehículos del lead que quien mira ve (vinculados e interesados, sin repetir), para elegir uno en
// un seguimiento o un recordatorio. Si la lectura falla, ninguno: no tumba la sección que lo pide.
export async function opcionesDeVehiculoDelLead(leadId: string): Promise<OpcionDeVehiculo[]> {
  const leido = await leerVehiculosDelLead(leadId)
  if (!leido.ok) {
    return []
  }
  const vistos = new Set<string>()
  return [...leido.data.vinculados, ...leido.data.interesados].flatMap((v) => {
    if (vistos.has(v.id)) {
      return []
    }
    vistos.add(v.id)
    return [{ id: v.id, titulo: v.titulo, numero: v.numero }]
  })
}
