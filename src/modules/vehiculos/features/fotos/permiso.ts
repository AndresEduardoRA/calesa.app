import 'server-only'
import { revalidatePath } from 'next/cache'
import { fallo, ok, type Resultado } from '@/shared/lib/errores'
import { alcanceDe, type Permisos } from '@/shared/lib/permisos'
import { RUTAS } from '@/shared/lib/rutas'
import { leerVehiculo } from '../../composicion'

export const SIN_PERMISO_PARA_FOTOS = 'No tienes permiso para cambiar las fotos de este vehículo.'

// Antes de tocar las fotos: el vehículo existe (y quien llama lo ve) y tiene `vehiculos.editar`
// en su origen. Con alcance «propios» decide la base, que sabe si lo creó o si está vinculado a
// un lead de su cartera.
export async function exigirEdicionDeFotos(
  permisos: Permisos,
  vehiculoId: string,
): Promise<Resultado<null>> {
  const leido = await leerVehiculo(vehiculoId)
  if (!leido.ok) {
    return leido
  }
  if (!leido.data) {
    return fallo('no_encontrado', 'Ese vehículo ya no existe o no tienes acceso.')
  }
  if (alcanceDe(permisos, 'vehiculos.editar', leido.data.origenId) === null) {
    return fallo('sin_permiso', SIN_PERMISO_PARA_FOTOS)
  }
  return ok(null)
}

// La portada se ve en el listado; el resto, en la ficha.
export function revalidarFotos(vehiculoId: string): void {
  revalidatePath(RUTAS.vehiculos)
  revalidatePath(`${RUTAS.vehiculos}/${vehiculoId}`)
}
