import { z } from 'zod'
import { LARGO_MAXIMO_DE_DESCRIPCION, LARGO_MAXIMO_DE_TITULO } from '../../../entities/edicion'

// Lo que cruza el límite de las tareas: la forma y los topes. Quién puede y quién recibe lo dice la base.
const iso = z.iso.datetime({ offset: true })
const titulo = z.string().trim().min(1).max(LARGO_MAXIMO_DE_TITULO)
const descripcion = z.string().max(LARGO_MAXIMO_DE_DESCRIPCION).nullable().optional()

export const esquemaCrearTarea = z.object({
  // El del intento: lo genera el navegador al abrir el panel y lo conserva en cada reintento.
  id: z.guid(),
  // `responsable_id` sólo al crear (darla a otro exige `agenda.tareas.asignar`, lo comprueba la base).
  datos: z.strictObject({
    titulo,
    descripcion,
    vence_en: iso.nullable().optional(),
    responsable_id: z.guid().optional(),
  }),
})

// Al guardar no existe `responsable_id`: cambia por `reasignar_tarea` (7.07-3) y la base lo rechaza aquí.
export const esquemaGuardarTarea = z.object({
  id: z.guid(),
  actualizadoEnEsperado: iso,
  datos: z.strictObject({
    titulo: titulo.optional(),
    descripcion,
    vence_en: iso.nullable().optional(),
  }),
})

export const esquemaEliminarTarea = z.object({
  id: z.guid(),
  actualizadoEnEsperado: iso,
})
