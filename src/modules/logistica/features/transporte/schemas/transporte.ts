import { z } from 'zod'
import { LARGO_MAXIMO_DE_LAS_NOTAS_DE_TRANSPORTE } from '../../../entities/transporte/transporte'

// Lo que cruza al servidor al guardar el transporte de una unidad (6.08-2). La base vuelve a revisarlo todo (`_transporte_cambios`, `_transporte_validar`); acá se corta lo que no tiene la forma.
const fecha = z.iso.date()

// Sólo las claves que `transporte_guardar` admite: una de más da 22023. Una clave ausente no cambia; `null` vacía el dato. El contenedor y el booking los normaliza la base.
const esquemaDeCambios = z
  .strictObject({
    naviera_id: z.guid().nullable().optional(),
    puerto_origen_id: z.guid().nullable().optional(),
    puerto_destino_id: z.guid().nullable().optional(),
    contenedor: z.string().max(80).nullable().optional(),
    booking: z.string().max(80).nullable().optional(),
    zarpe_el: fecha.nullable().optional(),
    eta_el: fecha.nullable().optional(),
    arribo_el: fecha.nullable().optional(),
    notas: z.string().max(LARGO_MAXIMO_DE_LAS_NOTAS_DE_TRANSPORTE).nullable().optional(),
  })
  .refine((c) => Object.keys(c).length > 0, { message: 'No hay nada que guardar.' })

// Crear lleva la versión nula; editar, la que se leyó.
export const esquemaGuardarTransporte = z.object({
  vehiculoId: z.guid(),
  actualizadoEnEsperado: z.string().min(1).nullable(),
  cambios: esquemaDeCambios,
})
