import 'server-only'
import { errorDePostgrest, fallo } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import type { Json } from '@/shared/types/database.types'
import type {
  FalloDeFase,
  RepositorioDeFases,
  ResultadoDeFase,
} from '../../entities/fases/repositorios'
import { esCampoDeFase } from '../../entities/fases/reglas-de-fase'
import { respuestaDeEliminarFaseDesde, respuestaDeFaseDesde } from '../../entities/fases/respuestas'

// Las cinco escrituras (`fase_crear`, `fase_guardar`, `fase_mover`, `fase_eliminar`, `fase_reactivar`): el permiso del flujo, la versión (`PT409`), las reglas del dato con el campo
// en el `hint` (`22023`, `23514`) y los únicos con mensaje humano (`23505`). Ninguna devuelve la lista.
const NO_SE_LEYO = 'No pudimos leer la respuesta. Recarga para ver cómo quedó.'

type SalidaDeRpc = {
  data: unknown
  error: { code?: string | null; message: string; hint?: string | null } | null
}

function comoFallo(error: NonNullable<SalidaDeRpc['error']>): FalloDeFase {
  const campo = error.hint ?? undefined
  return {
    ok: false,
    error: errorDePostgrest(error),
    ...(esCampoDeFase(campo) ? { campo } : {}),
  }
}

function comoResultado<T>(
  salida: SalidaDeRpc,
  leer: (crudo: unknown) => T | null,
): ResultadoDeFase<T> {
  if (salida.error) {
    return comoFallo(salida.error)
  }
  const leido = leer(salida.data)
  return leido ? { ok: true, data: leido } : fallo('inesperado', NO_SE_LEYO)
}

export const fasesSupabase: RepositorioDeFases = {
  crear: async ({ id, flujoId, actualizadoEnEsperado, datos }) => {
    const supabase = await createClient()
    return comoResultado(
      await supabase.rpc('fase_crear', {
        p_id: id,
        p_flujo: flujoId,
        p_actualizado_en_esperado: actualizadoEnEsperado,
        p_datos: datos as Json,
      }),
      respuestaDeFaseDesde,
    )
  },
  guardar: async ({ id, actualizadoEnEsperado, cambios }) => {
    const supabase = await createClient()
    return comoResultado(
      await supabase.rpc('fase_guardar', {
        p_fase: id,
        p_actualizado_en_esperado: actualizadoEnEsperado,
        p_cambios: cambios as Json,
      }),
      respuestaDeFaseDesde,
    )
  },
  mover: async ({ id, actualizadoEnEsperado, despuesDe }) => {
    const supabase = await createClient()
    return comoResultado(
      await supabase.rpc('fase_mover', {
        p_fase: id,
        p_actualizado_en_esperado: actualizadoEnEsperado,
        // Nulo = al principio; el tipo generado no lo admite.
        p_despues_de: despuesDe as string,
      }),
      respuestaDeFaseDesde,
    )
  },
  eliminar: async ({ id, actualizadoEnEsperado }) => {
    const supabase = await createClient()
    return comoResultado(
      await supabase.rpc('fase_eliminar', {
        p_fase: id,
        p_actualizado_en_esperado: actualizadoEnEsperado,
      }),
      respuestaDeEliminarFaseDesde,
    )
  },
  reactivar: async ({ id, actualizadoEnEsperado }) => {
    const supabase = await createClient()
    return comoResultado(
      await supabase.rpc('fase_reactivar', {
        p_fase: id,
        p_actualizado_en_esperado: actualizadoEnEsperado,
      }),
      respuestaDeFaseDesde,
    )
  },
}
