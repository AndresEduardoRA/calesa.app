// Lo que el hueco «Documentos» lee desde el navegador, con la sesión de quien mira (6.06-1): los documentos vivos de una unidad bajo la policy «documentos: leer» y, en una sola
// consulta, el nombre de quien subió y de quien revisó cada uno. Escribir va por las RPC de 6.05 (6.06-2 y 6.06-3).
import { cortarAlTope } from '@/shared/lib/conteo'
import { errorDePostgrest, fallo, ok, type Resultado } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/browser'
import { documentosDesde, type DocumentoDeLaUnidad } from '../../entities/documentos/documento'
import { refDeUnidad, type Unidad } from '../../entities/nucleo/unidad'

export const NO_SE_CARGARON_LOS_DOCUMENTOS = 'No se pudieron cargar los documentos.'

// Cuántos documentos de una unidad se dibujan: una unidad lleva decenas, no miles. Más recientes primero.
export const TOPE_DE_DOCUMENTOS_DE_LA_UNIDAD = 50

const COLUMNAS =
  'id, tipo_documento_id, estado, ruta, nombre_archivo, mime, bytes, emitido_el, vence_el, nota, motivo_rechazo, subido_por, revisado_por, revisado_en, visible_portal, eliminado_en, creado_en, actualizado_en'

export type DocumentosDeLaUnidad = {
  documentos: DocumentoDeLaUnidad[]
  hayMas: boolean
  // id de persona → nombre. Quien no está («otra persona») no se inventa.
  nombres: Record<string, string>
}

// Los nombres de quien subió y revisó: una consulta por todos, nunca una por fila. Si falla, la fila dice «otra persona» y la lista se muestra igual.
async function nombresDe(ids: readonly string[]): Promise<Record<string, string>> {
  if (ids.length === 0) {
    return {}
  }
  const { data, error } = await createClient()
    .from('perfiles')
    .select('id, nombre')
    .in('id', [...ids])
    .limit(ids.length)
  if (error) {
    return {}
  }
  const nombres: Record<string, string> = {}
  for (const fila of data) {
    if (typeof fila.nombre === 'string' && fila.nombre.trim() !== '') {
      nombres[fila.id] = fila.nombre
    }
  }
  return nombres
}

// Por `documentos_vehiculo_id_idx` donde no está eliminado, con `limit tope + 1`: ordena a lo sumo esas filas. Los eliminados no salen: la policy de lectura los esconde.
export async function leerDocumentosDeLaUnidad(
  unidad: Pick<Unidad, 'tipo' | 'id'>,
): Promise<Resultado<DocumentosDeLaUnidad>> {
  const ref = refDeUnidad(unidad)
  const columna = 'vehiculo_id' in ref ? 'vehiculo_id' : 'repuesto_id'
  const { data, error } = await createClient()
    .from('documentos')
    .select(COLUMNAS)
    .eq(columna, unidad.id)
    .is('eliminado_en', null)
    .order('creado_en', { ascending: false })
    .order('id', { ascending: false })
    .limit(TOPE_DE_DOCUMENTOS_DE_LA_UNIDAD + 1)
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  const documentos = documentosDesde(data)
  if (!documentos) {
    return fallo('inesperado', NO_SE_CARGARON_LOS_DOCUMENTOS)
  }
  const { filas, hayMas } = cortarAlTope(documentos, TOPE_DE_DOCUMENTOS_DE_LA_UNIDAD)
  const personas = [
    ...new Set(filas.flatMap((d) => [d.subidoPor, d.revisadoPor]).filter((id) => id !== null)),
  ]
  return ok({ documentos: filas, hayMas, nombres: await nombresDe(personas) })
}
