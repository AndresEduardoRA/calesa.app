import 'server-only'
import { errorDePostgrest, fallo as falloDe } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import type { FalloDeVinculo, RepositorioDeVinculo } from '../entities/repositorios'
import { respuestaDeInteresDesde, respuestaDeVinculoDesde } from '../entities/vehiculos-del-lead'

// El vínculo a un lead y el interés se escriben sólo por estas RPC (`…20261015000600_vehiculos_del_lead.sql`):
// vincular y marcar exigen la cartera del lead y el permiso sobre el vehículo; desvincular, sólo editar el
// vehículo. Lo que no se ve responde igual que lo que no existe. El `hint` es el campo del formulario.

const NO_SE_LEYO = 'No pudimos leer la respuesta. Recarga para ver cómo quedó.'

type SalidaDeRpc = {
  data: unknown
  error: { code?: string | null; message: string; hint?: string | null } | null
}

function comoRespuesta<Dato>({ data, error }: SalidaDeRpc, leer: (datos: unknown) => Dato | null) {
  if (error) {
    const fallo: FalloDeVinculo = {
      ok: false,
      error: errorDePostgrest(error),
      ...(error.hint ? { campo: error.hint } : {}),
    }
    return fallo
  }
  const leida = leer(data)
  return leida ? { ok: true as const, data: leida } : falloDe('inesperado', NO_SE_LEYO)
}

export const vinculoSupabase: RepositorioDeVinculo = {
  vincular: async ({ vehiculoId, actualizadoEnEsperado, leadId }) => {
    const supabase = await createClient()
    return comoRespuesta(
      await supabase.rpc('vehiculo_vincular', {
        p_vehiculo: vehiculoId,
        p_actualizado_en_esperado: actualizadoEnEsperado,
        // El tipo generado no admite nulo, pero la base sí: nulo desvincula.
        p_lead: leadId as string,
      }),
      respuestaDeVinculoDesde,
    )
  },
  marcarInteres: async ({ vehiculoId, leadId, nota }) => {
    const supabase = await createClient()
    return comoRespuesta(
      await supabase.rpc('vehiculo_interesado_marcar', {
        p_vehiculo: vehiculoId,
        p_lead: leadId,
        ...(nota === null ? {} : { p_nota: nota }),
      }),
      respuestaDeInteresDesde,
    )
  },
  quitarInteres: async ({ vehiculoId, leadId }) => {
    const supabase = await createClient()
    return comoRespuesta(
      await supabase.rpc('vehiculo_interesado_quitar', { p_vehiculo: vehiculoId, p_lead: leadId }),
      respuestaDeInteresDesde,
    )
  },
}
