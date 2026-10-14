import { z } from 'zod'

// Refrescar la subasta de un vehículo con una consulta nueva. Lo que viaja es la referencia: el
// bruto lo guardó la edge function, y de ahí lo copia la base (fecha y estado no se pueden
// inventar desde el navegador).
export const esquemaRefrescarSubasta = z.object({
  vehiculoId: z.guid(),
  // La versión que tenía en pantalla quien refresca.
  actualizadoEnEsperado: z.string().min(1),
  consulta: z.guid(),
})
