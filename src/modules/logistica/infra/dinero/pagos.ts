import 'server-only'
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { createClient } from '@/shared/lib/supabase/server'
import { esquemaDePagoConfirmado, esquemaDePagoGuardado } from '../../entities/dinero/pago'
import type {
  PagoConfirmado,
  PagoGuardado,
  RepositorioDePagos,
} from '../../entities/dinero/repositorio-de-pagos'
import { falloDeLaBase, inesperado, nuloParaLaBase } from './rpc'

// Los pagos se escriben sólo por RPC (6.10: `pago_registrar` y, de un proyecto, `pago_registrar_proyecto` del 8.13-5, `pago_guardar`, `pago_eliminar`, `pago_confirmar` y `pago_anular`), con el cliente de quien pide. El sello de un pago confirmado
// (quién y cuándo) lo pone el disparador de la base, nunca esto. Lo que la base rechaza vuelve con su mensaje ya escrito.

function guardadoDesde(datos: unknown): PagoGuardado | null {
  const leido = esquemaDePagoGuardado.safeParse(datos)
  if (!leido.success) {
    return null
  }
  const p = leido.data
  return {
    id: p.id,
    actualizadoEn: p.actualizado_en,
    tipoCambioAplicado: p.tipo_cambio_aplicado ?? null,
    montoBase: p.monto_base ?? null,
  }
}

function confirmadoDesde(datos: unknown): PagoConfirmado | null {
  const leido = esquemaDePagoConfirmado.safeParse(datos)
  if (!leido.success) {
    return null
  }
  const p = leido.data
  return {
    id: p.id,
    actualizadoEn: p.actualizado_en,
    confirmadoPor: p.confirmado_por ?? null,
    confirmadoEn: p.confirmado_en ?? null,
  }
}

function respuesta<T>(dato: T | null): ResultadoDeAccion<T> {
  return dato === null ? inesperado() : { ok: true, data: dato }
}

export const pagosSupabase: RepositorioDePagos = {
  registrar: async (p) => {
    const supabase = await createClient()
    const datos = {
      p_id: p.id,
      p_concepto: p.concepto,
      p_moneda: p.moneda,
      p_monto: p.monto,
      p_tipo_cambio: nuloParaLaBase(p.tipoCambioId),
      p_metodo: nuloParaLaBase(p.metodo),
      p_fecha: p.fecha,
      p_comprobante_ruta: nuloParaLaBase(p.comprobanteRuta),
      p_notas: nuloParaLaBase(p.notas),
    }
    // Un pago de proyecto va por su gemela (8.13-5, D1), sin lead (D2).
    const { data, error } =
      p.proyectoId !== undefined
        ? await supabase.rpc('pago_registrar_proyecto', { ...datos, p_proyecto: p.proyectoId })
        : await supabase.rpc('pago_registrar', {
            ...datos,
            p_vehiculo: p.vehiculoId,
            // El lead no se elige en esta parte (D3): el pago va sin lead.
            p_lead: nuloParaLaBase(null),
          })
    return error ? falloDeLaBase(error) : respuesta(guardadoDesde(data))
  },
  guardar: async (p) => {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('pago_guardar', {
      p_id: p.id,
      p_actualizado_en_esperado: p.actualizadoEnEsperado,
      p_cambios: p.cambios as never,
    })
    return error ? falloDeLaBase(error) : respuesta(guardadoDesde(data))
  },
  eliminar: async (p) => {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('pago_eliminar', {
      p_id: p.id,
      p_actualizado_en_esperado: p.actualizadoEnEsperado,
    })
    if (error) {
      return falloDeLaBase(error)
    }
    const guardado = guardadoDesde(data)
    return respuesta(guardado ? { id: guardado.id } : null)
  },
  confirmar: async (p) => {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('pago_confirmar', {
      p_id: p.id,
      p_actualizado_en_esperado: p.actualizadoEnEsperado,
    })
    return error ? falloDeLaBase(error) : respuesta(confirmadoDesde(data))
  },
  anular: async (p) => {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('pago_anular', {
      p_id: p.id,
      p_actualizado_en_esperado: p.actualizadoEnEsperado,
      p_motivo: p.motivo,
    })
    if (error) {
      return falloDeLaBase(error)
    }
    const anulado = confirmadoDesde(data)
    return respuesta(anulado ? { id: anulado.id } : null)
  },
}
