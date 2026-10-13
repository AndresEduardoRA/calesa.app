import 'server-only'
import { leerVistaPrevia, leerVitrinaDelOrigen } from '../../composicion'
import {
  VITRINA_CERRADA,
  type VistaPreviaDeVitrina,
  type VitrinaDelOrigen,
} from '../../entities/vitrina'

// Lo que el inventario necesita saber de la vitrina de un origen. Si la base no responde, el
// listado se dibuja igual: nada figura «en vitrina» y el filtro no trae filas.
export async function vitrinaDelOrigen(origenId: string): Promise<VitrinaDelOrigen> {
  const leida = await leerVitrinaDelOrigen(origenId)
  return leida.ok ? leida.data : VITRINA_CERRADA
}

// Lo que vería un visitante de este vehículo. Si no se pudo leer, la ficha se dibuja sin ella.
export async function vistaPreviaDe(vehiculoId: string): Promise<VistaPreviaDeVitrina | null> {
  const leida = await leerVistaPrevia(vehiculoId)
  return leida.ok ? leida.data : null
}
