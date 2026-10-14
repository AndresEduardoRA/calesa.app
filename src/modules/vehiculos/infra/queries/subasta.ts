import 'server-only'
import { errorDePostgrest, ok } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import type { LectorDeSubasta } from '../../entities/repositorios'
import { COLUMNAS_DE_SUBASTA, subastaDesdeFila } from '../../entities/subasta-vehiculo'

// La subasta de un vehículo, con la RLS de quien pregunta: lo que no se ve (otro origen, la
// papelera) vuelve como null, igual que lo que no existe.
export const getSubasta: LectorDeSubasta = async (vehiculoId) => {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('vehiculos')
    .select(COLUMNAS_DE_SUBASTA)
    .eq('id', vehiculoId)
    .maybeSingle()
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  return ok(data ? subastaDesdeFila(data) : null)
}
