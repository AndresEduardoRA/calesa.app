import 'server-only'
import { errorDePostgrest, fallo, ok, type Resultado } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import { tarjetaDesde, type LecturaDeLaTarjeta } from '../../entities/tarjeta/lectura-de-la-tarjeta'

// La tarjeta de una versión de la fórmula en el servidor, para el PDF (4.18-3a, C5): `cotizacion_tarjeta(p_formula)` con la sesión de quien pide (cliente por request; la base
// pide `cotizaciones.ver` del origen y da sólo lo del nivel «todos», 4.18-1). Sin memoria: un pedido arma un PDF. No es una lista: lo acota la plantilla (hasta 20 grupos).
export async function getTarjeta(formulaId: string): Promise<Resultado<LecturaDeLaTarjeta>> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('cotizacion_tarjeta', { p_formula: formulaId })
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  const lectura = tarjetaDesde(data)
  return lectura === null ? fallo('inesperado', 'No se pudo leer la tarjeta.') : ok(lectura)
}
