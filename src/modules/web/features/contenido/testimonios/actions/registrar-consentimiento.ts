'use server'

import { revalidatePath } from 'next/cache'
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { fallo } from '@/shared/lib/errores'
import { puede } from '@/shared/lib/permisos'
import { RUTAS } from '@/shared/lib/rutas'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeConsentimiento } from '../../../../areas/contenido/composicion'
import { SIN_PERMISO_PARA_TESTIMONIOS } from '../../../../entities/contenido/errores'
import { esquemaRegistrarConsentimiento } from '../schemas/testimonio'

// Registra el consentimiento de un testimonio por la RPC (8.02-2): quién, cuándo, canal y qué datos autorizó. Registrarlo tras retirarlo lo reactiva.
export const registrarConsentimiento = actionClient
  .inputSchema(esquemaRegistrarConsentimiento)
  .action(async ({ parsedInput, ctx }): Promise<ResultadoDeAccion<{ actualizadoEn: string }>> => {
    if (!puede(ctx.permisos, 'web.contenido.gestionar')) {
      return fallo('sin_permiso', SIN_PERMISO_PARA_TESTIMONIOS)
    }
    const hecho = await repositorioDeConsentimiento.consentir(parsedInput)
    if (hecho.ok) revalidatePath(RUTAS.configuracionDeWeb)
    return hecho
  })
