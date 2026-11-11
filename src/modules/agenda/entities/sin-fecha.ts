// «Tareas sin fecha» (7.07-3): lo que devuelve `agenda_tareas_sin_fecha` (mis tareas vivas sin vencimiento, pendientes y hechas, la más nueva primero)
// y el cursor de «Ver más». Puro: la respuesta de la RPC es un `jsonb` sin tipo, así que se **parsea** (Zod en todo límite).
import { z } from 'zod'
import type { Resultado } from '@/shared/lib/errores'
import { ESTADO_DE_TAREA_HECHA } from './agenda'

export type TareaSinFecha = {
  id: string
  titulo: string
  hecha: boolean
  // Tal como vino de la base (con su precisión): el cursor lo devuelve intacto.
  creadoEn: string
  mia: boolean
}

export type PaginaDeSinFecha = { tareas: TareaSinFecha[]; hayMas: boolean }

// Desde dónde sigue la lista: la última fila leída `(creado_en, id)`.
export type CursorDeSinFecha = { antesEn: string; antesId: string }

// `null`: la primera página.
export type LectorDeSinFecha = (
  cursor: CursorDeSinFecha | null,
) => Promise<Resultado<PaginaDeSinFecha>>

const esquema = z.object({
  tareas: z.array(
    z.object({
      id: z.guid(),
      titulo: z.string(),
      estado: z.string(),
      creado_en: z.iso.datetime({ offset: true }),
      mia: z.boolean(),
    }),
  ),
  hay_mas: z.boolean(),
})

// De lo que devolvió la RPC a la página, o `null` si no tiene la forma esperada.
export function paginaDeSinFecha(datos: unknown): PaginaDeSinFecha | null {
  const leido = esquema.safeParse(datos)
  if (!leido.success) {
    return null
  }
  return {
    tareas: leido.data.tareas.map((t) => ({
      id: t.id,
      titulo: t.titulo,
      hecha: t.estado === ESTADO_DE_TAREA_HECHA,
      creadoEn: t.creado_en,
      mia: t.mia,
    })),
    hayMas: leido.data.hay_mas,
  }
}

// El cursor de la página que sigue: la última fila de lo cargado (nulo si no hay nada cargado).
export function cursorDeSinFecha(tareas: readonly TareaSinFecha[]): CursorDeSinFecha | null {
  const ultima = tareas.at(-1)
  return ultima ? { antesEn: ultima.creadoEn, antesId: ultima.id } : null
}
