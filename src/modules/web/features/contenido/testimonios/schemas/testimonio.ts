import { z } from 'zod'
import {
  LARGO_DE_CANAL,
  LARGO_DE_CIUDAD,
  LARGO_DE_CLIENTE,
  LARGO_DE_TEXTO,
  LARGO_DE_VEHICULO,
} from '../../../../entities/contenido/testimonios'

// Lo que cruza al servidor al crear, guardar, eliminar, consentir o retirar un testimonio (8.02-2). La base vuelve a revisarlo con la RLS, las columnas, el
// trigger del consentimiento y las RPC.
const cliente = z.string().trim().min(1).max(LARGO_DE_CLIENTE)
const ciudad = z.string().trim().min(1).max(LARGO_DE_CIUDAD).nullable()
const vehiculo = z.string().trim().min(1).max(LARGO_DE_VEHICULO).nullable()
const texto = z.string().trim().min(1).max(LARGO_DE_TEXTO)
// La ruta de la foto ya subida al bucket `web`; nula = sin foto.
const fotoRuta = z
  .string()
  .regex(/^testimonios\/[\w.-]+$/)
  .nullable()
const version = z.iso.datetime({ offset: true })

export const esquemaCrearTestimonio = z.object({
  cliente,
  ciudad,
  vehiculo,
  texto,
  publicado: z.boolean(),
  fotoRuta,
})

// Sólo lo que cambió (`cambiosDeTestimonio`): al menos una clave, con la versión que se vio.
export const esquemaGuardarTestimonio = z.object({
  id: z.guid(),
  actualizadoEnEsperado: version,
  cambios: z
    .strictObject({
      cliente: cliente.optional(),
      ciudad: ciudad.optional(),
      vehiculo: vehiculo.optional(),
      texto: texto.optional(),
      publicado: z.boolean().optional(),
      fotoRuta: fotoRuta.optional(),
    })
    .refine((c) => Object.keys(c).length > 0, { error: 'No hay cambios que guardar.' }),
})

export const esquemaEliminarTestimonio = z.object({
  id: z.guid(),
  actualizadoEnEsperado: version,
})

export const esquemaRetirarConsentimiento = esquemaEliminarTestimonio

export const esquemaRegistrarConsentimiento = z.object({
  id: z.guid(),
  actualizadoEnEsperado: version,
  canal: z.string().trim().min(1).max(LARGO_DE_CANAL),
  ciudad: z.boolean(),
  vehiculo: z.boolean(),
  foto: z.boolean(),
})
