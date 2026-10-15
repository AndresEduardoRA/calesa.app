import 'server-only'
import { errorDePostgrest, ok } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import type { RepositorioDeTelefonos } from '../entities/repositorios'
import { cambioDesde, extrasDesde } from '../entities/telefonos'
import { verificacionDesde } from '../entities/verificacion'

// Los teléfonos de un lead se escriben sólo por estas RPC (`…20261014001400_lead_telefonos.sql`): la
// tabla `leads_telefonos` no tiene grants. Un código de país vacío es «el de la empresa».

// El `hint` de la base es la clave del campo en el formulario (`telefono`, `etiqueta`).
function fallo(error: { code?: string | null; message: string; hint?: string | null }) {
  return {
    ok: false as const,
    error: errorDePostgrest(error),
    ...(error.hint ? { campo: error.hint } : {}),
  }
}

const verificar: RepositorioDeTelefonos['verificar'] = async (pedido) => {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('verificar_telefono_de_lead', {
    p_lead: pedido.id,
    p_cc: pedido.codigoDePais ?? '',
    p_tel: pedido.telefono,
  })
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  return ok(verificacionDesde(data))
}

const cambiar: RepositorioDeTelefonos['cambiar'] = async (pedido) => {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('cambiar_telefono_lead', {
    p_lead: pedido.id,
    p_actualizado_en_esperado: pedido.actualizadoEnEsperado,
    p_cc: pedido.codigoDePais ?? '',
    p_tel: pedido.telefono,
  })
  if (error) {
    return fallo(error)
  }
  return { ok: true, data: cambioDesde(data) }
}

const guardarExtra: RepositorioDeTelefonos['guardarExtra'] = async (pedido) => {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('lead_telefono_guardar', {
    p_lead: pedido.leadId,
    p_id: pedido.id,
    p_cc: pedido.codigoDePais ?? '',
    p_tel: pedido.telefono,
    ...(pedido.etiqueta === null ? {} : { p_etiqueta: pedido.etiqueta }),
    ...(pedido.creadoEn === null ? {} : { p_creado_en: pedido.creadoEn }),
  })
  if (error) {
    return fallo(error)
  }
  return { ok: true, data: extrasDesde(data) }
}

const quitarExtra: RepositorioDeTelefonos['quitarExtra'] = async (pedido) => {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('lead_telefono_quitar', {
    p_lead: pedido.leadId,
    p_id: pedido.id,
  })
  if (error) {
    return fallo(error)
  }
  return { ok: true, data: extrasDesde(data) }
}

export const telefonosSupabase: RepositorioDeTelefonos = {
  verificar,
  cambiar,
  guardarExtra,
  quitarExtra,
}
