import 'server-only'
import { leerLimpiezaPendiente } from '../../composicion'
import type { LimpiezaPendiente } from '../../entities/papelera'

// Lo que la limpieza de Storage tiene atrasado, para avisarle a quien puede vaciar la papelera.
// Si no se pudo leer, la papelera se dibuja igual, sin el aviso.
export async function limpiezaPendiente(): Promise<LimpiezaPendiente | null> {
  const leida = await leerLimpiezaPendiente()
  return leida.ok ? leida.data : null
}
