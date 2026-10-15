import 'server-only'
import { errorDePostgrest, fallo as falloDe } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import type { Json } from '@/shared/types/database.types'
import type { RepositorioDeSeguimientos, ResultadoDeSeguimiento } from '../entities/repositorios'
import { recordatorioDesde } from '../entities/recordatorios'
import { seguimientoDesde, type CambiosDeSeguimiento } from '../entities/seguimiento'

// Los seguimientos se escriben sólo por estas RPC (`…20261015000100_seguimientos_recordatorios.sql`):
// la tabla no tiene grants de escritura. Exigen el lead en la cartera y responden igual que un lead
// inexistente si no; el detalle viaja como documento y la base lo valida contra su lista blanca.

// El `hint` de la base, dicho con la clave del redactor.
const CAMPO_DEL_HINT: Record<string, string> = {
  titulo: 'titulo',
  tipo_id: 'tipoId',
  detalle: 'detalle',
  ocurrido_en: 'ocurridoEn',
  'recordatorio.recordar_en': 'recordatorio',
}

function fallo(error: { code?: string | null; message: string; hint?: string | null }) {
  const campo = error.hint ? CAMPO_DEL_HINT[error.hint] : undefined
  return { ok: false as const, error: errorDePostgrest(error), ...(campo ? { campo } : {}) }
}

function respuesta(data: unknown) {
  const crudo = data as {
    resultado?: unknown
    seguimiento?: unknown
    recordatorio?: unknown
  } | null
  const seguimiento = seguimientoDesde(crudo?.seguimiento)
  const recordatorio = crudo?.recordatorio ? recordatorioDesde(crudo.recordatorio) : null
  if (!seguimiento || typeof crudo?.resultado !== 'string') {
    return falloDe('inesperado', 'No pudimos leer la respuesta. Recarga para ver cómo quedó.')
  }
  return {
    ok: true as const,
    data: {
      resultado: crudo.resultado as ResultadoDeSeguimiento['resultado'],
      seguimiento,
      recordatorio,
    },
  }
}

function comoLaBase(cambios: CambiosDeSeguimiento): { [clave: string]: Json } {
  return {
    ...(cambios.tipoId === undefined ? {} : { tipo_id: cambios.tipoId }),
    ...(cambios.titulo === undefined ? {} : { titulo: cambios.titulo }),
    ...(cambios.detalle === undefined ? {} : { detalle: cambios.detalle as Json }),
    ...(cambios.visibilidad === undefined ? {} : { visibilidad: cambios.visibilidad }),
    ...(cambios.ocurridoEn === undefined ? {} : { ocurrido_en: cambios.ocurridoEn }),
  }
}

const crear: RepositorioDeSeguimientos['crear'] = async (pedido) => {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('seguimiento_crear', {
    p_id: pedido.id,
    p_lead: pedido.leadId,
    p_seguimiento: {
      tipo_id: pedido.tipoId,
      titulo: pedido.titulo,
      detalle: pedido.detalle as Json,
      visibilidad: pedido.visibilidad,
      ...(pedido.ocurridoEn === null ? {} : { ocurrido_en: pedido.ocurridoEn }),
    },
    ...(pedido.recordatorio
      ? { p_recordatorio: { recordar_en: pedido.recordatorio.recordarEn } }
      : {}),
  })
  return error ? fallo(error) : respuesta(data)
}

const guardar: RepositorioDeSeguimientos['guardar'] = async (pedido) => {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('seguimiento_guardar', {
    p_id: pedido.id,
    p_actualizado_en_esperado: pedido.actualizadoEnEsperado,
    p_cambios: comoLaBase(pedido.cambios),
  })
  return error ? fallo(error) : respuesta(data)
}

const eliminar: RepositorioDeSeguimientos['eliminar'] = async (pedido) => {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('seguimiento_eliminar', {
    p_id: pedido.id,
    p_actualizado_en_esperado: pedido.actualizadoEnEsperado,
  })
  return error ? fallo(error) : respuesta(data)
}

const restaurar: RepositorioDeSeguimientos['restaurar'] = async (pedido) => {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('seguimiento_restaurar', {
    p_id: pedido.id,
    p_actualizado_en_esperado: pedido.actualizadoEnEsperado,
  })
  return error ? fallo(error) : respuesta(data)
}

export const seguimientosSupabase: RepositorioDeSeguimientos = {
  crear,
  guardar,
  eliminar,
  restaurar,
}
