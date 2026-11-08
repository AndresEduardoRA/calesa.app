// Los comentarios de una cotización como los lee la pantalla (4.27-2): lo que responden `cotizacion_comentarios`, `cotizacion_comentario_respuestas` y las RPC
// de escribir (4.27-1). Un nivel: una raíz con sus respuestas. Nada de React ni de Supabase. Las fechas quedan como el texto de la base (la versión para editar o
// borrar y el cursor no pasan por `Date`: perderían los microsegundos).
import { z } from 'zod'

export type Comentario = {
  id: string
  autor: { id: string | null; nombre: string | null }
  // Nulo si está eliminado («Comentario eliminado.»).
  cuerpo: string | null
  creadoEn: string
  // La versión: editar y borrar la mandan tal cual.
  actualizadoEn: string
  editado: boolean
  eliminado: boolean
  mio: boolean
}

export type ComentarioRaiz = Comentario & {
  respuestas: Comentario[]
  hayMasRespuestas: boolean
}

export type PaginaDeComentarios = {
  comentarios: ComentarioRaiz[]
  hayMas: boolean
  // Si quien mira puede borrar comentarios ajenos (`cotizaciones.moderar`): lo dice la misma lectura.
  puedeModerar: boolean
}

export type PaginaDeRespuestas = {
  respuestas: Comentario[]
  hayMas: boolean
}

export type ResultadoDeBorrar = 'borrado' | 'eliminado' | 'sin_cambios'

const esquemaItem = z.object({
  id: z.guid(),
  autor: z.object({ id: z.guid().nullable(), nombre: z.string().nullable() }),
  cuerpo: z.string().nullable(),
  creado_en: z.string(),
  actualizado_en: z.string(),
  editado: z.boolean(),
  eliminado: z.boolean(),
  mio: z.boolean(),
})

const esquemaRaiz = esquemaItem.extend({
  respuestas: z.array(esquemaItem),
  hay_mas_respuestas: z.boolean(),
})

const esquemaPagina = z.object({
  comentarios: z.array(esquemaRaiz),
  hay_mas: z.boolean(),
  puede_moderar: z.boolean(),
})
const esquemaRespuestas = z.object({ respuestas: z.array(esquemaItem), hay_mas: z.boolean() })
const esquemaBorrar = z.object({ resultado: z.enum(['borrado', 'eliminado', 'sin_cambios']) })

function deItem(crudo: z.infer<typeof esquemaItem>): Comentario {
  return {
    id: crudo.id,
    autor: crudo.autor,
    cuerpo: crudo.eliminado ? null : crudo.cuerpo,
    creadoEn: crudo.creado_en,
    actualizadoEn: crudo.actualizado_en,
    editado: crudo.editado,
    eliminado: crudo.eliminado,
    mio: crudo.mio,
  }
}

// Una forma que no cuadra es null: un error, nunca una lista vacía.
export function paginaDeComentariosDesde(crudo: unknown): PaginaDeComentarios | null {
  const leida = esquemaPagina.safeParse(crudo)
  if (!leida.success) {
    return null
  }
  return {
    comentarios: leida.data.comentarios.map((raiz) => ({
      ...deItem(raiz),
      respuestas: raiz.respuestas.map(deItem),
      hayMasRespuestas: raiz.hay_mas_respuestas,
    })),
    hayMas: leida.data.hay_mas,
    puedeModerar: leida.data.puede_moderar,
  }
}

export function paginaDeRespuestasDesde(crudo: unknown): PaginaDeRespuestas | null {
  const leida = esquemaRespuestas.safeParse(crudo)
  return leida.success
    ? { respuestas: leida.data.respuestas.map(deItem), hayMas: leida.data.hay_mas }
    : null
}

export function comentarioDesde(crudo: unknown): Comentario | null {
  const leido = esquemaItem.safeParse(crudo)
  return leido.success ? deItem(leido.data) : null
}

export function resultadoDeBorrarDesde(crudo: unknown): ResultadoDeBorrar | null {
  const leido = esquemaBorrar.safeParse(crudo)
  return leido.success ? leido.data.resultado : null
}

// Quién lo escribió, como se lee en la lista: sin nombre que mostrar, «Alguien».
export function autorDelComentario(comentario: Pick<Comentario, 'autor'>): string {
  return comentario.autor.nombre ?? 'Alguien'
}
