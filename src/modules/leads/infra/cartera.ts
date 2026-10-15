import 'server-only'
import { errorDePostgrest, fallo as falloDe } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import { respuestaDeCarteraDesde } from '../entities/cartera'
import type { FalloDeCartera, RepositorioDeCartera } from '../entities/repositorios'

// Quién tiene el lead se mueve sólo por estas RPC (`…20261015000400_leads_auditoria.sql`): el dueño,
// o quien tiene el permiso en «todos»; nadie se concede acceso a sí mismo. Lo que no se ve
// responde igual que un lead que no existe. El `hint` es el campo del formulario que lo causó.

const NO_SE_LEYO = 'No pudimos leer la respuesta. Recarga para ver cómo quedó.'

type SalidaDeRpc = {
  data: unknown
  error: { code?: string | null; message: string; hint?: string | null } | null
}

function comoRespuesta({ data, error }: SalidaDeRpc) {
  if (error) {
    const fallo: FalloDeCartera = {
      ok: false,
      error: errorDePostgrest(error),
      ...(error.hint ? { campo: error.hint } : {}),
    }
    return fallo
  }
  const leida = respuestaDeCarteraDesde(data)
  return leida ? { ok: true as const, data: leida } : falloDe('inesperado', NO_SE_LEYO)
}

export const carteraSupabase: RepositorioDeCartera = {
  compartir: async ({ leadId, usuarioId }) => {
    const supabase = await createClient()
    return comoRespuesta(
      await supabase.rpc('lead_compartir', { p_lead: leadId, p_usuario: usuarioId }),
    )
  },
  transferir: async ({ leadId, destinoId, duenoEsperadoId }) => {
    const supabase = await createClient()
    return comoRespuesta(
      await supabase.rpc('lead_transferir', {
        p_lead: leadId,
        p_destino: destinoId,
        // El tipo generado no admite nulo, pero la base sí (un lead sin dueño tras una baja).
        p_dueno_esperado: duenoEsperadoId as string,
      }),
    )
  },
  revocar: async ({ leadId, usuarioId }) => {
    const supabase = await createClient()
    return comoRespuesta(
      await supabase.rpc('lead_revocar_acceso', { p_lead: leadId, p_usuario: usuarioId }),
    )
  },
  salir: async ({ leadId }) => {
    const supabase = await createClient()
    return comoRespuesta(await supabase.rpc('lead_salir', { p_lead: leadId }))
  },
}
