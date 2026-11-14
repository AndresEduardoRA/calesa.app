import 'server-only'
import { z } from 'zod'
import { errorDePostgrest, ok } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import { esquemaDeSituacion } from '../entities/situacion'
import type { RepositorioDeSituacion } from '../entities/repositorios'

const respuesta = z.object({ situacion: esquemaDeSituacion })

// «No la ganamos» y su «Deshacer» por `vehiculo_subasta_no_ganada`: el estado deseado, sin versión (el estado hace de versión: otro es PT409 con quién
// y cuándo). `errorDePostgrest` traduce PT409 a `conflicto` (con el texto de la base) y 42501 a `sin_permiso`.
const marcarNoGanada: RepositorioDeSituacion['marcarNoGanada'] = async ({
  vehiculoId,
  noGanada,
}) => {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('vehiculo_subasta_no_ganada', {
    p_vehiculo: vehiculoId,
    p_no_ganada: noGanada,
  })
  if (error) return { ok: false, error: errorDePostgrest(error) }
  const leida = respuesta.safeParse(data)
  return ok({
    situacion: leida.success ? leida.data.situacion : noGanada ? 'no_ganada' : 'sin_resolver',
  })
}

export const situacionSupabase: RepositorioDeSituacion = { marcarNoGanada }
