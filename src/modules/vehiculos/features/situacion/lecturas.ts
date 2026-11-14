import 'server-only'
import { leerResolucionDeSubasta } from '../../composicion'
import type { ResolucionDeSubasta } from '../../entities/situacion'

// Quién marcó la subasta y cuándo, para el aviso de la ficha. No tumba la pantalla: si falla, el aviso se dibuja sin el nombre.
export async function resolucionDeSubasta(vehiculoId: string): Promise<ResolucionDeSubasta | null> {
  const leida = await leerResolucionDeSubasta(vehiculoId)
  if (!leida.ok) {
    console.error('la resolución de la subasta no respondió', leida.error)
    return null
  }
  return leida.data
}
