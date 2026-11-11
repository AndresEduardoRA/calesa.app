import 'server-only'
import { cache } from 'react'
import { cortarAlTope } from '@/shared/lib/conteo'
import { errorDePostgrest, fallo, ok } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import {
  COLUMNAS_DE_TIPO_DE_DOCUMENTO,
  tipoDeDocumentoDesde,
  usoPorTipoDesde,
} from '../../entities/documentos/respuestas'
import type {
  LectorDeTiposDeDocumento,
  LectorDeUsoDeTipos,
} from '../../entities/documentos/repositorios'
import {
  TOPE_DE_TIPOS_POR_GRUPO,
  type TipoDeDocumento,
} from '../../entities/documentos/tipo-de-documento'

const NO_SE_LEYO = 'No pudimos leer los tipos de documento. Vuelve a intentar.'

// Un grupo (los de toda la empresa o los de un flujo), por el btree de `tipos_documento_flujo_id_nombre_key` (flujo_id primero), en el orden en que
// se ve y con `tope + 1` filas para saber si hay más. Es un catálogo de configuración: a lo sumo 100 por grupo. Leer es de cualquier cuenta con sesión.
export const leerTiposDeDocumentoDelGrupo: LectorDeTiposDeDocumento = cache(async (flujoId) => {
  const supabase = await createClient()
  const consulta = supabase.from('tipos_documento').select(COLUMNAS_DE_TIPO_DE_DOCUMENTO)
  const { data, error } = await (
    flujoId === null ? consulta.is('flujo_id', null) : consulta.eq('flujo_id', flujoId)
  )
    .order('orden')
    .order('nombre')
    .limit(TOPE_DE_TIPOS_POR_GRUPO + 1)
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  const tipos = data.map(tipoDeDocumentoDesde)
  if (tipos.some((tipo) => tipo === null)) {
    // Una lista con filas que no se entienden nunca se dibuja a medias.
    return fallo('inesperado', NO_SE_LEYO)
  }
  const { filas, hayMas } = cortarAlTope(
    tipos.filter((tipo): tipo is TipoDeDocumento => tipo !== null),
    TOPE_DE_TIPOS_POR_GRUPO,
  )
  return ok({ flujoId, tope: TOPE_DE_TIPOS_POR_GRUPO, tipos: filas, hayMas })
})

// Cuánto usa cada tipo del grupo: la base da `42501` a quien no puede cambiar el grupo, así que sólo se pide si puede.
export const leerUsoDeTiposDelGrupo: LectorDeUsoDeTipos = cache(async (flujoId) => {
  const supabase = await createClient()
  // El tipo generado no admite nulo, pero la base sí (nulo = los de toda la empresa).
  const { data, error } = await supabase.rpc('tipos_documento_con_uso', {
    p_flujo: flujoId as string,
  })
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  const uso = usoPorTipoDesde(data)
  return uso ? ok(uso) : fallo('inesperado', NO_SE_LEYO)
})
