import 'server-only'
import { z } from 'zod'
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { createClient } from '@/shared/lib/supabase/server'
import type {
  DocumentoModificado,
  RepositorioDeRevision,
} from '../../entities/documentos/repositorio-de-revision'
import { falloDeLaBase, inesperado, nuloParaLaBase } from './rpc'

// Revisar, editar y eliminar un documento van sólo por RPC (6.05: `documento_revisar`, `documento_editar`, `documento_eliminar`), con el cliente de quien pide: la base exige la clave de
// aprobar o de subir de la unidad y la versión. Un `PT409` llega como conflicto con el mensaje de la base.
const esquemaDeRespuesta = z.object({ id: z.guid(), actualizado_en: z.string().optional() })

function modificadoDesde(datos: unknown): ResultadoDeAccion<DocumentoModificado> {
  const leido = esquemaDeRespuesta.safeParse(datos)
  return leido.success
    ? { ok: true, data: { id: leido.data.id, actualizadoEn: leido.data.actualizado_en ?? null } }
    : inesperado()
}

const NO_PUEDE_REVISAR = 'No puedes revisar este documento.'
const NO_PUEDE_EDITAR = 'No puedes editar este documento.'
const NO_PUEDE_ELIMINAR = 'No puedes eliminar este documento.'

export const revisionSupabase: RepositorioDeRevision = {
  revisar: async (p) => {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('documento_revisar', {
      p_id: p.id,
      p_estado: p.estado,
      p_motivo: nuloParaLaBase(p.motivo),
      p_actualizado_en_esperado: p.actualizadoEnEsperado,
    })
    return error ? falloDeLaBase(error, NO_PUEDE_REVISAR) : modificadoDesde(data)
  },
  editar: async (p) => {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('documento_editar', {
      p_id: p.id,
      p_cambios: p.cambios as never,
      p_actualizado_en_esperado: p.actualizadoEnEsperado,
    })
    return error ? falloDeLaBase(error, NO_PUEDE_EDITAR) : modificadoDesde(data)
  },
  eliminar: async (p) => {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('documento_eliminar', {
      p_id: p.id,
      p_actualizado_en_esperado: p.actualizadoEnEsperado,
    })
    return error ? falloDeLaBase(error, NO_PUEDE_ELIMINAR) : modificadoDesde(data)
  },
}
