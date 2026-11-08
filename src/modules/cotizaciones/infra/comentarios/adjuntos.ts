import 'server-only'
import { errorDePostgrest, fallo, ok } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import { adjuntoRegistradoDesde } from '../../entities/comentarios/adjunto'
import type { RepositorioDeAdjuntos } from '../../entities/comentarios/repositorio-de-adjuntos'

// Los adjuntos de una cotización se registran y se quitan sólo por RPC (`cotizacion_adjuntar`, `cotizacion_adjunto_quitar`, 4.27-1), con el cliente de quien
// pide. Lo que la base rechaza (sin acceso, sin permiso, el tope, el mismo archivo, el archivo que no terminó de subir) vuelve con su mensaje, ya escrito.

const NO_SE_LEYO = 'No pudimos leer la respuesta. Recarga para ver cómo quedó.'

export const adjuntosSupabase: RepositorioDeAdjuntos = {
  adjuntar: async ({ cotizacionId, ruta, nombre, mime, bytes }) => {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('cotizacion_adjuntar', {
      p_cotizacion: cotizacionId,
      p_ruta: ruta,
      p_nombre: nombre,
      p_mime: mime,
      p_bytes: bytes,
    })
    if (error) {
      return { ok: false, error: errorDePostgrest(error) }
    }
    const adjunto = adjuntoRegistradoDesde(data)
    return adjunto ? ok(adjunto) : fallo('inesperado', NO_SE_LEYO)
  },
  quitar: async ({ adjuntoId }) => {
    const supabase = await createClient()
    const { error } = await supabase.rpc('cotizacion_adjunto_quitar', { p_adjunto: adjuntoId })
    return error ? { ok: false, error: errorDePostgrest(error) } : ok({ resultado: 'quitado' })
  },
}
