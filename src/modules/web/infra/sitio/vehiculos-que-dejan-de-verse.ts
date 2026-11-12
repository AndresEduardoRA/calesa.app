import 'server-only'
import { conteoAcotado } from '@/shared/lib/conteo'
import { createClient } from '@/shared/lib/supabase/server'
import { TOPE_DE_VEHICULOS_QUE_DEJAN_DE_VERSE } from '../../entities/sitio/ajustes'
import type { LectorDeVehiculosQueDejanDeVerse } from '../../entities/sitio/repositorios'

// Lo que hoy ve un visitante de cada origen, de la vista pública `web.vehiculos` (la misma condición que la vitrina, «web activa»
// incluida: con la web apagada no deja de verse nada). Uno por origen, en paralelo, con `limit tope + 1`. `origen_nombre` es único
// (`origenes_nombre_unico`) y de ahí entra por `vehiculos_vitrina_idx (origen_id, …) where publicado_web`. Un error deja `null`.
export const getVehiculosQueDejanDeVerse: LectorDeVehiculosQueDejanDeVerse = async (origenes) => {
  if (origenes.length === 0) {
    return {}
  }
  const supabase = await createClient()
  const leidos = await Promise.all(
    origenes.map(async ({ id, nombre }) => {
      const { data, error } = await supabase
        .schema('web')
        .from('vehiculos')
        .select('id')
        .eq('origen_nombre', nombre)
        .limit(TOPE_DE_VEHICULOS_QUE_DEJAN_DE_VERSE + 1)
      if (error) {
        console.error('No se pudieron contar los vehículos del origen', error)
        return [id, null] as const
      }
      return [id, conteoAcotado(data.length, TOPE_DE_VEHICULOS_QUE_DEJAN_DE_VERSE)] as const
    }),
  )
  return Object.fromEntries(leidos)
}
