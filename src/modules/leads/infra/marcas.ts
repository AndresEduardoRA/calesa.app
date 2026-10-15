import 'server-only'
import { errorDePostgrest, fallo as falloDe } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import { respuestaDeEtiquetasDelLeadDesde, respuestaDeMarcaDesde } from '../entities/marcas'
import type { RepositorioDeMarcas } from '../entities/repositorios'

// Las marcas de quien mira se escriben sólo por estas RPC (`…20261015000200_marcas_de_leads.sql`):
// las tablas no tienen grants de escritura. Exigen ver el lead; lo que no se ve responde igual que
// un lead que no existe, también al quitar.

function fallo(error: { code?: string | null; message: string; hint?: string | null }) {
  return {
    ok: false as const,
    error: errorDePostgrest(error),
    ...(error.hint === 'etiquetas' ? { campo: 'etiquetas' } : {}),
  }
}

const NO_SE_LEYO = 'No pudimos leer la respuesta. Recarga para ver cómo quedó.'

async function ponerMarca(
  rpc: 'lead_favorito_poner' | 'lead_tachado_poner',
  leadId: string,
  valor: boolean,
) {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc(rpc, { p_lead: leadId, p_valor: valor })
  if (error) {
    return fallo(error)
  }
  const leida = respuestaDeMarcaDesde(data)
  return leida ? { ok: true as const, data: leida } : falloDe('inesperado', NO_SE_LEYO)
}

export const marcasSupabase: RepositorioDeMarcas = {
  favorito: ({ leadId, valor }) => ponerMarca('lead_favorito_poner', leadId, valor),
  tachado: ({ leadId, valor }) => ponerMarca('lead_tachado_poner', leadId, valor),
  etiquetas: async ({ leadId, etiquetas, valor }) => {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('lead_etiquetas_poner', {
      p_lead: leadId,
      p_etiquetas: etiquetas,
      p_valor: valor,
    })
    if (error) {
      return fallo(error)
    }
    const leida = respuestaDeEtiquetasDelLeadDesde(data)
    return leida ? { ok: true as const, data: leida } : falloDe('inesperado', NO_SE_LEYO)
  },
}
