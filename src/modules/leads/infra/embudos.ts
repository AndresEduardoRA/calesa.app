import 'server-only'
import { errorDePostgrest, fallo as falloDe } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import { embudoDesde, etapasParaGuardar } from '../entities/embudo'
import type {
  RepositorioDeEmbudos,
  ResultadoDeEmbudo,
} from '../entities/repositorios-de-oportunidades'

// Los embudos se escriben sólo por estas RPC (`…20261016000100_embudos_oportunidades.sql`). Son de su
// dueña: uno ajeno responde igual que uno que no existe. Renombrar, eliminar y guardar las etapas
// piden la versión del embudo (`PT409` legible si otra pestaña lo cambió).

const CAMPO_DEL_HINT: Record<string, string> = { nombre: 'nombre', etapas: 'etapas' }

function fallo(error: { code?: string | null; message: string; hint?: string | null }) {
  const campo = error.hint ? CAMPO_DEL_HINT[error.hint] : undefined
  return { ok: false as const, error: errorDePostgrest(error), ...(campo ? { campo } : {}) }
}

const RESULTADOS = [
  'creado',
  'existente',
  'repetido',
  'guardado',
  'eliminado',
  'sin_cambios',
] as const

function respuesta(data: unknown) {
  const crudo = data as { resultado?: unknown; embudo?: unknown } | null
  const resultado = RESULTADOS.find((uno) => uno === crudo?.resultado)
  const embudo =
    crudo?.embudo === undefined || crudo.embudo === null ? null : embudoDesde(crudo.embudo)
  // Sólo eliminar llega sin embudo.
  if (!resultado || (embudo === null && resultado !== 'eliminado' && resultado !== 'sin_cambios')) {
    return falloDe('inesperado', 'No pudimos leer la respuesta. Recarga para ver cómo quedó.')
  }
  const data_: ResultadoDeEmbudo = { resultado, embudo }
  return { ok: true as const, data: data_ }
}

export const embudosSupabase: RepositorioDeEmbudos = {
  porDefecto: async () => {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('embudo_por_defecto')
    return error ? fallo(error) : respuesta(data)
  },
  crear: async ({ id, nombre }) => {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('embudo_crear', { p_id: id, p_nombre: nombre })
    return error ? fallo(error) : respuesta(data)
  },
  guardar: async ({ id, actualizadoEnEsperado, nombre }) => {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('embudo_guardar', {
      p_id: id,
      p_actualizado_en_esperado: actualizadoEnEsperado,
      p_nombre: nombre,
    })
    return error ? fallo(error) : respuesta(data)
  },
  eliminar: async ({ id, actualizadoEnEsperado }) => {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('embudo_eliminar', {
      p_id: id,
      p_actualizado_en_esperado: actualizadoEnEsperado,
    })
    return error ? fallo(error) : respuesta(data)
  },
  guardarEtapas: async ({ embudoId, actualizadoEnEsperado, etapas }) => {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('embudo_etapas_guardar', {
      p_embudo: embudoId,
      p_actualizado_en_esperado: actualizadoEnEsperado,
      p_etapas: etapasParaGuardar(etapas),
    })
    return error ? fallo(error) : respuesta(data)
  },
}
