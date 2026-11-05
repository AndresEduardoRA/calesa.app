import { z } from 'zod'

// El sobre de elegir un dato del vehículo en el panel de la hoja de cotizar (4.14-2c3): el vehículo, la versión que tenía en pantalla, el campo y el valor elegido (una fila de la
// tabla, un texto). Qué campo vale y qué valor admite lo decide la action con el layout de hoy.
export const esquemaGuardarDatoDelVehiculo = z.strictObject({
  id: z.guid(),
  actualizadoEnEsperado: z.string().min(1),
  campo: z.string().min(1).max(60),
  valor: z.string().min(1).max(6000),
})
