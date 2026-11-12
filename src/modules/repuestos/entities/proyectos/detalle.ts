import { z } from 'zod'

// Un proyecto de repuestos para su pantalla `/repuestos/[id]` (8.09-2, C1). Puro: `infra/proyectos/leer.ts` lo arma. No trae el teléfono ni el lead del cliente (D50: la lista
// tampoco, y leerlos pediría `leads.ver`).
export type ProyectoDetallado = {
  id: string
  numero: number
  vehiculoId: string | null
  // Del proyecto externo: lo que la persona escribió en vez de un vehículo.
  vehiculoEtiqueta: string | null
  vin: string | null
  clienteNombre: string | null
  notas: string | null
  // ISO; nulo = abierto.
  cerradoEn: string | null
  // ISO: la versión que esperan cerrar y reabrir.
  actualizadoEn: string
}

export const COLUMNAS_DE_PROYECTO =
  'id, numero, vehiculo_id, vehiculo_etiqueta, vin, cliente_nombre, notas, cerrado_en, actualizado_en'

const esquemaDeProyecto = z.object({
  id: z.guid(),
  numero: z.number().int().positive(),
  vehiculo_id: z.guid().nullable(),
  vehiculo_etiqueta: z.string().nullable(),
  vin: z.string().nullable(),
  cliente_nombre: z.string().nullable(),
  notas: z.string().nullable(),
  cerrado_en: z.string().nullable(),
  actualizado_en: z.string(),
})

/** La fila de `repuestos_proyectos`; nulo si no tiene la forma esperada. */
export function proyectoDetalladoDesde(dato: unknown): ProyectoDetallado | null {
  const leido = esquemaDeProyecto.safeParse(dato)
  if (!leido.success) {
    return null
  }
  const p = leido.data
  return {
    id: p.id,
    numero: p.numero,
    vehiculoId: p.vehiculo_id,
    vehiculoEtiqueta: p.vehiculo_etiqueta,
    vin: p.vin,
    clienteNombre: p.cliente_nombre,
    notas: p.notas,
    cerradoEn: p.cerrado_en,
    actualizadoEn: p.actualizado_en,
  }
}

/** Un `id` de la URL que ni es guid no se consulta: es el mismo «no existe» que un proyecto que la RLS no deja ver (D49). */
export function esIdDeProyecto(id: string): boolean {
  return z.guid().safeParse(id).success
}

export const PROYECTO_YA_NO_ESTA =
  'Este proyecto ya no está disponible: no existe o ya no tienes acceso.'
