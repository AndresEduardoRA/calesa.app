import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import type { ErrorApp } from '@/shared/lib/errores'
import { avisarError } from '@/shared/ui/toasts'
import type { FalloDeEscritura, ResultadoDeEscritura } from '../entities/escritura'

export const MENSAJE_DE_VALIDACION = 'Revisa los campos marcados.'

// Lo que vuelve del repositorio, dicho como resultado de una action: el motivo junto a su campo.
export function comoResultado(
  resultado: { ok: true; data: ResultadoDeEscritura } | FalloDeEscritura,
): ResultadoDeAccion<ResultadoDeEscritura> {
  if (resultado.ok) {
    return resultado
  }
  const { campo, error } = resultado
  return { ok: false, error, ...(campo ? { porCampo: { [campo]: error.mensaje } } : {}) }
}

// Lo que un formulario hace con un rechazo: un conflicto (`PT409`) ofrece «Recargar», un motivo por campo va junto a su campo y lo demás, un aviso.
export function rechazarEnvio(
  error: ErrorApp,
  porCampo: Record<string, string> | undefined,
  alConflicto: (mensaje: string) => void,
  alCampos: (porCampo: Record<string, string>) => void,
): void {
  if (error.codigo === 'conflicto') {
    alConflicto(error.mensaje)
  } else if (porCampo) {
    alCampos(porCampo)
  } else {
    avisarError(error)
  }
}
