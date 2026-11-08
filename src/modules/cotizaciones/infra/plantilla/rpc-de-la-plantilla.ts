// Las escrituras de la plantilla de la tarjeta sobre un cliente (4.19-3a): el de la sesión de quien edita, porque la base vuelve a pedir `cotizaciones.configurar` del origen.
// Sin `server-only`, para que una prueba la corra contra la base. Los rechazos llegan como los dice `rechazoHaciaUnCampo()`.
import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { fallo, ok } from '@/shared/lib/errores'
import type { Database, Json } from '@/shared/types/database.types'
import {
  rechazoHaciaUnCampo,
  type ErrorDeLaPlantilla,
  type RepositorioDeLaPlantilla,
} from '../../entities/plantilla/escritura-de-la-plantilla'

type Respuesta = { data: unknown; error: ErrorDeLaPlantilla | null }

const NO_SE_LEYO = 'No pudimos leer la respuesta. Recarga para ver cómo quedó.'

// «Crear el primer borrador»: la base la toma como nula y no compara. Los tipos generados dan el argumento como `string` (la función no tiene valor por omisión) y un
// `undefined` no viaja en el JSON de supabase-js: tiene que ser un `null` explícito, y por eso es un `const` con nombre y no un argumento omitido.
const ESPERADA_NULA = null as unknown as string

// Lo que devolvió `plantilla_guardar_borrador()`: el `actualizado_en` nuevo del borrador, que es la versión esperada de lo que sigue. Sólo se pide que sea un texto.
function horaGuardada({ data, error }: Respuesta): ResultadoDeAccion<string> {
  if (error) return rechazoHaciaUnCampo(error)
  const leida = z.string().min(1).safeParse(data)
  return leida.success ? ok(leida.data) : fallo('inesperado', NO_SE_LEYO)
}

function idPublicado({ data, error }: Respuesta): ResultadoDeAccion<string> {
  if (error) return rechazoHaciaUnCampo(error)
  const leido = z.guid().safeParse(data)
  return leido.success ? ok(leido.data) : fallo('inesperado', NO_SE_LEYO)
}

export function plantillaSobre(cliente: SupabaseClient<Database>): RepositorioDeLaPlantilla {
  return {
    // Sin `p_nota`: el editor no escribe la nota del borrador (la de publicar la reemplaza). La esperada va siempre, nula para crear.
    guardar: async ({ origenId, esperada, definicion }) =>
      horaGuardada(
        await cliente.rpc('plantilla_guardar_borrador', {
          p_origen: origenId,
          p_actualizado_en_esperado: esperada ?? ESPERADA_NULA,
          // La acción ya revisó que sea un JSON que la base lee (`revisarTextoParaLaBase()`); su forma la juzga la base.
          p_def: definicion as Json,
        }),
      ),
    publicar: async ({ origenId, esperada, nota }) =>
      idPublicado(
        await cliente.rpc('plantilla_publicar', {
          p_origen: origenId,
          p_actualizado_en_esperado: esperada,
          p_nota: nota,
        }),
      ),
    // `returns void`: sin error, entró.
    descartar: async ({ origenId, esperada }) => {
      const { error } = await cliente.rpc('plantilla_descartar_borrador', {
        p_origen: origenId,
        p_actualizado_en_esperado: esperada,
      })
      return error ? rechazoHaciaUnCampo(error) : ok(null)
    },
  }
}
