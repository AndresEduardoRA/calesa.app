'use server'

import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { errorDePostgrest, fallo } from '@/shared/lib/errores'
import { puede } from '@/shared/lib/permisos'
import { actionClient } from '@/shared/lib/safe-action'
import { esquemaConfirmarContacto } from '../schemas/confirmar-contacto'

const SIN_PERMISO_PARA_TURNOS = 'No tienes permiso para confirmar turnos de la web.'
const MENSAJE_TURNO_AJENO = 'No puedes confirmar este turno.'

// «Contacté» (con `lead`: «Vincular a lead») sobre un turno de la web (8.05-1): `web_confirmar_contacto(p_solicitud, p_lead)` decide a quién le pertenece el
// turno y si el lead se ve (42501 en los dos casos, sin decir si existe). Una solicitud que ya no está abierta no da error: la tarjeta se va al releer.
// El permiso se mira antes con las mismas claves que muestran el bloque; lo que protege es la base.
export const confirmarContacto = actionClient
  .inputSchema(esquemaConfirmarContacto)
  .action(async ({ parsedInput, ctx }): Promise<ResultadoDeAccion<null>> => {
    if (!puede(ctx.permisos, 'leads.crear') && !puede(ctx.permisos, 'web.cola.gestionar')) {
      return fallo('sin_permiso', SIN_PERMISO_PARA_TURNOS)
    }
    const { error } = await ctx.supabase.rpc('web_confirmar_contacto', {
      p_solicitud: parsedInput.solicitud,
      ...(parsedInput.lead ? { p_lead: parsedInput.lead } : {}),
    })
    if (error) {
      return error.code === '42501'
        ? fallo('sin_permiso', MENSAJE_TURNO_AJENO)
        : { ok: false, error: errorDePostgrest(error) }
    }
    return { ok: true, data: null }
  })
