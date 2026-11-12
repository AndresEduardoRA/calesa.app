import { z } from 'zod'
import {
  LARGO_MAXIMO_DE_CLIENTE,
  LARGO_MAXIMO_DE_ETIQUETA,
  LARGO_MAXIMO_DE_NOTAS,
  LARGO_MAXIMO_DE_TELEFONO,
  LARGO_MAXIMO_DE_VIN,
} from '../../../entities/proyectos/borrador'

// Lo que cruza al servidor al crear un proyecto (8.09-1, C4). O un vehículo, o una etiqueta (nunca los dos, ni VIN con vehículo); la base vuelve a revisarlo
// (`repuesto_proyecto_crear`). Un campo vacío no se manda: no existe en el objeto.
const texto = (maximo: number) => z.string().trim().min(1).max(maximo).optional()

export const esquemaCrearProyecto = z
  .object({
    id: z.guid(),
    vehiculoId: z.guid().optional(),
    vehiculoEtiqueta: texto(LARGO_MAXIMO_DE_ETIQUETA),
    vin: texto(LARGO_MAXIMO_DE_VIN),
    leadId: z.guid().optional(),
    clienteNombre: texto(LARGO_MAXIMO_DE_CLIENTE),
    clienteTelefono: texto(LARGO_MAXIMO_DE_TELEFONO),
    notas: texto(LARGO_MAXIMO_DE_NOTAS),
  })
  .superRefine((p, contexto) => {
    if (p.vehiculoId === undefined) {
      if (p.vehiculoEtiqueta === undefined) {
        contexto.addIssue({
          code: 'custom',
          path: ['vehiculoEtiqueta'],
          message: 'Escribe qué vehículo es.',
        })
      }
      return
    }
    if (p.vehiculoEtiqueta !== undefined || p.vin !== undefined) {
      contexto.addIssue({
        code: 'custom',
        path: ['vehiculoEtiqueta'],
        message: 'Un proyecto de un vehículo toma sus datos del vehículo.',
      })
    }
  })
