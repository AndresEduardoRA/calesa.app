import { z } from 'zod'
import { CANALES_DE_AFORO } from '../../../entities/aduana/declaracion'
import { MAXIMO_DE_VEHICULOS_POR_VEZ } from '../../../entities/aduana/escritura'

// Lo que cruza al servidor al guardar una declaración, poner sus vehículos o asignarle el canal (6.09-2). La base vuelve a revisarlo todo (`_declaracion_datos`); acá se corta lo que
// no tiene la forma.
const fecha = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)

// Sólo las claves que `declaracion_guardar` admite: una de más da 22023. Una clave ausente no cambia; `null` vacía el dato.
const esquemaDeDatos = z.strictObject({
  numero: z.string().trim().min(1).max(60).optional(),
  aceptada_el: fecha.nullable().optional(),
  vence_tributos_el: fecha.nullable().optional(),
  despachante: z.string().trim().max(200).nullable().optional(),
  deposito: z.string().trim().max(200).nullable().optional(),
  notas: z.string().trim().max(2000).nullable().optional(),
})

// Crear lleva `id` y versión nulos (y el número); editar, el id y la versión que se leyó.
export const esquemaGuardarDeclaracion = z
  .object({
    id: z.guid().nullable(),
    actualizadoEnEsperado: z.string().min(1).nullable(),
    datos: esquemaDeDatos,
  })
  .refine((v) => (v.id === null) === (v.actualizadoEnEsperado === null), {
    message: 'El id y la versión van juntos o ninguno.',
  })
  .refine((v) => v.id !== null || (v.datos.numero ?? '') !== '', {
    message: 'El número es obligatorio.',
  })

// Hasta 200 entre las dos listas, sin repetidos y sin el mismo vehículo en las dos.
export const esquemaPonerVehiculos = z
  .object({
    declaracionId: z.guid(),
    actualizadoEnEsperado: z.string().min(1),
    agregar: z.array(z.guid()),
    quitar: z.array(z.guid()),
  })
  .refine((v) => v.agregar.length + v.quitar.length <= MAXIMO_DE_VEHICULOS_POR_VEZ, {
    message: 'Hasta 200 vehículos por vez.',
  })
  .refine((v) => new Set([...v.agregar, ...v.quitar]).size === v.agregar.length + v.quitar.length, {
    message: 'Un vehículo no puede repetirse ni agregarse y quitarse a la vez.',
  })

export const esquemaAsignarCanal = z.object({
  declaracionId: z.guid(),
  actualizadoEnEsperado: z.string().min(1),
  canal: z.enum(CANALES_DE_AFORO),
})
