'use server'

import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { actionClient } from '@/shared/lib/safe-action'
import { leerOpcionesDeRequisitos as leer } from '../../../areas/requisitos/composicion'
import type { OpcionesDeRequisitos } from '../../../entities/requisitos/opciones'
import { esquemaLeerOpciones } from '../schemas/requisitos'

// Los tipos de documento que los requisitos de un flujo nombran. Una lectura que el cliente pide una vez al abrirse el bloque (el hueco del inspector es de
// cliente y sólo recibe `{flujo, fase}`); la RLS de la base decide qué ve quien pide.
export const leerOpcionesDeRequisitos = actionClient
  .inputSchema(esquemaLeerOpciones)
  .action(async ({ parsedInput }): Promise<ResultadoDeAccion<OpcionesDeRequisitos>> => {
    const lectura = await leer(parsedInput.flujoId)
    return lectura.ok ? lectura : { ok: false, error: lectura.error }
  })
