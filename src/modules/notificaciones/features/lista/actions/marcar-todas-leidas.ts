'use server'

import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeNotificaciones } from '../../../composicion'
import { LOTES_POR_CLIC } from '../../../entities/notificacion'

// Sólo pone `leida_en` (no acciona: lo que pedía acción sigue pidiéndola). Por lotes y hasta `LOTES_POR_CLIC`:
// si el último vino lleno, `quedanMas` y la pantalla deja repetir.
export const marcarTodasLeidas = actionClient.action(async ({ ctx }) =>
  repositorioDeNotificaciones.marcarTodasLeidas(ctx.usuarioId, LOTES_POR_CLIC),
)
