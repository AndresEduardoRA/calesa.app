import 'server-only'
import { z } from 'zod'
import { errorDePostgrest } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import type { Json } from '@/shared/types/database.types'
import type { CambiosDeLead } from '../entities/edicion'
import type { PedidoDeGuardado, RepositorioDeFicha } from '../entities/repositorios'

// La ficha se escribe sólo por `lead_guardar()` (`…20261014001300_lead_ficha.sql`): permiso, versión
// y validación del layout en una transacción. No hay `.update()` sobre `leads`.

const respuesta = z.object({ actualizado_en: z.string() })

// Lo que viaja: sólo lo que cambió, con los nombres de la base.
function comoJson(cambios: CambiosDeLead): Json {
  const json: Record<string, Json> = {}
  if (cambios.nombre !== undefined) {
    json['nombre'] = cambios.nombre
  }
  if (cambios.tipo !== undefined) {
    json['tipo'] = cambios.tipo
  }
  if (cambios.origenId !== undefined) {
    json['origen_lead_id'] = cambios.origenId
  }
  if (cambios.atributos !== undefined) {
    json['atributos'] = cambios.atributos
  }
  return json
}

const guardar: RepositorioDeFicha['guardar'] = async (pedido: PedidoDeGuardado) => {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('lead_guardar', {
    p_lead: pedido.id,
    p_actualizado_en_esperado: pedido.actualizadoEnEsperado,
    p_cambios: comoJson(pedido.cambios),
  })
  if (error) {
    // El `hint` es la clave del campo en el formulario (`nombre`, `atributos.signo`).
    return {
      ok: false,
      error: errorDePostgrest(error),
      ...(error.hint ? { campo: error.hint } : {}),
    }
  }
  const leido = respuesta.parse(data)
  return { ok: true, data: { actualizadoEn: leido.actualizado_en } }
}

export const fichaSupabase: RepositorioDeFicha = { guardar }
