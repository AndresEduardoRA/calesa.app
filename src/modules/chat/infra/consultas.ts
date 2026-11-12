// Las lecturas del chat, escritas una vez para el servidor (primera página, la conversación abierta) y el navegador («Ver más»,
// las señales de Realtime). Las dos pasan por la sesión de quien mira: la fila de Realtime es sólo señal, se relee con esto.
import type { SupabaseClient } from '@supabase/supabase-js'
import { type Resultado, errorDePostgrest, ok } from '@/shared/lib/errores'
import type { Database } from '@/shared/types/database.types'
import {
  leerPaginaDeConversaciones,
  type Conversacion,
  type PaginaDeConversaciones,
} from '../entities/conversaciones'
import type { PedidoDePaginaDeConversaciones } from '../entities/repositorios'

export type Cliente = SupabaseClient<Database>

// Una página de mis conversaciones por la RPC `chat_conversaciones`: ella decide la membresía (fila propia y, en el canal global,
// `chat.global`), cuenta los no leídos y trae a la otra persona de cada directa. La base acota el tamaño (20 por defecto, 50 como mucho).
export async function leerPagina(
  cliente: Cliente,
  { desde, tamano }: PedidoDePaginaDeConversaciones,
): Promise<Resultado<PaginaDeConversaciones>> {
  const { data, error } = await cliente.rpc('chat_conversaciones', {
    p_tamano: tamano,
    ...(desde ? { p_antes_en: desde.ultimoMensajeEn, p_antes_id: desde.id } : {}),
  })
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  return leerPaginaDeConversaciones(data)
}

// Una conversación por su id, **sólo si es mía**: la decide la fila propia de `conversaciones_miembros` (`es_miembro` en la RLS), no
// poder leer `conversaciones` (que deja ver el canal global a quien tiene `chat.global` aunque no haya entrado). Una consulta con
// embed; en una directa, otra a `perfiles` por la otra persona. `noLeidos` queda en 0: lo cuenta la lista.
export async function leerUna(
  cliente: Cliente,
  usuarioId: string,
  id: string,
): Promise<Resultado<Conversacion | null>> {
  const { data, error } = await cliente
    .from('conversaciones_miembros')
    .select(
      'ultimo_leido_en, silenciada, conversaciones!inner(id, tipo, nombre, es_global, ultimo_mensaje_en, par_directo)',
    )
    .eq('conversacion_id', id)
    .eq('usuario_id', usuarioId)
    .maybeSingle()
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  const conversacion = data?.conversaciones
  if (!data || !conversacion) {
    return ok(null)
  }
  let otro: Conversacion['otro'] = null
  if (conversacion.tipo === 'directa') {
    const idDelOtro = await idDeLaOtraPersona(cliente, usuarioId, id, conversacion.par_directo)
    if (!idDelOtro.ok) {
      return idDelOtro
    }
    if (idDelOtro.data) {
      const { data: perfil, error: errorDePerfil } = await cliente
        .from('perfiles')
        .select('id, nombre')
        .eq('id', idDelOtro.data)
        .maybeSingle()
      if (errorDePerfil) {
        return { ok: false, error: errorDePostgrest(errorDePerfil) }
      }
      otro = perfil ? { id: perfil.id, nombre: perfil.nombre } : null
    }
  }
  return ok({
    id: conversacion.id,
    tipo: conversacion.es_global ? 'global' : conversacion.tipo === 'directa' ? 'directa' : 'grupo',
    nombre: conversacion.nombre,
    esGlobal: conversacion.es_global,
    ultimoMensajeEn: conversacion.ultimo_mensaje_en,
    ultimoLeidoEn: data.ultimo_leido_en,
    silenciada: data.silenciada,
    noLeidos: 0,
    otro,
  })
}

// El par ordenado de la directa; una directa vieja sin par (de antes de 7.08-1) se resuelve por su otro miembro.
async function idDeLaOtraPersona(
  cliente: Cliente,
  usuarioId: string,
  conversacionId: string,
  par: string[] | null,
): Promise<Resultado<string | null>> {
  const delPar = par?.find((p) => p !== usuarioId)
  if (delPar) {
    return ok(delPar)
  }
  const { data, error } = await cliente
    .from('conversaciones_miembros')
    .select('usuario_id')
    .eq('conversacion_id', conversacionId)
    .neq('usuario_id', usuarioId)
    .order('usuario_id')
    .limit(1)
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  return ok(data[0]?.usuario_id ?? null)
}
