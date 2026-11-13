import 'server-only'
import { cortarAlTope } from '@/shared/lib/conteo'
import { errorDePostgrest, fallo, ok } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import { avisosDesde, ordenarAvisos, TOPE_DE_AVISOS } from '../../entities/revisar/avisos'
import type { LectorDeAvisosDeRevision } from '../../entities/revisar/repositorios'

const NO_SE_LEYO = 'No pudimos revisar el flujo.'

// `revisar_flujo`: los avisos de un flujo, con `tope + 1` filas para saber si hay más. Sin índice que nombrar:
// recorre la configuración de un flujo (decenas de fases). A quien no configura el flujo la base le da cero filas.
export const leerAvisosDeRevision: LectorDeAvisosDeRevision = async ({ flujoId }) => {
  const supabase = await createClient()
  const { data, error } = await supabase
    .rpc('revisar_flujo', { p_flujo: flujoId })
    .limit(TOPE_DE_AVISOS + 1)
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  const avisos = avisosDesde(data)
  if (avisos === null) {
    return fallo('inesperado', NO_SE_LEYO)
  }
  const cortados = cortarAlTope(avisos, TOPE_DE_AVISOS)
  return ok({ avisos: ordenarAvisos(cortados.filas), hayMas: cortados.hayMas })
}
