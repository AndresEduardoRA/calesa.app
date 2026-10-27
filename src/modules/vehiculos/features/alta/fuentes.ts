import 'server-only'
import { getAjustes } from '@/modules/empresa'
import { getOrigenes, leerLayout, type OrigenResumen } from '@/modules/origenes'
import { fallo, ok, type Resultado } from '@/shared/lib/errores'
import { camposActivos } from '../../entities/campo'
import { camposComunes } from '../../entities/comunes'
import type { Fuentes } from '../../entities/esquema'
import type { Vehiculo } from '../../entities/vehiculo'

// Lo que hace falta para validar un vehículo en el servidor: el origen, su layout de hoy y la
// zona y el locale de la empresa. Se lee de nuevo en cada guardado: el formulario pudo abrirse con un layout
// que ya cambió, y lo que manda es el de ahora.
export async function fuentesDeValidacion(
  origenId: string,
  vehiculo: Vehiculo | null,
): Promise<Resultado<{ origen: OrigenResumen; fuentes: Fuentes }>> {
  const [origenes, layout, ajustes] = await Promise.all([
    getOrigenes(true),
    leerLayout(origenId, { conUso: false }),
    getAjustes(),
  ])
  if (!origenes.ok) {
    return origenes
  }
  if (!layout.ok) {
    return layout
  }
  const origen = origenes.data.find((uno) => uno.id === origenId)
  if (!origen) {
    return fallo('no_encontrado', 'Ese origen ya no existe.')
  }
  return ok({
    origen,
    fuentes: {
      comunes: camposComunes(origen.tipo),
      campos: camposActivos(layout.data.campos),
      categorias: layout.data.categorias,
      zona: ajustes.zonaHoraria,
      locale: ajustes.locale,
      ...(vehiculo
        ? { actuales: { atributos: vehiculo.atributos, categoriaId: vehiculo.categoriaId } }
        : {}),
    },
  })
}
