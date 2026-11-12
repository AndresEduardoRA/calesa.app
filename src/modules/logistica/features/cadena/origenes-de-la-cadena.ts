import 'server-only'
import { getOrigenes } from '@/modules/origenes'
import { leerFlujoDeOrigen, reglaActiva } from '@/modules/flujos'
import { puede, type Permisos } from '@/shared/lib/permisos'
import type { OrigenDeLaCadena } from '../../entities/cadena/origenes'

// Las pestañas de origen de la cadena (6.03-1): los orígenes activos donde la persona tiene `logistica.ver` y cuyo flujo de vehículos tiene la regla `logistica` encendida. Los flujos se
// leen en paralelo (son decenas). Un origen cuyo flujo no se pudo leer queda fuera y se cuenta en `fallaron`: la pantalla lo dice, no se cae.
export type OrigenesDeLaCadena = { origenes: OrigenDeLaCadena[]; fallaron: number }

export const REGLA_DE_LOGISTICA = 'logistica'

export async function origenesDeLaCadena(permisos: Permisos): Promise<OrigenesDeLaCadena | null> {
  const origenes = await getOrigenes()
  if (!origenes.ok) return null
  const visibles = origenes.data.filter((origen) => puede(permisos, 'logistica.ver', origen.id))
  const flujos = await Promise.all(visibles.map((origen) => leerFlujoDeOrigen(origen.id)))
  const encendidos: OrigenDeLaCadena[] = []
  let fallaron = 0
  visibles.forEach((origen, i) => {
    const flujo = flujos[i]
    if (flujo === undefined || !flujo.ok) {
      fallaron += 1
      return
    }
    if (flujo.data !== null && reglaActiva(flujo.data, REGLA_DE_LOGISTICA)) {
      encendidos.push({ id: origen.id, nombre: origen.nombre, color: origen.color })
    }
  })
  return { origenes: encendidos, fallaron }
}
