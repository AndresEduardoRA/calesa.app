import 'server-only'
import { errorDePostgrest, fallo as falloDe } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import { recordatorioDesde } from '../entities/recordatorios'
import type { RepositorioDeRecordatorios, ResultadoDeRecordatorio } from '../entities/repositorios'

// Los recordatorios se escriben sólo por estas RPC (`…20261015000100_seguimientos_recordatorios.sql`):
// la tabla no tiene grants de escritura. Son de su dueño: uno ajeno responde igual que uno que no
// existe. Con lead, crearlo exige la cartera.

const CAMPO_DEL_HINT: Record<string, string> = {
  titulo: 'titulo',
  recordar_en: 'recordarEn',
}

function fallo(error: { code?: string | null; message: string; hint?: string | null }) {
  const campo = error.hint ? CAMPO_DEL_HINT[error.hint] : undefined
  return { ok: false as const, error: errorDePostgrest(error), ...(campo ? { campo } : {}) }
}

function respuesta(data: unknown) {
  const crudo = data as { resultado?: unknown; recordatorio?: unknown } | null
  const recordatorio = recordatorioDesde(crudo?.recordatorio)
  if (!recordatorio || typeof crudo?.resultado !== 'string') {
    return falloDe('inesperado', 'No pudimos leer la respuesta. Recarga para ver cómo quedó.')
  }
  return {
    ok: true as const,
    data: { resultado: crudo.resultado as ResultadoDeRecordatorio['resultado'], recordatorio },
  }
}

const crear: RepositorioDeRecordatorios['crear'] = async (pedido) => {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('recordatorio_crear', {
    p_id: pedido.id,
    // La base acepta un recordatorio sin lead (personal); acá siempre viene de la ficha.
    p_lead: pedido.leadId as string,
    p_titulo: pedido.titulo,
    p_recordar_en: pedido.recordarEn,
  })
  return error ? fallo(error) : respuesta(data)
}

const guardar: RepositorioDeRecordatorios['guardar'] = async (pedido) => {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('recordatorio_guardar', {
    p_id: pedido.id,
    p_actualizado_en_esperado: pedido.actualizadoEnEsperado,
    p_cambios: {
      ...(pedido.cambios.titulo === undefined ? {} : { titulo: pedido.cambios.titulo }),
      ...(pedido.cambios.recordarEn === undefined
        ? {}
        : { recordar_en: pedido.cambios.recordarEn }),
    },
  })
  return error ? fallo(error) : respuesta(data)
}

const completar: RepositorioDeRecordatorios['completar'] = async (pedido) => {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('recordatorio_completar', {
    p_id: pedido.id,
    p_actualizado_en_esperado: pedido.actualizadoEnEsperado,
    p_completado: pedido.completado,
  })
  return error ? fallo(error) : respuesta(data)
}

const eliminar: RepositorioDeRecordatorios['eliminar'] = async (pedido) => {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('recordatorio_eliminar', {
    p_id: pedido.id,
    p_actualizado_en_esperado: pedido.actualizadoEnEsperado,
  })
  return error ? fallo(error) : respuesta(data)
}

const restaurar: RepositorioDeRecordatorios['restaurar'] = async (pedido) => {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('recordatorio_restaurar', {
    p_id: pedido.id,
    p_actualizado_en_esperado: pedido.actualizadoEnEsperado,
  })
  return error ? fallo(error) : respuesta(data)
}

export const recordatoriosSupabase: RepositorioDeRecordatorios = {
  crear,
  guardar,
  completar,
  eliminar,
  restaurar,
}
