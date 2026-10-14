import { z } from 'zod'

// El sobre de un guardado. Lo que viaja en `valores` es el estado del formulario tal como está
// (texto, sí o no, listas): qué campos lleva y qué vale cada uno depende del layout del origen,
// así que la action lo valida con el esquema que arma `esquemaDeVehiculo()` después de leer el
// layout en el servidor. Acá sólo se acota la forma y el tamaño.
const valor = z.union([
  z.string().max(6000),
  z.boolean(),
  z.null(),
  z.array(z.string().max(80)).max(100),
])

const valores = z
  .record(z.string().min(1).max(60), valor)
  .refine((campos) => Object.keys(campos).length <= 300, { error: 'Son demasiados campos.' })

export const esquemaCrearVehiculo = z.object({
  // Lo genera el navegador al abrir el formulario: reintentar el alta no la duplica.
  id: z.guid(),
  origenId: z.guid(),
  valores,
  // La consulta a apibara que llenó la ficha, si el alta vino de ahí: la base copia el bruto de ella.
  consulta: z.guid().optional(),
})

export const esquemaGuardarVehiculo = z.object({
  id: z.guid(),
  // La versión que tenía en pantalla quien edita.
  actualizadoEnEsperado: z.string().min(1),
  valores,
})
