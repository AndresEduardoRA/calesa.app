import { z } from 'zod'

// El interruptor «Disponible para recibir turnos» (8.05-2): sólo el sí o el no. La persona sale de la sesión, nunca del formulario.
export const esquemaCambiarDisponibilidad = z.object({ disponible: z.boolean() })
