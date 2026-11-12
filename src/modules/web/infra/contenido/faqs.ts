import 'server-only'
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { cortarAlTope } from '@/shared/lib/conteo'
import { errorDePostgrest, fallo, ok, type Resultado } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import {
  COLUMNAS_DE_FAQ,
  faqsDesde,
  ordenSiguiente,
  reordenar,
  TOPE_DE_FAQS,
  type Faq,
} from '../../entities/contenido/faqs'
import { ORDEN_CAMBIADO, rechazoDeEscritura, sinFilas } from '../../entities/contenido/errores'
import type { RepositorioDeFaqs } from '../../entities/contenido/repositorios'

const NO_SE_LEYO = 'No se pudieron cargar las preguntas frecuentes.'
const NO_SE_LEYO_LA_RESPUESTA = 'No pudimos leer la respuesta. Recarga para ver cómo quedó.'

type Cliente = Awaited<ReturnType<typeof createClient>>

// Las preguntas frecuentes en su orden, con tope (8.02-1). `web_faqs` es una tabla de configuración de decenas de filas: sin índice por `orden` ni
// medición (`escala.md`; sólo la PK). Leer es de cualquier cuenta con sesión (policy `true`); escribir lo exige `web.contenido.gestionar`.
async function leerEnOrden(
  supabase: Cliente,
): Promise<Resultado<{ faqs: Faq[]; hayMas: boolean }>> {
  const { data, error } = await supabase
    .from('web_faqs')
    .select(COLUMNAS_DE_FAQ)
    .order('orden')
    .order('pregunta')
    .limit(TOPE_DE_FAQS + 1)
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  const leidas = faqsDesde(data)
  if (leidas === null) {
    return fallo('inesperado', NO_SE_LEYO)
  }
  const { filas, hayMas } = cortarAlTope(leidas, TOPE_DE_FAQS)
  return ok({ faqs: filas, hayMas })
}

export async function leerFaqs(): Promise<Resultado<{ faqs: Faq[]; hayMas: boolean }>> {
  return leerEnOrden(await createClient())
}

// Una escritura con la versión esperada quedó en cero filas: se relee la fila por id para decir ya no existe, conflicto o sin permiso.
async function ceroFilas(
  supabase: Cliente,
  id: string,
  esperada: string,
  mensajeDeConflicto?: string,
): Promise<ResultadoDeAccion<never>> {
  const { data, error } = await supabase
    .from('web_faqs')
    .select('actualizado_en')
    .eq('id', id)
    .limit(1)
  if (error) {
    return rechazoDeEscritura(error)
  }
  const fila = data[0]
  return sinFilas(
    { existe: fila !== undefined, versionDistinta: fila?.actualizado_en !== esperada },
    mensajeDeConflicto,
  )
}

function unaFaq(datos: unknown): Faq | null | undefined {
  const lista = faqsDesde(datos)
  return lista === null ? undefined : (lista[0] ?? null)
}

// Las preguntas frecuentes se escriben directo, con el cliente de quien pide, y el límite es la RLS (`web.contenido.gestionar`): una pregunta no otorga
// permisos, así que no hay RPC (8.02-1, D3). Una escritura que la RLS o la versión dejan en cero filas nunca es éxito.
export const faqsSupabase: RepositorioDeFaqs = {
  crear: async (datos) => {
    const supabase = await createClient()
    const leidas = await leerEnOrden(supabase)
    if (!leidas.ok) {
      return leidas
    }
    const { data, error } = await supabase
      .from('web_faqs')
      .insert({ ...datos, orden: ordenSiguiente(leidas.data.faqs) })
      .select(COLUMNAS_DE_FAQ)
      .limit(1)
    if (error) {
      return rechazoDeEscritura(error)
    }
    const faq = unaFaq(data)
    if (faq === undefined) return fallo('inesperado', NO_SE_LEYO_LA_RESPUESTA)
    // Un INSERT sin permiso da 42501; sin fila devuelta es que la RLS no dejó leerla: no pasa (leer es `true`), pero nunca es éxito.
    return faq === null
      ? fallo('sin_permiso', 'No se pudo crear la pregunta.')
      : { ok: true, data: faq }
  },
  guardar: async ({ id, actualizadoEnEsperado, cambios }) => {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('web_faqs')
      .update(cambios)
      .eq('id', id)
      .eq('actualizado_en', actualizadoEnEsperado)
      .select(COLUMNAS_DE_FAQ)
      .limit(1)
    if (error) {
      return rechazoDeEscritura(error)
    }
    const faq = unaFaq(data)
    if (faq === undefined) return fallo('inesperado', NO_SE_LEYO_LA_RESPUESTA)
    return faq === null ? ceroFilas(supabase, id, actualizadoEnEsperado) : { ok: true, data: faq }
  },
  eliminar: async ({ id, actualizadoEnEsperado }) => {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('web_faqs')
      .delete()
      .eq('id', id)
      .eq('actualizado_en', actualizadoEnEsperado)
      .select('id')
      .limit(1)
    if (error) {
      return rechazoDeEscritura(error)
    }
    return data.length > 0
      ? { ok: true, data: { id } }
      : ceroFilas(supabase, id, actualizadoEnEsperado)
  },
  mover: async ({ id, direccion }) => {
    const supabase = await createClient()
    const leidas = await leerEnOrden(supabase)
    if (!leidas.ok) {
      return leidas
    }
    // Sin la lista completa el orden mostrado no es el de la base: no se mueve (la interfaz ya lo apaga; esto cierra la puerta de la action).
    if (leidas.data.hayMas) {
      return fallo(
        'regla',
        'Hay más preguntas de las que se muestran; ordénalas desde las primeras.',
      )
    }
    for (const cambio of reordenar(leidas.data.faqs, id, direccion)) {
      const { data, error } = await supabase
        .from('web_faqs')
        .update({ orden: cambio.orden })
        .eq('id', cambio.id)
        .eq('actualizado_en', cambio.actualizadoEn)
        .select('id')
        .limit(1)
      if (error) {
        return rechazoDeEscritura(error)
      }
      if (data.length === 0) {
        return ceroFilas(supabase, cambio.id, cambio.actualizadoEn, ORDEN_CAMBIADO)
      }
    }
    return { ok: true, data: null }
  },
}
