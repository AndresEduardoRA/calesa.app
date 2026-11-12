import { avisarError } from '@/shared/ui/toasts'
import { urlDelComprobante } from '../../../areas/dinero/composicion.client'

// «Ver comprobante» de un gasto o de un pago: pide una URL firmada de 60 s y la abre en otra pestaña (6.11).
export async function verComprobante(ruta: string): Promise<void> {
  const resultado = await urlDelComprobante(ruta).catch(() => null)
  if (resultado?.ok) {
    window.open(resultado.data, '_blank', 'noopener,noreferrer')
  } else {
    avisarError(
      resultado?.ok === false
        ? resultado.error
        : { codigo: 'inesperado', mensaje: 'No se pudo abrir el comprobante. Prueba de nuevo.' },
    )
  }
}
