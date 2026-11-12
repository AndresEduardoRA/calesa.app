import 'server-only'
import { z } from 'zod'
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { createClient } from '@/shared/lib/supabase/server'
import { falloDeLaBase, inesperado, nuloParaLaBase } from './rpc'
import type { DeclaracionGuardada } from '../../entities/aduana/escritura'
import type { EscriturasDeAduana } from '../../entities/aduana/repositorio'

// Las declaraciones se escriben sólo por RPC (6.07-2: `declaracion_guardar`, `declaracion_vehiculos_poner`, `declaracion_canal`), con el cliente de quien pide: la base exige
// `logistica.aduana.gestionar` y la versión. Lo que rechaza vuelve con su mensaje ya escrito.

const esquemaDeGuardada = z.object({
  id: z.guid(),
  actualizado_en: z.string(),
  sin_cambios: z.boolean().optional(),
})

function respuesta(datos: unknown): ResultadoDeAccion<DeclaracionGuardada> {
  const leido = esquemaDeGuardada.safeParse(datos)
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

export const escriturasDeAduanaSupabase: EscriturasDeAduana = {
  guardar: async (p) => {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('declaracion_guardar', {
      p_id: nuloParaLaBase(p.id),
      p_actualizado_en_esperado: nuloParaLaBase(p.actualizadoEnEsperado),
      p_datos: p.datos,
    })
    return error ? falloDeLaBase(error) : respuesta(data)
  },
  ponerVehiculos: async (p) => {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('declaracion_vehiculos_poner', {
      p_declaracion: p.declaracionId,
      p_actualizado_en_esperado: p.actualizadoEnEsperado,
      p_agregar: p.agregar,
      p_quitar: p.quitar,
    })
    return error ? falloDeLaBase(error) : respuesta(data)
  },
  asignarCanal: async (p) => {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('declaracion_canal', {
      p_id: p.declaracionId,
      p_actualizado_en_esperado: p.actualizadoEnEsperado,
      p_canal: p.canal,
    })
    return error ? falloDeLaBase(error) : respuesta(data)
  },
}
