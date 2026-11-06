import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { errorDePostgrest, fallo, ok, type Resultado } from '@/shared/lib/errores'
import type { Database } from '@/shared/types/database.types'
import type { RepositorioDeLaFormula } from '../../entities/formula/repositorio'

type Respuesta = { data: unknown; error: { code?: string | null; message: string } | null }

// El id de la versión publicada que devuelve la RPC; cualquier otra cosa es una respuesta que no se esperaba.
function idPublicado({ data, error }: Respuesta): Resultado<string> {
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  const leido = z.guid().safeParse(data)
  return leido.success
    ? ok(leido.data)
    : fallo('inesperado', 'No pudimos leer la respuesta. Recarga para ver cómo quedó.')
}

// Las escrituras de la fórmula sobre un cliente (el de la sesión de quien publica: la base vuelve a pedir `cotizaciones.configurar` del origen). Los mensajes de la base
// llegan tal cual: el PT409 dice quién publicó qué versión y cuándo (`_version_publicada_por()`), los 22023 la regla.
export function publicacionSobre(cliente: SupabaseClient<Database>): RepositorioDeLaFormula {
  return {
    publicar: async ({ origenId, nota, publicadaEsperada }) =>
      idPublicado(
        await cliente.rpc('formula_publicar', {
          p_origen: origenId,
          p_nota: nota,
          // Sin publicada no se manda: la base la toma nula y no compara.
          ...(publicadaEsperada ? { p_publicada_esperada: publicadaEsperada } : {}),
        }),
      ),
  }
}
