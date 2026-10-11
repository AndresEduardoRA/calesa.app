import 'server-only'
import { conflicto, errorDePostgrest, ok } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import type { RepositorioPerfil } from '../entities/repositorios'

const actualizar: RepositorioPerfil['actualizar'] = async (pedido) => {
  const { usuarioId, nombre, avatarRuta, actualizadoEnEsperado } = pedido
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('perfiles')
    .update(avatarRuta === undefined ? { nombre } : { nombre, avatar_ruta: avatarRuta })
    .eq('id', usuarioId)
    // Si alguien (otra pestaña, quien administra el equipo) lo cambió después de abrir el
    // formulario, ninguna fila coincide y no se pisa nada.
    .eq('actualizado_en', actualizadoEnEsperado)
    .select('actualizado_en')
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  const fila = data[0]
  if (!fila) {
    return conflicto('Tu perfil cambió desde que abriste esta pantalla.')
  }
  return ok({ actualizadoEn: fila.actualizado_en })
}

const guardarPreferencia: RepositorioPerfil['guardarPreferencia'] = async (
  usuarioId,
  { clave, valor },
) => {
  const supabase = await createClient()
  const tabla = supabase.from('preferencias_usuario')
  // `null` = volver a lo automático: se borra la fila en vez de guardar un null.
  const { error } =
    valor === null
      ? await tabla.delete().eq('usuario_id', usuarioId).eq('clave', clave)
      : await tabla.upsert({ usuario_id: usuarioId, clave, valor })
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  return ok(null)
}

export const perfilSupabase: RepositorioPerfil = { actualizar, guardarPreferencia }
