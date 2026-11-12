import { z } from 'zod'

// Las preguntas frecuentes de la web pública (8.02-1). `web_faqs` es una tabla de configuración de decenas de filas: sin índice por `orden` ni medición
// (`escala.md`). La respuesta es texto plano: `web.faqs` la entrega tal cual y el sitio la escapa (D2).
export const TOPE_DE_FAQS = 100
export const LARGO_DE_PREGUNTA = 200
export const LARGO_DE_RESPUESTA = 2000
export const LARGO_DE_CATEGORIA = 60

export type Faq = {
  id: string
  pregunta: string
  respuesta: string
  categoria: string | null
  publicada: boolean
  orden: number
  // La versión de la fila (`actualizado_en`): se espera al guardar o eliminar.
  actualizadoEn: string
}

export const COLUMNAS_DE_FAQ =
  'id, pregunta, respuesta, categoria, publicada, orden, actualizado_en'

const esquemaDeFila = z
  .object({
    id: z.guid(),
    pregunta: z.string(),
    respuesta: z.string(),
    categoria: z.string().nullable(),
    publicada: z.boolean(),
    orden: z.number(),
    actualizado_en: z.string(),
  })
  .transform(({ actualizado_en, ...resto }): Faq => ({ ...resto, actualizadoEn: actualizado_en }))

/** Las filas de `web_faqs`; nulo si alguna no tiene la forma esperada. */
export function faqsDesde(datos: unknown): Faq[] | null {
  const leido = z.array(esquemaDeFila).safeParse(datos)
  return leido.success ? leido.data : null
}

/** El orden de una pregunta nueva: al final de las que hay. */
export function ordenSiguiente(faqs: readonly Faq[]): number {
  return faqs.length === 0 ? 0 : Math.max(...faqs.map((f) => f.orden)) + 1
}

/**
 * Mover una pregunta un lugar. Renumera 0…n−1 en el orden mostrado (los `orden` repetidos, como el 0 por defecto, no se pueden intercambiar sin
 * renumerar) e intercambia la fila con su vecina. Devuelve sólo las filas cuyo `orden` cambia; vacío si ya es la primera (al subir) o la última (al bajar)
 * o si no existe.
 */
export function reordenar(
  faqs: readonly Faq[],
  id: string,
  direccion: 'subir' | 'bajar',
): { id: string; actualizadoEn: string; orden: number }[] {
  const indice = faqs.findIndex((f) => f.id === id)
  const destino = direccion === 'subir' ? indice - 1 : indice + 1
  if (indice < 0 || destino < 0 || destino >= faqs.length) {
    return []
  }
  const nuevas = [...faqs]
  const [movida] = nuevas.splice(indice, 1)
  if (movida === undefined) {
    return []
  }
  nuevas.splice(destino, 0, movida)
  return nuevas.flatMap((f, posicion) =>
    f.orden === posicion ? [] : [{ id: f.id, actualizadoEn: f.actualizadoEn, orden: posicion }],
  )
}

/** Las categorías ya usadas, sin repetir ni vacías, en el orden en que aparecen: las sugerencias del campo. */
export function categoriasUsadas(faqs: readonly Faq[]): string[] {
  const vistas = new Set<string>()
  for (const { categoria } of faqs) {
    const limpia = categoria?.trim() ?? ''
    if (limpia !== '') vistas.add(limpia)
  }
  return [...vistas]
}

/** Lo que escribe la persona en el formulario, tal cual. */
export type ValoresDeFaq = {
  pregunta: string
  respuesta: string
  categoria: string
  publicada: boolean
}

/** Lo validado, listo para mandar (la categoría vacía es «sin categoría»). */
export type DatosDeFaq = {
  pregunta: string
  respuesta: string
  categoria: string | null
  publicada: boolean
}

export const VALORES_DE_FAQ_NUEVA: ValoresDeFaq = {
  pregunta: '',
  respuesta: '',
  categoria: '',
  publicada: false,
}

export function valoresDeFaq(faq: Faq): ValoresDeFaq {
  return {
    pregunta: faq.pregunta,
    respuesta: faq.respuesta,
    categoria: faq.categoria ?? '',
    publicada: faq.publicada,
  }
}

export type ValidacionDeFaq =
  { ok: true; datos: DatosDeFaq } | { ok: false; errores: Record<string, string> }

/** Valida el formulario con las reglas de la base. El error de cada campo va por su clave del formulario. */
export function validarFaq(valores: ValoresDeFaq): ValidacionDeFaq {
  const errores: Record<string, string> = {}
  const pregunta = valores.pregunta.trim()
  const respuesta = valores.respuesta.trim()
  const categoria = valores.categoria.trim()
  if (pregunta === '') {
    errores['pregunta'] = 'Escribe la pregunta.'
  } else if (pregunta.length > LARGO_DE_PREGUNTA) {
    errores['pregunta'] = `La pregunta admite hasta ${String(LARGO_DE_PREGUNTA)} letras.`
  }
  if (respuesta === '') {
    errores['respuesta'] = 'Escribe la respuesta.'
  } else if (respuesta.length > LARGO_DE_RESPUESTA) {
    errores['respuesta'] = `La respuesta admite hasta ${String(LARGO_DE_RESPUESTA)} letras.`
  }
  if (categoria.length > LARGO_DE_CATEGORIA) {
    errores['categoria'] = `La categoría admite hasta ${String(LARGO_DE_CATEGORIA)} letras.`
  }
  if (Object.keys(errores).length > 0) {
    return { ok: false, errores }
  }
  return {
    ok: true,
    datos: {
      pregunta,
      respuesta,
      categoria: categoria === '' ? null : categoria,
      publicada: valores.publicada,
    },
  }
}

/** Sólo lo que cambió respecto de lo guardado; nulo si no hay nada que guardar. */
export function cambiosDeFaq(original: Faq, nuevos: DatosDeFaq): Partial<DatosDeFaq> | null {
  const cambios: Partial<DatosDeFaq> = {}
  if (nuevos.pregunta !== original.pregunta) cambios.pregunta = nuevos.pregunta
  if (nuevos.respuesta !== original.respuesta) cambios.respuesta = nuevos.respuesta
  if (nuevos.categoria !== original.categoria) cambios.categoria = nuevos.categoria
  if (nuevos.publicada !== original.publicada) cambios.publicada = nuevos.publicada
  return Object.keys(cambios).length === 0 ? null : cambios
}
