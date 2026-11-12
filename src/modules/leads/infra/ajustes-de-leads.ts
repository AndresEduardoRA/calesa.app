import 'server-only'
import { errorDePostgrest } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import type { EscritorDeAjustesDeLeads } from '../entities/ajustes-de-leads'
import { etapasParaGuardar } from '../entities/embudo'

// Las plantillas de leads se escriben sólo por estas RPC (`…_embudo_plantilla.sql`, `…_portal_mensaje.sql`, 9.04-4), con `leads.configurar`
// y la versión de cada una (`PT409` legible si otra persona la cambió). Devuelven la versión nueva.

const CAMPO_DEL_HINT: Record<string, string> = { etapas: 'etapas', texto: 'texto' }

function fallo(error: { code?: string | null; message: string; hint?: string | null }) {
  const campo = error.hint ? CAMPO_DEL_HINT[error.hint] : undefined
  return { ok: false as const, error: errorDePostgrest(error), ...(campo ? { campo } : {}) }
}

export const ajustesDeLeadsSupabase: EscritorDeAjustesDeLeads = {
  guardarPlantillaDelEmbudo: async ({ etapas, actualizadoEnEsperado }) => {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('embudo_plantilla_guardar', {
      // Sin id: una plantilla no es de ningún embudo.
      p_etapas: etapas ? etapasParaGuardar(etapas.map((etapa) => ({ ...etapa, id: null }))) : null,
      p_actualizado_en_esperado: actualizadoEnEsperado,
    })
    return error ? fallo(error) : { ok: true as const, data: { actualizadoEn: data } }
  },
  guardarMensajeDelPortal: async ({ texto, actualizadoEnEsperado }) => {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('portal_mensaje_guardar', {
      // En blanco es nulo para la base (el de fábrica): el tipo generado no admite `null`.
      p_texto: texto ?? '',
      p_actualizado_en_esperado: actualizadoEnEsperado,
    })
    return error ? fallo(error) : { ok: true as const, data: { actualizadoEn: data } }
  },
}
