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

// Las fechas de la subasta (A4b): sólo las que cambiaron, como instante con su zona (lo convierte el navegador desde la hora que se
// escribió); null borra. La base vuelve a validar todo.
const instante = z.iso.datetime({ offset: true }).nullable().optional()
export const esquemaGuardarFechasDeSubasta = z.object({
  vehiculoId: z.guid(),
  actualizadoEnEsperado: z.string().min(1),
  cambios: z
    .strictObject({ subasta_en: instante, subasta_fin_en: instante })
    .refine((cambios) => Object.keys(cambios).length > 0, { error: 'No hay nada que guardar.' }),
})
