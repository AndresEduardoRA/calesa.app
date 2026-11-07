import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { errorDePostgrest, fallo, ok, type Resultado } from '@/shared/lib/errores'
import type { Database } from '@/shared/types/database.types'
import type { RepositorioDeLaFormula, ResultadoDelCambio } from '../../entities/formula/repositorio'

type Respuesta = {
  data: unknown
  error: { code?: string | null; message: string; hint?: string | null } | null
}

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

// El cambio de una constante: como `idPublicado`, y el 22023 con `hint = 'valor'` («La constante ya tiene ese valor.», el único que lo lleva en
// `formula_cambiar_constante()`) va al campo. Otro 22023 queda sin campo: el `hint` de `_formula_rechazar` es el id de un nodo.
function idDelCambio(respuesta: Respuesta): ResultadoDelCambio {
  const { error } = respuesta
  if (error?.code === '22023' && error.hint === 'valor') {
    return { ok: false, error: errorDePostgrest(error), campo: 'valor' }
  }
  return idPublicado(respuesta)
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
    revertir: async ({ origenId, versionId, nota, publicadaEsperada }) =>
      idPublicado(
        await cliente.rpc('formula_revertir', {
          p_origen: origenId,
          p_version: versionId,
          p_nota: nota,
          p_publicada_esperada: publicadaEsperada,
        }),
      ),
    // Siempre con la esperada: sin ella la base no compara y otra publicación en el medio se pisaría.
    cambiarConstante: async ({ origenId, nodo, valor, publicadaEsperada }) =>
      idDelCambio(
        await cliente.rpc('formula_cambiar_constante', {
          p_origen: origenId,
          p_nodo: nodo,
          p_valor: valor,
          p_publicada_esperada: publicadaEsperada,
        }),
      ),
    // `returns void`: sin error, entró.
    descartar: async ({ origenId }) => {
      const { error } = await cliente.rpc('formula_descartar_borrador', { p_origen: origenId })
      return error ? { ok: false, error: errorDePostgrest(error) } : ok(null)
    },
  }
}
