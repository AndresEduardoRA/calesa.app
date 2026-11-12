import type { Envio } from '@/shared/lib/enviar-accion'
import { avisarError } from '@/shared/ui/toasts'

type Destinos = {
  alConflicto: (mensaje: string) => void
  alCampo: (errores: Record<string, string>) => void
}

// Dónde se dice un rechazo de un formulario: el conflicto dentro del formulario con «Recargar», el motivo de un campo junto a él y lo demás en un aviso.
export function decirElRechazo(
  envio: Extract<Envio<unknown>, { ok: false }>,
  { alConflicto, alCampo }: Destinos,
) {
  if (envio.error.codigo === 'conflicto') {
    alConflicto(envio.error.mensaje)
  } else if ('porCampo' in envio && envio.porCampo) {
    alCampo(envio.porCampo)
  } else {
    avisarError(envio.error)
  }
}
