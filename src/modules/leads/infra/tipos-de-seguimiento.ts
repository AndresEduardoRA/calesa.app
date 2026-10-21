import 'server-only'
import { errorDePostgrest, fallo as falloDe } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import type { RepositorioDeTiposDeSeguimiento } from '../entities/repositorios-de-tipos-de-seguimiento'
import { respuestaDeTiposDeSeguimientoDesde } from '../entities/tipo-de-seguimiento'

// Los tipos de seguimiento se escriben sólo por estas RPC (`…20261019004000_configuracion_de_leads.sql`), con `leads.configurar`. Guardar,
// mover y eliminar piden la versión (`PT409` legible si otra pestaña la cambió). Todas devuelven la lista entera: la pantalla no
// vuelve a leer.

const CAMPO_DEL_HINT: Record<string, string> = {
  nombre: 'nombre',
  activo: 'activo',
  icono: 'icono',
}

function fallo(error: { code?: string | null; message: string; hint?: string | null }) {
  const campo = error.hint ? CAMPO_DEL_HINT[error.hint] : undefined
  return { ok: false as const, error: errorDePostgrest(error), ...(campo ? { campo } : {}) }
}

function respuesta(data: unknown) {
  const leida = respuestaDeTiposDeSeguimientoDesde(data)
  return leida
    ? { ok: true as const, data: leida }
    : falloDe('inesperado', 'No pudimos leer la respuesta. Recarga para ver cómo quedó.')
}

export const tiposDeSeguimientoSupabase: RepositorioDeTiposDeSeguimiento = {
  crear: async ({ id, nombre, icono }) => {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('tipo_seguimiento_crear', {
      p_id: id,
      p_nombre: nombre,
      ...(icono === null ? {} : { p_icono: icono }),
    })
    return error ? fallo(error) : respuesta(data)
  },
  guardar: async ({ id, actualizadoEnEsperado, nombre, icono, activo }) => {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('tipo_seguimiento_guardar', {
      p_id: id,
      p_actualizado_en_esperado: actualizadoEnEsperado,
      p_cambios: {
        ...(nombre === undefined ? {} : { nombre }),
        ...(icono === undefined ? {} : { icono }),
        ...(activo === undefined ? {} : { activo }),
      },
    })
    return error ? fallo(error) : respuesta(data)
  },
  mover: async ({ id, actualizadoEnEsperado, despuesDe }) => {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('tipo_seguimiento_mover', {
      p_id: id,
      p_actualizado_en_esperado: actualizadoEnEsperado,
      ...(despuesDe === null ? {} : { p_despues_de: despuesDe }),
    })
    return error ? fallo(error) : respuesta(data)
  },
  eliminar: async ({ id, actualizadoEnEsperado }) => {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('tipo_seguimiento_eliminar', {
      p_id: id,
      p_actualizado_en_esperado: actualizadoEnEsperado,
    })
    return error ? fallo(error) : respuesta(data)
  },
}
