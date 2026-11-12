import 'server-only'
import { z } from 'zod'
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { createClient } from '@/shared/lib/supabase/server'
import type {
  RepositorioDeTransporte,
  TransporteGuardado,
} from '../../entities/transporte/repositorio-de-transporte'
import { falloDeLaBase, inesperado, nuloParaLaBase } from './rpc'

// El transporte se escribe sólo por RPC (6.07-1: `transporte_guardar`), con el cliente de quien pide: la base exige `logistica.transporte.editar` del origen y la versión. Una versión nula
// crea (si ya existía, `PT409`); la clave ausente de `cambios` no cambia y `null` vacía.
const esquemaDeGuardado = z.object({
  id: z.guid(),
  actualizado_en: z.string(),
  sin_cambios: z.boolean().optional(),
})

function respuesta(datos: unknown): ResultadoDeAccion<TransporteGuardado> {
  const leido = esquemaDeGuardado.safeParse(datos)
  return leido.success
    ? {
        ok: true,
        data: {
          id: leido.data.id,
          actualizadoEn: leido.data.actualizado_en,
          sinCambios: leido.data.sin_cambios === true,
        },
      }
    : inesperado()
}

export const transporteSupabase: RepositorioDeTransporte = {
  guardar: async (p) => {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('transporte_guardar', {
      p_vehiculo: p.vehiculoId,
      p_repuesto: nuloParaLaBase(null),
      p_actualizado_en_esperado: nuloParaLaBase(p.actualizadoEnEsperado),
      p_cambios: p.cambios,
    })
    return error ? falloDeLaBase(error) : respuesta(data)
  },
}
