import 'server-only'
import { errorDePostgrest, fallo, ok } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import { envioDesde, purgaDesde, restauracionDesde } from '../entities/papelera'
import type { RepositorioDePapeleraDeLeads } from '../entities/repositorios'

// La papelera de leads se escribe sólo por RPC (`…20261015000400_leads_auditoria.sql`). Enviar es
// todo o nada y lleva el id del lote; restaurar y purgar, la versión del lote. Lo que la base
// rechaza vuelve como error con el mensaje ya escrito para la persona.

const NO_SE_LEYO = 'No pudimos leer la respuesta. Recarga para ver cómo quedó.'

export const papeleraDeLeadsSupabase: RepositorioDePapeleraDeLeads = {
  enviar: async ({ loteId, leads }) => {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('leads_papelera_enviar', {
      p_lote: loteId,
      p_leads: [...leads],
    })
    if (error) {
      return { ok: false, error: errorDePostgrest(error) }
    }
    const envio = envioDesde(data)
    return envio ? ok(envio) : fallo('inesperado', NO_SE_LEYO)
  },
  restaurar: async ({ loteId, actualizadoEnEsperado, leads }) => {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('leads_papelera_restaurar', {
      p_lote: loteId,
      p_actualizado_en_esperado: actualizadoEnEsperado,
      // Sin la lista es el lote entero (el valor por defecto del parámetro es nulo).
      ...(leads ? { p_leads: [...leads] } : {}),
    })
    if (error) {
      return { ok: false, error: errorDePostgrest(error) }
    }
    const restauracion = restauracionDesde(data)
    return restauracion ? ok(restauracion) : fallo('inesperado', NO_SE_LEYO)
  },
  purgar: async ({ loteId, actualizadoEnEsperado, leads }) => {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('leads_papelera_purgar', {
      p_lote: loteId,
      p_actualizado_en_esperado: actualizadoEnEsperado,
      ...(leads ? { p_leads: [...leads] } : {}),
    })
    if (error) {
      return { ok: false, error: errorDePostgrest(error) }
    }
    const purga = purgaDesde(data)
    return purga ? ok(purga) : fallo('inesperado', NO_SE_LEYO)
  },
}
