import 'server-only'
import { leerLimpiezaAutomatica, leerUltimaLimpieza } from '../../composicion'
import type { LimpiezaDeVehiculo, UltimaLimpieza } from '../../entities/limpieza'

// Las dos lecturas no tumban la pantalla: un aviso de más es peor que ninguno, y un fallo de la
// limpieza no es razón para que no se vea la ficha ni la papelera.
export async function limpiezaDe(vehiculoId: string): Promise<LimpiezaDeVehiculo | null> {
  const leida = await leerLimpiezaAutomatica(vehiculoId)
  if (!leida.ok) {
    console.error('vehiculo_limpieza no respondió', leida.error)
    return null
  }
  return leida.data
}

export async function ultimaLimpieza(): Promise<UltimaLimpieza | null> {
  const leida = await leerUltimaLimpieza()
  return leida.ok ? leida.data : null
}
