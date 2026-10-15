// Buscar un vehículo para vincularlo o marcar interés, desde el navegador y con la sesión de quien
// mira: `vehiculos_para_lead()` corre con su RLS y trae hasta 20 de los que ve, con su estado frente
// al lead. El texto va como parámetro de la RPC, no dentro de un filtro de PostgREST.
import { errorDePostgrest, ok } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/browser'
import type { BuscadorDeCandidatos } from '../entities/repositorios'
import { candidatosDesde } from '../entities/vehiculos-del-lead'

export const buscarCandidatos: BuscadorDeCandidatos = async ({ leadId, texto }) => {
  const { data, error } = await createClient().rpc('vehiculos_para_lead', {
    p_lead: leadId,
    p_texto: texto,
  })
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  return ok(candidatosDesde(data))
}
