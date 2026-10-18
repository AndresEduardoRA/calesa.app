import 'server-only'
import { errorDePostgrest, fallo as falloDe } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import type { RepositorioDeTiposDeLead } from '../entities/repositorios-de-tipos'
import { respuestaDeTiposDesde } from '../entities/tipo-de-lead'

// Los tipos de lead se escriben sólo por estas RPC (`…20261019002900_tipos_de_lead_rpc.sql`), con `leads.configurar`. Guardar,
// mover y eliminar piden la versión (`PT409` legible si otra pestaña la cambió). Todas devuelven la lista entera: la pantalla
// no vuelve a leer.

const CAMPO_DEL_HINT: Record<string, string> = {
  nombre: 'nombre',
  activo: 'activo',
  clase: 'clase',
}

function fallo(error: { code?: string | null; message: string; hint?: string | null }) {
  const campo = error.hint ? CAMPO_DEL_HINT[error.hint] : undefined
  return { ok: false as const, error: errorDePostgrest(error), ...(campo ? { campo } : {}) }
}

function respuesta(data: unknown) {
  const leida = respuestaDeTiposDesde(data)
  return leida
    ? { ok: true as const, data: leida }
    : falloDe('inesperado', 'No pudimos leer la respuesta. Recarga para ver cómo quedó.')
}

export const tiposDeLeadSupabase: RepositorioDeTiposDeLead = {
  crear: async ({ id, nombre, clase }) => {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('tipo_lead_crear', {
      p_id: id,
      p_nombre: nombre,
      p_clase: clase,
    })
    return error ? fallo(error) : respuesta(data)
  },
  guardar: async ({ id, actualizadoEnEsperado, nombre, activo }) => {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('tipo_lead_guardar', {
      p_id: id,
      p_actualizado_en_esperado: actualizadoEnEsperado,
      p_cambios: {
        ...(nombre === undefined ? {} : { nombre }),
        ...(activo === undefined ? {} : { activo }),
      },
    })
    return error ? fallo(error) : respuesta(data)
  },
  mover: async ({ id, actualizadoEnEsperado, despuesDe }) => {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('tipo_lead_mover', {
      p_id: id,
      p_actualizado_en_esperado: actualizadoEnEsperado,
      ...(despuesDe === null ? {} : { p_despues_de: despuesDe }),
    })
    return error ? fallo(error) : respuesta(data)
  },
  eliminar: async ({ id, actualizadoEnEsperado }) => {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('tipo_lead_eliminar', {
      p_id: id,
      p_actualizado_en_esperado: actualizadoEnEsperado,
    })
    return error ? fallo(error) : respuesta(data)
  },
}
