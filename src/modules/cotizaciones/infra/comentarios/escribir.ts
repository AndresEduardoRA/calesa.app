import 'server-only'
import { errorDePostgrest, fallo, ok } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import { comentarioDesde, resultadoDeBorrarDesde } from '../../entities/comentarios/comentario'
import type { RepositorioDeComentarios } from '../../entities/comentarios/repositorio'

// Los comentarios de una cotización se escriben sólo por RPC (`cotizacion_comentar`, `cotizacion_comentario_editar`, `cotizacion_comentario_borrar`, 4.27-1), con
// el cliente de quien pide. Lo que la base rechaza (sin acceso, no es tuyo, otra versión, el comentario ya no está) vuelve con su mensaje, ya escrito para la persona.

const NO_SE_LEYO = 'No pudimos leer la respuesta. Recarga para ver cómo quedó.'

export const comentariosSupabase: RepositorioDeComentarios = {
  comentar: async ({ cotizacionId, padreId, cuerpo }) => {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('cotizacion_comentar', {
      p_cotizacion: cotizacionId,
      // Sin padre es una raíz: la RPC lo recibe nulo.
      p_padre: padreId as string,
      p_cuerpo: cuerpo,
    })
    if (error) {
      return { ok: false, error: errorDePostgrest(error) }
    }
    const comentario = comentarioDesde(data)
    return comentario ? ok(comentario) : fallo('inesperado', NO_SE_LEYO)
  },
  editar: async ({ comentarioId, actualizadoEnEsperado, cuerpo }) => {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('cotizacion_comentario_editar', {
      p_comentario: comentarioId,
      p_actualizado_en_esperado: actualizadoEnEsperado,
      p_cuerpo: cuerpo,
    })
    if (error) {
      return { ok: false, error: errorDePostgrest(error) }
    }
    const comentario = comentarioDesde(data)
    return comentario ? ok(comentario) : fallo('inesperado', NO_SE_LEYO)
  },
  borrar: async ({ comentarioId, actualizadoEnEsperado }) => {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('cotizacion_comentario_borrar', {
      p_comentario: comentarioId,
      p_actualizado_en_esperado: actualizadoEnEsperado,
    })
    if (error) {
      return { ok: false, error: errorDePostgrest(error) }
    }
    const resultado = resultadoDeBorrarDesde(data)
    return resultado ? ok(resultado) : fallo('inesperado', NO_SE_LEYO)
  },
}
