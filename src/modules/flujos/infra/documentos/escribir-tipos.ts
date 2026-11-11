import 'server-only'
import { errorDePostgrest, fallo } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import { esCampoDeTipo } from '../../entities/documentos/formulario-de-tipo'
import type {
  FalloDeTipo,
  RepositorioDeTiposDeDocumento,
  ResultadoDeTipo,
} from '../../entities/documentos/repositorios'
import {
  respuestaDeEliminarDesde,
  respuestaDeEscrituraDesde,
} from '../../entities/documentos/respuestas'
import type { Json } from '@/shared/types/database.types'

// Las tres escrituras (`…20261111195259_tipos_documento_crear.sql` y siguientes): el permiso del grupo, la versión (`PT409`), las reglas del dato
// con el campo en el `hint` (`22023`) y el nombre repetido (`23505`). Ninguna devuelve la lista.
const NO_SE_LEYO = 'No pudimos leer la respuesta. Recarga para ver cómo quedó.'

type SalidaDeRpc = {
  data: unknown
  error: { code?: string | null; message: string; hint?: string | null } | null
}

function comoFallo(error: NonNullable<SalidaDeRpc['error']>): FalloDeTipo {
  const campo = error.hint ?? undefined
  return {
    ok: false,
    error: errorDePostgrest(error),
    ...(esCampoDeTipo(campo) ? { campo } : {}),
  }
}

function comoResultado<T>(
  salida: SalidaDeRpc,
  leer: (crudo: unknown) => T | null,
): ResultadoDeTipo<T> {
  if (salida.error) {
    return comoFallo(salida.error)
  }
  const leido = leer(salida.data)
  return leido ? { ok: true, data: leido } : fallo('inesperado', NO_SE_LEYO)
}

export const tiposDeDocumentoSupabase: RepositorioDeTiposDeDocumento = {
  crear: async ({ id, flujoId, cambios }) => {
    const supabase = await createClient()
    return comoResultado(
      await supabase.rpc('tipo_documento_crear', {
        p_id: id,
        // El tipo generado no admite nulo, pero la base sí (nulo = de toda la empresa).
        p_flujo: flujoId as string,
        p_datos: cambios as Json,
      }),
      respuestaDeEscrituraDesde,
    )
  },
  guardar: async ({ id, actualizadoEnEsperado, cambios }) => {
    const supabase = await createClient()
    return comoResultado(
      await supabase.rpc('tipo_documento_guardar', {
        p_id: id,
        p_actualizado_en_esperado: actualizadoEnEsperado,
        p_cambios: cambios as Json,
      }),
      respuestaDeEscrituraDesde,
    )
  },
  mover: async ({ id, actualizadoEnEsperado, despuesDe }) => {
    const supabase = await createClient()
    return comoResultado(
      await supabase.rpc('tipo_documento_mover', {
        p_id: id,
        p_actualizado_en_esperado: actualizadoEnEsperado,
        // Nulo = al principio; el tipo generado no lo admite.
        p_despues_de: despuesDe as string,
      }),
      respuestaDeEscrituraDesde,
    )
  },
  eliminar: async ({ id, actualizadoEnEsperado }) => {
    const supabase = await createClient()
    return comoResultado(
      await supabase.rpc('tipo_documento_eliminar', {
        p_id: id,
        p_actualizado_en_esperado: actualizadoEnEsperado,
      }),
      respuestaDeEliminarDesde,
    )
  },
}
