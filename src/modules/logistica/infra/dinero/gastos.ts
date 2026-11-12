import 'server-only'
import { errorDePostgrest, type ErrorPostgrest } from '@/shared/lib/errores'
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { createClient } from '@/shared/lib/supabase/server'
import { esquemaDeGastoGuardado } from '../../entities/dinero/gasto'
import type {
  GastoGuardado,
  RepositorioDeGastos,
} from '../../entities/dinero/repositorio-de-gastos'

// Los gastos se escriben sólo por RPC (6.10-1: `gasto_registrar`, `gasto_guardar`, `gasto_eliminar`), con el cliente de quien pide. Lo que la base rechaza (sin permiso, la regla
// apagada, un monto inválido, una versión vieja) vuelve con su mensaje ya escrito; el `hint` de una validación nombra el campo, y aquí se traduce al del formulario.

const NO_SE_LEYO = 'No pudimos leer la respuesta. Recarga para ver cómo quedó.'

const CAMPO_DEL_FORMULARIO: Record<string, string> = {
  categoria_id: 'categoriaId',
  moneda: 'moneda',
  monto: 'monto',
  tipo_cambio: 'tipoCambioId',
  tipo_cambio_id: 'tipoCambioId',
  fecha: 'fecha',
  comprobante_ruta: 'comprobanteRuta',
}

type ErrorConPista = ErrorPostgrest & { hint?: string | null }

function falloDeLaBase(error: ErrorConPista): ResultadoDeAccion<never> {
  const app = errorDePostgrest(error)
  const campo = error.hint ? CAMPO_DEL_FORMULARIO[error.hint] : undefined
  return campo && app.codigo === 'regla'
    ? { ok: false, error: app, porCampo: { [campo]: app.mensaje } }
    : { ok: false, error: app }
}

// `gasto_registrar` no declara valores por omisión y sus tipos generados no admiten nulo; la base sí (un parámetro nulo es «no va»).
function nuloParaLaBase(valor: string | null): string {
  return valor as string
}

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
  return guardado
    ? { ok: true, data: guardado }
    : { ok: false, error: { codigo: 'inesperado', mensaje: NO_SE_LEYO } }
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
    return guardado
      ? { ok: true, data: { id: guardado.id } }
      : { ok: false, error: { codigo: 'inesperado', mensaje: NO_SE_LEYO } }
  },
}
