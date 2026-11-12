import { z } from 'zod'
import { AMBITOS_DE_FLUJO } from '../../../entities/flujo'
import { LARGO_MAXIMO_DE_ACCION } from '../../../entities/transiciones/formulario-de-salida'

// Lo que cruza el límite de las salidas: la forma. Lo que vale cada dato (el largo de la acción, el destino) lo dice la base con el campo en el `hint`. El
// `ambito` va en todas: la action necesita saber qué permiso exigir antes de escribir.
const version = z.string().min(1)
const ambito = z.enum(AMBITOS_DE_FLUJO)

export const esquemaCrearTransicion = z.object({
  // El id del intento: el mismo en cada reintento.
  id: z.guid(),
  ambito,
  flujoId: z.guid(),
  actualizadoEnEsperado: version,
  deFaseId: z.guid(),
  aFaseId: z.guid(),
  accion: z
    .string()
    .max(LARGO_MAXIMO_DE_ACCION * 4)
    .nullable(),
  notaObligatoria: z.boolean(),
})

export const esquemaEliminarTransicion = z.object({
  id: z.guid(),
  ambito,
  actualizadoEnEsperado: version,
})

// Sólo las dos claves que la base admite en `transicion_guardar`; al menos una (si no, no hay nada que guardar).
export const esquemaGuardarTransicion = z.strictObject({
  id: z.guid(),
  ambito,
  actualizadoEnEsperado: version,
  cambios: z
    .strictObject({
      accion: z
        .string()
        .max(LARGO_MAXIMO_DE_ACCION * 4)
        .nullable()
        .optional(),
      notaObligatoria: z.boolean().optional(),
    })
    .refine((c) => c.accion !== undefined || c.notaObligatoria !== undefined, {
      error: 'No hay nada que guardar.',
    }),
})

// La lista completa de roles (vacía es válida: quita la lista). La base rechaza repetidos, inexistentes y más de 100 con el hint `roles`.
const roles = z.array(z.guid()).max(100)

export const esquemaPonerRolesDeFase = z.strictObject({
  faseId: z.guid(),
  ambito,
  actualizadoEnEsperado: version,
  roles,
})

export const esquemaPonerRolesDeTransicion = z.strictObject({
  id: z.guid(),
  ambito,
  actualizadoEnEsperado: version,
  roles,
})
