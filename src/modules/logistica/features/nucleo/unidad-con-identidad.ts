import 'server-only'
import { getAjustes } from '@/modules/empresa'
import { leerCampoPrincipal } from '@/modules/origenes'
import { identidadDeVehiculo, identidadEnUnaLinea } from '@/modules/vehiculos'
import { ok, type Resultado } from '@/shared/lib/errores'
import type { UnidadLeida } from '../../entities/nucleo/leer-unidad'
import { esUnidadDeVehiculo, type Unidad } from '../../entities/nucleo/unidad'

// La unidad nombrada por el campo principal de su origen, «<principal> · <título>» (6.13), con el formato de la empresa. Se llama
// después de que la RLS de `vehiculos` dejó ver la unidad. Si el principal no se puede leer, queda el título: no tumba el panel.
export async function unidadConIdentidad(
  leida: Resultado<UnidadLeida | null>,
): Promise<Resultado<Unidad | null>> {
  if (!leida.ok) return leida
  if (leida.data === null) return ok(null)
  const { unidad, atributos } = leida.data
  // Sólo un vehículo tiene origen y campo principal (8.13-2).
  if (!esUnidadDeVehiculo(unidad)) return ok(unidad)
  const [principal, ajustes] = await Promise.all([
    leerCampoPrincipal(unidad.origenId),
    getAjustes(),
  ])
  if (!principal.ok || principal.data === null) return ok(unidad)
  const identidad = identidadDeVehiculo({ titulo: unidad.titulo, atributos }, principal.data, {
    locale: ajustes.locale,
    zona: ajustes.zonaHoraria,
  })
  return ok({ ...unidad, titulo: identidadEnUnaLinea(identidad) })
}
