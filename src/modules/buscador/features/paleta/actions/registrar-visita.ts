'use server'

import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeVisitas } from '../../../composicion'
import { esquemaDeVisita } from '../schemas/visita'

// Abrir una ficha deja su visita para «Últimos abiertos». La persona sale de la sesión, nunca del pedido. Sin
// `revalidatePath`: nadie lee la lista hasta que se abre la paleta, y entonces se relee.
export const registrarVisita = actionClient
  .inputSchema(esquemaDeVisita)
  .action(({ parsedInput }) => repositorioDeVisitas.registrar(parsedInput.tipo, parsedInput.id))
