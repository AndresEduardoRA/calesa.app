// El guardado del borrador del diseño (4.22-2) sobre el cliente que recibe: `formula_guardar_borrador()` con la definición y los `params` tal cual se leyeron.
// Replica lo que hace el área `formula` (una guarda impide importarla); los mensajes de la base llegan tal cual (el PT409 dice quién guardó y cuándo).
import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { errorDePostgrest, fallo, ok } from '@/shared/lib/errores'
import type { Database, Json } from '@/shared/types/database.types'
import type { RepositorioDelDiseno } from '../../entities/diseno/edicion-del-diseno'

const esquemaDelGuardado = z.strictObject({ id: z.guid(), actualizado_en: z.string() })

// Una sola esperada (sin hora crea; con hora pisa) y la nota sólo si hay (la base la toma nula).
export function guardadoDelDisenoSobre(cliente: SupabaseClient<Database>): RepositorioDelDiseno {
  return {
    guardarBorrador: async ({ origenId, definicion, params, diseno, nota, esperada }) => {
      const { data, error } = await cliente.rpc('formula_guardar_borrador', {
        p_origen: origenId,
        p_def: definicion as Json,
        p_params: params as Json,
        p_diseno: diseno as Json,
        ...(nota === null ? {} : { p_nota: nota }),
        ...(esperada.sobre === 'publicada'
          ? { p_publicada_esperada: esperada.publicadaId }
          : { p_actualizado_en_esperado: esperada.actualizadoEn }),
      })
      if (error) return { ok: false, error: errorDePostgrest(error) }
      const leido = esquemaDelGuardado.safeParse(data)
      return leido.success
        ? ok({ id: leido.data.id, actualizadoEn: leido.data.actualizado_en })
        : fallo('inesperado', 'No pudimos leer la respuesta. Recarga para ver cómo quedó.')
    },
  }
}
