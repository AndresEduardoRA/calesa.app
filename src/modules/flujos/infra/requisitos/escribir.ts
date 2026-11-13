import 'server-only'
import { errorDePostgrest, fallo } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import type { Json } from '@/shared/types/database.types'
import type {
  FalloDeRequisito,
  RepositorioDeRequisitos,
  ResultadoDeRequisito,
} from '../../entities/requisitos/repositorios'
import { versionNuevaDesde } from '../../entities/requisitos/respuestas'

// Las escrituras de un requisito (`requisito_crear`, `requisito_guardar`, `requisito_mover`, `requisito_eliminar`): el permiso del flujo (`42501`), la versión (`PT409`) y las reglas del dato
// con el campo en el `hint` (`22023`). Ninguna devuelve la lista: devuelven la versión nueva del flujo y la pantalla relee.
const NO_SE_LEYO = 'No pudimos leer la respuesta. Recarga para ver cómo quedó.'

type SalidaDeRpc = {
  data: unknown
  error: { code?: string | null; message: string; hint?: string | null } | null
}

function comoResultado(salida: SalidaDeRpc): ResultadoDeRequisito<{ actualizadoEn: string }> {
  if (salida.error) {
    const fallido: FalloDeRequisito = { ok: false, error: errorDePostgrest(salida.error) }
    return salida.error.hint ? { ...fallido, campo: salida.error.hint } : fallido
  }
  const leida = versionNuevaDesde(salida.data)
  return leida ? { ok: true, data: leida } : fallo('inesperado', NO_SE_LEYO)
}

export const requisitosSupabase: RepositorioDeRequisitos = {
  crear: async ({ id, faseId, actualizadoEnEsperado, tipo, datos }) => {
    const supabase = await createClient()
    return comoResultado(
      await supabase.rpc('requisito_crear', {
        p_id: id,
        p_fase: faseId,
        p_actualizado_en_esperado: actualizadoEnEsperado,
        p_tipo: tipo,
        p_datos: datos as Json,
      }),
    )
  },
  guardar: async ({ id, actualizadoEnEsperado, cambios }) => {
    const supabase = await createClient()
    return comoResultado(
      await supabase.rpc('requisito_guardar', {
        p_requisito: id,
        p_actualizado_en_esperado: actualizadoEnEsperado,
        p_cambios: cambios as Json,
      }),
    )
  },
  mover: async ({ id, actualizadoEnEsperado, despuesDe }) => {
    const supabase = await createClient()
    return comoResultado(
      await supabase.rpc('requisito_mover', {
        p_requisito: id,
        p_actualizado_en_esperado: actualizadoEnEsperado,
        // Nulo = al principio; el tipo generado no lo admite.
        p_despues_de: despuesDe as string,
      }),
    )
  },
  eliminar: async ({ id, actualizadoEnEsperado }) => {
    const supabase = await createClient()
    return comoResultado(
      await supabase.rpc('requisito_eliminar', {
        p_requisito: id,
        p_actualizado_en_esperado: actualizadoEnEsperado,
      }),
    )
  },
}
