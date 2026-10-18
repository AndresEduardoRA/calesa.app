import 'server-only'
import { z } from 'zod'
import { errorDePostgrest, ok } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import type { Json } from '@/shared/types/database.types'
import type { PedidoDeAlta, RepositorioDeAlta, ResultadoDeAlta } from '../entities/repositorios'
import { CAMPOS_DE_NUMEROS, numerosDesde } from '@/shared/lib/numeros-de-lead'
import { verificacionDesde } from '../entities/verificacion'

// El alta se escribe sólo por `crear_lead()` (`…20261014001000_lead_alta.sql`): el lead, su primer
// seguimiento y el recordatorio entran en una transacción o no entra nada.

const respuesta = z.discriminatedUnion('resultado', [
  z.object({
    resultado: z.enum(['creado', 'adoptado']),
    id: z.guid(),
    ...CAMPOS_DE_NUMEROS,
    repetido: z.boolean(),
  }),
  z.object({
    resultado: z.enum(['existe', 'de_otro', 'limbo']),
    verificacion: z.unknown(),
  }),
])

function resultadoDesde(crudo: unknown): ResultadoDeAlta {
  const leido = respuesta.parse(crudo)
  if ('verificacion' in leido) {
    return { resultado: leido.resultado, verificacion: verificacionDesde(leido.verificacion) }
  }
  return {
    resultado: leido.resultado,
    id: leido.id,
    numeros: numerosDesde(leido),
    repetido: leido.repetido,
  }
}

function comoJson({ datos, adoptar }: PedidoDeAlta): {
  lead: Json
  seguimiento: Json | undefined
  recordatorio: Json | undefined
} {
  const lead: Record<string, Json> = {
    nombre: datos.nombre,
    telefono_principal: datos.telefono,
    tipo_lead_id: datos.tipoLeadId,
    atributos: datos.atributos,
  }
  if (datos.origenId) {
    lead['origen_lead_id'] = datos.origenId
  }
  if (adoptar) {
    lead['adoptar'] = true
  }
  return {
    lead,
    seguimiento: datos.seguimiento
      ? {
          tipo_id: datos.seguimiento.tipoId,
          titulo: datos.seguimiento.titulo,
          detalle: datos.seguimiento.detalle as Json,
          ocurrido_en: datos.seguimiento.ocurridoEn,
        }
      : undefined,
    recordatorio: datos.recordatorio ? { recordar_en: datos.recordatorio.recordarEn } : undefined,
  }
}

const crear: RepositorioDeAlta['crear'] = async (pedido) => {
  const supabase = await createClient()
  const { lead, seguimiento, recordatorio } = comoJson(pedido)
  const { data, error } = await supabase.rpc('crear_lead', {
    p_id: pedido.id,
    p_lead: lead,
    ...(seguimiento === undefined ? {} : { p_seguimiento: seguimiento }),
    ...(recordatorio === undefined ? {} : { p_recordatorio: recordatorio }),
  })
  if (error) {
    return {
      ok: false,
      error: errorDePostgrest(error),
      ...(error.hint ? { campo: error.hint } : {}),
    }
  }
  return { ok: true, data: resultadoDesde(data) }
}

const verificar: RepositorioDeAlta['verificar'] = async (telefono) => {
  const supabase = await createClient()
  // Un código vacío es «el de la empresa».
  const { data, error } = await supabase.rpc('verificar_telefono', { p_cc: '', p_tel: telefono })
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  return ok(verificacionDesde(data))
}

export const altaSupabase: RepositorioDeAlta = { crear, verificar }
