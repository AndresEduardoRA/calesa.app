import 'server-only'
import { z } from 'zod'
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { createClient } from '@/shared/lib/supabase/server'
import type {
  GrupoAplicado,
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

// «Editar grupo» (6.08-4): `transporte_grupo_aplicar` es todo o nada y vuelve con la clave **nueva** si el cambio tocó el contenedor o el booking del tipo.
const esquemaDeAplicado = z.object({
  tipo: z.enum(['booking', 'contenedor']),
  clave: z.string(),
  unidades: z.array(z.unknown()),
  sin_cambios: z.boolean().optional(),
})

function respuestaDelGrupo(datos: unknown): ResultadoDeAccion<GrupoAplicado> {
  const leido = esquemaDeAplicado.safeParse(datos)
  return leido.success
    ? {
        ok: true,
        data: {
          tipo: leido.data.tipo,
          clave: leido.data.clave,
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
  aplicarAlGrupo: async (p) => {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('transporte_grupo_aplicar', {
      p_tipo: p.tipo,
      p_clave: p.clave,
      p_esperadas: p.esperadas,
      p_cambios: p.cambios,
    })
    return error ? falloDeLaBase(error) : respuestaDelGrupo(data)
  },
}
