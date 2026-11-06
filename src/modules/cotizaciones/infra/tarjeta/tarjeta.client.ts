// La tarjeta de una cotización desde el navegador, con la sesión de quien mira: `cotizacion_tarjeta(p_formula)` pide `cotizaciones.ver` del origen y da sólo lo del nivel «todos»
// (4.18-1). Se lee al abrir «Vista previa», una vez por versión de la fórmula y recordada 5 minutos: cerrar y volver a abrir no lee de nuevo y un fallo no se recuerda. No es una
// lista: lo dibujado lo acota la plantilla (hasta 20 grupos).
import { errorDePostgrest, fallo, ok, type Resultado } from '@/shared/lib/errores'
import { memoriaDeLectura, type MemoriaDeLectura } from '@/shared/lib/memoria-de-lectura'
import { createClient } from '@/shared/lib/supabase/browser'
import { tarjetaDesde, type LecturaDeLaTarjeta } from '../../entities/tarjeta/lectura-de-la-tarjeta'

const VIDA_MS = 5 * 60 * 1000
const memorias = new Map<string, MemoriaDeLectura<LecturaDeLaTarjeta>>()

async function leerSinMemoria(formulaId: string): Promise<Resultado<LecturaDeLaTarjeta>> {
  const { data, error } = await createClient().rpc('cotizacion_tarjeta', { p_formula: formulaId })
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  const lectura = tarjetaDesde(data)
  return lectura === null ? fallo('inesperado', 'No se pudo leer la tarjeta.') : ok(lectura)
}

export function leerTarjeta(formulaId: string): Promise<Resultado<LecturaDeLaTarjeta>> {
  let memoria = memorias.get(formulaId)
  if (!memoria) {
    memoria = memoriaDeLectura(() => leerSinMemoria(formulaId), VIDA_MS)
    memorias.set(formulaId, memoria)
  }
  return memoria.leer()
}
