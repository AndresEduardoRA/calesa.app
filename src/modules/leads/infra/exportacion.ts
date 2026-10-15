import 'server-only'
import { errorDePostgrest, fallo, ok } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import { registroDeExportacionDesde } from '../entities/exportacion'
import type { RepositorioDeExportacion } from '../entities/repositorios'

// La constancia de una exportación y su límite por hora (`leads_exportacion_registrar`, parte 8).
// Exige `leads.exportar`; los filtros viajan por nombre. Pasarse del cupo no es un error: es un valor.
export const exportacionSupabase: RepositorioDeExportacion = {
  registrar: async ({ filas, filtros }) => {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('leads_exportacion_registrar', {
      p_filas: filas,
      p_filtros: [...filtros],
    })
    if (error) {
      return { ok: false, error: errorDePostgrest(error) }
    }
    const registro = registroDeExportacionDesde(data)
    return registro
      ? ok(registro)
      : fallo('inesperado', 'No pudimos confirmar la exportación. Vuelve a intentarlo.')
  },
}
