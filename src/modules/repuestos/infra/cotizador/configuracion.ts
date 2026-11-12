import 'server-only'
import { cortarAlTope } from '@/shared/lib/conteo'
import { errorDePostgrest, fallo, ok, type Resultado } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import {
  COLUMNAS_DE_CAJA,
  COLUMNAS_DE_CONFIGURACION,
  COLUMNAS_DE_TRAMO,
  TOPE_DE_CAJAS,
  TOPE_DE_TRAMOS,
  TOPE_DEL_HISTORIAL,
  cajasDesde,
  configuracionesDesde,
  tramosDesde,
  type LecturaDeLaConfiguracion,
} from '../../entities/cotizador/filas-de-configuracion'

const NO_SE_LEYO = 'No se pudo cargar la configuración del cotizador.'

// La configuración del cotizador para Configuración › Repuestos › «Cotizador» (8.12-2, C4), con el cliente de quien pide (leer pide
// `repuestos.cotizar` o `repuestos.configurar`). Tablas de configuración de decenas de filas, con tope + 1 (`escala.md`): la configuración por su PK
// (`order by id desc`: la primera es la vigente), los tramos por `repuestos_tramos_logistica_moneda_idx` y las cajas por el único `(moneda, monto)`.
export async function leerConfiguracionDelCotizador(): Promise<
  Resultado<LecturaDeLaConfiguracion>
> {
  const supabase = await createClient()
  const [config, tramos, cajas] = await Promise.all([
    supabase
      .from('repuestos_cotizador_config')
      .select(COLUMNAS_DE_CONFIGURACION)
      .order('id', { ascending: false })
      .limit(TOPE_DEL_HISTORIAL + 1),
    supabase
      .from('repuestos_tramos_logistica')
      .select(COLUMNAS_DE_TRAMO)
      .order('moneda')
      .order('costo_min')
      .limit(TOPE_DE_TRAMOS + 1),
    supabase
      .from('repuestos_cajas')
      .select(COLUMNAS_DE_CAJA)
      .order('moneda')
      .order('monto')
      .limit(TOPE_DE_CAJAS + 1),
  ])
  const conError = [config, tramos, cajas].find((r) => r.error !== null)
  if (conError?.error) {
    return { ok: false, error: errorDePostgrest(conError.error) }
  }
  const configuraciones = configuracionesDesde(config.data)
  const filasDeTramos = tramosDesde(tramos.data)
  const filasDeCajas = cajasDesde(cajas.data)
  if (configuraciones === null || filasDeTramos === null || filasDeCajas === null) {
    return fallo('inesperado', NO_SE_LEYO)
  }
  const historial = cortarAlTope(configuraciones, TOPE_DEL_HISTORIAL)
  const t = cortarAlTope(filasDeTramos, TOPE_DE_TRAMOS)
  const c = cortarAlTope(filasDeCajas, TOPE_DE_CAJAS)
  return ok({
    vigente: historial.filas[0] ?? null,
    historial: historial.filas,
    hayMasHistorial: historial.hayMas,
    tramos: t.filas,
    hayMasTramos: t.hayMas,
    cajas: c.filas,
    hayMasCajas: c.hayMas,
  })
}
