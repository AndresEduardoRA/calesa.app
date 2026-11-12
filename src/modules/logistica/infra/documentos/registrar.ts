import 'server-only'
import { z } from 'zod'
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { createClient } from '@/shared/lib/supabase/server'
import type {
  DocumentoRegistrado,
  RepositorioDeDocumentos,
} from '../../entities/documentos/repositorio-de-documentos'
import { falloDeLaBase, inesperado, nuloParaLaBase } from './rpc'

// Los documentos se escriben sólo por RPC (6.05: `documento_registrar`), con el cliente de quien pide: la base exige `logistica.documentos.subir` en cada unidad.
const esquemaDeRegistro = z.array(
  z.object({ id: z.guid(), vehiculo_id: z.guid().nullable(), actualizado_en: z.string() }),
)

function registradosDesde(datos: unknown): ResultadoDeAccion<DocumentoRegistrado[]> {
  const leido = esquemaDeRegistro.safeParse(datos)
  return leido.success
    ? { ok: true, data: leido.data.map((f) => ({ id: f.id, actualizadoEn: f.actualizado_en })) }
    : inesperado()
}

export const documentosSupabase: RepositorioDeDocumentos = {
  registrar: async (p) => {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('documento_registrar', {
      p_id: p.id,
      p_vehiculos: p.vehiculos,
      p_repuesto: nuloParaLaBase(p.repuestoId),
      p_tipo: p.tipoId,
      p_ruta: p.ruta,
      p_nombre: p.nombre,
      p_mime: p.mime,
      p_bytes: p.bytes,
      p_emitido_el: nuloParaLaBase(p.emitidoEl),
      p_vence_el: nuloParaLaBase(p.venceEl),
      p_nota: nuloParaLaBase(p.nota),
    })
    return error ? falloDeLaBase(error) : registradosDesde(data)
  },
}
