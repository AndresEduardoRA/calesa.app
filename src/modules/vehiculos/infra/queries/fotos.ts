import 'server-only'
import { errorDePostgrest, ok } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import { COLUMNAS_DE_FOTO, fotosDesde } from '../../entities/foto'
import type { LectorDeGaleria } from '../../entities/repositorios'

// Las fotos de un vehículo, en su orden, y la versión que mandan las ediciones. Dos consultas a
// la vez; lo que no se ve (otro origen, la papelera) vuelve vacío.
export const getGaleria: LectorDeGaleria = async (vehiculoId) => {
  const supabase = await createClient()
  const [fotos, version] = await Promise.all([
    supabase
      .from('vehiculos_imagenes')
      .select(COLUMNAS_DE_FOTO)
      .eq('vehiculo_id', vehiculoId)
      .order('orden'),
    supabase
      .from('vehiculos_imagenes_version')
      .select('actualizado_en')
      .eq('vehiculo_id', vehiculoId)
      .limit(1),
  ])
  const error = fotos.error ?? version.error
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  return ok({
    fotos: fotosDesde(fotos.data),
    version: version.data?.[0]?.actualizado_en ?? null,
  })
}
