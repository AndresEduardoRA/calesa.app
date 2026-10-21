import 'server-only'
import { errorDePostgrest, fallo as falloDe } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import { respuestaDeOrigenesDesde } from '../entities/origen-de-lead'
import type { RepositorioDeOrigenesDeLead } from '../entities/repositorios-de-origenes'

// Los orígenes del lead se escriben sólo por estas RPC (`…20261019000700_origenes_lead_configurables.sql`),
// con `leads.configurar`. Guardar, mover y eliminar piden la versión (`PT409` legible si otra pestaña
// la cambió). Todas devuelven la lista entera: la pantalla no vuelve a leer.

const CAMPO_DEL_HINT: Record<string, string> = {
  nombre: 'nombre',
  activo: 'activo',
  icono: 'icono',
  por_defecto: 'porDefecto',
}

function fallo(error: { code?: string | null; message: string; hint?: string | null }) {
  const campo = error.hint ? CAMPO_DEL_HINT[error.hint] : undefined
  return { ok: false as const, error: errorDePostgrest(error), ...(campo ? { campo } : {}) }
}

function respuesta(data: unknown) {
  const leida = respuestaDeOrigenesDesde(data)
  return leida
    ? { ok: true as const, data: leida }
    : falloDe('inesperado', 'No pudimos leer la respuesta. Recarga para ver cómo quedó.')
}

export const origenesDeLeadSupabase: RepositorioDeOrigenesDeLead = {
  crear: async ({ id, nombre, icono }) => {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('origen_lead_crear', {
      p_id: id,
      p_nombre: nombre,
      ...(icono === null ? {} : { p_icono: icono }),
    })
    return error ? fallo(error) : respuesta(data)
  },
  guardar: async ({ id, actualizadoEnEsperado, nombre, icono, activo, porDefecto }) => {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('origen_lead_guardar', {
      p_id: id,
      p_actualizado_en_esperado: actualizadoEnEsperado,
      p_cambios: {
        ...(nombre === undefined ? {} : { nombre }),
        ...(icono === undefined ? {} : { icono }),
        ...(activo === undefined ? {} : { activo }),
        ...(porDefecto === undefined ? {} : { por_defecto: porDefecto }),
      },
    })
    return error ? fallo(error) : respuesta(data)
  },
  mover: async ({ id, actualizadoEnEsperado, despuesDe }) => {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('origen_lead_mover', {
      p_id: id,
      p_actualizado_en_esperado: actualizadoEnEsperado,
      ...(despuesDe === null ? {} : { p_despues_de: despuesDe }),
    })
    return error ? fallo(error) : respuesta(data)
  },
  eliminar: async ({ id, actualizadoEnEsperado }) => {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('origen_lead_eliminar', {
      p_id: id,
      p_actualizado_en_esperado: actualizadoEnEsperado,
    })
    return error ? fallo(error) : respuesta(data)
  },
}
