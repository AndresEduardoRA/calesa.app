import { z } from 'zod'
import {
  LARGO_MAXIMO_DE_NOMBRE_DE_VALOR,
  ORDEN_MAXIMO_DE_VALOR,
  esquemaDeClaveDeCatalogo,
} from '../../../entities/catalogos/catalogo'

// Lo que cruza al servidor al crear, guardar o borrar un valor de catálogo (8.08-2). La base vuelve a revisarlo (`check` del catálogo, `smallint` del
// orden, único `(catalogo, nombre)`). Guardar nunca lleva el catálogo (H1).
const nombre = z.string().trim().min(1).max(LARGO_MAXIMO_DE_NOMBRE_DE_VALOR)
const orden = z.number().int().min(0).max(ORDEN_MAXIMO_DE_VALOR)

export const esquemaCrearValor = z.object({
  catalogo: esquemaDeClaveDeCatalogo,
  nombre,
  activo: z.boolean(),
  orden,
})

// Sólo lo que cambió (`cambiosDeValor`): al menos una clave. Renombrar, ordenar (el campo «Orden», D21) y activar o desactivar.
export const esquemaGuardarValor = z.object({
  id: z.guid(),
  nombre,
  cambios: z
    .strictObject({
      nombre: nombre.optional(),
      activo: z.boolean().optional(),
      orden: orden.optional(),
    })
    .refine((c) => Object.keys(c).length > 0, { error: 'No hay cambios que guardar.' }),
})

export const esquemaEliminarValor = z.object({ id: z.guid(), nombre })
