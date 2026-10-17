// Un lote entero de la papelera, leído en el navegador al pulsar «Mostrar los N» (cierre 1): la lista trae los primeros
// de cada lote. La RPC aplica el mismo filtro que la lista y da nulo si el lote ya no está.
import { errorDePostgrest, fallo, ok } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/browser'
import { loteDesde } from '../entities/papelera'
import type { LectorDeLoteDePapelera } from '../entities/repositorios'

export const MENSAJE_DE_LOTE_QUE_YA_NO_ESTA = 'Ese lote ya no está en la papelera.'

export const leerLoteDePapelera: LectorDeLoteDePapelera = async (loteId) => {
  const { data, error } = await createClient().rpc('vehiculos_papelera_lote', { p_lote: loteId })
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  const lote = loteDesde(data)
  return lote ? ok(lote) : fallo('no_encontrado', MENSAJE_DE_LOTE_QUE_YA_NO_ESTA)
}
