import 'server-only'
import { errorDePostgrest, fallo as falloDe } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import { etiquetaDesde } from '../entities/etiqueta'
import type { RepositorioDeEtiquetas, ResultadoDeEtiqueta } from '../entities/repositorios'

// Las etiquetas se escriben sólo por estas RPC (`…20261015000200_marcas_de_leads.sql`). Son de su
// dueña: una ajena responde igual que una que no existe. Renombrar, recolorear y eliminar piden la
// versión (`PT409` legible si otra pestaña la cambió).

const CAMPO_DEL_HINT: Record<string, string> = { nombre: 'nombre', color: 'color' }

function fallo(error: { code?: string | null; message: string; hint?: string | null }) {
  const campo = error.hint ? CAMPO_DEL_HINT[error.hint] : undefined
  return { ok: false as const, error: errorDePostgrest(error), ...(campo ? { campo } : {}) }
}

const RESULTADOS = ['creada', 'repetido', 'guardada', 'eliminada', 'sin_cambios'] as const

function respuesta(data: unknown) {
  const crudo = data as { resultado?: unknown; etiqueta?: unknown; leads?: unknown } | null
  const resultado = RESULTADOS.find((uno) => uno === crudo?.resultado)
  const etiqueta = crudo?.etiqueta === null ? null : etiquetaDesde(crudo?.etiqueta)
  // Sólo «sin cambios» al eliminar llega sin etiqueta.
  if (!resultado || (etiqueta === null && resultado !== 'sin_cambios')) {
    return falloDe('inesperado', 'No pudimos leer la respuesta. Recarga para ver cómo quedó.')
  }
  const leads = typeof crudo?.leads === 'number' ? crudo.leads : 0
  const data_: ResultadoDeEtiqueta = { resultado, etiqueta, leads }
  return { ok: true as const, data: data_ }
}

export const etiquetasSupabase: RepositorioDeEtiquetas = {
  crear: async ({ id, nombre, color }) => {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('etiqueta_crear', {
      p_id: id,
      p_nombre: nombre,
      ...(color ? { p_color: color } : {}),
    })
    return error ? fallo(error) : respuesta(data)
  },
  guardar: async ({ id, actualizadoEnEsperado, nombre, color }) => {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('etiqueta_guardar', {
      p_id: id,
      p_actualizado_en_esperado: actualizadoEnEsperado,
      ...(nombre === undefined ? {} : { p_nombre: nombre }),
      ...(color === undefined ? {} : { p_color: color }),
    })
    return error ? fallo(error) : respuesta(data)
  },
  eliminar: async ({ id, actualizadoEnEsperado }) => {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('etiqueta_eliminar', {
      p_id: id,
      p_actualizado_en_esperado: actualizadoEnEsperado,
    })
    return error ? fallo(error) : respuesta(data)
  },
}
