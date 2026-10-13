import type { Resultado } from '@/shared/lib/errores'
import { avisarError, avisarExito } from '@/shared/ui/toasts'

// Cierra un envío: lo logrado se avisa y lo que falló también, salvo lo que ya está escrito al lado
// de su campo (un error de validación o un nombre repetido). Lo tipeado queda siempre.
export function cerrarConAviso<Dato>(
  resultado: Resultado<Dato>,
  exito: string | null,
): Resultado<Dato> {
  if (resultado.ok) {
    if (exito !== null) {
      avisarExito(exito)
    }
  } else if (resultado.error.codigo !== 'validacion' && resultado.error.codigo !== 'duplicado') {
    avisarError(resultado.error)
  }
  return resultado
}
