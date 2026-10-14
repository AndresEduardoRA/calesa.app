import { z } from 'zod'

// La respuesta de apibara tal como llegó del navegador: un objeto y de tamaño razonable (la base
// repite el tope). Lo que importa de ella (fecha, estado) lo deriva la base; lo que llena la ficha
// lo vuelve a leer el servidor con el layout de hoy.
export const esquemaFichaDeApibara = z
  .record(z.string(), z.unknown())
  .refine((objeto) => JSON.stringify(objeto).length <= 500_000, {
    error: 'La respuesta de apibara es demasiado grande.',
  })

// Refrescar la subasta de un vehículo con una respuesta nueva.
export const esquemaRefrescarSubasta = z.object({
  vehiculoId: z.guid(),
  // La versión que tenía en pantalla quien refresca.
  actualizadoEnEsperado: z.string().min(1),
  ficha: esquemaFichaDeApibara,
})
