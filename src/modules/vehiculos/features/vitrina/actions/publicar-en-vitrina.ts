'use server'

import { revalidatePath } from 'next/cache'
import { fallo } from '@/shared/lib/errores'
import { puede } from '@/shared/lib/permisos'
import { RUTAS } from '@/shared/lib/rutas'
import { actionClient } from '@/shared/lib/safe-action'
import { leerVehiculo, repositorioVitrina } from '../../../composicion'
import type { ResultadoDeGuardar } from '../../alta/resultado'
import { esquemaPublicarEnVitrina } from '../schemas/vitrina'

// Publica o despublica un vehículo, con su precio público. Manda la versión que tenía en pantalla
// quien publica: si otra persona cambió el vehículo, la base responde `conflicto` con quién y
// cuándo. El permiso es por origen; la base lo vuelve a comprobar.
export const publicarEnVitrina = actionClient
  .inputSchema(esquemaPublicarEnVitrina)
  .action(async ({ parsedInput, ctx }): Promise<ResultadoDeGuardar<{ actualizadoEn: string }>> => {
    const leido = await leerVehiculo(parsedInput.vehiculoId)
    if (!leido.ok) {
      return leido
    }
    if (!leido.data) {
      return fallo('no_encontrado', 'Ese vehículo ya no existe o no tienes acceso.')
    }
    if (!puede(ctx.permisos, 'vehiculos.vitrina', leido.data.origenId)) {
      return fallo('sin_permiso', 'No tienes permiso para publicar este vehículo en la web.')
    }
    const guardado = await repositorioVitrina.publicar(parsedInput)
    // Tras un conflicto la pantalla quedó vieja: que al recargar traiga lo nuevo.
    revalidatePath(RUTAS.vehiculos)
    revalidatePath(`${RUTAS.vehiculos}/${parsedInput.vehiculoId}`)
    if (!guardado.ok) {
      const { campo, error } = guardado
      return { ok: false, error, ...(campo ? { porCampo: { [campo]: error.mensaje } } : {}) }
    }
    return guardado
  })
