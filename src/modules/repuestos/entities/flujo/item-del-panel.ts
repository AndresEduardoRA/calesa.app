import { z } from 'zod'
import { fallo, MENSAJE_INESPERADO, ok, type Resultado } from '@/shared/lib/errores'

// El ítem que abre su panel (8.13-2): lo que `logistica` necesita para armar la unidad (`<ItemAbierto>` en `src/app`). Lectura propia —no la de la hoja— porque pide `fase_desde` y el proyecto.
export type ItemDelPanel = {
  id: string
  descripcion: string
  faseId: string | null
  // ISO: cuándo entró a su fase; nulo si no tiene.
  faseDesde: string | null
  fase: { nombre: string; color: string } | null
  proyecto: { id: string; numero: number; vehiculoId: string | null }
}

/** Las columnas que pide el panel, con la fase y el proyecto embebidos (una lectura, sin N+1). */
export const COLUMNAS_DEL_ITEM_DEL_PANEL =
  'id, descripcion, fase_id, fase_desde, fase:fases(id, nombre, color), proyecto:repuestos_proyectos(id, numero, vehiculo_id)'

const esquemaDeFila = z.object({
  id: z.guid(),
  descripcion: z.string(),
  fase_id: z.guid().nullable(),
  fase_desde: z.string().nullable(),
  fase: z.object({ id: z.guid(), nombre: z.string(), color: z.string() }).nullable(),
  // Nulo si la RLS no deja ver el proyecto: entonces el ítem tampoco se muestra.
  proyecto: z
    .object({
      id: z.guid(),
      numero: z.number().int().min(0),
      vehiculo_id: z.guid().nullable(),
    })
    .nullable(),
})

/** La fila de la base como `ItemDelPanel`; sin proyecto visible, nulo (se dice como si no existiera); una fila que no cumple el esquema es un error inesperado. */
export function itemDelPanelDesde(fila: unknown): Resultado<ItemDelPanel | null> {
  const leida = esquemaDeFila.safeParse(fila)
  if (!leida.success) return fallo('inesperado', MENSAJE_INESPERADO)
  const { id, descripcion, fase_id, fase_desde, fase, proyecto } = leida.data
  if (proyecto === null) return ok(null)
  return ok({
    id,
    descripcion,
    faseId: fase_id,
    faseDesde: fase_desde,
    fase: fase === null ? null : { nombre: fase.nombre, color: fase.color },
    proyecto: { id: proyecto.id, numero: proyecto.numero, vehiculoId: proyecto.vehiculo_id },
  })
}
