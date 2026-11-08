// Los reportes de una cotización desde el navegador (4.27-4): los lee quien modera al abrir el Confirmar de moderar. La policy de `cotizaciones_reportes` deja ver
// todos sólo a quien modera y ve la cotización. Se carga con el Confirmar, por `diferido()`.
import { cortarAlTope } from '@/shared/lib/conteo'
import { errorDePostgrest, fallo, ok, type Resultado } from '@/shared/lib/errores'
import { TAMANO_DE_VER_MAS } from '@/shared/lib/paginacion'
import { createClient } from '@/shared/lib/supabase/browser'
import {
  reportesDesde,
  type ReporteDeLaCotizacion,
} from '../../entities/comentarios/moderacion-lectura'

export const NO_SE_CARGARON_LOS_REPORTES = 'No se cargaron los reportes.'

// Hasta 21, del más nuevo al más viejo, por `cotizaciones_reportes_pkey (cotizacion_id, usuario_id)`: hay uno por persona, así que ordena a lo sumo el equipo.
// Sin «Ver más»: moderar no depende de leerlos todos.
export async function leerReportes(
  cotizacionId: string,
): Promise<Resultado<{ reportes: ReporteDeLaCotizacion[]; hayMas: boolean }>> {
  const { data, error } = await createClient()
    .from('cotizaciones_reportes')
    .select('motivo, creado_en')
    .eq('cotizacion_id', cotizacionId)
    .order('creado_en', { ascending: false })
    .limit(TAMANO_DE_VER_MAS + 1)
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  const reportes = reportesDesde(data)
  if (!reportes) {
    return fallo('inesperado', NO_SE_CARGARON_LOS_REPORTES)
  }
  const { filas, hayMas } = cortarAlTope(reportes, TAMANO_DE_VER_MAS)
  return ok({ reportes: filas, hayMas })
}
