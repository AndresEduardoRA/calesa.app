import 'server-only'
import { z } from 'zod'
import { errorDePostgrest, fallo, ok } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import type { LectorDeConsultaDeApibara, LectorDeSubasta } from '../../entities/repositorios'
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

const bruto = z.record(z.string(), z.unknown())

// El bruto de una consulta propia y vigente (`apibara_consulta_leer`): la base lo guardó cuando la
// edge function consultó, y sólo se lo devuelve a quien consultó.
export const getConsultaDeApibara: LectorDeConsultaDeApibara = async (consulta) => {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('apibara_consulta_leer', { p_consulta: consulta })
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  const leido = bruto.safeParse(data)
  return leido.success
    ? ok(leido.data)
    : fallo('inesperado', 'La consulta a la subasta llegó incompleta. Vuelve a consultar.')
}
