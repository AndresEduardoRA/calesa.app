import 'server-only'
import { z } from 'zod'
import { errorDePostgrest, fallo, ok } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import { hojaDesde } from '../../entities/hoja'
import type { LectorDeHoja } from '../../entities/repositorios-de-hoja'

// Lo que abre la hoja de cotizar: UNA llamada a `cotizacion_hoja()`, que ya recorta por nivel, trae la versión y la hora de la base y dice si la fórmula del origen no está
// publicada. No lee cotizaciones ni el snapshot, y la respuesta pesa unos pocos KB (`docs/RENDIMIENTO.md`, «Paso 4.13 (1 de 4)»): ni lista ni cursor.
const esquemaOrigen = z.guid()

export const getHojaParaCotizar: LectorDeHoja = async (origenId) => {
  const origen = esquemaOrigen.safeParse(origenId)
  if (!origen.success) {
    return fallo('validacion', 'Ese origen no es válido.')
  }
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('cotizacion_hoja', { p_origen: origen.data })
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  const hoja = hojaDesde(data)
  return hoja
    ? ok(hoja)
    : fallo('inesperado', 'No pudimos leer la hoja de cotizar. Recarga para volver a intentar.')
}
