import 'server-only'
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { createClient } from '@/shared/lib/supabase/server'
import { falloDeLaBase, inesperado, nuloParaLaBase } from './rpc'
import { esquemaDeGastoGuardado } from '../../entities/dinero/gasto'
import type {
  GastoGuardado,
  RepositorioDeGastos,
} from '../../entities/dinero/repositorio-de-gastos'

// Los gastos se escriben sólo por RPC (6.10-1: `gasto_registrar`, `gasto_guardar`, `gasto_eliminar`), con el cliente de quien pide. Lo que la base rechaza (sin permiso, la regla
// apagada, un monto inválido, una versión vieja) vuelve con su mensaje ya escrito; el `hint` de una validación nombra el campo, y aquí se traduce al del formulario.

function guardadoDesde(datos: unknown): GastoGuardado | null {
  const leido = esquemaDeGastoGuardado.safeParse(datos)
  if (!leido.success) {
    return null
  }
  const g = leido.data
  return {
    id: g.id,
    actualizadoEn: g.actualizado_en,
    tipoCambioAplicado: g.tipo_cambio_aplicado ?? null,
    montoBase: g.monto_base ?? null,
  }
}

function respuesta(datos: unknown): ResultadoDeAccion<GastoGuardado> {
  const guardado = guardadoDesde(datos)
  return guardado ? { ok: true, data: guardado } : inesperado()
}

export const gastosSupabase: RepositorioDeGastos = {
  registrar: async (p) => {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('gasto_registrar', {
      p_id: p.id,
      p_vehiculo: p.vehiculoId,
      p_repuesto: nuloParaLaBase(null),
      p_categoria: p.categoriaId,
      p_moneda: p.moneda,
      p_monto: p.monto,
      p_tipo_cambio: nuloParaLaBase(p.tipoCambioId),
      p_fecha: p.fecha,
      p_proveedor: nuloParaLaBase(p.proveedor),
      p_comprobante_ruta: nuloParaLaBase(p.comprobanteRuta),
      p_notas: nuloParaLaBase(p.notas),
    })
    return error ? falloDeLaBase(error) : respuesta(data)
  },
  guardar: async (p) => {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('gasto_guardar', {
      p_id: p.id,
      p_actualizado_en_esperado: p.actualizadoEnEsperado,
      p_cambios: p.cambios as never,
    })
    return error ? falloDeLaBase(error) : respuesta(data)
  },
  eliminar: async (p) => {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('gasto_eliminar', {
      p_id: p.id,
      p_actualizado_en_esperado: p.actualizadoEnEsperado,
    })
    if (error) {
      return falloDeLaBase(error)
    }
    const guardado = guardadoDesde(data)
    return guardado ? { ok: true, data: { id: guardado.id } } : inesperado()
  },
}
